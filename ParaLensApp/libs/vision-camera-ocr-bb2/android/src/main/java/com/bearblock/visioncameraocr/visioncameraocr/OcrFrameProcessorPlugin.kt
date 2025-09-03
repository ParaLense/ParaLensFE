package com.bearblock.visioncameraocr.visioncameraocr

import android.graphics.Point
import android.graphics.Rect
import android.media.Image
import android.graphics.ImageFormat
import android.util.Log
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import java.util.HashMap
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.min

class OcrFrameProcessorPlugin(
  proxy: VisionCameraProxy,
  options: Map<String, Any>?
) : FrameProcessorPlugin() {

  private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  private val pluginOptions = options

  override fun callback(frame: Frame, arguments: Map<String, Any>?): HashMap<String, Any>? {
    val data = WritableNativeMap()

    // Log the options for debugging
    if (pluginOptions != null) {
      Log.d("OcrDetector", "Plugin options: $pluginOptions")
      val model = pluginOptions["model"] as? String
      if (model != null) {
        Log.d("OcrDetector", "Using model: $model")
        // TODO: Implement different model options based on 'model' parameter
        // Currently ML Kit only supports DEFAULT_OPTIONS for text recognition
        // Future versions might support different accuracy/speed trade-offs
      }
    }

    val mediaImage: Image = frame.image

    // Compute crop rect (supports screen-space or image-space input) but do NOT call setCropRect on Image.
    // We'll crop the NV21 byte array instead to ensure ML Kit respects the ROI.
    var roiRect: Rect? = null
    try {
      val cropArg = (arguments?.get("crop") as? Map<*, *>)
      val screenArg = (arguments?.get("screen") as? Map<*, *>)
      if (cropArg != null) {
        val imgW = mediaImage.width
        val imgH = mediaImage.height

        val xIn = (cropArg["x"] as? Number)?.toFloat() ?: 0f
        val yIn = (cropArg["y"] as? Number)?.toFloat() ?: 0f
        val wIn = (cropArg["width"] as? Number)?.toFloat() ?: imgW.toFloat()
        val hIn = (cropArg["height"] as? Number)?.toFloat() ?: imgH.toFloat()

        val screenW = (screenArg?.get("width") as? Number)?.toInt()
        val screenH = (screenArg?.get("height") as? Number)?.toInt()

        val rotation = frame.imageProxy.imageInfo.rotationDegrees
        val rotW = if (rotation == 90 || rotation == 270) imgH else imgW
        val rotH = if (rotation == 90 || rotation == 270) imgW else imgH

        var xPix: Int
        var yPix: Int
        var wPix: Int
        var hPix: Int

        if (screenW != null && screenH != null) {
          // Treat crop values as SCREEN pixels. Map to rotated image coordinates using 'cover' scaling.
          val scale = max(screenW.toFloat() / rotW.toFloat(), screenH.toFloat() / rotH.toFloat())
          val dispW = rotW * scale
          val dispH = rotH * scale
          val offX = (screenW - dispW) / 2f
          val offY = (screenH - dispH) / 2f

          val xr = ((xIn - offX) / dispW * rotW).toInt()
          val yr = ((yIn - offY) / dispH * rotH).toInt()
          val wr = (wIn / dispW * rotW).toInt()
          val hr = (hIn / dispH * rotH).toInt()

          // Clamp to rotated bounds
          val rx0 = xr.coerceIn(0, rotW)
          val ry0 = yr.coerceIn(0, rotH)
          val rx1 = (xr + wr).coerceIn(0, rotW)
          val ry1 = (yr + hr).coerceIn(0, rotH)
          val rLeft = min(rx0, rx1)
          val rTop = min(ry0, ry1)
          val rW = max(0, max(rx0, rx1) - rLeft)
          val rH = max(0, max(ry0, ry1) - rTop)

          // Map rotated rectangle to RAW image orientation
          when (rotation) {
            0 -> {
              xPix = rLeft
              yPix = rTop
              wPix = rW
              hPix = rH
            }
            90 -> {
              // 90 CW: (x_r, y_r, w_r, h_r) -> raw: (y_r, imgW - (x_r + w_r), h_r, w_r)
              xPix = rTop
              yPix = imgW - (rLeft + rW)
              wPix = rH
              hPix = rW
            }
            180 -> {
              xPix = imgW - (rLeft + rW)
              yPix = imgH - (rTop + rH)
              wPix = rW
              hPix = rH
            }
            270 -> {
              // 270 CW (90 CCW): (x_r, y_r, w_r, h_r) -> raw: (imgH - (y_r + h_r), x_r, h_r, w_r)
              xPix = imgH - (rTop + rH)
              yPix = rLeft
              wPix = rH
              hPix = rW
            }
            else -> {
              xPix = rLeft
              yPix = rTop
              wPix = rW
              hPix = rH
            }
          }
        } else {
          // Treat crop values as IMAGE pixels (legacy behavior)
          xPix = xIn.toInt()
          yPix = yIn.toInt()
          wPix = wIn.toInt()
          hPix = hIn.toInt()
        }

        var left = xPix.coerceIn(0, imgW - 1)
        var top = yPix.coerceIn(0, imgH - 1)
        var wPx = wPix
        var hPx = hPix

        if (wPx <= 0) wPx = imgW - left
        if (hPx <= 0) hPx = imgH - top

        wPx = wPx.coerceIn(2, imgW - left)
        hPx = hPx.coerceIn(2, imgH - top)

        // Ensure even-aligned ROI for chroma subsampling (NV21 requires even coords/dimensions)
        if (left % 2 != 0) left = (left - 1).coerceAtLeast(0)
        if (top % 2 != 0) top = (top - 1).coerceAtLeast(0)
        if (wPx % 2 != 0) wPx -= 1
        if (hPx % 2 != 0) hPx -= 1

        wPx = wPx.coerceIn(2, imgW - left)
        hPx = hPx.coerceIn(2, imgH - top)

        val right = (left + wPx).coerceAtMost(imgW)
        val bottom = (top + hPx).coerceAtMost(imgH)

        if (right > left && bottom > top && (right - left) >= 2 && (bottom - top) >= 2) {
          roiRect = Rect(left, top, right, bottom)
          Log.d("OcrDetector", "Computed ROI (img space): $roiRect from input x=$xIn y=$yIn w=$wIn h=$hIn screen=${screenW}x${screenH} rot=$rotation img=${imgW}x${imgH}")
        }
      }
    } catch (e: Exception) {
      Log.w("OcrDetector", "Failed to parse crop argument: ${e.localizedMessage}")
    }

    val width = mediaImage.width
    val height = mediaImage.height

    val nv21: ByteArray = try {
      yuv420888ToNv21(mediaImage)
    } catch (e: Exception) {
      Log.e("OcrDetector", "Failed YUV_420_888 to NV21 conversion: ${e.localizedMessage}")
      return null
    }

    val image: InputImage = try {
      if (roiRect != null) {
        val crop = cropNv21(nv21, width, height, roiRect!!)
        InputImage.fromByteArray(
          crop,
          roiRect!!.width(),
          roiRect!!.height(),
          frame.imageProxy.imageInfo.rotationDegrees,
          ImageFormat.NV21
        )
      } else {
        InputImage.fromByteArray(
          nv21,
          width,
          height,
          frame.imageProxy.imageInfo.rotationDegrees,
          ImageFormat.NV21
        )
      }
    } catch (e: Exception) {
      Log.e("OcrDetector", "Failed to build InputImage: ${e.localizedMessage}")
      return null
    }

    return try {
      val visionText: Text = Tasks.await(recognizer.process(image))

      if (visionText.text.isEmpty()) {
        @Suppress("UNCHECKED_CAST")
        return WritableNativeMap().toHashMap() as HashMap<String, Any>
      }

      data.putString("text", visionText.text)

      @Suppress("UNCHECKED_CAST")
      data.toHashMap() as HashMap<String, Any>
    } catch (e: Exception) {
      Log.e("OcrDetector", "OCR recognition error: ${e.localizedMessage}")
      null
    }
  }
}

