//
//  ScreenDetection.h
//  vision-camera-screen-detector
//
//  Created by Refactoring
//

#import <Foundation/Foundation.h>
#import <opencv2/opencv.hpp>
#import "Utils.h"

NS_ASSUME_NONNULL_BEGIN

@interface ScreenDetection : NSObject

// Screen candidate detection
+ (struct ScreenCandidate)findBestScreenCandidate:(const std::vector<std::vector<cv::Point>>&)contours
                                        roiInner:(const cv::Rect&)roiInner
                                        roiOuter:(const cv::Rect&)roiOuter
                                        frameW:(int)frameW
                                        frameH:(int)frameH;

// Homography building
+ (cv::Mat)buildScreenHomography:(const std::vector<cv::Point2f>&)bestQuad
                   templateTargetW:(int)templateTargetW
                   templateTargetH:(int)templateTargetH;

// Template matching
+ (struct TemplateMatchResult)matchTemplateBoxes:(const std::vector<SDBOX>&)templateBoxes
                                        homography:(const cv::Mat&)H
                                      contourRects:(const std::vector<cv::Rect>&)contourRects
                                          frameW:(int)frameW
                                          frameH:(int)frameH
                                   templateTargetW:(int)templateTargetW
                                   templateTargetH:(int)templateTargetH
                                    minIouForMatch:(double)minIouForMatch;

// Screen data creation
+ (NSMutableDictionary*)createScreenData:(BOOL)detected
                                accuracy:(double)accuracy
                        accuracyThreshold:(double)accuracyThreshold
                         detectionCounter:(int)detectionCounter
                          totalFrameCounter:(int)totalFrameCounter
                                 frameW:(int)frameW
                                 frameH:(int)frameH
                               srcWidth:(size_t)srcWidth
                              srcHeight:(size_t)srcHeight
                           screenAspectW:(int)screenAspectW
                           screenAspectH:(int)screenAspectH
                         templateTargetW:(int)templateTargetW
                         templateTargetH:(int)templateTargetH
                            homography:(const cv::Mat&)H
                                 mask:(const cv::Mat&)mask
                            roiOuterPx:(const cv::Rect&)roiOuterPx
                            roiInnerPx:(const cv::Rect&)roiInnerPx
                             bestRect:(const cv::Rect&)bestRect
                            hasBestRect:(BOOL)hasBestRect
                             allRects:(NSMutableArray*)allRects
                    templatePixelRects:(NSMutableArray*)templatePixelRects
                            matchedArr:(NSMutableArray*)matchedArr
                      warpedImageBase64:(NSString* _Nullable)warpedImageBase64
                               outputW:(int)outputW
                               outputH:(int)outputH;

@end

// Data structures
struct ScreenCandidate {
    cv::Rect bestRect;
    BOOL hasBest;
    double bestScore;
    std::vector<cv::Point2f> bestQuad;
};

struct TemplateMatchResult {
    double accuracy;
    NSMutableArray* matchedArr;
    NSMutableArray* templatePixelRectsArr;
};

NS_ASSUME_NONNULL_END
