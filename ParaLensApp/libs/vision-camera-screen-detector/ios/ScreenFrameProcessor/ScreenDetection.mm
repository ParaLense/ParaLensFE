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

+ (struct TemplateMatchResult)matchTemplateBoxesInWarped:(const std::vector<SDBOX>&)templateBoxes
                                                  warped:(const cv::Mat&)warped
                                                 outputW:(int)outputW
                                                 outputH:(int)outputH
                                          paddingPercent:(double)paddingPercent
                                       minScoreForMatch:(double)minScoreForMatch {
    struct TemplateMatchResult result = {0.0, [NSMutableArray array], [NSMutableArray array]};
    if (templateBoxes.empty()) return result;

    int matches = 0;

    for (const auto& b : templateBoxes) {
        double boxW = (b.w / 100.0) * outputW;
        double boxH = (b.h / 100.0) * outputH;
        double paddingX = boxW * (paddingPercent / 100.0);
        double paddingY = boxH * (paddingPercent / 100.0);

        int rx = (int)std::max(0.0, (b.x / 100.0) * outputW - paddingX);
        int ry = (int)std::max(0.0, (b.y / 100.0) * outputH - paddingY);
        int rw = (int)std::min((double)(outputW - rx), boxW + 2.0 * paddingX);
        int rh = (int)std::min((double)(outputH - ry), boxH + 2.0 * paddingY);

        int innerX = (int)std::max(0.0, paddingX);
        int innerY = (int)std::max(0.0, paddingY);
        int innerW = (int)std::max(3.0, std::min((double)(rw - innerX), boxW));
        int innerH = (int)std::max(3.0, std::min((double)(rh - innerY), boxH));

        // Store template pixel rect (original position without padding)
        [result.templatePixelRectsArr addObject:@{
            @"x": @(rx + innerX), @"y": @(ry + innerY),
            @"w": @(innerW),      @"h": @(innerH)
        }];

        if (rw < 5 || rh < 5 || innerW < 3 || innerH < 3) {
            [result.matchedArr addObject:[NSNull null]];
            continue;
        }

        cv::Rect roiRect(rx, ry, rw, rh);
        // Clamp to warped bounds
        roiRect &= cv::Rect(0, 0, warped.cols, warped.rows);
        if (roiRect.width < 5 || roiRect.height < 5) {
            [result.matchedArr addObject:[NSNull null]];
            continue;
        }
        cv::Mat roi = warped(roiRect);

        // --- Method 1: Edge detection at box borders ---
        cv::Mat edges, corners, cornerMask, gradX, gradY, magnitude;
        cv::Canny(roi, edges, 30.0, 80.0);

        int borderWidth = 2;
        int topEdgeY1    = std::max(0, innerY - borderWidth);
        int topEdgeY2    = std::min(rh, innerY + borderWidth);
        int bottomEdgeY1 = std::max(0, innerY + innerH - borderWidth);
        int bottomEdgeY2 = std::min(rh, innerY + innerH + borderWidth);
        int leftEdgeX1   = std::max(0, innerX - borderWidth);
        int leftEdgeX2   = std::min(rw, innerX + borderWidth);
        int rightEdgeX1  = std::max(0, innerX + innerW - borderWidth);
        int rightEdgeX2  = std::min(rw, innerX + innerW + borderWidth);

        double topEdgeCount = 0, bottomEdgeCount = 0, leftEdgeCount = 0, rightEdgeCount = 0;
        int innerWClamped = std::min(innerW, rw - innerX);
        int innerHClamped = std::min(innerH, rh - innerY);
        if (topEdgeY2 > topEdgeY1 && innerWClamped > 0)
            topEdgeCount    = cv::countNonZero(edges(cv::Rect(innerX, topEdgeY1, innerWClamped, topEdgeY2 - topEdgeY1)));
        if (bottomEdgeY2 > bottomEdgeY1 && innerWClamped > 0)
            bottomEdgeCount = cv::countNonZero(edges(cv::Rect(innerX, bottomEdgeY1, innerWClamped, bottomEdgeY2 - bottomEdgeY1)));
        if (leftEdgeX2 > leftEdgeX1 && innerHClamped > 0)
            leftEdgeCount   = cv::countNonZero(edges(cv::Rect(leftEdgeX1, innerY, leftEdgeX2 - leftEdgeX1, innerHClamped)));
        if (rightEdgeX2 > rightEdgeX1 && innerHClamped > 0)
            rightEdgeCount  = cv::countNonZero(edges(cv::Rect(rightEdgeX1, innerY, rightEdgeX2 - rightEdgeX1, innerHClamped)));

        double totalBorderPixels = std::max(1.0, (double)(innerW * borderWidth * 2 + innerH * borderWidth * 2));
        double borderEdgeRatio = (topEdgeCount + bottomEdgeCount + leftEdgeCount + rightEdgeCount) / totalBorderPixels;

        // --- Method 2: Corner detection ---
        cv::cornerHarris(roi, corners, 2, 3, 0.04);
        double maxCornerVal;
        cv::minMaxLoc(corners, nullptr, &maxCornerVal);
        cv::compare(corners, cv::Scalar(maxCornerVal * 0.01), cornerMask, cv::CMP_GT);

        int cornerSize = 3;
        int cornersFound = 0;
        // Top-left
        if (innerY >= cornerSize && innerX >= cornerSize)
            if (cv::countNonZero(cornerMask(cv::Rect(innerX - cornerSize, innerY - cornerSize, cornerSize * 2, cornerSize * 2))) > 0) cornersFound++;
        // Top-right
        if (innerY >= cornerSize && innerX + innerW + cornerSize <= rw)
            if (cv::countNonZero(cornerMask(cv::Rect(innerX + innerW - cornerSize, innerY - cornerSize, cornerSize * 2, cornerSize * 2))) > 0) cornersFound++;
        // Bottom-left
        if (innerY + innerH + cornerSize <= rh && innerX >= cornerSize)
            if (cv::countNonZero(cornerMask(cv::Rect(innerX - cornerSize, innerY + innerH - cornerSize, cornerSize * 2, cornerSize * 2))) > 0) cornersFound++;
        // Bottom-right
        if (innerY + innerH + cornerSize <= rh && innerX + innerW + cornerSize <= rw)
            if (cv::countNonZero(cornerMask(cv::Rect(innerX + innerW - cornerSize, innerY + innerH - cornerSize, cornerSize * 2, cornerSize * 2))) > 0) cornersFound++;
        double cornerScore = cornersFound / 4.0;

        // --- Method 3: Gradient verification at box borders ---
        cv::Sobel(roi, gradX, CV_64F, 1, 0, 3);
        cv::Sobel(roi, gradY, CV_64F, 0, 1, 3);
        cv::magnitude(gradX, gradY, magnitude);

        double avgTopGrad = 0, avgBottomGrad = 0;
        int topGradY1    = std::max(0, innerY - 1);
        int topGradY2    = std::min(rh, innerY + 1);
        int bottomGradY1 = std::max(0, innerY + innerH - 1);
        int bottomGradY2 = std::min(rh, innerY + innerH + 1);
        if (topGradY2 > topGradY1 && innerWClamped > 0) {
            cv::Scalar m = cv::mean(magnitude(cv::Rect(innerX, topGradY1, innerWClamped, topGradY2 - topGradY1)));
            avgTopGrad = m[0];
        }
        if (bottomGradY2 > bottomGradY1 && innerWClamped > 0) {
            cv::Scalar m = cv::mean(magnitude(cv::Rect(innerX, bottomGradY1, innerWClamped, bottomGradY2 - bottomGradY1)));
            avgBottomGrad = m[0];
        }
        double avgBorderGrad = (avgTopGrad + avgBottomGrad) / 2.0;

        // --- Combined score ---
        double edgeScore       = (borderEdgeRatio > 0.1) ? 0.5 : std::min(0.5, borderEdgeRatio * 5.0);
        double cornerScoreW    = cornerScore * 0.3;
        double gradientScore   = (avgBorderGrad > 15.0) ? 0.2 : 0.0;
        double totalScore      = edgeScore + cornerScoreW + gradientScore;

        BOOL hasMatch = totalScore >= minScoreForMatch;
        if (hasMatch) {
            matches++;
            [result.matchedArr addObject:@{
                @"x": @(rx + innerX), @"y": @(ry + innerY),
                @"w": @(innerW),      @"h": @(innerH),
                @"score": @(totalScore),
                @"borderEdgeRatio": @(borderEdgeRatio),
                @"cornerScore": @(cornerScore),
                @"avgBorderGrad": @(avgBorderGrad)
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
