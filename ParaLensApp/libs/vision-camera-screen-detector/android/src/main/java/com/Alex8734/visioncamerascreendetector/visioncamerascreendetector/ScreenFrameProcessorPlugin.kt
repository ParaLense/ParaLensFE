package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import android.media.Image
import android.util.Log
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import java.util.HashMap
import java.util.ArrayList
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.min
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.calib3d.Calib3d
import org.opencv.android.Utils
import org.opencv.core.Core
import android.graphics.Bitmap
import android.util.Base64
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.ByteArrayOutputStream
import org.opencv.core.Scalar
// Debug Streamer (falls vorhanden)
import com.alex8734.visioncamerascreendetector.visioncamerascreendetector.DebugHttpStreamer

class ScreenDetectorFrameProcessorPlugin(
  proxy: VisionCameraProxy,
  options: Map<String, Any>?
) : FrameProcessorPlugin() {
  private val pluginOptions = options
  private val textRecognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }
  
  companion object {
    private var detectionCounter = 0
    private var totalFrameCounter = 0
  }

  // --- Option Helpers ---
  private fun getDouble(map: Map<String, Any>?, key: String, def: Double): Double {
    if (map == null) return def
    val v = map[key] ?: return def
    return when (v) {
      is Number -> v.toDouble()
      is String -> v.toDoubleOrNull() ?: def
      else -> def
    }
  }
  private fun getInt(map: Map<String, Any>?, key: String, def: Int): Int {
    if (map == null) return def
    val v = map[key] ?: return def
    return when (v) {
      is Number -> v.toInt()
      is String -> v.toIntOrNull() ?: def
      else -> def
    }
  }
  private fun getBool(map: Map<String, Any>?, key: String, def: Boolean): Boolean {
    if (map == null) return def
    val v = map[key] ?: return def
    return when (v) {
      is Boolean -> v
      is Number -> v.toInt() != 0
      is String -> v.equals("true", true)
      else -> def
    }
  }
  private fun getList(map: Map<String, Any>?, key: String): List<Any>? {
    if (map == null) return null
    val v = map[key] ?: return null
    @Suppress("UNCHECKED_CAST")
    return v as? List<Any>
  }
  private fun getMap(map: Map<String, Any>?, key: String): Map<String, Any>? {
    if (map == null) return null
    val v = map[key] ?: return null
    @Suppress("UNCHECKED_CAST")
    return v as? Map<String, Any>
  }

  private data class Box(val id: String?, val x: Double, val y: Double, val w: Double, val h: Double)
  private data class OcrBox(
    val id: String,
    val x: Double,
    val y: Double,
    val w: Double,
    val h: Double,
    val type: String?,
    val options: Map<String, Any>?
  )

  private fun parseTemplate(argMap: Map<String, Any>?): List<Box>? {
    val src = getList(argMap, "template") ?: getList(pluginOptions, "template") ?: return null
    val out = mutableListOf<Box>()
    for (e in src) {
      val m = e as? Map<*, *> ?: continue
      val id = (m["id"] as? String) ?: m["id"]?.toString()
      val x = (m["x"] as? Number)?.toDouble() ?: (m["x"] as? String)?.toDoubleOrNull()
      val y = (m["y"] as? Number)?.toDouble() ?: (m["y"] as? String)?.toDoubleOrNull()
      val w = (m["width"] as? Number)?.toDouble() ?: (m["width"] as? String)?.toDoubleOrNull()
      val h = (m["height"] as? Number)?.toDouble() ?: (m["height"] as? String)?.toDoubleOrNull()
      if (x != null && y != null && w != null && h != null) out.add(Box(id, x, y, w, h))
    }
    return if (out.isEmpty()) null else out
  }

  private fun parseOcrTemplate(argMap: Map<String, Any>?): List<OcrBox>? {
    val src = getList(argMap, "ocrTemplate") ?: return null
    val out = mutableListOf<OcrBox>()
    for (e in src) {
      val m = e as? Map<*, *> ?: continue
      val id = (m["id"] as? String) ?: m["id"]?.toString() ?: continue
      val x = (m["x"] as? Number)?.toDouble() ?: (m["x"] as? String)?.toDoubleOrNull()
      val y = (m["y"] as? Number)?.toDouble() ?: (m["y"] as? String)?.toDoubleOrNull()
      val w = (m["width"] as? Number)?.toDouble() ?: (m["width"] as? String)?.toDoubleOrNull()
      val h = (m["height"] as? Number)?.toDouble() ?: (m["height"] as? String)?.toDoubleOrNull()
      val type = m["type"] as? String
      @Suppress("UNCHECKED_CAST")
      val options = m["options"] as? Map<String, Any>
      if (x != null && y != null && w != null && h != null) out.add(OcrBox(id, x, y, w, h, type, options))
    }
    return if (out.isEmpty()) null else out
  }

  private fun iou(a: IntArray, b: IntArray): Double {
    val xA = max(a[0], b[0])
    val yA = max(a[1], b[1])
    val xB = min(a[0] + a[2], b[0] + b[2])
    val yB = min(a[1] + a[3], b[1] + b[3])
    val interW = max(0, xB - xA)
    val interH = max(0, yB - yA)
    val interArea = interW * interH
    val areaA = a[2] * a[3]
    val areaB = b[2] * b[3]
    val union = areaA + areaB - interArea
    return if (union > 0) interArea.toDouble() / union.toDouble() else 0.0
  }

  private fun rectToPtsXYWH(r: IntArray): Array<Point> {
    val x = r[0].toDouble(); val y = r[1].toDouble(); val w = r[2].toDouble(); val h = r[3].toDouble()
    return arrayOf(
      Point(x, y),
      Point(x + w, y),
      Point(x + w, y + h),
      Point(x, y + h)
    )
  }
  private fun orderQuad(pts: Array<Point>): Array<Point> {
    // Order by sum/diff like TL (min sum), TR (min diff), BR (max sum), BL (max diff)
    // Order points to match the canonical template orientation
    // Find centroid
    val cx = pts.map { it.x }.average()
    val cy = pts.map { it.y }.average()
    
    // Separate into left/right based on x-coordinate
    val (left, right) = pts.partition { it.x < cx }
    
    // Sort left points by y (top to bottom)
    val leftSorted = left.sortedBy { it.y }
    val tl = if (leftSorted.isNotEmpty()) leftSorted[0] else pts[0]
    val bl = if (leftSorted.size > 1) leftSorted[1] else pts[3]
    
    // Sort right points by y (top to bottom)
    val rightSorted = right.sortedBy { it.y }
    val tr = if (rightSorted.isNotEmpty()) rightSorted[0] else pts[1]
    val br = if (rightSorted.size > 1) rightSorted[1] else pts[2]
    
    return arrayOf(tl, tr, br, bl)
  }

  private fun clamp(v: Int, minV: Int, maxV: Int) = Math.max(minV, Math.min(maxV, v))

  private fun normRectToPx(
    rect: Map<String, Any>,
    frameW: Int,
    frameH: Int
  ): IntArray {
    val x = getDouble(rect, "x", 0.0)
    val y = getDouble(rect, "y", 0.0)
    val w = getDouble(rect, "width", 1.0)
    val h = getDouble(rect, "height", 1.0)
    val px = (x * frameW).toInt()
    val py = (y * frameH).toInt()
    val pw = Math.max(1, (w * frameW).toInt())
    val ph = Math.max(1, (h * frameH).toInt())
    return intArrayOf(px, py, pw, ph)
  }

  private fun enforceMinAspect(
    r: IntArray,
    frameW: Int,
    frameH: Int,
    minAspect: Double
  ): IntArray {
    var x = r[0]; var y = r[1]; var w = r[2]; var h = r[3]
    if (w <= 0 || h <= 0) return intArrayOf(x, y, w, h)
    val ratio = w.toDouble() / h.toDouble()
    if (ratio < minAspect) {
      // reduce height to satisfy min aspect, keep center
      val newH = Math.max(1, (w / minAspect).toInt())
      val cy = y + h / 2
      y = clamp(cy - newH / 2, 0, frameH - newH)
      h = newH
    }
    // clamp within frame
    x = clamp(x, 0, Math.max(0, frameW - w))
    y = clamp(y, 0, Math.max(0, frameH - h))
    return intArrayOf(x, y, w, h)
  }

  private fun rectWithinRoi(test: IntArray, inner: IntArray, outer: IntArray, tol: Int = 0): Boolean {
    val tx1 = test[0]; val ty1 = test[1]; val tx2 = test[0] + test[2]; val ty2 = test[1] + test[3]
    val ox1 = outer[0]; val oy1 = outer[1]; val ox2 = outer[0] + outer[2]; val oy2 = outer[1] + outer[3]
    val ix1 = inner[0]; val iy1 = inner[1]; val ix2 = inner[0] + inner[2]; val iy2 = inner[1] + inner[3]

    if (tx1 < ox1 - tol || ty1 < oy1 - tol || tx2 > ox2 + tol || ty2 > oy2 + tol) return false
    if (tx1 > ix1 + tol) return false
    if (ty1 > iy1 + tol) return false
    if (tx2 < ix2 - tol) return false
    if (ty2 < iy2 - tol) return false
    return true
  }
  private fun percentBoxToPts(box: Box, templateW: Int, templateH: Int): Array<Point> {
    val x = box.x / 100.0 * templateW
    val y = box.y / 100.0 * templateH
    val w = box.w / 100.0 * templateW
    val h = box.h / 100.0 * templateH
    return arrayOf(
      Point(x, y),
      Point(x + w, y),
      Point(x + w, y + h),
      Point(x, y + h)
    )
  }
  private fun buildHomography(templateBoxes: List<Box>, matches: Array<IntArray?>, templateW: Int, templateH: Int): Pair<Mat?, Mat?> {
    val dstPtsList = ArrayList<Point>() // canonical template points (destination)
    val srcPtsList = ArrayList<Point>() // observed points from the frame (source)
    for (i in templateBoxes.indices) {
      val observed = matches[i] ?: continue
      percentBoxToPts(templateBoxes[i], templateW, templateH).forEach { dstPtsList.add(it) }
      rectToPtsXYWH(observed).forEach { srcPtsList.add(it) }
    }
    if (srcPtsList.size < 4 || dstPtsList.size < 4) return Pair(null, null)
    val src = MatOfPoint2f().apply { fromList(srcPtsList) }
    val dst = MatOfPoint2f().apply { fromList(dstPtsList) }
    val mask = Mat()
    val H = Calib3d.findHomography(src, dst, Calib3d.RANSAC, 3.0, mask)
    return Pair(H, mask)
  }

  private fun yPlaneToGrayMat(image: Image): Mat {
    val yPlane = image.planes[0]
    val yBuffer: ByteBuffer = yPlane.buffer
    val yRowStride = yPlane.rowStride
    val yPixelStride = yPlane.pixelStride
    val width = image.width
    val height = image.height
    val gray = Mat(height, width, CvType.CV_8UC1)
    val rowBytes = ByteArray(yRowStride)
    var row = 0
    yBuffer.rewind()
    while (row < height) {
      val pos = row * yRowStride
      if (yBuffer.position() != pos) yBuffer.position(pos)
      val length = min(yRowStride, yBuffer.remaining())
      yBuffer.get(rowBytes, 0, length)
      if (yPixelStride == 1) {
        gray.put(row, 0, rowBytes, 0, width)
      } else {
        val tmp = ByteArray(width)
        var idx = 0; var col = 0
        while (col < width && (col * yPixelStride) < length) {
          tmp[idx++] = rowBytes[col * yPixelStride]
          col++
        }
        gray.put(row, 0, tmp)
      }
      row++
    }
    return gray
  }

  private fun warpAndEncodeGrayToBase64(gray: Mat, H: Mat, outW: Int, outH: Int, jpegQuality: Int): String? {
    return try {
      val warped = Mat(outH, outW, CvType.CV_8UC1)
      Imgproc.warpPerspective(gray, warped, H, Size(outW.toDouble(), outH.toDouble()))
      val rgba = Mat()
      Imgproc.cvtColor(warped, rgba, Imgproc.COLOR_GRAY2RGBA)
      val bmp = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
      Utils.matToBitmap(rgba, bmp)
      val baos = ByteArrayOutputStream()
      bmp.compress(Bitmap.CompressFormat.JPEG, jpegQuality.coerceIn(0,100), baos)
      Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
    } catch (t: Throwable) {
      Log.e("ScreenDetector", "warp/encode failed: ${t.message}", t)
      null
    }
  }

  override fun callback(frame: Frame, arguments: Map<String, Any>?): HashMap<String, Any?>? {
    val data = HashMap<String, Any?>()
    val mediaImage: Image = frame.image
    val srcWidth = mediaImage.width
    val srcHeight = mediaImage.height

    try {
      val templateBoxes = parseTemplate(arguments) // optional now

      val screenAspectW = getInt(arguments, "screenAspectW", getInt(pluginOptions, "screenAspectW", 3))
      val screenAspectH = getInt(arguments, "screenAspectH", getInt(pluginOptions, "screenAspectH", 4))
      val runOcr = getBool(arguments, "runOcr", false)
      val ocrBoxes = if (runOcr) parseOcrTemplate(arguments) else null
      val minIouForMatch = getDouble(arguments, "minIouForMatch", getDouble(pluginOptions, "minIouForMatch", 0.30))
      val accuracyThreshold = getDouble(arguments, "accuracyThreshold", getDouble(pluginOptions, "accuracyThreshold", 0.80))
      val templateTargetW = getInt(arguments, "templateTargetW", getInt(pluginOptions, "templateTargetW", 1200))
      val templateTargetH = getInt(arguments, "templateTargetH", getInt(pluginOptions, "templateTargetH", 1600))
      val returnWarpedImage = getBool(arguments, "returnWarpedImage", getBool(pluginOptions, "returnWarpedImage", false))
      val outputW = getInt(arguments, "outputW", templateTargetW)
      val outputH = getInt(arguments, "outputH", templateTargetH)
      val imageQuality = getInt(arguments, "imageQuality", 80)

      // ROI config (normalized 0..1). Defaults similar to Python main2.py
      val roiOuterArg = getMap(arguments, "roiOuter") ?: mapOf(
        "x" to 0.10, "y" to 0.05, "width" to 0.80, "height" to 0.90
      )
      val roiInnerArg = getMap(arguments, "roiInner") ?: mapOf(
        "x" to 0.30, "y" to 0.20, "width" to 0.45, "height" to 0.60
      )
      val minAspectW = getInt(arguments, "minAspectW", 3)
      val minAspectH = getInt(arguments, "minAspectH", 4)
      val minAspect = if (minAspectH != 0) minAspectW.toDouble() / minAspectH.toDouble() else 0.75

      val gray = yPlaneToGrayMat(mediaImage)
      val rotate90CW = getBool(arguments, "rotate90CW", getBool(pluginOptions, "rotate90CW", false))
      
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
      val roiOuterPx = enforceMinAspect(normRectToPx(roiOuterArg, frameW, frameH), frameW, frameH, minAspect)
      val roiInnerPx = enforceMinAspect(normRectToPx(roiInnerArg, frameW, frameH), frameW, frameH, minAspect)

      // Preprocessing for better light handling
      val normalized = Mat()
      val clahe = Imgproc.createCLAHE(2.0, Size(8.0, 8.0))
      
      // Option 1: CLAHE (Contrast Limited Adaptive Histogram Equalization)
      // This helps with uneven lighting
      clahe.apply(img, normalized)
      
      // Option 2: Alternative - Adaptive threshold preprocessing
      // val adaptiveThresh = Mat()
      // Imgproc.adaptiveThreshold(img, adaptiveThresh, 255.0, Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY, 31, 10.0)
      
      // Two-pass approach: different edge detection for screen vs template boxes
      val screenBlur = Mat()
      val detailBlur = Mat()
      
      // For screen detection: stronger blur, adaptive thresholds based on image mean
      Imgproc.GaussianBlur(normalized, screenBlur, Size(5.0, 5.0), 1.5)
      val mean = Core.mean(screenBlur)
      val sigma = 0.33 // lower sigma for screen detection
      val v = mean.`val`[0]
      val lowerScreen = Math.max(0.0, (1.0 - sigma) * v)
      val upperScreen = Math.min(255.0, (1.0 + sigma) * v)
      
      // For detail/template detection: minimal blur, lower thresholds
      Imgproc.GaussianBlur(normalized, detailBlur, Size(3.0, 3.0), 1.0)
      
      // Create two edge maps
      val screenEdges = Mat()
      val detailEdges = Mat()
      
      // Screen edges: for finding the display outline
      Imgproc.Canny(screenBlur, screenEdges, lowerScreen, upperScreen, 3, false)
      
      // Detail edges: for finding template boxes with dynamic thresholds
      val detailMean = Core.mean(detailBlur)
      val detailV = detailMean.`val`[0]
      val detailLower = Math.max(20.0, detailV * 0.3)
      val detailUpper = Math.min(200.0, detailV * 0.9)
      Imgproc.Canny(detailBlur, detailEdges, detailLower, detailUpper, 3, false)
      
      // Optional: Light morphological closing on screen edges to connect gaps
      val kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(3.0, 3.0))
      Imgproc.morphologyEx(screenEdges, screenEdges, Imgproc.MORPH_CLOSE, kernel)
      
      // Debug output
      DebugHttpStreamer.updateMatGray("normalized", normalized, 60)
      DebugHttpStreamer.updateMatGray("screenEdges", screenEdges, 60)
      DebugHttpStreamer.updateMatGray("detailEdges", detailEdges, 60)
      
      // First pass: Find screen using screen edges
      val screenContours = ArrayList<MatOfPoint>()
      val screenHierarchy = Mat()
      Imgproc.findContours(screenEdges, screenContours, screenHierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)

      val approx = MatOfPoint2f()
      val tmp2f = MatOfPoint2f()
      var bestRect: IntArray? = null
      var bestQuad: Array<Point>? = null
      var bestScore = 0.0
      val allRects = ArrayList<HashMap<String, Any?>>()
      
      // First find the best screen candidate
      for (cnt in screenContours) {
        tmp2f.fromArray(*cnt.toArray())
        val perim = Imgproc.arcLength(tmp2f, true)
        Imgproc.approxPolyDP(tmp2f, approx, 0.02 * perim, true)
        if (approx.total().toInt() != 4) continue
        val pts = approx.toArray()
        var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
        var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
        for (p in pts) { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y }
        val x = max(0, minX.toInt()); val y = max(0, minY.toInt())
        val wpx = min(frameW - x, (maxX - minX).toInt()); val hpx = min(frameH - y, (maxY - minY).toInt())
        if (wpx <= 0 || hpx <= 0) continue
        val rect = intArrayOf(x, y, wpx, hpx)
        // collect for debug
        run { val m = HashMap<String, Any?>(); m["x"] = x; m["y"] = y; m["w"] = wpx; m["h"] = hpx; allRects.add(m) }
        if (!rectWithinRoi(rect, roiInnerPx, roiOuterPx, 12)) continue
        val bbox = intArrayOf(x, y, wpx, hpx)
        val score = iou(bbox, bbox) // IoU with itself ~ 1.0, but keep for extensibility
        if (score > bestScore) {
          bestScore = score
          bestRect = rect
          bestQuad = orderQuad(arrayOf(pts[0], pts[1], pts[2], pts[3]))
        }
      }
      
      // Second pass: Find all detail contours for template matching
      val detailContours = ArrayList<MatOfPoint>()
      val detailHierarchy = Mat()
      Imgproc.findContours(detailEdges, detailContours, detailHierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)
      
      val contourRects = ArrayList<IntArray>()
      for (cnt in detailContours) {
        tmp2f.fromArray(*cnt.toArray())
        val perim = Imgproc.arcLength(tmp2f, true)
        Imgproc.approxPolyDP(tmp2f, approx, 0.02 * perim, true)
        if (approx.total().toInt() != 4) continue
        val pts = approx.toArray()
        var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
        var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
        for (p in pts) { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y }
        val x = max(0, minX.toInt()); val y = max(0, minY.toInt())
        val wpx = min(frameW - x, (maxX - minX).toInt()); val hpx = min(frameH - y, (maxY - minY).toInt())
        if (wpx <= 0 || hpx <= 0) continue
        contourRects.add(intArrayOf(x, y, wpx, hpx))
      }

      var H: Mat? = null
      var mask: Mat? = null
      if (bestQuad != null) {
        // Build H as canonical (template) -> image space
        val src = MatOfPoint2f(
          Point(0.0, 0.0),
          Point(templateTargetW.toDouble(), 0.0),
          Point(templateTargetW.toDouble(), templateTargetH.toDouble()),
          Point(0.0, templateTargetH.toDouble())
        )
        val dst = MatOfPoint2f()
        dst.fromArray(*bestQuad!!)
        H = Calib3d.findHomography(src, dst, Calib3d.RANSAC, 3.0)
      }
      // Optional template-abgleich via homography inverse
      var accuracy = 0.0
      val matchedArr = ArrayList<Any?>()
      val templatePixelRectsArr = ArrayList<HashMap<String, Any?>>()
      if (H != null && !H.empty() && templateBoxes != null && templateBoxes.isNotEmpty()) {
        var matches = 0
        for (b in templateBoxes) {
          val pts = MatOfPoint2f(*percentBoxToPts(b, templateTargetW, templateTargetH))
          val proj = MatOfPoint2f()
          // Project canonical template box into image using H (canonical -> image)
          Core.perspectiveTransform(pts, proj, H)
          val arr = proj.toArray()
          var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
          var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
          for (p in arr) { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y }
          val rx = max(0, minX.toInt()); val ry = max(0, minY.toInt())
          val rw = min(frameW - rx, (maxX - minX).toInt()); val rh = min(frameH - ry, (maxY - minY).toInt())
          val rectMap = HashMap<String, Any?>(); rectMap["x"] = rx; rectMap["y"] = ry; rectMap["w"] = rw; rectMap["h"] = rh; templatePixelRectsArr.add(rectMap)

          var best = 0.0; var bestRectForThis: IntArray? = null
          for (cr in contourRects) {
            val sc = iou(intArrayOf(rx, ry, rw, rh), cr)
            if (sc > best) { best = sc; bestRectForThis = cr }
          }
          if (bestRectForThis != null && best >= minIouForMatch) {
            matches += 1
            val mm = HashMap<String, Any?>(); mm["x"] = bestRectForThis[0]; mm["y"] = bestRectForThis[1]; mm["w"] = bestRectForThis[2]; mm["h"] = bestRectForThis[3]
            matchedArr.add(mm)
          } else {
            matchedArr.add(null)
          }
        }
        accuracy = if (templateBoxes.isNotEmpty()) matches.toDouble() / templateBoxes.size.toDouble() else 0.0
      }
      val detected = (H != null && !H.empty()) && (
        if (templateBoxes != null && templateBoxes.isNotEmpty()) accuracy >= accuracyThreshold else true
      )
      
      // Update counters
      totalFrameCounter++
      if (detected) detectionCounter++

      val screenData = HashMap<String, Any?>()
      screenData["width"] = frameW; screenData["height"] = frameH
      screenData["detected"] = detected
      screenData["accuracy"] = accuracy
      screenData["accuracy_threshold"] = accuracyThreshold
      screenData["detection_count"] = detectionCounter
      screenData["total_frames"] = totalFrameCounter
      screenData["detection_rate"] = if (totalFrameCounter > 0) detectionCounter.toDouble() / totalFrameCounter.toDouble() else 0.0
      val origSize = HashMap<String, Any?>(); origSize["w"] = srcWidth; origSize["h"] = srcHeight; screenData["source_frame_size"] = origSize
      val aspect = HashMap<String, Any?>(); aspect["w"] = screenAspectW; aspect["h"] = screenAspectH; screenData["screen_aspect"] = aspect
      val tSize = HashMap<String, Any?>(); tSize["w"] = templateTargetW; tSize["h"] = templateTargetH; screenData["template_target_size"] = tSize

      if (H != null && !H.empty()) {
        val hRows = ArrayList<ArrayList<Double>>(); val buf = DoubleArray(H.cols())
        for (r in 0 until H.rows()) { val rowArr = ArrayList<Double>(H.cols()); H.row(r).get(0,0,buf); for (c in buf.indices) rowArr.add(buf[c]); hRows.add(rowArr) }
        screenData["homography"] = hRows
      } else screenData["homography"] = null

      if (mask != null && !mask.empty()) {
        val mArr = ArrayList<Int>(); val mBytes = ByteArray(mask.rows() * mask.cols()); mask.get(0,0,mBytes); for (b in mBytes) mArr.add(if (b.toInt()==0) 0 else 1); screenData["homography_inliers_mask"] = mArr
      } else screenData["homography_inliers_mask"] = null

      // ROI and candidate info
      val roiOuterMap = HashMap<String, Any?>(); roiOuterMap["x"] = roiOuterPx[0]; roiOuterMap["y"] = roiOuterPx[1]; roiOuterMap["w"] = roiOuterPx[2]; roiOuterMap["h"] = roiOuterPx[3]
      val roiInnerMap = HashMap<String, Any?>(); roiInnerMap["x"] = roiInnerPx[0]; roiInnerMap["y"] = roiInnerPx[1]; roiInnerMap["w"] = roiInnerPx[2]; roiInnerMap["h"] = roiInnerPx[3]
      screenData["roi_outer_px"] = roiOuterMap
      screenData["roi_inner_px"] = roiInnerMap
      if (bestRect != null) {
        val r = bestRect!!
        val br = HashMap<String, Any?>(); br["x"] = r[0]; br["y"] = r[1]; br["w"] = r[2]; br["h"] = r[3]
        screenData["screen_rect"] = br
      }
      screenData["all_detected_rects"] = allRects
      // Expose a template_rect for UI viewport mapping (use outer ROI)
      val templateRect = HashMap<String, Any?>(); templateRect["x"] = roiOuterPx[0]; templateRect["y"] = roiOuterPx[1]; templateRect["w"] = roiOuterPx[2]; templateRect["h"] = roiOuterPx[3]; screenData["template_rect"] = templateRect

      if (templatePixelRectsArr.isNotEmpty()) screenData["template_pixel_boxes"] = templatePixelRectsArr
      if (matchedArr.isNotEmpty()) screenData["matched_boxes"] = matchedArr

      if (detected && returnWarpedImage && H != null && !H.empty()) {
        // Warp image -> canonical using inverse(H)
        val warped = Mat(outputH, outputW, CvType.CV_8UC1)
        Imgproc.warpPerspective(img, warped, H.inv(), Size(outputW.toDouble(), outputH.toDouble()))
        
        // Show warped result in debug stream
        DebugHttpStreamer.updateMatGray("warped", warped, 80)
        
        // Convert to base64 for return
        val base64 = warpAndEncodeGrayToBase64(img, H.inv(), outputW, outputH, imageQuality)
        base64?.let {
          val preview = if (it.length > 120) it.substring(0, 120) + "…" else it
          Log.d("ScreenDetector", "warped image len=${it.length}, preview=$preview")
          screenData["image_base64"] = it
          screenData["image_format"] = "jpeg"
          val imap = HashMap<String, Any?>()
          imap["w"] = outputW
          imap["h"] = outputH
          screenData["image_size"] = imap
        }
      } else if (H != null && !H.empty()) {
        // Even if not returning base64, show warped result in debug for testing
        val warped = Mat(outputH, outputW, CvType.CV_8UC1)
        Imgproc.warpPerspective(img, warped, H.inv(), Size(outputW.toDouble(), outputH.toDouble()))
        DebugHttpStreamer.updateMatGray("warped", warped, 80)
      }

      // --- OCR on warped image (basic scaffold) ---
      if (detected && H != null && !H.empty() && runOcr && ocrBoxes != null && ocrBoxes.isNotEmpty()) {
        val warped = Mat(outputH, outputW, CvType.CV_8UC1)
        Imgproc.warpPerspective(img, warped, H.inv(), Size(outputW.toDouble(), outputH.toDouble()))
        val ocrArr = ArrayList<HashMap<String, Any?>>()
        for (b in ocrBoxes) {
          val rx = ((b.x / 100.0) * outputW).toInt().coerceIn(0, outputW - 1)
          val ry = ((b.y / 100.0) * outputH).toInt().coerceIn(0, outputH - 1)
          val rw = Math.max(1, ((b.w / 100.0) * outputW).toInt())
          val rh = Math.max(1, ((b.h / 100.0) * outputH).toInt())
          val x2 = (rx + rw).coerceAtMost(outputW)
          val y2 = (ry + rh).coerceAtMost(outputH)
          val roi = warped.submat(ry, y2, rx, x2)

          val result = HashMap<String, Any?>()
          result["id"] = b.id
          when (b.type) {
            "checkbox" -> {
              // Simple checkbox heuristic: dark pixel ratio threshold
              val blur = Mat(); Imgproc.GaussianBlur(roi, blur, Size(3.0,3.0), 0.0)
              val th = Mat(); Imgproc.threshold(blur, th, 0.0, 255.0, Imgproc.THRESH_BINARY_INV + Imgproc.THRESH_OTSU)
              val nonZero = Core.countNonZero(th)
              val total = th.rows() * th.cols()
              val ratio = if (total > 0) nonZero.toDouble() / total.toDouble() else 0.0
              val threshold = ((b.options?.get("checkboxThreshold") as? Number)?.toDouble() ?: 0.5).coerceIn(0.05, 0.95)
              val readValue = (b.options?.get("readValue") as? Boolean) ?: false
              val valueBoxId = b.options?.get("valueBoxId") as? String
              
              result["type"] = "checkbox"
              result["checked"] = ratio >= threshold
              result["confidence"] = Math.abs(ratio - threshold)
              
              // If checkbox is checked and readValue is true, also read the associated value
              if (ratio >= threshold && readValue && valueBoxId != null) {
                // Find the associated value box and read it
                val valueBox = ocrBoxes.find { it.id == valueBoxId }
                if (valueBox != null) {
                  val vrx = ((valueBox.x / 100.0) * outputW).toInt().coerceIn(0, outputW - 1)
                  val vry = ((valueBox.y / 100.0) * outputH).toInt().coerceIn(0, outputH - 1)
                  val vrw = Math.max(1, ((valueBox.w / 100.0) * outputW).toInt())
                  val vrh = Math.max(1, ((valueBox.h / 100.0) * outputH).toInt())
                  val vx2 = (vrx + vrw).coerceAtMost(outputW)
                  val vy2 = (vry + vrh).coerceAtMost(outputH)
                  val vroi = warped.submat(vry, vy2, vrx, vx2)
                  
                  try {
                    val vrgba = Mat(); Imgproc.cvtColor(vroi, vrgba, Imgproc.COLOR_GRAY2RGBA)
                    val vbmp = Bitmap.createBitmap(vrgba.cols(), vrgba.rows(), Bitmap.Config.ARGB_8888)
                    Utils.matToBitmap(vrgba, vbmp)
                    val vimage = InputImage.fromBitmap(vbmp, 0)
                    val vtask = textRecognizer.process(vimage)
                    val vvisionText = Tasks.await(vtask)
                    val vtext = vvisionText.text?.trim() ?: ""
                    val vnumText = vtext.replace(',', '.').replace("\n", " ").trim()
                    val vnum = vnumText.toDoubleOrNull()
                    
                    result["valueText"] = if (vtext.isNotEmpty()) vtext else null
                    result["valueNumber"] = vnum
                    result["valueBoxId"] = valueBoxId
                  } catch (t: Throwable) {
                    Log.e("ScreenDetector", "ML Kit OCR for checkbox value failed: ${t.message}", t)
                    result["valueText"] = null
                    result["valueNumber"] = null
                  }
                }
              }
            }
            "scrollbar" -> {
              // Basic knob position via projection along axis
              val orientation = (b.options?.get("orientation") as? String) ?: if (rw >= rh) "horizontal" else "vertical"
              var positionPercent = 0.0
              if (orientation == "horizontal") {
                val proj = Mat()
                Core.reduce(roi, proj, 0, Core.REDUCE_SUM, CvType.CV_64F)
                var maxVal = Double.NEGATIVE_INFINITY; var maxIdx = 0
                val cols = proj.cols(); val buf = DoubleArray(cols)
                proj.get(0, 0, buf)
                for (i in 0 until cols) { val v = buf[i]; if (v > maxVal) { maxVal = v; maxIdx = i } }
                positionPercent = if (cols > 1) (maxIdx.toDouble() / (cols - 1).toDouble()) * 100.0 else 0.0
              } else {
                val proj = Mat()
                Core.reduce(roi, proj, 1, Core.REDUCE_SUM, CvType.CV_64F)
                var maxVal = Double.NEGATIVE_INFINITY; var maxIdx = 0
                val rows = proj.rows(); val buf = DoubleArray(rows)
                proj.get(0, 0, buf)
                for (i in 0 until rows) { val v = buf[i]; if (v > maxVal) { maxVal = v; maxIdx = i } }
                positionPercent = if (rows > 1) (maxIdx.toDouble() / (rows - 1).toDouble()) * 100.0 else 0.0
              }
              result["type"] = "scrollbar"
              result["positionPercent"] = positionPercent
              // Values scanning can be plugged here using options.valuesRegion & options.cells
            }
            else -> {
              // value (text): ML Kit Text Recognition
              result["type"] = "value"
              try {
                val rgba = Mat(); Imgproc.cvtColor(roi, rgba, Imgproc.COLOR_GRAY2RGBA)
                val bmp = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
                Utils.matToBitmap(rgba, bmp)
                val image = InputImage.fromBitmap(bmp, 0)
                val task = textRecognizer.process(image)
                val visionText = Tasks.await(task)
                val text = visionText.text?.trim() ?: ""
                result["text"] = if (text.isNotEmpty()) text else null
                // Try parse number (replace comma)
                val numText = text.replace(',', '.').replace("\n", " ").trim()
                val num = numText.toDoubleOrNull()
                result["number"] = num
                result["confidence"] = if (!text.isNullOrEmpty()) 1.0 else 0.0
              } catch (t: Throwable) {
                Log.e("ScreenDetector", "ML Kit OCR failed: ${t.message}", t)
                result["text"] = null
                result["number"] = null
                result["confidence"] = 0.0
              }
            }
          }
          ocrArr.add(result)
        }
        data["ocr"] = hashMapOf("boxes" to ocrArr)
      }

      try {
        val overlayColor = Mat(); Imgproc.cvtColor(img, overlayColor, Imgproc.COLOR_GRAY2BGR)
        
        // Draw counter text
        val detectionText = "Detections: $detectionCounter / $totalFrameCounter (${String.format("%.1f", screenData["detection_rate"] as Double * 100)}%)"
        val statusText = if (detected) "DETECTED" else "SEARCHING"
        val statusColor = if (detected) Scalar(0.0, 255.0, 0.0) else Scalar(0.0, 0.0, 255.0)
        
        Imgproc.putText(overlayColor, detectionText, Point(10.0, 30.0), Imgproc.FONT_HERSHEY_SIMPLEX, 0.7, Scalar(255.0, 255.0, 255.0), 2)
        Imgproc.putText(overlayColor, statusText, Point(10.0, 60.0), Imgproc.FONT_HERSHEY_SIMPLEX, 0.9, statusColor, 2)
        
        // Draw ROIs
        Imgproc.rectangle(overlayColor, Point(roiOuterPx[0].toDouble(), roiOuterPx[1].toDouble()), Point((roiOuterPx[0]+roiOuterPx[2]).toDouble(), (roiOuterPx[1]+roiOuterPx[3]).toDouble()), Scalar(0.0,0.0,255.0), 2)
        Imgproc.rectangle(overlayColor, Point(roiInnerPx[0].toDouble(), roiInnerPx[1].toDouble()), Point((roiInnerPx[0]+roiInnerPx[2]).toDouble(), (roiInnerPx[1]+roiInnerPx[3]).toDouble()), Scalar(255.0,0.0,0.0), 2)

        // Draw best screen quad if available
        if (bestQuad != null) {
          val q = bestQuad!!
          Imgproc.line(overlayColor, q[0], q[1], Scalar(0.0,255.0,0.0), 2)
          Imgproc.line(overlayColor, q[1], q[2], Scalar(0.0,255.0,0.0), 2)
          Imgproc.line(overlayColor, q[2], q[3], Scalar(0.0,255.0,0.0), 2)
          Imgproc.line(overlayColor, q[3], q[0], Scalar(0.0,255.0,0.0), 2)
        }

        // Project and draw template boxes via H (canonical -> image)
        if (H != null && !H.empty() && templateBoxes != null && templateBoxes.isNotEmpty()) {
          for (b in templateBoxes) {
            val srcPts = MatOfPoint2f(*percentBoxToPts(b, templateTargetW, templateTargetH))
            val projPts = MatOfPoint2f()
            Core.perspectiveTransform(srcPts, projPts, H)
            val arr = projPts.toArray()
            val poly = MatOfPoint(
              Point(arr[0].x, arr[0].y),
              Point(arr[1].x, arr[1].y),
              Point(arr[2].x, arr[2].y),
              Point(arr[3].x, arr[3].y)
            )
            Imgproc.polylines(overlayColor, listOf(poly), true, Scalar(0.0,128.0,255.0), 2)
          }
        }

        // Optionally draw matched rects (green)
        if (matchedArr.isNotEmpty()) {
          for (m in matchedArr) {
            if (m is HashMap<*, *>) {
              val mx = (m["x"] as? Number)?.toInt() ?: continue
              val my = (m["y"] as? Number)?.toInt() ?: continue
              val mw = (m["w"] as? Number)?.toInt() ?: continue
              val mh = (m["h"] as? Number)?.toInt() ?: continue
              Imgproc.rectangle(overlayColor, Point(mx.toDouble(), my.toDouble()), Point((mx+mw).toDouble(), (my+mh).toDouble()), Scalar(0.0,255.0,0.0), 2)
            }
          }
        }

        DebugHttpStreamer.updateMatColor("overlay", overlayColor, 80)
      } catch (_: Throwable) {}

      data["screen"] = screenData
      return data
    } catch (e: Exception) {
      Log.e("ScreenDetector", "Screen detection error: ${e.localizedMessage}", e)
      return null
    }
  }
}
