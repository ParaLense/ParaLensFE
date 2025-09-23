package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

// Frame-Processor: Erkennung anhand von Template-Boxen + optionale Bild-Rückgabe (entzerrt als Base64 JPEG)
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

// OpenCV
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.calib3d.Calib3d
import org.opencv.android.Utils

// Zusätzliche Android-Imports fürs JPEG-Encoding
import android.graphics.Bitmap
import android.util.Base64
import java.io.ByteArrayOutputStream

class ScreenDetectorFrameProcessorPlugin(
  proxy: VisionCameraProxy,
  options: Map<String, Any>?
) : FrameProcessorPlugin() {

  private val pluginOptions = options

  // --------------------------
  // Hilfsfunktionen: Options-Parsing
  // --------------------------
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
      is String -> v.equals("true", ignoreCase = true)
      else -> def
    }
  }

  private fun getList(map: Map<String, Any>?, key: String): List<Any>? {
    if (map == null) return null
    val v = map[key] ?: return null
    @Suppress("UNCHECKED_CAST")
    return v as? List<Any>
  }

  // Template-Box (Prozentwerte relativ zur virtuellen Template-Fläche)
  private data class Box(val id: String?, val x: Double, val y: Double, val w: Double, val h: Double)

  // Liest die Template-Boxen aus arguments oder pluginOptions
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
      if (x != null && y != null && w != null && h != null) {
        out.add(Box(id, x, y, w, h))
      }
    }
    return if (out.isEmpty()) null else out
  }

  // IoU-Metrik zwischen zwei Rechtecken (x,y,w,h)
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

  // Rechteck -> 4 Eckpunkte in Ziel-Bildebene
  private fun rectToPtsXYWH(r: IntArray): Array<Point> {
    val x = r[0].toDouble(); val y = r[1].toDouble()
    val w = r[2].toDouble(); val h = r[3].toDouble()
    return arrayOf(
      Point(x, y),
      Point(x + w, y),
      Point(x + w, y + h),
      Point(x, y + h)
    )
  }

  // Prozent-Box -> 4 Eckpunkte in virtueller Template-Fläche
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

  // Erzeugt Homographie aus den übereinstimmenden Boxenpunkten (RANSAC)
  private fun buildHomography(
    templateBoxes: List<Box>,
    matches: Array<IntArray?>,
    templateW: Int,
    templateH: Int
  ): Pair<Mat?, Mat?> {
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

  // Extrahiert das Graubild direkt aus der Y-Plane (ohne teure Konvertierung)
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
        var idx = 0
        var col = 0
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

  // Entzerrt das Graubild mit H auf Zielgröße und encodiert als Base64-JPEG
  private fun warpAndEncodeGrayToBase64(gray: Mat, H: Mat, outW: Int, outH: Int, jpegQuality: Int): String? {
    return try {
      val warped = Mat(outH, outW, CvType.CV_8UC1)
      Imgproc.warpPerspective(gray, warped, H, Size(outW.toDouble(), outH.toDouble()))
      // Für Bitmap in RGBA umwandeln und als JPEG komprimieren
      val rgba = Mat()
      Imgproc.cvtColor(warped, rgba, Imgproc.COLOR_GRAY2RGBA)
      val bmp = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
      Utils.matToBitmap(rgba, bmp)
      val baos = ByteArrayOutputStream()
      bmp.compress(Bitmap.CompressFormat.JPEG, jpegQuality.coerceIn(0, 100), baos)
      val bytes = baos.toByteArray()
      Base64.encodeToString(bytes, Base64.NO_WRAP)
    } catch (t: Throwable) {
      Log.e("ScreenDetector", "warp/encode failed: ${t.message}", t)
      null
    }
  }

  override fun callback(frame: Frame, arguments: Map<String, Any>?): HashMap<String, Any?>? {
    val data = HashMap<String, Any?>()

    if (pluginOptions != null) {
      Log.d("ScreenDetector", "Plugin options: $pluginOptions")
    }

    val mediaImage: Image = frame.image
    val width = mediaImage.width
    val height = mediaImage.height

    try {
      // 1) Template lesen (Pflicht). Ohne Template -> detected=false
      val templateBoxes = parseTemplate(arguments)
      if (templateBoxes == null) {
        val screenData = HashMap<String, Any?>()
        screenData["width"] = width
        screenData["height"] = height
        screenData["detected"] = false
        data["screen"] = screenData
        return data
      }
      Log.d("ScreenDetector", "Using ${templateBoxes.size} template boxes")
      Log.d("ScreenDetector", "Frame size: ${width}x${height}")

      // 2) Parameter (mit Defaults)
      val screenWidthRatio = getDouble(arguments, "screenWidthRatio", getDouble(pluginOptions, "screenWidthRatio", 1.0))
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

      // 3) Luma (Y-Plane) -> Graubild, Kanten + Konturen extrahieren
      val gray = yPlaneToGrayMat(mediaImage)
      val edges = Mat()
      Imgproc.Canny(gray, edges, 50.0, 150.0)
      val contours = ArrayList<MatOfPoint>()
      val hierarchy = Mat()
      Imgproc.findContours(edges, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)

      // 4) Template-Boxen -> Pixelrechtecke bezogen auf den zentralen Bereich (screenWidthRatio)
      val cropW = (width * screenWidthRatio).toInt()
      val cropX = ((width - cropW) / 2.0).toInt()
      val templateRects = templateBoxes.map { b ->
        val x = (b.x / 100.0 * cropW + cropX).toInt()
        val y = (b.y / 100.0 * height).toInt()
        val wpx = (b.w / 100.0 * cropW).toInt()
        val hpx = (b.h / 100.0 * height).toInt()
        intArrayOf(x, y, wpx, hpx)
      }

      // 4a) ALLE erkannten Rechtecke (Konturen mit 4 Ecken) sammeln
      val approx = MatOfPoint2f()
      val tmp2f = MatOfPoint2f()

      // 4a) ALLE erkannten Rechtecke (Konturen mit 4 Ecken) sammeln
      val allRects = ArrayList<HashMap<String, Any?>>()
      for (cnt in contours) {
        tmp2f.fromArray(*cnt.toArray())
        val perim = Imgproc.arcLength(tmp2f, true)
        Imgproc.approxPolyDP(tmp2f, approx, 0.02 * perim, true)
        if (approx.total().toInt() == 4) {
          val pts = approx.toArray()
          var minX = Double.POSITIVE_INFINITY
          var minY = Double.POSITIVE_INFINITY
          var maxX = Double.NEGATIVE_INFINITY
          var maxY = Double.NEGATIVE_INFINITY
          for (p in pts) {
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
          }
          val x = max(0, minX.toInt())
          val y = max(0, minY.toInt())
          val wpx = min(width - x, (maxX - minX).toInt())
          val hpx = min(height - y, (maxY - minY).toInt())
          if (wpx <= 0 || hpx <= 0) continue
          val rectMap = HashMap<String, Any?>()
          rectMap["x"] = x
          rectMap["y"] = y
          rectMap["w"] = wpx
          rectMap["h"] = hpx
          allRects.add(rectMap)
        }
      }

      // Füge zum Testen ein Rechteck über den gesamten Frame hinzu (als ersten Eintrag)
      run {
        val frameRectMap = HashMap<String, Any?>()
        frameRectMap["x"] = 0
        frameRectMap["y"] = 0
        frameRectMap["w"] = width
        frameRectMap["h"] = height
        allRects.add(0, frameRectMap)
      }

      // 5) Kontur-Rechtecke per IoU dem besten Template zuordnen
      val matched: Array<IntArray?> = arrayOfNulls(templateRects.size)
      for (cnt in contours) {
        tmp2f.fromArray(*cnt.toArray())
        val perim = Imgproc.arcLength(tmp2f, true)
        Imgproc.approxPolyDP(tmp2f, approx, 0.02 * perim, true)
        if (approx.total().toInt() == 4) {
          val pts = approx.toArray()
          var minX = Double.POSITIVE_INFINITY
          var minY = Double.POSITIVE_INFINITY
          var maxX = Double.NEGATIVE_INFINITY
          var maxY = Double.NEGATIVE_INFINITY
          for (p in pts) {
            if (p.x < minX) minX = p.x
            if (p.y < minY) minY = p.y
            if (p.x > maxX) maxX = p.x
            if (p.y > maxY) maxY = p.y
          }
          val x = max(0, minX.toInt())
          val y = max(0, minY.toInt())
          val wpx = min(width - x, (maxX - minX).toInt())
          val hpx = min(height - y, (maxY - minY).toInt())
          if (wpx <= 0 || hpx <= 0) continue
          val rect = intArrayOf(x, y, wpx, hpx)

          var bestIou = 0.0
          var bestIdx = -1
          for (i in templateRects.indices) {
            val score = iou(rect, templateRects[i])
            if (score > bestIou) {
              bestIou = score
              bestIdx = i
            }
          }
          if (bestIdx >= 0 && bestIou > minIouForMatch) {
            matched[bestIdx] = rect
          }
        }
      }

      // 6) Genauigkeit + Homographie berechnen (Template-Ebene bleibt 3:4 Default oder wie vorgegeben)
      val matchedCount = matched.count { it != null }
      val total = matched.size
      val accuracy = if (total > 0) matchedCount.toDouble() / total.toDouble() else 0.0
      val (H, mask) = if (matchedCount >= 1) buildHomography(templateBoxes, matched, templateTargetW, templateTargetH) else Pair(null, null)

      // 7) Ergebnis-Objekt aufbauen (nur Plain Java Collections)
      val screenData = HashMap<String, Any?>()
      screenData["width"] = width
      screenData["height"] = height
      val detected = accuracy >= accuracyThreshold && H != null && !H.empty()
      screenData["detected"] = detected
      screenData["accuracy"] = accuracy
      screenData["accuracy_threshold"] = accuracyThreshold

      // Info: Aspect-Ratio bleibt Teil der API (z.B. für Debug/Zukunft)
      val aspectMap = HashMap<String, Any?>()
      aspectMap["w"] = screenAspectW
      aspectMap["h"] = screenAspectH
      screenData["screen_aspect"] = aspectMap

      val sizeMap = HashMap<String, Any?>()
      sizeMap["w"] = templateTargetW
      sizeMap["h"] = templateTargetH
      screenData["template_target_size"] = sizeMap

      if (H != null && !H.empty()) {
        val rows = H.rows(); val cols = H.cols()
        val hArr = ArrayList<ArrayList<Double>>()
        val buf = DoubleArray(cols)
        for (r in 0 until rows) {
          val rowArr = ArrayList<Double>(cols)
          H.row(r).get(0, 0, buf)
          for (c in 0 until cols) rowArr.add(buf[c])
          hArr.add(rowArr)
        }
        screenData["homography"] = hArr
      } else {
        screenData["homography"] = null
      }

      if (mask != null && !mask.empty()) {
        val maskArr = ArrayList<Int>()
        val mBytes = ByteArray(mask.rows() * mask.cols())
        mask.get(0, 0, mBytes)
        for (b in mBytes) maskArr.add(if (b.toInt() == 0) 0 else 1)
        screenData["homography_inliers_mask"] = maskArr
      } else {
        screenData["homography_inliers_mask"] = null
      }

      val matchedArr = ArrayList<Any?>()
      for (m in matched) {
        if (m == null) matchedArr.add(null) else {
          val mMap = HashMap<String, Any?>()
          mMap["x"] = m[0]; mMap["y"] = m[1]; mMap["w"] = m[2]; mMap["h"] = m[3]
          matchedArr.add(mMap)
        }
      }
      screenData["matched_boxes"] = matchedArr

      val tmplArr = ArrayList<HashMap<String, Any?>>()
      for (b in templateBoxes) {
        val bMap = HashMap<String, Any?>()
        if (b.id != null) bMap["id"] = b.id
        bMap["x"] = b.x; bMap["y"] = b.y
        bMap["width"] = b.w; bMap["height"] = b.h
        tmplArr.add(bMap)
      }
      screenData["template_boxes"] = tmplArr

      // 8) Optional: entzerrtes Bild als Base64-JPEG anhängen
      if (detected && returnWarpedImage && H != null && !H.empty()) {
        val base64 = warpAndEncodeGrayToBase64(gray, H, outputW, outputH, imageQuality)
        if (base64 != null) {
          screenData["image_base64"] = base64
          screenData["image_format"] = "jpeg"
          val imap = HashMap<String, Any?>()
          imap["w"] = outputW
          imap["h"] = outputH
          screenData["image_size"] = imap
        }
      }

      // Füge den Full-Frame-Rect auch separat hinzu, damit er leicht unterscheidbar ist
      run {
        val frameRectMap = HashMap<String, Any?>()
        frameRectMap["x"] = 0
        frameRectMap["y"] = 0
        frameRectMap["w"] = width
        frameRectMap["h"] = height
        screenData["frame_rect"] = frameRectMap
      }

      screenData["all_detected_rects"] = allRects

      data["screen"] = screenData
      return data
    } catch (e: Exception) {
      Log.e("ScreenDetector", "Screen detection error: ${e.localizedMessage}", e)
      return null
    }
  }
}
