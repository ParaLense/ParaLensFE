package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import android.media.Image
import android.util.Log
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import java.util.HashMap
import java.util.ArrayList
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.core.Scalar
// Debug Streamer (falls vorhanden)
import com.alex8734.visioncamerascreendetector.visioncamerascreendetector.DebugHttpStreamer

class ScreenDetectorFrameProcessorPlugin(
  proxy: VisionCameraProxy,
  options: Map<String, Any>?
) : FrameProcessorPlugin() {
  private val pluginOptions = options
  
  companion object {
    private var detectionCounter = 0
    private var totalFrameCounter = 0
  }


  override fun callback(frame: Frame, arguments: Map<String, Any>?): HashMap<String, Any?>? {
    val data = HashMap<String, Any?>()
    val mediaImage: Image = frame.image
    val srcWidth = mediaImage.width
    val srcHeight = mediaImage.height

    try {
      // Parse arguments using Utils
      val templateBoxes = ScreenDetection.parseTemplate(arguments, pluginOptions)
      val screenAspectW = Utils.getInt(arguments, "screenAspectW", Utils.getInt(pluginOptions, "screenAspectW", 3))
      val screenAspectH = Utils.getInt(arguments, "screenAspectH", Utils.getInt(pluginOptions, "screenAspectH", 4))
      val runOcr = Utils.getBool(arguments, "runOcr", false)
      val ocrBoxes = if (runOcr) OcrProcessor.parseOcrTemplate(arguments) else null
      val minIouForMatch = Utils.getDouble(arguments, "minIouForMatch", Utils.getDouble(pluginOptions, "minIouForMatch", 0.30))
      val accuracyThreshold = Utils.getDouble(arguments, "accuracyThreshold", Utils.getDouble(pluginOptions, "accuracyThreshold", 0.80))
      val templateTargetW = Utils.getInt(arguments, "templateTargetW", Utils.getInt(pluginOptions, "templateTargetW", 1200))
      val templateTargetH = Utils.getInt(arguments, "templateTargetH", Utils.getInt(pluginOptions, "templateTargetH", 1600))
      val returnWarpedImage = Utils.getBool(arguments, "returnWarpedImage", Utils.getBool(pluginOptions, "returnWarpedImage", false))
      val outputW = Utils.getInt(arguments, "outputW", templateTargetW)
      val outputH = Utils.getInt(arguments, "outputH", templateTargetH)
      val imageQuality = Utils.getInt(arguments, "imageQuality", 80)

      // ROI config (normalized 0..1)
      val roiOuterArg = Utils.getMap(arguments, "roiOuter") ?: mapOf(
        "x" to 0.10, "y" to 0.05, "width" to 0.80, "height" to 0.90
      )
      val roiInnerArg = Utils.getMap(arguments, "roiInner") ?: mapOf(
        "x" to 0.30, "y" to 0.20, "width" to 0.45, "height" to 0.60
      )
      val minAspectW = Utils.getInt(arguments, "minAspectW", 3)
      val minAspectH = Utils.getInt(arguments, "minAspectH", 4)
      val minAspect = if (minAspectH != 0) minAspectW.toDouble() / minAspectH.toDouble() else 0.75

      // Convert image to grayscale
      val gray = ImageProcessing.yPlaneToGrayMat(mediaImage)
      val rotate90CW = Utils.getBool(arguments, "rotate90CW", Utils.getBool(pluginOptions, "rotate90CW", false))
      
      val img = if (rotate90CW) {
        val rotated = Mat()
        Core.rotate(gray, rotated, Core.ROTATE_90_CLOCKWISE)
        rotated
      } else {
        gray
      }
      val frameW = img.width()
      val frameH = img.height()

      DebugHttpStreamer.updateMatGray("gray", gray, 60)
      DebugHttpStreamer.updateMatGray("rotated", img, 60)

      // Resolve ROIs in pixels, enforce min aspect
      val roiOuterPx = Utils.enforceMinAspect(Utils.normRectToPx(roiOuterArg, frameW, frameH), frameW, frameH, minAspect)
      val roiInnerPx = Utils.enforceMinAspect(Utils.normRectToPx(roiInnerArg, frameW, frameH), frameW, frameH, minAspect)

      // Preprocess image for better edge detection
      val normalized = ImageProcessing.preprocessImage(img)
      
      // Create edge maps for screen and detail detection
      val (screenEdges, detailEdges) = ImageProcessing.createEdgeMaps(normalized)
      
      // Update debug streams less frequently to avoid overload
      if (totalFrameCounter % 3 == 0) {
        DebugHttpStreamer.updateMatGray("normalized", normalized, 60)
        DebugHttpStreamer.updateMatGray("screenEdges", screenEdges, 60)
        DebugHttpStreamer.updateMatGray("detailEdges", detailEdges, 60)
      }
      
      // Find screen contours
      val screenContours = ArrayList<org.opencv.core.MatOfPoint>()
      val screenHierarchy = Mat()
      Imgproc.findContours(screenEdges, screenContours, screenHierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)

      // Find screen contour rectangles for debug visualization
      val screenContourRects = ImageProcessing.findContourRects(screenEdges)
      
      // Debug: Draw detected screen contours (less frequent updates)
      if (totalFrameCounter % 5 == 0) {
        val debugScreenRects = ImageProcessing.drawDebugRects(img, screenContourRects, Scalar(0.0, 255.0, 0.0), 3)
        DebugHttpStreamer.updateMatColor("screenContourRects", debugScreenRects, 60)
      }

      // Find best screen candidate
      val (bestRect, bestQuad, bestScore) = ScreenDetection.findBestScreenCandidate(
        screenContours, roiInnerPx, roiOuterPx, frameW, frameH
      )
      
      // Find detail contours for template matching
      val contourRects = ImageProcessing.findContourRects(detailEdges)

      // Debug: Draw detected detail contours (less frequent updates)
      if (totalFrameCounter % 5 == 0) {
        val debugDetailRects = ImageProcessing.drawDebugRects(img, contourRects, Scalar(255.0, 0.0, 0.0), 2)
        DebugHttpStreamer.updateMatColor("detailContourRects", debugDetailRects, 60)
      }

      // Build homography matrix
      var H: Mat? = null
      var mask: Mat? = null
      if (bestQuad != null) {
        H = ScreenDetection.buildScreenHomography(bestQuad, templateTargetW, templateTargetH)
      }
      
      // Create warped image early for template matching
      var warped: Mat? = null
      if (H != null && !H.empty()) {
        warped = Mat(outputH, outputW, org.opencv.core.CvType.CV_8UC1)
        Imgproc.warpPerspective(img, warped, H.inv(), Size(outputW.toDouble(), outputH.toDouble()))
        DebugHttpStreamer.updateMatGray("warped", warped, 80)
      }
      
      // Match template boxes using improved warped image method
      var accuracy = 0.0
      val matchedArr = ArrayList<Any?>()
      val templatePixelRectsArr = ArrayList<HashMap<String, Any?>>()
      
      if (warped != null && templateBoxes != null && templateBoxes.isNotEmpty()) {
        // Use new improved method: match in warped image with padding
        val (acc, matched, pixelRects) = ScreenDetection.matchTemplateBoxesInWarped(
          templateBoxes, warped, outputW, outputH,
          paddingPercent = 1.0,  // 1% padding
          minScoreForMatch = 0.4
        )
        accuracy = acc
        templatePixelRectsArr.addAll(pixelRects)
        matchedArr.addAll(matched)
        
        // Debug: Draw matched boxes on camera feed (less frequent updates)
        if (totalFrameCounter % 7 == 0 && H != null && !H.empty()) {
          // Draw matched boxes on camera feed with IDs and scores
          val matchedBoxesDebug = ImageProcessing.drawMatchedBoxesOnCameraFeed(
            img, matchedArr, templateBoxes, outputW, outputH, H
          )
          DebugHttpStreamer.updateMatColor("matchedBoxes", matchedBoxesDebug, 85)
          
          // Log summary of matched boxes
          val matchedCount = matchedArr.count { it != null }
          val totalCount = templateBoxes.size
          Log.d("ScreenDetector", "Matched boxes visualization: $matchedCount/$totalCount boxes detected (accuracy: ${String.format("%.2f", accuracy * 100)}%)")
          
          // Debug: Template boxes projected on camera feed
          val debugTemplateBoxes = ImageProcessing.drawDebugTemplateBoxes(img, templateBoxes, H, templateTargetW, templateTargetH, Scalar(0.0, 0.0, 255.0), 2)
          DebugHttpStreamer.updateMatColor("templateBoxes", debugTemplateBoxes, 80)
          
          // Debug: Combined visualization with all elements
          val combinedDebug = ImageProcessing.createCombinedDebugVisualization(img, screenEdges, detailEdges, screenContourRects, contourRects, templateBoxes, H, templateTargetW, templateTargetH)
          DebugHttpStreamer.updateMatColor("combinedDebug", combinedDebug, 80)
        }
      }
      
      val detected = (H != null && !H.empty()) && (
        if (templateBoxes != null && templateBoxes.isNotEmpty()) accuracy >= accuracyThreshold else true
      )
      
      // Update counters
      totalFrameCounter++
      if (detected) detectionCounter++

      // Encode warped image for base64 if needed
      var warpedImageBase64: String? = null
      if (detected && returnWarpedImage && warped != null) {
        warpedImageBase64 = ImageProcessing.warpAndEncodeGrayToBase64(img, H!!.inv(), outputW, outputH, imageQuality)
        warpedImageBase64?.let {
          val preview = if (it.length > 120) it.substring(0, 120) + "…" else it
          Log.d("ScreenDetector", "warped image len=${it.length}, preview=$preview")
        }
      }

      // Process OCR if requested (reuse warped image if available)
      if (detected && runOcr && ocrBoxes != null && ocrBoxes.isNotEmpty()) {
        val ocrWarped = warped ?: if (H != null && !H.empty()) {
          val temp = Mat(outputH, outputW, org.opencv.core.CvType.CV_8UC1)
          Imgproc.warpPerspective(img, temp, H.inv(), Size(outputW.toDouble(), outputH.toDouble()))
          temp
        } else null
        
        if (ocrWarped != null && H != null && !H.empty()) {
          // Debug: Draw OCR template boxes on camera feed (less frequent updates)
          if (totalFrameCounter % 10 == 0) {
            // Draw on camera feed (with perspective projection)
            val ocrDebugCameraFeed = ImageProcessing.drawOcrTemplateBoxesOnCameraFeed(
              img, ocrBoxes, outputW, outputH, H
            )
            DebugHttpStreamer.updateMatColor("ocrTemplateBoxes", ocrDebugCameraFeed, 60)
            
            // Also draw on warped image for comparison
            val ocrDebugWarped = ImageProcessing.drawOcrTemplateBoxes(ocrWarped, ocrBoxes, outputW, outputH)
            DebugHttpStreamer.updateMatColor("ocrTemplateBoxesWarped", ocrDebugWarped, 60)
          }
          
          val ocrResults = OcrProcessor.processOcrBoxes(ocrWarped, ocrBoxes, outputW, outputH)
          data["ocr"] = hashMapOf("boxes" to ocrResults)
          
          // Clean up if we created a separate warped image for OCR
          if (ocrWarped != warped) {
            ocrWarped.release()
          }
        }
      }

      // Create screen data
      val screenData = ScreenDetection.createScreenData(
        detected, accuracy, accuracyThreshold, detectionCounter, totalFrameCounter,
        frameW, frameH, srcWidth, srcHeight, screenAspectW, screenAspectH,
        templateTargetW, templateTargetH, H, mask, roiOuterPx, roiInnerPx,
        bestRect, emptyList(), templatePixelRectsArr, matchedArr,
        warpedImageBase64, outputW, outputH
      )

      // Create debug overlay with matched boxes projected on camera feed
      try {
        val overlayColor = ImageProcessing.createOverlayImage(
          img, detected, detectionCounter, totalFrameCounter,
          roiOuterPx, roiInnerPx, bestQuad, templateBoxes, H, matchedArr
        )
        
        // Overlay matched boxes if available
        if (H != null && !H.empty() && templateBoxes != null && matchedArr.isNotEmpty()) {
          val matchedOverlay = ImageProcessing.drawMatchedBoxesOnCameraFeed(
            overlayColor, matchedArr, templateBoxes, outputW, outputH, H
          )
          DebugHttpStreamer.updateMatColor("overlay", matchedOverlay, 90)
        } else {
          DebugHttpStreamer.updateMatColor("overlay", overlayColor, 90)
        }
      } catch (_: Throwable) {}

      data["screen"] = screenData
      return data
    } catch (e: Exception) {
      Log.e("ScreenDetector", "Screen detection error: ${e.localizedMessage}", e)
      return null
    }
  }
}
