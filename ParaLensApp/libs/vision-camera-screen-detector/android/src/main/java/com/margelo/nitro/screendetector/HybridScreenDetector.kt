package com.margelo.nitro.screendetector

import android.annotation.SuppressLint
import android.media.Image
import android.util.Log
import com.alex8734.visioncamerascreendetector.visioncamerascreendetector.ScreenDetectorProcessor
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.hybrids.instances.HybridFrame
import com.margelo.nitro.core.NullType
import org.json.JSONArray
import org.json.JSONObject

/**
 * VisionCamera v5 / Nitro implementation of the screen detector.
 *
 * Runs synchronously on the camera worklet thread. It pulls the live
 * [android.media.Image] out of the VisionCamera [HybridFrame], hands it to the
 * unchanged OpenCV/OCR pipeline ([ScreenDetectorProcessor]), and transports the
 * scan options/results as JSON strings (see ScreenDetector.nitro.ts for why).
 */
class HybridScreenDetector : HybridScreenDetectorSpec() {
  // One processor per HybridObject instance — keeps the per-session frame counters.
  private val processor = ScreenDetectorProcessor(null)

  @SuppressLint("UnsafeOptInUsageError")
  override fun detectScreen(
    frame: HybridFrameSpec,
    argsJson: String
  ): Variant_NullType_String {
    return try {
      val hybridFrame = frame as? HybridFrame
        ?: return Variant_NullType_String.create(NullType.NULL)
      val mediaImage: Image = hybridFrame.image.image
        ?: return Variant_NullType_String.create(NullType.NULL)

      val arguments = jsonToMap(JSONObject(argsJson))
      val result = processor.processImage(mediaImage, arguments)
        ?: return Variant_NullType_String.create(NullType.NULL)

      Variant_NullType_String.create(mapToJson(result).toString())
    } catch (t: Throwable) {
      Log.e("HybridScreenDetector", "detectScreen failed: ${t.message}", t)
      Variant_NullType_String.create(NullType.NULL)
    }
  }

  // ---- JSON <-> Map bridging -------------------------------------------------

  private fun jsonToMap(obj: JSONObject): Map<String, Any> {
    val map = HashMap<String, Any>()
    val keys = obj.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      val value = obj.get(key)
      if (value != JSONObject.NULL) {
        map[key] = jsonToValue(value)
      }
    }
    return map
  }

  private fun jsonToValue(value: Any): Any {
    return when (value) {
      is JSONObject -> jsonToMap(value)
      is JSONArray -> {
        val list = ArrayList<Any>(value.length())
        for (i in 0 until value.length()) {
          val item = value.get(i)
          if (item != JSONObject.NULL) list.add(jsonToValue(item))
        }
        list
      }
      else -> value
    }
  }

  @Suppress("UNCHECKED_CAST")
  private fun mapToJson(map: Map<*, *>): JSONObject {
    val obj = JSONObject()
    for ((k, v) in map) {
      obj.put(k.toString(), valueToJson(v))
    }
    return obj
  }

  private fun listToJson(list: List<*>): JSONArray {
    val arr = JSONArray()
    for (v in list) arr.put(valueToJson(v))
    return arr
  }

  private fun valueToJson(value: Any?): Any {
    return when (value) {
      null -> JSONObject.NULL
      is Map<*, *> -> mapToJson(value)
      is List<*> -> listToJson(value)
      is Array<*> -> listToJson(value.toList())
      is DoubleArray -> JSONArray().apply { value.forEach { put(it) } }
      is IntArray -> JSONArray().apply { value.forEach { put(it) } }
      is BooleanArray -> JSONArray().apply { value.forEach { put(it) } }
      is Float -> value.toDouble()
      else -> value
    }
  }
}
