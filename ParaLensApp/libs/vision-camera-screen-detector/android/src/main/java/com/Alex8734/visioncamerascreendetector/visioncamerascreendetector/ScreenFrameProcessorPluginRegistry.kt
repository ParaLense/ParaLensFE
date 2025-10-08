package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry

class ScreenDetectorFrameProcessorPluginRegistry {
  companion object {
    init {
      FrameProcessorPluginRegistry.addFrameProcessorPlugin("detectScreen") { proxy, options ->
        ScreenDetectorFrameProcessorPlugin(proxy, options)
      }
    }
  }
}
