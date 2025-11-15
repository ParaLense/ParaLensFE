package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import kotlin.math.max
import kotlin.math.min

/**
 * Data classes for template and OCR processing
 */
data class Box(val id: String?, val x: Double, val y: Double, val w: Double, val h: Double)

data class OcrBox(
    val id: String,
    val x: Double,
    val y: Double,
    val w: Double,
    val h: Double,
    val type: String?,
    val options: Map<String, Any>?
)

/**
 * Utility functions for parameter parsing and validation
 */
object Utils {
    
    fun getDouble(map: Map<String, Any>?, key: String, def: Double): Double {
        if (map == null) return def
        val v = map[key] ?: return def
        return when (v) {
            is Number -> v.toDouble()
            is String -> v.toDoubleOrNull() ?: def
            else -> def
        }
    }
    
    fun getInt(map: Map<String, Any>?, key: String, def: Int): Int {
        if (map == null) return def
        val v = map[key] ?: return def
        return when (v) {
            is Number -> v.toInt()
            is String -> v.toIntOrNull() ?: def
            else -> def
        }
    }
    
    fun getBool(map: Map<String, Any>?, key: String, def: Boolean): Boolean {
        if (map == null) return def
        val v = map[key] ?: return def
        return when (v) {
            is Boolean -> v
            is Number -> v.toInt() != 0
            is String -> v.equals("true", true)
            else -> def
        }
    }
    
    @Suppress("UNCHECKED_CAST")
    fun getList(map: Map<String, Any>?, key: String): List<Any>? {
        if (map == null) return null
        val v = map[key] ?: return null
        return v as? List<Any>
    }
    
    @Suppress("UNCHECKED_CAST")
    fun getMap(map: Map<String, Any>?, key: String): Map<String, Any>? {
        if (map == null) return null
        val v = map[key] ?: return null
        return v as? Map<String, Any>
    }
    
    fun clamp(v: Int, minV: Int, maxV: Int) = Math.max(minV, Math.min(maxV, v))
    
    fun iou(a: IntArray, b: IntArray): Double {
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
    
    fun rectWithinRoi(test: IntArray, inner: IntArray, outer: IntArray, tol: Int = 0): Boolean {
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
    
    fun enforceMinAspect(
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
    
    fun normRectToPx(
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
}
