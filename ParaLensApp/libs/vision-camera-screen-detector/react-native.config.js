module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath:
          'import com.alex8734.visioncamerascreendetector.visioncamerascreendetector.ScreenDetectorFrameProcessorPluginPackage;',
        packageInstance: 'new ScreenDetectorFrameProcessorPluginPackage()',
      },
    },
  },
};
