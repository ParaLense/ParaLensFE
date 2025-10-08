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
import java.io.ByteArrayOutputStream
import org.opencv.core.Scalar
// Debug Streamer (falls vorhanden)
import com.alex8734.visioncamerascreendetector.visioncamerascreendetector.DebugHttpStreamer

class ScreenDetectorFrameProcessorPlugin(
  proxy: VisionCameraProxy,
  options: Map<String, Any>?
) : FrameProcessorPlugin() {
  private val pluginOptions = options

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

  private data class Box(val id: String?, val x: Double, val y: Double, val w: Double, val h: Double)

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
    val srcPtsList = ArrayList<Point>()
    val dstPtsList = ArrayList<Point>()
    for (i in templateBoxes.indices) {
      val m = matches[i] ?: continue
      percentBoxToPts(templateBoxes[i], templateW, templateH).forEach { srcPtsList.add(it) }
      rectToPtsXYWH(m).forEach { dstPtsList.add(it) }
    }
    if (srcPtsList.size < 4) return Pair(null, null)
    val src = MatOfPoint2f(); src.fromList(srcPtsList)
    val dst = MatOfPoint2f(); dst.fromList(dstPtsList)
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
      val templateBoxes = parseTemplate(arguments)
      if (templateBoxes == null) {
        val screenData = HashMap<String, Any?>()
        screenData["width"] = srcWidth
        screenData["height"] = srcHeight
        screenData["detected"] = false
        data["screen"] = screenData
        return data
      }

      val screenWidthRatio = getDouble(arguments, "screenWidthRatio", getDouble(pluginOptions, "screenWidthRatio", 0.80))
      val screenAspectW = getInt(arguments, "screenAspectW", getInt(pluginOptions, "screenAspectW", 3))
      val screenAspectH = getInt(arguments, "screenAspectH", getInt(pluginOptions, "screenAspectH", 4))
      val minIouForMatch = getDouble(arguments, "minIouForMatch", getDouble(pluginOptions, "minIouForMatch", 0.30))
      val accuracyThreshold = getDouble(arguments, "accuracyThreshold", getDouble(pluginOptions, "accuracyThreshold", 0.60))
      val templateTargetW = getInt(arguments, "templateTargetW", getInt(pluginOptions, "templateTargetW", 1200))
      val templateTargetH = getInt(arguments, "templateTargetH", getInt(pluginOptions, "templateTargetH", 1600))
      val returnWarpedImage = getBool(arguments, "returnWarpedImage", getBool(pluginOptions, "returnWarpedImage", false))
      val outputW = getInt(arguments, "outputW", templateTargetW)
      val outputH = getInt(arguments, "outputH", templateTargetH)
      val imageQuality = getInt(arguments, "imageQuality", 80)

      val gray = yPlaneToGrayMat(mediaImage)
      val rotated = Mat()
      Core.rotate(gray, rotated, Core.ROTATE_90_CLOCKWISE)
      val frameW = rotated.cols()
      val frameH = rotated.rows()
      DebugHttpStreamer.updateMatGray("rotated", rotated, 60)

      // Zentriertes Template-Rechteck
      var templW = (frameW * screenWidthRatio).toInt().coerceAtLeast(1)
      var templH = (templW * screenAspectH / screenAspectW.toDouble()).toInt().coerceAtLeast(1)
      if (templH > frameH) {
        val scale = frameH.toDouble() / templH.toDouble()
        templH = frameH
        templW = (templW * scale).toInt().coerceAtLeast(1)
      }
      val templX = (frameW - templW) / 2
      val templY = (frameH - templH) / 2
      val cropW = templW
      val cropX = templX

      val templateRects = templateBoxes.map { b ->
        val x = templX + (b.x / 100.0 * templW).toInt()
        val y = templY + (b.y / 100.0 * templH).toInt()
        val wpx = (b.w / 100.0 * templW).toInt().coerceAtLeast(1)
        val hpx = (b.h / 100.0 * templH).toInt().coerceAtLeast(1)
        intArrayOf(x, y, wpx, hpx)
      }
      val templatePixelRectsArr = ArrayList<HashMap<String, Any?>>()
      for (r in templateRects) {
        val m = HashMap<String, Any?>(); m["x"] = r[0]; m["y"] = r[1]; m["w"] = r[2]; m["h"] = r[3]; templatePixelRectsArr.add(m)
      }

      val edges = Mat()
      Imgproc.Canny(rotated, edges, 50.0, 150.0)
      DebugHttpStreamer.updateMatGray("edges", edges, 60)
      val contours = ArrayList<MatOfPoint>()
      val hierarchy = Mat()
      Imgproc.findContours(edges, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)

      val approx = MatOfPoint2f()
      val tmp2f = MatOfPoint2f()
      val allRects = ArrayList<HashMap<String, Any?>>()
      for (cnt in contours) {
        tmp2f.fromArray(*cnt.toArray())
        val perim = Imgproc.arcLength(tmp2f, true)
        Imgproc.approxPolyDP(tmp2f, approx, 0.02 * perim, true)
        if (approx.total().toInt() == 4) {
          val pts = approx.toArray()
          var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
          var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
          for (p in pts) {
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
          }
          val x = max(0, minX.toInt()); val y = max(0, minY.toInt())
          val wpx = min(frameW - x, (maxX - minX).toInt())
          val hpx = min(frameH - y, (maxY - minY).toInt())
          if (wpx <= 0 || hpx <= 0) continue
          val rectMap = HashMap<String, Any?>(); rectMap["x"] = x; rectMap["y"] = y; rectMap["w"] = wpx; rectMap["h"] = hpx; allRects.add(rectMap)
        }
      }
      run { val fr = HashMap<String, Any?>(); fr["x"] = 0; fr["y"] = 0; fr["w"] = frameW; fr["h"] = frameH; allRects.add(0, fr) }

      val matched: Array<IntArray?> = arrayOfNulls(templateRects.size)
      for (cnt in contours) {
        tmp2f.fromArray(*cnt.toArray())
        val perim = Imgproc.arcLength(tmp2f, true)
        Imgproc.approxPolyDP(tmp2f, approx, 0.02 * perim, true)
        if (approx.total().toInt() == 4) {
          val pts = approx.toArray()
          var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
          var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
          for (p in pts) {
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
          }
          val x = max(0, minX.toInt()); val y = max(0, minY.toInt())
          val wpx = min(frameW - x, (maxX - minX).toInt())
          val hpx = min(frameH - y, (maxY - minY).toInt())
          if (wpx <= 0 || hpx <= 0) continue
          val rect = intArrayOf(x, y, wpx, hpx)
          var bestIou = 0.0; var bestIdx = -1
          for (i in templateRects.indices) {
            val score = iou(rect, templateRects[i])
            if (score > bestIou) { bestIou = score; bestIdx = i }
          }
          if (bestIdx >= 0 && bestIou > minIouForMatch) matched[bestIdx] = rect
        }
      }

      val matchedCount = matched.count { it != null }
      val accuracy = if (templateRects.isNotEmpty()) matchedCount.toDouble() / templateRects.size.toDouble() else 0.0
      val (H, mask) = if (matchedCount >= 1) buildHomography(templateBoxes, matched, templateTargetW, templateTargetH) else Pair(null, null)
      val detected = accuracy >= accuracyThreshold && H != null && !H.empty()

      val screenData = HashMap<String, Any?>()
      screenData["width"] = frameW; screenData["height"] = frameH
      screenData["detected"] = detected
      screenData["accuracy"] = accuracy
      screenData["accuracy_threshold"] = accuracyThreshold
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

      val matchedArr = ArrayList<Any?>(); for (m in matched) { if (m==null) matchedArr.add(null) else { val mm = HashMap<String, Any?>(); mm["x"]=m[0]; mm["y"]=m[1]; mm["w"]=m[2]; mm["h"]=m[3]; matchedArr.add(mm) } }
      screenData["matched_boxes"] = matchedArr
      screenData["template_pixel_boxes"] = templatePixelRectsArr
      val cropInfo = HashMap<String, Any?>(); cropInfo["crop_x"] = cropX; cropInfo["crop_w"] = cropW; cropInfo["screen_width_ratio"] = screenWidthRatio; cropInfo["template_x"] = templX; cropInfo["template_y"] = templY; cropInfo["template_w"] = templW; cropInfo["template_h"] = templH; screenData["crop_info"] = cropInfo
      val templateRect = HashMap<String, Any?>(); templateRect["x"] = templX; templateRect["y"] = templY; templateRect["w"] = templW; templateRect["h"] = templH; screenData["template_rect"] = templateRect

      val tmplArr = ArrayList<HashMap<String, Any?>>(); for (b in templateBoxes) { val bMap = HashMap<String, Any?>(); if (b.id!=null) bMap["id"] = b.id; bMap["x"] = b.x; bMap["y"] = b.y; bMap["width"] = b.w; bMap["height"] = b.h; tmplArr.add(bMap) }; screenData["template_boxes"] = tmplArr

      if (detected && returnWarpedImage && H != null && !H.empty()) {
        val base64 = warpAndEncodeGrayToBase64(rotated, H, outputW, outputH, imageQuality)
        if (base64 != null) { screenData["image_base64"] = base64; screenData["image_format"] = "jpeg"; val imap = HashMap<String, Any?>(); imap["w"] = outputW; imap["h"] = outputH; screenData["image_size"] = imap }
      }

      try {
        val overlayColor = Mat(); Imgproc.cvtColor(rotated, overlayColor, Imgproc.COLOR_GRAY2BGR)
        Imgproc.rectangle(overlayColor, Point(templX.toDouble(), templY.toDouble()), Point((templX+templW).toDouble(), (templY+templH).toDouble()), Scalar(0.0,0.0,255.0), 2)
        for (r in templateRects) Imgproc.rectangle(overlayColor, Point(r[0].toDouble(), r[1].toDouble()), Point((r[0]+r[2]).toDouble(), (r[1]+r[3]).toDouble()), Scalar(255.0,0.0,0.0), 2)
        for (m in matched) if (m!=null) Imgproc.rectangle(overlayColor, Point(m[0].toDouble(), m[1].toDouble()), Point((m[0]+m[2]).toDouble(), (m[1]+m[3]).toDouble()), Scalar(0.0,255.0,0.0), 2)
        DebugHttpStreamer.updateMatColor("overlay", overlayColor, 70)
      } catch (_: Throwable) {}

      data["screen"] = screenData
      return data
    } catch (e: Exception) {
      Log.e("ScreenDetector", "Screen detection error: ${e.localizedMessage}", e)
      return null
    }
  }
}
