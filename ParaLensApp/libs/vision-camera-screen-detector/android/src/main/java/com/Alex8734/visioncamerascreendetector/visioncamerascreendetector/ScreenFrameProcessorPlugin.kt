package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import android.media.Image
import android.util.Log
import com.alex8734.visioncamerascreendetector.BuildConfig
import java.util.HashMap
import java.util.ArrayList
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.core.Scalar
import com.alex8734.visioncamerascreendetector.visioncamerascreendetector.DebugHttpStreamer

/**
 * Core screen-detection / OCR pipeline. Decoupled from VisionCamera: it operates
 * on a plain [Image] plus an argument map, so it can be driven from the V5 Nitro
 * HybridObject (see HybridScreenDetector) without depending on the old (removed)
 * FrameProcessorPlugin API. All OpenCV/OCR logic below is unchanged.
 */
class ScreenDetectorProcessor(
  options: Map<String, Any>?
) {
  private val pluginOptions = options

  // Per-instance counters — reset on new camera session (plugin re-creation).
  private var detectionCounter = 0
  private var totalFrameCounter = 0

  init {
    ensureOpenCv()
  }

  fun processImage(mediaImage: Image, arguments: Map<String, Any>?): HashMap<String, Any?>? {
    val data = HashMap<String, Any?>()
    val srcWidth = mediaImage.width
    val srcHeight = mediaImage.height

    // Declare all per-frame Mats here so they can be released in finally.
    var gray: Mat? = null
    var img: Mat? = null
    var normalized: Mat? = null
    var screenEdges: Mat? = null
    var detailEdges: Mat? = null
    var screenHierarchy: Mat? = null
    var H: Mat? = null
    var warped: Mat? = null

    try {
      val templateBoxes = ScreenDetection.parseTemplate(arguments, pluginOptions)
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

      val roiOuterArg = Utils.getMap(arguments, "roiOuter") ?: mapOf(
        "x" to 0.10, "y" to 0.05, "width" to 0.80, "height" to 0.90
      )
      val roiInnerArg = Utils.getMap(arguments, "roiInner") ?: mapOf(
        "x" to 0.30, "y" to 0.20, "width" to 0.45, "height" to 0.60
      )
      val minAspectW = Utils.getInt(arguments, "minAspectW", 3)
      val minAspectH = Utils.getInt(arguments, "minAspectH", 4)
      val minAspect = if (minAspectH != 0) minAspectW.toDouble() / minAspectH.toDouble() else 0.75

      gray = ImageProcessing.yPlaneToGrayMat(mediaImage)
      val rotate90CW = Utils.getBool(arguments, "rotate90CW", Utils.getBool(pluginOptions, "rotate90CW", false))

      img = if (rotate90CW) {
        val rotated = Mat()
        Core.rotate(gray, rotated, Core.ROTATE_90_CLOCKWISE)
        rotated
      } else {
        gray
      }
      val frameW = img!!.width()
      val frameH = img!!.height()

      if (BuildConfig.DEBUG) {
        DebugHttpStreamer.updateMatGray("gray", gray, 60)
        DebugHttpStreamer.updateMatGray("rotated", img, 60)
      }

      val roiOuterPx = Utils.enforceMinAspect(Utils.normRectToPx(roiOuterArg, frameW, frameH), frameW, frameH, minAspect)
      val roiInnerPx = Utils.enforceMinAspect(Utils.normRectToPx(roiInnerArg, frameW, frameH), frameW, frameH, minAspect)

      normalized = ImageProcessing.preprocessImage(img!!)

      val edgePair = ImageProcessing.createEdgeMaps(normalized!!)
      screenEdges = edgePair.first
      detailEdges = edgePair.second

      if (BuildConfig.DEBUG && totalFrameCounter % 3 == 0) {
        DebugHttpStreamer.updateMatGray("normalized", normalized, 60)
        DebugHttpStreamer.updateMatGray("screenEdges", screenEdges, 60)
        DebugHttpStreamer.updateMatGray("detailEdges", detailEdges, 60)
      }

      val screenContours = ArrayList<org.opencv.core.MatOfPoint>()
      screenHierarchy = Mat()
      Imgproc.findContours(screenEdges, screenContours, screenHierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)

      val screenContourRects = ImageProcessing.findContourRects(screenEdges!!)

      if (BuildConfig.DEBUG && totalFrameCounter % 5 == 0) {
        val debugScreenRects = ImageProcessing.drawDebugRects(img, screenContourRects, Scalar(0.0, 255.0, 0.0), 3)
        DebugHttpStreamer.updateMatColor("screenContourRects", debugScreenRects, 60)
        debugScreenRects.release()
      }

      val (bestRect, bestQuad, bestScore) = ScreenDetection.findBestScreenCandidate(
        screenContours, roiInnerPx, roiOuterPx, frameW, frameH
      )

      // Detail contours are only needed for DEBUG visualization — skip in release builds.
      val contourRects = if (BuildConfig.DEBUG) ImageProcessing.findContourRects(detailEdges!!) else emptyList()

      if (BuildConfig.DEBUG && totalFrameCounter % 5 == 0) {
        val debugDetailRects = ImageProcessing.drawDebugRects(img, contourRects, Scalar(255.0, 0.0, 0.0), 2)
        DebugHttpStreamer.updateMatColor("detailContourRects", debugDetailRects, 60)
        debugDetailRects.release()
      }

      if (bestQuad != null) {
        H = ScreenDetection.buildScreenHomography(bestQuad, templateTargetW, templateTargetH)
      }

      if (H != null && !H.empty()) {
        warped = Mat(outputH, outputW, org.opencv.core.CvType.CV_8UC1)
        val Hinv = H.inv()
        Imgproc.warpPerspective(img, warped, Hinv, Size(outputW.toDouble(), outputH.toDouble()))
        Hinv.release()
        if (BuildConfig.DEBUG) {
          DebugHttpStreamer.updateMatGray("warped", warped, 80)
        }
      }

      var accuracy = 0.0
      val matchedArr = ArrayList<Any?>()
      val templatePixelRectsArr = ArrayList<HashMap<String, Any?>>()

      if (warped != null && templateBoxes != null && templateBoxes.isNotEmpty()) {
        val (acc, matched, pixelRects) = ScreenDetection.matchTemplateBoxesInWarped(
          templateBoxes, warped!!, outputW, outputH,
          paddingPercent = 1.0,
          minScoreForMatch = 0.4
        )
        accuracy = acc
        templatePixelRectsArr.addAll(pixelRects)
        matchedArr.addAll(matched)

        if (BuildConfig.DEBUG && totalFrameCounter % 7 == 0 && H != null && !H.empty()) {
          val matchedBoxesDebug = ImageProcessing.drawMatchedBoxesOnCameraFeed(
            img, matchedArr, templateBoxes, outputW, outputH, H!!
          )
          DebugHttpStreamer.updateMatColor("matchedBoxes", matchedBoxesDebug, 85)
          matchedBoxesDebug.release()

          val matchedCount = matchedArr.count { it != null }
          val totalCount = templateBoxes.size
          Log.d("ScreenDetector", "Matched boxes visualization: $matchedCount/$totalCount boxes detected (accuracy: ${String.format("%.2f", accuracy * 100)}%)")

          val debugTemplateBoxes = ImageProcessing.drawDebugTemplateBoxes(img, templateBoxes, H!!, templateTargetW, templateTargetH, Scalar(0.0, 0.0, 255.0), 2)
          DebugHttpStreamer.updateMatColor("templateBoxes", debugTemplateBoxes, 80)
          debugTemplateBoxes.release()

          val combinedDebug = ImageProcessing.createCombinedDebugVisualization(img, screenEdges!!, detailEdges!!, screenContourRects, contourRects, templateBoxes, H!!, templateTargetW, templateTargetH)
          DebugHttpStreamer.updateMatColor("combinedDebug", combinedDebug, 80)
          combinedDebug.release()
        }
      }

      val detected = (H != null && !H.empty()) && (
        if (templateBoxes != null && templateBoxes.isNotEmpty()) accuracy >= accuracyThreshold else true
      )

      totalFrameCounter++
      if (detected) detectionCounter++

      var warpedImageBase64: String? = null
      if (detected && returnWarpedImage && warped != null) {
        val Hinv = H!!.inv()
        warpedImageBase64 = ImageProcessing.warpAndEncodeGrayToBase64(img!!, Hinv, outputW, outputH, imageQuality)
        Hinv.release()
        warpedImageBase64?.let {
          val preview = if (it.length > 120) it.substring(0, 120) + "…" else it
          Log.d("ScreenDetector", "warped image len=${it.length}, preview=$preview")
        }
      }

      if (detected && runOcr && ocrBoxes != null && ocrBoxes.isNotEmpty()) {
        val ocrWarped = warped ?: if (H != null && !H.empty()) {
          val Hinv = H!!.inv()
          val temp = Mat(outputH, outputW, org.opencv.core.CvType.CV_8UC1)
          Imgproc.warpPerspective(img!!, temp, Hinv, Size(outputW.toDouble(), outputH.toDouble()))
          Hinv.release()
          temp
        } else null

        if (ocrWarped != null && H != null && !H.empty()) {
          if (BuildConfig.DEBUG && totalFrameCounter % 10 == 0) {
            val ocrDebugCameraFeed = ImageProcessing.drawOcrTemplateBoxesOnCameraFeed(
              img!!, ocrBoxes, outputW, outputH, H!!
            )
            DebugHttpStreamer.updateMatColor("ocrTemplateBoxes", ocrDebugCameraFeed, 60)
            ocrDebugCameraFeed.release()

            val ocrDebugWarped = ImageProcessing.drawOcrTemplateBoxes(ocrWarped, ocrBoxes, outputW, outputH)
            DebugHttpStreamer.updateMatColor("ocrTemplateBoxesWarped", ocrDebugWarped, 60)
            ocrDebugWarped.release()
          }

          val ocrResults = OcrProcessor.processOcrBoxes(ocrWarped, ocrBoxes, outputW, outputH)
          data["ocr"] = hashMapOf("boxes" to ocrResults)

          if (ocrWarped != warped) {
            ocrWarped.release()
          }
        }
      }

      val screenData = ScreenDetection.createScreenData(
        detected, accuracy, accuracyThreshold, detectionCounter, totalFrameCounter,
        frameW, frameH, srcWidth, srcHeight,
        templateTargetW, templateTargetH, H, null, roiOuterPx, roiInnerPx,
        bestRect, templatePixelRectsArr, matchedArr,
        warpedImageBase64, outputW, outputH
      )

      if (BuildConfig.DEBUG) {
        try {
          val overlayColor = ImageProcessing.createOverlayImage(
            img!!, detected, detectionCounter, totalFrameCounter,
            roiOuterPx, roiInnerPx, bestQuad, templateBoxes, H, matchedArr
          )

          if (H != null && !H.empty() && templateBoxes != null && matchedArr.isNotEmpty()) {
            val matchedOverlay = ImageProcessing.drawMatchedBoxesOnCameraFeed(
              overlayColor, matchedArr, templateBoxes, outputW, outputH, H!!
            )
            DebugHttpStreamer.updateMatColor("overlay", matchedOverlay, 90)
            matchedOverlay.release()
            overlayColor.release()
          } else {
            DebugHttpStreamer.updateMatColor("overlay", overlayColor, 90)
            overlayColor.release()
          }
        } catch (_: Throwable) {}
      }

      data["screen"] = screenData
      return data
    } catch (e: Exception) {
      Log.e("ScreenDetector", "Screen detection error: ${e.localizedMessage}", e)
      return null
    } finally {
      // Release frame Mats — img may alias gray when no rotation is applied.
      if (img !== gray) img?.release()
      gray?.release()
      normalized?.release()
      screenEdges?.release()
      detailEdges?.release()
      screenHierarchy?.release()
      H?.release()
      warped?.release()
    }
  }

  companion object {
    @Volatile private var openCvReady = false
    @Volatile private var debugStarted = false

    /**
     * Lazily initialize OpenCV (and, in debug builds, the debug HTTP streamer)
     * the first time a processor is created. Previously this lived in the
     * ReactPackage init, which no longer drives plugin registration under the
     * VisionCamera v5 / Nitro autolinking model.
     */
    @Synchronized
    fun ensureOpenCv() {
      if (!openCvReady) {
        try {
          val ok = org.opencv.android.OpenCVLoader.initLocal()
          Log.d("ScreenDetector", "OpenCV initLocal: $ok")
        } catch (t: Throwable) {
          Log.e("ScreenDetector", "OpenCV init failed: ${t.message}", t)
        }
        openCvReady = true
      }
      if (BuildConfig.DEBUG && !debugStarted) {
        try {
          DebugHttpStreamer.start(8082)
        } catch (_: Throwable) {}
        debugStarted = true
      }
    }
  }
}
