//
//  ScreenDetection.mm
//  vision-camera-screen-detector
//
//  Created by Refactoring
//

#import "ScreenDetection.h"
#import "ImageProcessing.h"
#import <algorithm>

@implementation ScreenDetection

+ (struct ScreenCandidate)findBestScreenCandidate:(const std::vector<std::vector<cv::Point>>&)contours
                                        roiInner:(const cv::Rect&)roiInner
                                        roiOuter:(const cv::Rect&)roiOuter
                                        frameW:(int)frameW
                                        frameH:(int)frameH {
    struct ScreenCandidate result = {cv::Rect(), NO, 0.0, std::vector<cv::Point2f>()};
    
    for (const auto& cnt : contours) {
        double peri = cv::arcLength(cnt, true);
        std::vector<cv::Point> approx;
        cv::approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.size() != 4) continue;
        
        cv::Rect rect = cv::boundingRect(approx) & cv::Rect(0,0,frameW,frameH);
        if (rect.width <= 0 || rect.height <= 0) continue;
        
        if (![Utils rectWithinRoi:rect inner:roiInner outer:roiOuter tolerance:12]) continue;
        
        double score = [Utils calculateIoU:rect withRect:rect];
        if (score > result.bestScore) {
            result.bestScore = score;
            result.bestRect = rect;
            result.hasBest = YES;
            
            std::vector<cv::Point2f> pts(4);
            for (int i = 0; i < 4; ++i) {
                pts[i] = cv::Point2f((float)approx[i].x, (float)approx[i].y);
            }
            result.bestQuad = [Utils orderQuad:pts];
        }
    }
    
    return result;
}

+ (cv::Mat)buildScreenHomography:(const std::vector<cv::Point2f>&)bestQuad
                   templateTargetW:(int)templateTargetW
                   templateTargetH:(int)templateTargetH {
    if (bestQuad.size() != 4) return cv::Mat();
    
    std::vector<cv::Point2f> dst = {
        cv::Point2f(0.f, 0.f),
        cv::Point2f((float)templateTargetW, 0.f),
        cv::Point2f((float)templateTargetW, (float)templateTargetH),
        cv::Point2f(0.f, (float)templateTargetH)
    };
    
    return [ImageProcessing buildHomography:bestQuad dstPoints:dst];
}

