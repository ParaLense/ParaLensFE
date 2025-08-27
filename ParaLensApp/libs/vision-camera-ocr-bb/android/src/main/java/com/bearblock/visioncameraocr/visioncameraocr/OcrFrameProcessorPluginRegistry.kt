package com.bearblock.visioncameraocr.visioncameraocr

import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry

class OcrFrameProcessorPluginRegistry {
  companion object {
    init {
      FrameProcessorPluginRegistry.addFrameProcessorPlugin("detectText") { proxy, options ->
        OcrFrameProcessorPlugin(proxy, options)
      }
    }
  }
}
