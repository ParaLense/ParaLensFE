package com.bearblock.visioncameraocr.visioncameraocr

import android.graphics.Point
import android.graphics.Rect
import android.media.Image
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

    // Optional normalized crop support from arguments: { crop: { x, y, width, height } }
    try {
      val cropArg = (arguments?.get("crop") as? Map<*, *>)
      if (cropArg != null) {
        val imgW = mediaImage.width
        val imgH = mediaImage.height

        val x = (cropArg["x"] as? Number)?.toFloat() ?: 0f
        val y = (cropArg["y"] as? Number)?.toFloat() ?: 0f
        val w = (cropArg["width"] as? Number)?.toFloat() ?: 1f
        val h = (cropArg["height"] as? Number)?.toFloat() ?: 1f

        val left = (x * imgW).toInt().coerceIn(0, imgW)
        val top = (y * imgH).toInt().coerceIn(0, imgH)
        val right = ((x + w) * imgW).toInt().coerceIn(0, imgW)
        val bottom = ((y + h) * imgH).toInt().coerceIn(0, imgH)

        if (right > left && bottom > top) {
          val cropRect = Rect(left, top, right, bottom)
          mediaImage.setCropRect(cropRect)
          Log.d("OcrDetector", "Applied crop rect: $cropRect on ${imgW}x${imgH}")
        }
      }
    } catch (e: Exception) {
      Log.w("OcrDetector", "Failed to apply crop argument: ${e.localizedMessage}")
    }

    val image = InputImage.fromMediaImage(mediaImage, frame.imageProxy.imageInfo.rotationDegrees)

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
