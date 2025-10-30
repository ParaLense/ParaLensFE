package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import android.graphics.Bitmap
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.android.Utils as OpenCVUtils
import java.util.HashMap
import java.util.ArrayList
import kotlin.math.max

/**
 * Handles all OCR processing operations
 */
object OcrProcessor {
    
    private val textRecognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }
    
    /**
     * Parse OCR template boxes from arguments
     */
    fun parseOcrTemplate(argMap: Map<String, Any>?): List<OcrBox>? {
        val src = Utils.getList(argMap, "ocrTemplate") ?: return null
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
    
    /**
     * Process OCR for all boxes in the warped image
     */
    fun processOcrBoxes(
        warped: Mat,
        ocrBoxes: List<OcrBox>,
        outputW: Int,
        outputH: Int
    ): List<HashMap<String, Any?>> {
        val ocrArr = ArrayList<HashMap<String, Any?>>()
        
        for (b in ocrBoxes) {
            val rx = ((b.x / 100.0) * outputW).toInt().coerceIn(0, outputW - 1)
            val ry = ((b.y / 100.0) * outputH).toInt().coerceIn(0, outputH - 1)
            val rw = max(1, ((b.w / 100.0) * outputW).toInt())
            val rh = max(1, ((b.h / 100.0) * outputH).toInt())
            val x2 = (rx + rw).coerceAtMost(outputW)
            val y2 = (ry + rh).coerceAtMost(outputH)
            val roi = warped.submat(ry, y2, rx, x2)

            val result = HashMap<String, Any?>()
            result["id"] = b.id
            
            when (b.type) {
                "checkbox" -> {
                    processCheckbox(roi, b, result)
                }
                "scrollbar" -> {
                    processScrollbar(roi, b, result)
                }
                else -> {
                    processValue(roi, result)
                }
            }
            ocrArr.add(result)
        }
        
        return ocrArr
    }
    
    /**
     * Process checkbox detection
     */
    private fun processCheckbox(roi: Mat, box: OcrBox, result: HashMap<String, Any?>) {
        // Improved checkbox detection based on mean pixel value
        val blur = Mat()
        Imgproc.GaussianBlur(roi, blur, Size(3.0,3.0), 0.0)
        
        // Calculate mean pixel value
        val mean = Core.mean(blur)
        val meanValue = mean.`val`[0]
        
        // Threshold from template config, default based on your values:
        // Checked: ~194, Unchecked: ~235
        // Threshold should be around 214 (middle between 194 and 235)
        val threshold = ((box.options?.get("checkboxThreshold") as? Number)?.toDouble() ?: 214.0).coerceIn(0.0, 255.0)
        val readValue = (box.options?.get("readValue") as? Boolean) ?: false
        val valueBoxId = box.options?.get("valueBoxId") as? String
        
        result["type"] = "checkbox"
        // Lower mean value = darker = checked
        result["checked"] = meanValue <= threshold
        result["confidence"] = Math.abs(meanValue - threshold) / 255.0
        result["meanValue"] = meanValue
        result["threshold"] = threshold
        
        // Debug: Log checkbox detection details
        Log.d("CheckboxDetection", "Box ${box.id}: meanValue=$meanValue, threshold=$threshold, checked=${meanValue <= threshold}")
        
        // If checkbox is checked and readValue is true, also read the associated value
        if (meanValue <= threshold && readValue && valueBoxId != null) {
            // Note: This would need access to the full OCR boxes list to find the value box
            // For now, we'll leave this as a placeholder
            result["valueBoxId"] = valueBoxId
            result["valueText"] = null
            result["valueNumber"] = null
        }
    }
    
    /**
     * Process scrollbar detection - scans with ML Kit OCR and returns key-value pairs
     * Each pair consists of a key (even index) and value (odd index)
     */
    private fun processScrollbar(roi: Mat, box: OcrBox, result: HashMap<String, Any?>) {
        val orientation = (box.options?.get("orientation") as? String) ?: if (roi.cols() >= roi.rows()) "horizontal" else "vertical"
        val cells = (box.options?.get("cells") as? Number)?.toInt() ?: 4 // Default to 4 cells
        
        val allTexts = ArrayList<String>()
        
        try {
            // Convert Mat to Bitmap for ML Kit
            val rgba = Mat()
            Imgproc.cvtColor(roi, rgba, Imgproc.COLOR_GRAY2RGBA)
            val bmp = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
            OpenCVUtils.matToBitmap(rgba, bmp)
            val image = InputImage.fromBitmap(bmp, 0)
            
            // Process with ML Kit OCR
            val task = textRecognizer.process(image)
            val visionText = Tasks.await(task)
            
            // Extract all text blocks found
            for (block in visionText.textBlocks) {
                for (line in block.lines) {
                    val text = line.text?.trim()
                    if (!text.isNullOrEmpty()) {
                        allTexts.add(text)
                    }
                }
            }
            
        } catch (t: Throwable) {
            Log.e("OcrProcessor", "ML Kit OCR for scrollbar failed: ${t.message}", t)
        }
        
        Log.d("OcrProcessor", "All texts: ${allTexts}")
        result["type"] = "scrollbar"
        result["values"] = allTexts // Array of all detected text blocks
        result["cells"] = cells
        result["orientation"] = orientation
    }
    
    /**
     * Process text value detection using ML Kit
     */
    private fun processValue(roi: Mat, result: HashMap<String, Any?>) {
        result["type"] = "value"
        try {
            val rgba = Mat()
            Imgproc.cvtColor(roi, rgba, Imgproc.COLOR_GRAY2RGBA)
            val bmp = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
            OpenCVUtils.matToBitmap(rgba, bmp)
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
            Log.e("OcrProcessor", "ML Kit OCR failed: ${t.message}", t)
            result["text"] = null
            result["number"] = null
            result["confidence"] = 0.0
        }
    }
    
    
    /**
     * Process checkbox with associated value reading
     */
    fun processCheckboxWithValue(
        warped: Mat,
        checkboxBox: OcrBox,
        valueBox: OcrBox,
        outputW: Int,
        outputH: Int
    ): HashMap<String, Any?> {
        val result = HashMap<String, Any?>()
        result["id"] = checkboxBox.id
        
        // Process checkbox
        val rx = ((checkboxBox.x / 100.0) * outputW).toInt().coerceIn(0, outputW - 1)
        val ry = ((checkboxBox.y / 100.0) * outputH).toInt().coerceIn(0, outputH - 1)
        val rw = max(1, ((checkboxBox.w / 100.0) * outputW).toInt())
        val rh = max(1, ((checkboxBox.h / 100.0) * outputH).toInt())
        val x2 = (rx + rw).coerceAtMost(outputW)
        val y2 = (ry + rh).coerceAtMost(outputH)
        val checkboxRoi = warped.submat(ry, y2, rx, x2)
        
        processCheckbox(checkboxRoi, checkboxBox, result)
        
        // If checkbox is checked, also read the value
        val checked = result["checked"] as? Boolean ?: false
        if (checked) {
            val vrx = ((valueBox.x / 100.0) * outputW).toInt().coerceIn(0, outputW - 1)
            val vry = ((valueBox.y / 100.0) * outputH).toInt().coerceIn(0, outputH - 1)
            val vrw = max(1, ((valueBox.w / 100.0) * outputW).toInt())
            val vrh = max(1, ((valueBox.h / 100.0) * outputH).toInt())
            val vx2 = (vrx + vrw).coerceAtMost(outputW)
            val vy2 = (vry + vrh).coerceAtMost(outputH)
            val vroi = warped.submat(vry, vy2, vrx, vx2)
            
            try {
                val vrgba = Mat()
                Imgproc.cvtColor(vroi, vrgba, Imgproc.COLOR_GRAY2RGBA)
                val vbmp = Bitmap.createBitmap(vrgba.cols(), vrgba.rows(), Bitmap.Config.ARGB_8888)
                OpenCVUtils.matToBitmap(vrgba, vbmp)
                val vimage = InputImage.fromBitmap(vbmp, 0)
                val vtask = textRecognizer.process(vimage)
                val vvisionText = Tasks.await(vtask)
                val vtext = vvisionText.text?.trim() ?: ""
                val vnumText = vtext.replace(',', '.').replace("\n", " ").trim()
                val vnum = vnumText.toDoubleOrNull()
                
                result["valueText"] = if (vtext.isNotEmpty()) vtext else null
                result["valueNumber"] = vnum
                result["valueBoxId"] = valueBox.id
            } catch (t: Throwable) {
                Log.e("OcrProcessor", "ML Kit OCR for checkbox value failed: ${t.message}", t)
                result["valueText"] = null
                result["valueNumber"] = null
            }
        }
        
        return result
    }
}
