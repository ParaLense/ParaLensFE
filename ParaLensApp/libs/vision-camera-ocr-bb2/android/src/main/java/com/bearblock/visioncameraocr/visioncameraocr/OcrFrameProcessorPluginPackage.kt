package com.bearblock.visioncameraocr.visioncameraocr

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import android.util.Log

class OcrFrameProcessorPluginPackage : ReactPackage {
  init {
    try {
      Class.forName("com.bearblock.visioncameraocr.visioncameraocr.OcrFrameProcessorPluginRegistry")
      Log.d("OcrPlugin", "Registry loaded")
    } catch (t: Throwable) {
      Log.e("OcrPlugin", "Failed loading registry: ${t.message}", t)
    }
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return emptyList()
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}