#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <CoreImage/CoreImage.h>
#import <opencv2/opencv.hpp>

#import "Utils.h"
#import "ImageProcessing.h"
#import "ScreenDetection.h"
#import "OcrProcessor.h"

@interface ScreenDetectorFrameProcessorPlugin : FrameProcessorPlugin {
    // Per-instance counters — reset on new camera session (plugin re-creation).
    int _detectionCounter;
    int _totalFrameCounter;
}
@end

@implementation ScreenDetectorFrameProcessorPlugin

- (instancetype _Nonnull)initWithProxy:(VisionCameraProxyHolder*)proxy
                           withOptions:(NSDictionary* _Nullable)options {
    self = [super initWithProxy:proxy withOptions:options];
    if (self) {
        _detectionCounter = 0;
        _totalFrameCounter = 0;
    }
    if (options != nil) {
        NSLog(@"Screen Detector Plugin options: %@", options);
    }
    return self;
}

- (id _Nullable)callback:(Frame* _Nonnull)frame
           withArguments:(NSDictionary* _Nullable)arguments {
    CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer);
    size_t width  = CVPixelBufferGetWidth(pixelBuffer);
    size_t height = CVPixelBufferGetHeight(pixelBuffer);

    @try {
        // Parse arguments
        std::vector<SDBOX> templateBoxes = [Utils parseTemplate:arguments options:self.options];
        int templateTargetW  = [Utils getInt:arguments key:@"templateTargetW"  defaultValue:[Utils getInt:self.options key:@"templateTargetW"  defaultValue:1200]];
        int templateTargetH  = [Utils getInt:arguments key:@"templateTargetH"  defaultValue:[Utils getInt:self.options key:@"templateTargetH"  defaultValue:1600]];
        BOOL returnWarpedImage = [Utils getBool:arguments key:@"returnWarpedImage" defaultValue:[Utils getBool:self.options key:@"returnWarpedImage" defaultValue:NO]];
        int outputW          = [Utils getInt:arguments key:@"outputW"          defaultValue:templateTargetW];
        int outputH          = [Utils getInt:arguments key:@"outputH"          defaultValue:templateTargetH];
        int imageQuality     = [Utils getInt:arguments key:@"imageQuality"     defaultValue:80];
        BOOL runOcr          = [Utils getBool:arguments key:@"runOcr"          defaultValue:NO];
        NSArray* ocrTemplate = [OcrProcessor parseOcrTemplate:arguments];
        double accuracyThreshold = [Utils getDouble:arguments key:@"accuracyThreshold" defaultValue:[Utils getDouble:self.options key:@"accuracyThreshold" defaultValue:0.80]];
        BOOL rotate90CW      = [Utils getBool:arguments key:@"rotate90CW"      defaultValue:[Utils getBool:self.options key:@"rotate90CW" defaultValue:YES]];

        NSDictionary* roiOuterArg = [Utils getMap:arguments key:@"roiOuter"];
        NSDictionary* roiInnerArg = [Utils getMap:arguments key:@"roiInner"];
        if (!roiOuterArg) roiOuterArg = @{ @"x": @0.10, @"y": @0.05, @"width": @0.80, @"height": @0.90 };
        if (!roiInnerArg) roiInnerArg = @{ @"x": @0.30, @"y": @0.20, @"width": @0.45, @"height": @0.60 };
        int minAspectW = [Utils getInt:arguments key:@"minAspectW" defaultValue:3];
        int minAspectH = [Utils getInt:arguments key:@"minAspectH" defaultValue:4];
        double minAspect = (minAspectH != 0) ? ((double)minAspectW / (double)minAspectH) : 0.75;

        // Convert Y-plane to grayscale
        cv::Mat gray = [ImageProcessing createGrayMatFromPixelBuffer:pixelBuffer];

        // Optional 90° rotation (default YES on iOS — camera delivers landscape)
        cv::Mat img;
        if (rotate90CW) {
            cv::rotate(gray, img, cv::ROTATE_90_CLOCKWISE);
        } else {
            img = gray;
        }
        int frameW = img.cols, frameH = img.rows;

        cv::Rect roiOuterPx = [Utils enforceMinAspect:[Utils normToPx:roiOuterArg width:frameW height:frameH]
                                                 width:frameW height:frameH minAspect:minAspect];
        cv::Rect roiInnerPx = [Utils enforceMinAspect:[Utils normToPx:roiInnerArg width:frameW height:frameH]
                                                 width:frameW height:frameH minAspect:minAspect];

        cv::Mat normalized = [ImageProcessing preprocessImage:img];

        // Dual edge maps — screen outline + detail (matches Android)
        cv::Mat screenEdges, detailEdges;
        [ImageProcessing createEdgeMaps:normalized screenEdges:screenEdges detailEdges:detailEdges];

        // Find contours on screen edge map
        std::vector<std::vector<cv::Point>> contours = [ImageProcessing findContours:screenEdges];

        struct ScreenCandidate candidate = [ScreenDetection findBestScreenCandidate:contours
                                                                           roiInner:roiInnerPx
                                                                           roiOuter:roiOuterPx
                                                                             frameW:frameW
                                                                             frameH:frameH];

        cv::Mat H;
        if (candidate.hasBest) {
            H = [ScreenDetection buildScreenHomography:candidate.bestQuad
                                       templateTargetW:templateTargetW
                                       templateTargetH:templateTargetH];
        }

        // Warp image once for template matching + OCR
        cv::Mat warped;
        if (!H.empty()) {
            cv::Mat Hinv = H.inv();
            cv::warpPerspective(img, warped, Hinv, cv::Size(outputW, outputH));
        }

        // Match template boxes in warped space (matches Android matchTemplateBoxesInWarped)
        struct TemplateMatchResult matchResult = {0.0, [NSMutableArray array], [NSMutableArray array]};
        if (!H.empty() && !templateBoxes.empty() && !warped.empty()) {
            matchResult = [ScreenDetection matchTemplateBoxesInWarped:templateBoxes
                                                               warped:warped
                                                              outputW:outputW
                                                              outputH:outputH
                                                       paddingPercent:1.0
                                                    minScoreForMatch:0.4];
        }

        BOOL detected = !H.empty() && (
            templateBoxes.empty() ? YES : (matchResult.accuracy >= accuracyThreshold)
        );

        _totalFrameCounter++;
        if (detected) _detectionCounter++;

        // Screenshot — only when detected and requested
        NSString* imageBase64 = nil;
        if (detected && returnWarpedImage && !H.empty()) {
            cv::Mat Hinv = H.inv();
            imageBase64 = [ImageProcessing warpAndEncodeToBase64:img
                                                       homography:Hinv
                                                          outputW:outputW
                                                          outputH:outputH
                                                     imageQuality:imageQuality];
        }

        // OCR — in warped space (reuse already-warped image)
        NSMutableDictionary* ocrMap = nil;
        if (detected && runOcr && ocrTemplate && ocrTemplate.count > 0 && !warped.empty()) {
            NSMutableArray* ocrResults = [OcrProcessor processOcrBoxes:warped
                                                              ocrBoxes:ocrTemplate
                                                               outputW:outputW
                                                               outputH:outputH];
            ocrMap = [@{ @"boxes": ocrResults } mutableCopy];
        }

        NSMutableArray* allRects = [NSMutableArray array];
        NSMutableDictionary* screenData = [ScreenDetection createScreenData:detected
                                                                   accuracy:matchResult.accuracy
                                                           accuracyThreshold:accuracyThreshold
                                                            detectionCounter:_detectionCounter
                                                             totalFrameCounter:_totalFrameCounter
                                                                    frameW:frameW
                                                                    frameH:frameH
                                                                  srcWidth:width
                                                                 srcHeight:height
                                                            templateTargetW:templateTargetW
                                                            templateTargetH:templateTargetH
                                                               homography:H
                                                                    mask:cv::Mat()
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
