#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <CoreImage/CoreImage.h>
#import <opencv2/opencv.hpp>

// Import our refactored modules
#import "Utils.h"
#import "ImageProcessing.h"
#import "ScreenDetection.h"
#import "OcrProcessor.h"

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
    // Parse arguments using Utils
    std::vector<SDBOX> templateBoxes = [Utils parseTemplate:arguments options:self.options];
    int screenAspectW = [Utils getInt:arguments key:@"screenAspectW" defaultValue:[Utils getInt:self.options key:@"screenAspectW" defaultValue:3]];
    int screenAspectH = [Utils getInt:arguments key:@"screenAspectH" defaultValue:[Utils getInt:self.options key:@"screenAspectH" defaultValue:4]];
    int templateTargetW = [Utils getInt:arguments key:@"templateTargetW" defaultValue:[Utils getInt:self.options key:@"templateTargetW" defaultValue:1200]];
    int templateTargetH = [Utils getInt:arguments key:@"templateTargetH" defaultValue:[Utils getInt:self.options key:@"templateTargetH" defaultValue:1600]];
    BOOL returnWarpedImage = [Utils getBool:arguments key:@"returnWarpedImage" defaultValue:[Utils getBool:self.options key:@"returnWarpedImage" defaultValue:NO]];
    int outputW = [Utils getInt:arguments key:@"outputW" defaultValue:templateTargetW];
    int outputH = [Utils getInt:arguments key:@"outputH" defaultValue:templateTargetH];
    int imageQuality = [Utils getInt:arguments key:@"imageQuality" defaultValue:80];
    BOOL runOcr = [Utils getBool:arguments key:@"runOcr" defaultValue:NO];
    NSArray* ocrTemplate = [OcrProcessor parseOcrTemplate:arguments];
    double minIouForMatch = [Utils getDouble:arguments key:@"minIouForMatch" defaultValue:[Utils getDouble:self.options key:@"minIouForMatch" defaultValue:0.30]];
    double accuracyThreshold = [Utils getDouble:arguments key:@"accuracyThreshold" defaultValue:[Utils getDouble:self.options key:@"accuracyThreshold" defaultValue:0.80]];

    // ROI config (normalized 0..1)
    NSDictionary* roiOuterArg = [Utils getMap:arguments key:@"roiOuter"];
    NSDictionary* roiInnerArg = [Utils getMap:arguments key:@"roiInner"];
    if (!roiOuterArg) roiOuterArg = @{ @"x": @0.10, @"y": @0.05, @"width": @0.80, @"height": @0.90 };
    if (!roiInnerArg) roiInnerArg = @{ @"x": @0.30, @"y": @0.20, @"width": @0.45, @"height": @0.60 };
    int minAspectW = [Utils getInt:arguments key:@"minAspectW" defaultValue:3];
    int minAspectH = [Utils getInt:arguments key:@"minAspectH" defaultValue:4];
    double minAspect = (minAspectH != 0) ? ((double)minAspectW / (double)minAspectH) : 0.75;

    // Convert image to grayscale
    cv::Mat gray = [ImageProcessing createGrayMatFromPixelBuffer:pixelBuffer];
    cv::Mat rotated;
    cv::rotate(gray, rotated, cv::ROTATE_90_CLOCKWISE);
    int frameW = rotated.cols, frameH = rotated.rows;

    // Resolve ROIs in pixels, enforce min aspect
    cv::Rect roiOuterPx = [Utils enforceMinAspect:[Utils normToPx:roiOuterArg width:frameW height:frameH] 
                                             width:frameW height:frameH minAspect:minAspect];
    cv::Rect roiInnerPx = [Utils enforceMinAspect:[Utils normToPx:roiInnerArg width:frameW height:frameH] 
                                             width:frameW height:frameH minAspect:minAspect];

    // Preprocess image for better edge detection
    cv::Mat normalized = [ImageProcessing preprocessImage:rotated];
    
    // Create edge map
    cv::Mat edges = [ImageProcessing createEdgeMap:normalized];
    
    // Find contours
    std::vector<std::vector<cv::Point>> contours = [ImageProcessing findContours:edges];

    // Find best screen candidate
    struct ScreenCandidate candidate = [ScreenDetection findBestScreenCandidate:contours
                                                                         roiInner:roiInnerPx
                                                                         roiOuter:roiOuterPx
                                                                         frameW:frameW
                                                                         frameH:frameH];
    
    // Build homography matrix
    cv::Mat H;
    cv::Mat mask;
    if (candidate.hasBest) {
        H = [ScreenDetection buildScreenHomography:candidate.bestQuad
                                   templateTargetW:templateTargetW
                                   templateTargetH:templateTargetH];
    }
    
    // Match template boxes
    struct TemplateMatchResult matchResult = {0.0, [NSMutableArray array], [NSMutableArray array]};
    if (!H.empty() && !templateBoxes.empty()) {
        // Convert contours to rectangles for template matching
        std::vector<cv::Rect> contourRects;
        for (const auto& cnt : contours) {
            cv::Rect rect = cv::boundingRect(cnt) & cv::Rect(0,0,frameW,frameH);
            if (rect.width > 0 && rect.height > 0) {
                contourRects.push_back(rect);
            }
        }
        
        matchResult = [ScreenDetection matchTemplateBoxes:templateBoxes
                                               homography:H
                                             contourRects:contourRects
                                                   frameW:frameW
                                                   frameH:frameH
                                            templateTargetW:templateTargetW
                                            templateTargetH:templateTargetH
                                             minIouForMatch:minIouForMatch];
    }
    
    BOOL detected = !H.empty() && (
        templateBoxes.empty() ? YES : (matchResult.accuracy >= accuracyThreshold)
    );

    // Create warped image for OCR if needed
    NSString* imageBase64 = nil;
    if (detected && returnWarpedImage && !H.empty()) {
        imageBase64 = [ImageProcessing warpAndEncodeToBase64:gray
                                                  homography:H
                                                     outputW:outputW
                                                     outputH:outputH
                                                imageQuality:imageQuality];
    }

    // Process OCR if requested
    NSMutableDictionary* ocrMap = nil;
    if (detected && runOcr && ocrTemplate && ocrTemplate.count > 0 && !H.empty()) {
        cv::Mat warped;
        cv::warpPerspective(gray, warped, H, cv::Size(outputW, outputH));
        
        NSMutableArray* ocrResults = [OcrProcessor processOcrBoxes:warped
                                                          ocrBoxes:ocrTemplate
                                                           outputW:outputW
                                                           outputH:outputH];
        ocrMap = [@{ @"boxes": ocrResults } mutableCopy];
    }

    // Create screen data
    NSMutableArray* allRects = [NSMutableArray array];
    NSMutableDictionary* screenData = [ScreenDetection createScreenData:detected
                                                               accuracy:matchResult.accuracy
                                                       accuracyThreshold:accuracyThreshold
                                                        detectionCounter:0
                                                         totalFrameCounter:0
                                                                frameW:frameW
                                                                frameH:frameH
                                                              srcWidth:width
                                                             srcHeight:height
                                                          screenAspectW:screenAspectW
                                                          screenAspectH:screenAspectH
                                                        templateTargetW:templateTargetW
                                                        templateTargetH:templateTargetH
                                                           homography:H
                                                                mask:mask
                                                           roiOuterPx:roiOuterPx
                                                           roiInnerPx:roiInnerPx
                                                            bestRect:candidate.bestRect
                                                           hasBestRect:candidate.hasBest
                                                            allRects:allRects
                                                   templatePixelRects:matchResult.templatePixelRectsArr
                                                           matchedArr:matchResult.matchedArr
                                                     warpedImageBase64:imageBase64
                                                              outputW:outputW
                                                              outputH:outputH];

    if (ocrMap) {
        return @{ @"screen": screenData, @"ocr": ocrMap };
    } else {
        return @{ @"screen": screenData };
    }
  } @catch (NSException *exception) {
    NSLog(@"Screen detection error: %@", exception.reason);
    return nil;
  }
}

VISION_EXPORT_FRAME_PROCESSOR(ScreenDetectorFrameProcessorPlugin, detectScreen)

@end
