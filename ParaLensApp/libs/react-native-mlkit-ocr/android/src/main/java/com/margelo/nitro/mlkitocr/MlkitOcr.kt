package com.margelo.nitro.mlkitocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.YuvImage
import android.graphics.Rect
import android.util.Base64
import com.facebook.proguard.annotations.DoNotStrip
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@DoNotStrip
class MlkitOcr : HybridMlkitOcrSpec() {
  private val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
  
  // MARK: - Static Image OCR Methods
  
  override fun recognizeText(imagePath: String): OcrResult {
    val latch = CountDownLatch(1)
    var ocrResult: OcrResult? = null
    var processingError: Exception? = null
    
    try {
      val file = File(imagePath)
      if (!file.exists()) {
        return OcrResult(
          text = "",
          blocks = emptyArray(),
          success = false,
          error = "Image file not found: $imagePath"
        )
      }
      
      val bitmap = BitmapFactory.decodeFile(imagePath)
      if (bitmap == null) {
        return OcrResult(
          text = "",
          blocks = emptyArray(),
          success = false,
          error = "Failed to decode image from path: $imagePath"
        )
      }
      
      val image = InputImage.fromBitmap(bitmap, 0)
      textRecognizer.process(image)
        .addOnSuccessListener { result ->
          ocrResult = processTextRecognitionResult(result)
          latch.countDown()
        }
        .addOnFailureListener { exception ->
          processingError = exception
          latch.countDown()
        }
      
      latch.await(10, TimeUnit.SECONDS)
      
      if (processingError != null) {
        return OcrResult(
          text = "",
          blocks = emptyArray(),
          success = false,
          error = processingError!!.message ?: "Unknown error occurred"
        )
      }
      
      return ocrResult ?: OcrResult(
        text = "",
        blocks = emptyArray(),
        success = false,
        error = "Failed to process image"
      )
    } catch (e: Exception) {
      return OcrResult(
        text = "",
        blocks = emptyArray(),
        success = false,
        error = e.message ?: "Unknown error occurred"
      )
    }
  }
  
  override fun recognizeTextFromBase64(base64Image: String): OcrResult {
    val latch = CountDownLatch(1)
    var ocrResult: OcrResult? = null
    var processingError: Exception? = null
    
    try {
      val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)
      val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
      
      if (bitmap == null) {
        return OcrResult(
          text = "",
          blocks = emptyArray(),
          success = false,
          error = "Failed to decode base64 image"
        )
      }
      
      val image = InputImage.fromBitmap(bitmap, 0)
      textRecognizer.process(image)
        .addOnSuccessListener { result ->
          ocrResult = processTextRecognitionResult(result)
          latch.countDown()
        }
        .addOnFailureListener { exception ->
          processingError = exception
          latch.countDown()
        }
      
      latch.await(10, TimeUnit.SECONDS)
      
      if (processingError != null) {
        return OcrResult(
          text = "",
          blocks = emptyArray(),
          success = false,
          error = processingError!!.message ?: "Unknown error occurred"
        )
      }
      
      return ocrResult ?: OcrResult(
        text = "",
        blocks = emptyArray(),
        success = false,
        error = "Failed to process base64 image"
      )
    } catch (e: Exception) {
      return OcrResult(
        text = "",
        blocks = emptyArray(),
        success = false,
        error = e.message ?: "Unknown error occurred"
      )
    }
  }
  
  // MARK: - Vision Camera Frame Processing Methods
  
  override fun processFrame(frame: Frame): OcrResult {
    val latch = CountDownLatch(1)
    var ocrResult: OcrResult? = null
    var processingError: Exception? = null
    
    try {
      // Convert frame data to Bitmap
      val bitmap = convertFrameToBitmap(frame)
      if (bitmap == null) {
        return OcrResult(
          text = "",
          blocks = emptyArray(),
          success = false,
          error = "Failed to convert frame to bitmap"
        )
      }
      
      val image = InputImage.fromBitmap(bitmap, 0)
      textRecognizer.process(image)
        .addOnSuccessListener { result ->
          ocrResult = processTextRecognitionResult(result)
          latch.countDown()
        }
        .addOnFailureListener { exception ->
          processingError = exception
          latch.countDown()
        }
      
      latch.await(10, TimeUnit.SECONDS)
      
      if (processingError != null) {
        return OcrResult(
          text = "",
          blocks = emptyArray(),
          success = false,
          error = processingError!!.message ?: "Unknown error occurred"
        )
      }
      
      return ocrResult ?: OcrResult(
        text = "",
        blocks = emptyArray(),
        success = false,
        error = "Failed to process frame"
      )
    } catch (e: Exception) {
      return OcrResult(
        text = "",
        blocks = emptyArray(),
        success = false,
        error = e.message ?: "Unknown error occurred"
      )
    }
  }
  
  override fun processFrameSync(frame: Frame): OcrResult {
    return processFrame(frame)
  }
  
  // MARK: - Utility Methods
  
  override fun isAvailable(): Boolean {
    return true
  }
  
  // MARK: - Private Helper Methods
  
  private fun convertFrameToBitmap(frame: Frame): Bitmap? {
    try {
      // Get the frame data as ArrayBuffer (actual runtime type may vary)
      val bufferObject = frame.toArrayBuffer()

      val bytes: ByteArray = when (bufferObject) {
        is ByteArray -> bufferObject
        is ByteBuffer -> {
          val duplicateBuffer = bufferObject.duplicate()
          duplicateBuffer.clear()
          val out = ByteArray(duplicateBuffer.remaining())
          duplicateBuffer.get(out)
          out
        }
        else -> return null
      }

      // Create Bitmap from byte array
      return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    } catch (e: Exception) {
      e.printStackTrace()
      return null
    }
  }
  
  private fun processTextRecognitionResult(result: com.google.mlkit.vision.text.Text): OcrResult {
    val allText = StringBuilder()
    val blocks = mutableListOf<TextBlock>()
    
    for (block in result.textBlocks) {
      val blockText = block.text
      allText.append(blockText).append("\n")
      
      val boundingBox = block.boundingBox
      val textBlock = TextBlock(
        text = blockText,
        boundingBox = BoundingBox(
          left = boundingBox?.left?.toDouble() ?: 0.0,
          top = boundingBox?.top?.toDouble() ?: 0.0,
          right = boundingBox?.right?.toDouble() ?: 0.0,
          bottom = boundingBox?.bottom?.toDouble() ?: 0.0
        ),
        cornerPoints = if (boundingBox != null) {
          arrayOf(
            CornerPoint(x = boundingBox.left.toDouble(), y = boundingBox.top.toDouble()),
            CornerPoint(x = boundingBox.right.toDouble(), y = boundingBox.top.toDouble()),
            CornerPoint(x = boundingBox.right.toDouble(), y = boundingBox.bottom.toDouble()),
            CornerPoint(x = boundingBox.left.toDouble(), y = boundingBox.bottom.toDouble())
          )
        } else {
          emptyArray()
        }
      )
      blocks.add(textBlock)
    }
    
    return OcrResult(
      text = allText.toString().trim(),
      blocks = blocks.toTypedArray(),
      success = true,
      error = null
    )
  }
}