// Convert YUV_420_888 Image to NV21 ByteArray (Y + interleaved VU)
private fun yuv420888ToNv21(image: Image): ByteArray {
  val width = image.width
  val height = image.height

  val yPlane = image.planes[0]
  val uPlane = image.planes[1]
  val vPlane = image.planes[2]

  val ySize = width * height
  val uvSize = ySize / 2
  val out = ByteArray(ySize + uvSize)

  // Copy Y plane
  copyPlaneToArray(
    plane = yPlane,
    width = width,
    height = height,
    pixelStride = yPlane.pixelStride,
    rowStride = yPlane.rowStride,
    out = out,
    outOffset = 0,
    outPixelStride = 1
  )

  // Interleave V and U for NV21
  val outOffsetUv = ySize
  val uBuffer = uPlane.buffer.duplicate()
  val vBuffer = vPlane.buffer.duplicate()
  val uRowStride = uPlane.rowStride
  val vRowStride = vPlane.rowStride
  val uPixelStride = uPlane.pixelStride
  val vPixelStride = vPlane.pixelStride

  var outputIndex = outOffsetUv
  val chromaHeight = height / 2
  val chromaWidth = width / 2
  for (row in 0 until chromaHeight) {
    var uIndex = row * uRowStride
    var vIndex = row * vRowStride
    for (col in 0 until chromaWidth) {
      val v = vBuffer.get(vIndex)
      val u = uBuffer.get(uIndex)
      out[outputIndex++] = v
      out[outputIndex++] = u
      vIndex += vPixelStride
      uIndex += uPixelStride
    }
  }

  return out
}

