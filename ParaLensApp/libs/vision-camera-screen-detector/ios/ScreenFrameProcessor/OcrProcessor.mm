//
//  OcrProcessor.mm
//  vision-camera-screen-detector
//
//  Created by Refactoring
//

#import "OcrProcessor.h"
#import <algorithm>
#import <cmath>

@implementation OcrProcessor

+ (NSArray* _Nullable)parseOcrTemplate:(NSDictionary* _Nullable)args {
    NSArray* src = [Utils getArray:args key:@"ocrTemplate"];
    if (!src) return nil;
    
    NSMutableArray* out = [NSMutableArray array];
    for (id e in src) {
        if (![e isKindOfClass:[NSDictionary class]]) continue;
        NSDictionary* m = (NSDictionary*)e;
        
        NSString* id = [m[@"id"] isKindOfClass:[NSString class]] ? (NSString*)m[@"id"] : [[m objectForKey:@"id"] description];
        if (!id) continue;
        
        double x = [Utils getDouble:m key:@"x" defaultValue:0.0];
        double y = [Utils getDouble:m key:@"y" defaultValue:0.0];
        double w = [Utils getDouble:m key:@"width" defaultValue:0.0];
        double h = [Utils getDouble:m key:@"height" defaultValue:0.0];
        NSString* type = [m[@"type"] isKindOfClass:[NSString class]] ? (NSString*)m[@"type"] : @"value";
        NSDictionary* options = [Utils getMap:m key:@"options"];
        
        [out addObject:@{
            @"id": id,
            @"x": @(x),
            @"y": @(y),
            @"width": @(w),
            @"height": @(h),
            @"type": type,
            @"options": options ?: [NSNull null]
        }];
    }
    
    return out.count > 0 ? out : nil;
}

+ (NSMutableArray*)processOcrBoxes:(const cv::Mat&)warped
                          ocrBoxes:(NSArray*)ocrBoxes
                           outputW:(int)outputW
                           outputH:(int)outputH {
    NSMutableArray* ocrArr = [NSMutableArray arrayWithCapacity:ocrBoxes.count];
    
    for (NSDictionary* box in ocrBoxes) {
        NSString* boxId = box[@"id"];
        double x = [box[@"x"] doubleValue];
        double y = [box[@"y"] doubleValue];
        double w = [box[@"width"] doubleValue];
        double h = [box[@"height"] doubleValue];
        NSString* type = box[@"type"];
        NSDictionary* options = box[@"options"];
        if ([options isKindOfClass:[NSNull class]]) options = nil;
        
        int rx = (int)std::round((x / 100.0) * outputW);
        int ry = (int)std::round((y / 100.0) * outputH);
        int rw = std::max(1, (int)std::round((w / 100.0) * outputW));
        int rh = std::max(1, (int)std::round((h / 100.0) * outputH));
        int x2 = std::min(outputW, rx + rw);
        int y2 = std::min(outputH, ry + rh);
        
        cv::Rect roi(rx, ry, std::max(1, x2 - rx), std::max(1, y2 - ry));
        cv::Mat sub = warped(roi).clone();
        
        NSMutableDictionary* result = [NSMutableDictionary dictionary];
        result[@"id"] = boxId;
        
        if ([type isEqualToString:@"checkbox"]) {
            NSMutableDictionary* checkboxResult = [self processCheckbox:sub options:options boxId:boxId];
            [result addEntriesFromDictionary:checkboxResult];
        } else if ([type isEqualToString:@"scrollbar"]) {
            NSMutableDictionary* scrollbarResult = [self processScrollbar:sub options:options boxId:boxId];
            [result addEntriesFromDictionary:scrollbarResult];
        } else {
            NSMutableDictionary* valueResult = [self processValue:sub boxId:boxId];
            [result addEntriesFromDictionary:valueResult];
        }
        
        [ocrArr addObject:result];
    }
    
    return ocrArr;
}

+ (NSMutableDictionary*)processCheckbox:(const cv::Mat&)roi
                                options:(NSDictionary* _Nullable)options
                                   boxId:(NSString*)boxId {
    NSMutableDictionary* result = [NSMutableDictionary dictionary];

    cv::Mat normalized, smooth, bin;

    // 1) Local normalization (CLAHE) + light blur — same as Android
    @try {
        cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(2.0, cv::Size(8, 8));
        clahe->apply(roi, normalized);
    } @catch (...) {
        roi.copyTo(normalized);
    }
    cv::GaussianBlur(normalized, smooth, cv::Size(3, 3), 0.0);

    int area = std::max(1, smooth.rows * smooth.cols);

    // 2) Adaptive binarization (Otsu, invert so dark=white) → black ratio
    cv::threshold(smooth, bin, 0.0, 255.0, cv::THRESH_BINARY_INV | cv::THRESH_OTSU);
    int whiteCount = cv::countNonZero(bin);
    double blackRatio = (double)whiteCount / (double)area;

    // 3) Decision by threshold — use blackRatioMin key (aligned with Android)
    double blackRatioMin = [Utils getDouble:options key:@"blackRatioMin" defaultValue:0.30];
    blackRatioMin = std::max(0.0, std::min(1.0, blackRatioMin));
    BOOL isChecked = blackRatio >= blackRatioMin;

    auto clamp01 = [](double v) { return std::max(0.0, std::min(1.0, v)); };
    double confidence = clamp01((blackRatio - blackRatioMin) / 0.40);

    result[@"type"]         = @"checkbox";
    result[@"checked"]      = @(isChecked);
    result[@"confidence"]   = @(confidence);
    result[@"blackRatio"]   = @(blackRatio);
    result[@"blackRatioMin"] = @(blackRatioMin);

    return result;
}

