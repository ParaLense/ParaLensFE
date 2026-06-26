package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.screendetector.VisionCameraScreenDetectorOnLoad

/**
 * ReactPackage entry point for React Native autolinking.
 *
 * Under VisionCamera v5 / Nitro the screen-detector plugin (HybridScreenDetector)
 * is a Nitro HybridObject. Loading the native C++ library here (via the
 * Nitrogen-generated OnLoad) runs its JNI_OnLoad, which registers the
 * HybridObject in the Nitro registry so `createHybridObject('ScreenDetector')`
 * works. OpenCV (and the debug streamer) are initialized lazily on first use in
 * [ScreenDetectorProcessor].
 */
class ScreenDetectorFrameProcessorPluginPackage : ReactPackage {
  init {
    VisionCameraScreenDetectorOnLoad.initializeNative()
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return emptyList()
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