// Helper to copy a single plane accounting for row/pixel stride
private fun copyPlaneToArray(
  plane: Image.Plane,
  width: Int,
  height: Int,
  pixelStride: Int,
  rowStride: Int,
  out: ByteArray,
  outOffset: Int,
  outPixelStride: Int
) {
  val buffer = plane.buffer.duplicate()
  var outputIndex = outOffset
  if (pixelStride == 1 && rowStride == width) {
    // Fast path
    buffer.get(out, outputIndex, width * height)
    return
  }
  val row = ByteArray(rowStride)
  for (rowIndex in 0 until height) {
    val rowStart = rowIndex * rowStride
    buffer.position(rowStart)
    buffer.get(row, 0, rowStride.coerceAtMost(buffer.remaining()))
    var colIndex = 0
    while (colIndex < width) {
      out[outputIndex] = row[colIndex * pixelStride]
      outputIndex += outPixelStride
      colIndex += 1
    }
  }
}

// Crop an NV21 byte array to the provided even-aligned Rect
private fun cropNv21(src: ByteArray, imageWidth: Int, imageHeight: Int, rect: Rect): ByteArray {
  val left = rect.left
  val top = rect.top
  val width = rect.width()
  val height = rect.height()

  val ySizeSrc = imageWidth * imageHeight
  val ySizeDst = width * height
  val uvSizeDst = ySizeDst / 2
  val out = ByteArray(ySizeDst + uvSizeDst)

  // Copy Y plane
  var destIndex = 0
  var srcIndex: Int
  for (row in 0 until height) {
    srcIndex = (top + row) * imageWidth + left
    System.arraycopy(src, srcIndex, out, destIndex, width)
    destIndex += width
  }

  // Copy interleaved VU plane
  val srcUvStart = ySizeSrc
  val dstUvStart = ySizeDst
  destIndex = dstUvStart
  val srcTopUv = top / 2
  val srcLeftUv = left
  val uvRowCount = height / 2
  for (row in 0 until uvRowCount) {
    srcIndex = srcUvStart + (srcTopUv + row) * imageWidth + srcLeftUv
    System.arraycopy(src, srcIndex, out, destIndex, width)
    destIndex += width
  }

  return out
}
