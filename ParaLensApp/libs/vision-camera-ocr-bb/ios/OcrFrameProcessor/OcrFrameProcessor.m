#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <Vision/Vision.h>
#import <CoreImage/CoreImage.h>

@interface OcrFrameProcessorPlugin : FrameProcessorPlugin
@end

@implementation OcrFrameProcessorPlugin

- (instancetype _Nonnull)initWithProxy:(VisionCameraProxyHolder*)proxy
                           withOptions:(NSDictionary* _Nullable)options {
  self = [super initWithProxy:proxy withOptions:options];
  
  // Log the options for debugging
  if (options != nil) {
    NSLog(@"OCR Plugin options: %@", options);
    NSString *model = options[@"model"];
    if (model != nil) {
      NSLog(@"Using model: %@", model);
      // TODO: Implement different model options based on 'model' parameter
      // Currently Vision Framework uses default settings
      // Future versions might support different accuracy/speed trade-offs
    }
  }
  
  return self;
}

- (id _Nullable)callback:(Frame* _Nonnull)frame
           withArguments:(NSDictionary* _Nullable)arguments {
  CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer);
  CIImage *ciImage = [CIImage imageWithCVPixelBuffer:pixelBuffer];

  CGImagePropertyOrientation orientation = [self cgImageOrientationFromUIImageOrientation:frame.orientation];
  VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCIImage:ciImage orientation:orientation options:@{}];

  __block NSMutableArray<NSString *> *recognizedTexts = [NSMutableArray array];

  VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] initWithCompletionHandler:^(VNRequest * _Nonnull request, NSError * _Nullable error) {
    if (error != nil) {
      NSLog(@"OCR recognition failed: %@", error);
      return;
    }

    for (VNRecognizedTextObservation *observation in request.results) {
      VNRecognizedText *topCandidate = [[observation topCandidates:1] firstObject];
      if (topCandidate != nil) {
        [recognizedTexts addObject:topCandidate.string];
      }
    }
  }];

  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSError *error = nil;
    [handler performRequests:@[request] error:&error];
    if (error) {
      NSLog(@"Failed to perform OCR recognition: %@", error);
    }
    dispatch_semaphore_signal(semaphore);
  });

  dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);

  NSString *joinedText = [recognizedTexts componentsJoinedByString:@" "];
  return @{ @"text": joinedText };
}

- (CGImagePropertyOrientation)cgImageOrientationFromUIImageOrientation:(UIImageOrientation)orientation {
  switch (orientation) {
    case UIImageOrientationUp: return kCGImagePropertyOrientationUp;
    case UIImageOrientationDown: return kCGImagePropertyOrientationDown;
    case UIImageOrientationLeft: return kCGImagePropertyOrientationLeft;
    case UIImageOrientationRight: return kCGImagePropertyOrientationRight;
    case UIImageOrientationUpMirrored: return kCGImagePropertyOrientationUpMirrored;
    case UIImageOrientationDownMirrored: return kCGImagePropertyOrientationDownMirrored;
    case UIImageOrientationLeftMirrored: return kCGImagePropertyOrientationLeftMirrored;
    case UIImageOrientationRightMirrored: return kCGImagePropertyOrientationRightMirrored;
    default: return kCGImagePropertyOrientationUp;
  }
}

VISION_EXPORT_FRAME_PROCESSOR(OcrFrameProcessorPlugin, detectText)

@end
