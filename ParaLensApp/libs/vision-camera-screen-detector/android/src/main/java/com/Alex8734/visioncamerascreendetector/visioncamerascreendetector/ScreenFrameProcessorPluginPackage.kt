package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import android.util.Log
import org.opencv.android.OpenCVLoader

class ScreenDetectorFrameProcessorPluginPackage : ReactPackage {

  init {
    try {
      val ok = OpenCVLoader.initDebug()
      Log.d("ScreenDetector", "OpenCV initDebug: $ok")
    } catch (t: Throwable) {
      Log.e("ScreenDetector", "OpenCV init failed: ${t.message}", t)
    }
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return emptyList()
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
