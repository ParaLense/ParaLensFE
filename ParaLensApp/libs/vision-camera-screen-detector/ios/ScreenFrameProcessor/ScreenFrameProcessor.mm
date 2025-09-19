#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <CoreImage/CoreImage.h>

// OpenCV
#import <opencv2/opencv.hpp>

@interface ScreenDetectorFrameProcessorPlugin : FrameProcessorPlugin
@end

@implementation ScreenDetectorFrameProcessorPlugin

- (instancetype _Nonnull)initWithProxy:(VisionCameraProxyHolder*)proxy
                           withOptions:(NSDictionary* _Nullable)options {
  self = [super initWithProxy:proxy withOptions:options];
  
  if (options != nil) {
    NSLog(@"Screen Detector Plugin options: %@", options);
  }
  
  return self;
}

- (id _Nullable)callback:(Frame* _Nonnull)frame
           withArguments:(NSDictionary* _Nullable)arguments {
  CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer);
  size_t width = CVPixelBufferGetWidth(pixelBuffer);
  size_t height = CVPixelBufferGetHeight(pixelBuffer);

  @try {
    // Minimal OpenCV usage to verify linkage
    int64_t cvTick = (int64_t)cv::getTickCount();

    NSDictionary *screenData = @{
      @"width": @(width),
      @"height": @(height),
      @"detected": @NO,
      @"cvTick": @(cvTick)
    };
    
    return @{ @"screen": screenData };
  } @catch (NSException *exception) {
    NSLog(@"Screen detection error: %@", exception.reason);
    return nil;
  }
}

VISION_EXPORT_FRAME_PROCESSOR(ScreenDetectorFrameProcessorPlugin, detectScreen)

@end