+ (NSMutableDictionary*)processScrollbar:(const cv::Mat&)roi
                                 options:(NSDictionary* _Nullable)options
                                    boxId:(NSString*)boxId {
    NSMutableDictionary* result = [NSMutableDictionary dictionary];
    
    NSString* orientation = [options[@"orientation"] isKindOfClass:[NSString class]] ? 
                           (NSString*)options[@"orientation"] : 
                           ((roi.cols >= roi.rows) ? @"horizontal" : @"vertical");
    
    double positionPercent = 0.0;
    
    if ([orientation isEqualToString:@"horizontal"]) {
        cv::Mat proj;
        cv::reduce(roi, proj, 0, cv::REDUCE_SUM, CV_64F);
        int cols = proj.cols;
        std::vector<double> buf(cols);
        if (cols > 0) proj.row(0).copyTo(cv::Mat(buf));
        
        double maxVal = -DBL_MAX;
        int maxIdx = 0;
        for (int i = 0; i < cols; ++i) {
            double v = buf[i];
            if (v > maxVal) {
                maxVal = v;
                maxIdx = i;
            }
        }
        positionPercent = (cols > 1) ? ((double)maxIdx / (double)(cols - 1)) * 100.0 : 0.0;
    } else {
        cv::Mat proj;
        cv::reduce(roi, proj, 1, cv::REDUCE_SUM, CV_64F);
        int rows = proj.rows;
        std::vector<double> buf(rows);
        if (rows > 0) proj.col(0).copyTo(cv::Mat(buf));
        
        double maxVal = -DBL_MAX;
        int maxIdx = 0;
        for (int i = 0; i < rows; ++i) {
            double v = buf[i];
            if (v > maxVal) {
                maxVal = v;
                maxIdx = i;
            }
        }
        positionPercent = (rows > 1) ? ((double)maxIdx / (double)(rows - 1)) * 100.0 : 0.0;
    }
    
    result[@"type"] = @"scrollbar";
    result[@"positionPercent"] = @(positionPercent);
    
    return result;
}

+ (NSMutableDictionary*)processValue:(const cv::Mat&)roi
                               boxId:(NSString*)boxId {
    NSMutableDictionary* result = [NSMutableDictionary dictionary];
    
    result[@"type"] = @"value";
    result[@"text"] = [NSNull null];
    result[@"number"] = [NSNull null];
    result[@"confidence"] = @(0.0);
    
    // TODO: Add Vision text recognition for iOS here
    // For now, we'll leave this as a placeholder since iOS Vision framework
    // would need to be integrated separately
    
    return result;
}

+ (NSMutableDictionary*)processCheckboxWithValue:(const cv::Mat&)warped
                                      checkboxBox:(NSDictionary*)checkboxBox
                                        valueBox:(NSDictionary*)valueBox
                                         outputW:(int)outputW
                                         outputH:(int)outputH {
    NSMutableDictionary* result = [NSMutableDictionary dictionary];
    
    // Process checkbox first
    double cx = [checkboxBox[@"x"] doubleValue];
    double cy = [checkboxBox[@"y"] doubleValue];
    double cw = [checkboxBox[@"width"] doubleValue];
    double ch = [checkboxBox[@"height"] doubleValue];
    
    int crx = (int)std::round((cx / 100.0) * outputW);
    int cry = (int)std::round((cy / 100.0) * outputH);
    int crw = std::max(1, (int)std::round((cw / 100.0) * outputW));
    int crh = std::max(1, (int)std::round((ch / 100.0) * outputH));
    int cx2 = std::min(outputW, crx + crw);
    int cy2 = std::min(outputH, cry + crh);
    
    cv::Rect checkboxRoi(crx, cry, std::max(1, cx2 - crx), std::max(1, cy2 - cry));
    cv::Mat checkboxSub = warped(checkboxRoi).clone();
    
    NSDictionary* checkboxOptions = checkboxBox[@"options"];
    if ([checkboxOptions isKindOfClass:[NSNull class]]) checkboxOptions = nil;
    
    NSMutableDictionary* checkboxResult = [self processCheckbox:checkboxSub 
                                                       options:checkboxOptions 
                                                         boxId:checkboxBox[@"id"]];
    [result addEntriesFromDictionary:checkboxResult];
    
    // If checkbox is checked, also read the value
    BOOL checked = [result[@"checked"] boolValue];
    if (checked) {
        double vx = [valueBox[@"x"] doubleValue];
        double vy = [valueBox[@"y"] doubleValue];
        double vw = [valueBox[@"width"] doubleValue];
        double vh = [valueBox[@"height"] doubleValue];
        
        int vrx = (int)std::round((vx / 100.0) * outputW);
        int vry = (int)std::round((vy / 100.0) * outputH);
        int vrw = std::max(1, (int)std::round((vw / 100.0) * outputW));
        int vrh = std::max(1, (int)std::round((vh / 100.0) * outputH));
        int vx2 = std::min(outputW, vrx + vrw);
        int vy2 = std::min(outputH, vry + vrh);
        
        cv::Rect valueRoi(vrx, vry, std::max(1, vx2 - vrx), std::max(1, vy2 - vry));
        cv::Mat valueSub = warped(valueRoi).clone();
        
        // TODO: Add Vision text recognition for value reading here
        result[@"valueText"] = [NSNull null];
        result[@"valueNumber"] = [NSNull null];
        result[@"valueBoxId"] = valueBox[@"id"];
    }
    
    return result;
}

@end
