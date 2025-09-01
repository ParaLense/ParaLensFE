module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath:
          'import com.bearblock.visioncameraocr.visioncameraocr.OcrFrameProcessorPluginPackage;',
        packageInstance: 'new OcrFrameProcessorPluginPackage()',
      },
      ios: {
        sourceDir: './ios',
      },
    },
  },
};