+ (struct TemplateMatchResult)matchTemplateBoxes:(const std::vector<SDBOX>&)templateBoxes
                                        homography:(const cv::Mat&)H
                                      contourRects:(const std::vector<cv::Rect>&)contourRects
                                          frameW:(int)frameW
                                          frameH:(int)frameH
                                   templateTargetW:(int)templateTargetW
                                   templateTargetH:(int)templateTargetH
                                    minIouForMatch:(double)minIouForMatch {
    struct TemplateMatchResult result = {0.0, [NSMutableArray array], [NSMutableArray array]};
    
    if (H.empty() || templateBoxes.empty()) {
        return result;
    }
    
    int matches = 0;
    for (const auto& b : templateBoxes) {
        std::vector<cv::Point2f> pts;
        [Utils percentBoxToPts:b templateWidth:templateTargetW templateHeight:templateTargetH points:pts];
        
        std::vector<cv::Point2f> proj;
        cv::perspectiveTransform(pts, proj, H);
        
        // Calculate bounding box of projected points
        float minX = FLT_MAX, minY = FLT_MAX, maxX = -FLT_MAX, maxY = -FLT_MAX;
        for (const auto& p : proj) {
            minX = std::min(minX, p.x);
            minY = std::min(minY, p.y);
            maxX = std::max(maxX, p.x);
            maxY = std::max(maxY, p.y);
        }
        
        int rx = std::max(0, (int)minX);
        int ry = std::max(0, (int)minY);
        int rw = std::min(frameW - rx, (int)(maxX - minX));
        int rh = std::min(frameH - ry, (int)(maxY - minY));
        
        cv::Rect projectedRect(rx, ry, rw, rh);
        
        // Store template pixel rect
        [result.templatePixelRectsArr addObject:@{
            @"x": @(rx), @"y": @(ry), @"w": @(rw), @"h": @(rh)
        }];
        
        // Find best matching contour
        double best = 0.0;
        cv::Rect bestRectForThis;
        BOOL foundMatch = NO;
        
        for (const auto& cr : contourRects) {
            double sc = [Utils calculateIoU:projectedRect withRect:cr];
            if (sc > best) {
                best = sc;
                bestRectForThis = cr;
                foundMatch = YES;
            }
        }
        
        if (foundMatch && best >= minIouForMatch) {
            matches++;
            [result.matchedArr addObject:@{
                @"x": @(bestRectForThis.x),
                @"y": @(bestRectForThis.y),
                @"w": @(bestRectForThis.width),
                @"h": @(bestRectForThis.height)
            }];
        } else {
            [result.matchedArr addObject:[NSNull null]];
        }
    }
    
    result.accuracy = templateBoxes.empty() ? 0.0 : (double)matches / (double)templateBoxes.size();
    return result;
}

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
                               outputH:(int)outputH {
    
    NSMutableDictionary* screenData = [NSMutableDictionary dictionary];
    
    // Basic detection info
    screenData[@"width"] = @(frameW);
    screenData[@"height"] = @(frameH);
    screenData[@"detected"] = @(detected);
    screenData[@"accuracy"] = @(accuracy);
    screenData[@"accuracy_threshold"] = @(accuracyThreshold);
    screenData[@"detection_count"] = @(detectionCounter);
    screenData[@"total_frames"] = @(totalFrameCounter);
    screenData[@"detection_rate"] = @(totalFrameCounter > 0 ? (double)detectionCounter / (double)totalFrameCounter : 0.0);
    
    // Frame size info
    screenData[@"source_frame_size"] = @{ @"w": @(srcWidth), @"h": @(srcHeight) };
    
    // Aspect ratio info
    screenData[@"screen_aspect"] = @{ @"w": @(screenAspectW), @"h": @(screenAspectH) };
    
    // Template size info
    screenData[@"template_target_size"] = @{ @"w": @(templateTargetW), @"h": @(templateTargetH) };
    
    // Homography matrix
    if (!H.empty()) {
        NSMutableArray* hRows = [NSMutableArray arrayWithCapacity:3];
        cv::Mat Hd;
        H.convertTo(Hd, CV_64F);
        for (int r = 0; r < Hd.rows; r++) {
            NSMutableArray* row = [NSMutableArray arrayWithCapacity:Hd.cols];
            for (int c = 0; c < Hd.cols; c++) {
                [row addObject:@((double)Hd.at<double>(r, c))];
            }
            [hRows addObject:row];
        }
        screenData[@"homography"] = hRows;
    } else {
        screenData[@"homography"] = [NSNull null];
    }
    
    // Homography inliers mask
    if (!mask.empty()) {
        NSMutableArray* maskArr = [NSMutableArray arrayWithCapacity:mask.rows * mask.cols];
        for (int i = 0; i < mask.rows; i++) {
            int v = (int)mask.at<uchar>(i, 0);
            [maskArr addObject:@(v ? 1 : 0)];
        }
        screenData[@"homography_inliers_mask"] = maskArr;
    } else {
        screenData[@"homography_inliers_mask"] = [NSNull null];
    }
    
    // ROI info
    screenData[@"roi_outer_px"] = @{
        @"x": @(roiOuterPx.x), @"y": @(roiOuterPx.y),
        @"w": @(roiOuterPx.width), @"h": @(roiOuterPx.height)
    };
    screenData[@"roi_inner_px"] = @{
        @"x": @(roiInnerPx.x), @"y": @(roiInnerPx.y),
        @"w": @(roiInnerPx.width), @"h": @(roiInnerPx.height)
    };
    
    // Best screen rectangle
    if (hasBestRect) {
        screenData[@"screen_rect"] = @{
            @"x": @(bestRect.x), @"y": @(bestRect.y),
            @"w": @(bestRect.width), @"h": @(bestRect.height)
        };
    }
    
    screenData[@"all_detected_rects"] = allRects;
    
    // Template rect for UI viewport mapping
    screenData[@"template_rect"] = @{
        @"x": @(roiOuterPx.x), @"y": @(roiOuterPx.y),
        @"w": @(roiOuterPx.width), @"h": @(roiOuterPx.height)
    };
    
    // Template and match info
    if (templatePixelRects.count > 0) {
        screenData[@"template_pixel_boxes"] = templatePixelRects;
    }
    if (matchedArr.count > 0) {
        screenData[@"matched_boxes"] = matchedArr;
    }
    
    // Warped image
    if (warpedImageBase64) {
        screenData[@"image_base64"] = warpedImageBase64;
        screenData[@"image_format"] = @"jpeg";
        screenData[@"image_size"] = @{ @"w": @(outputW), @"h": @(outputH) };
    }
    
    return screenData;
}

@end
