//
//  Utils.mm
//  vision-camera-screen-detector
//
//  Created by Refactoring
//

#import "Utils.h"
#import <algorithm>
#import <cmath>

@implementation Utils

+ (double)getDouble:(NSDictionary* _Nullable)dict key:(NSString*)key defaultValue:(double)def {
    if (dict == nil) return def;
    id v = dict[key];
    if (!v) return def;
    if ([v isKindOfClass:[NSNumber class]]) return [(NSNumber*)v doubleValue];
    if ([v isKindOfClass:[NSString class]]) return [(NSString*)v doubleValue];
    return def;
}

+ (int)getInt:(NSDictionary* _Nullable)dict key:(NSString*)key defaultValue:(int)def {
    if (dict == nil) return def;
    id v = dict[key];
    if (!v) return def;
    if ([v isKindOfClass:[NSNumber class]]) return [(NSNumber*)v intValue];
    if ([v isKindOfClass:[NSString class]]) return [(NSString*)v intValue];
    return def;
}

+ (BOOL)getBool:(NSDictionary* _Nullable)dict key:(NSString*)key defaultValue:(BOOL)def {
    if (dict == nil) return def;
    id v = dict[key];
    if (!v) return def;
    if ([v isKindOfClass:[NSNumber class]]) return [(NSNumber*)v boolValue];
    if ([v isKindOfClass:[NSString class]]) return [(NSString*)v boolValue];
    return def;
}

+ (NSArray* _Nullable)getArray:(NSDictionary* _Nullable)dict key:(NSString*)key {
    if (dict == nil) return nil;
    id v = dict[key];
    if ([v isKindOfClass:[NSArray class]]) return (NSArray*)v;
    return nil;
}

+ (NSDictionary* _Nullable)getMap:(NSDictionary* _Nullable)dict key:(NSString*)key {
    if (dict == nil) return nil;
    id v = dict[key];
    if ([v isKindOfClass:[NSDictionary class]]) return (NSDictionary*)v;
    return nil;
}

+ (std::vector<SDBOX>)parseTemplate:(NSDictionary* _Nullable)args options:(NSDictionary* _Nullable)options {
    NSArray* tmpl = [self getArray:args key:@"template"];
    if (!tmpl) tmpl = [self getArray:options key:@"template"];
    std::vector<SDBOX> out;
    if (!tmpl) return out;
    
    for (id e in tmpl) {
        if (![e isKindOfClass:[NSDictionary class]]) continue;
        NSDictionary* m = (NSDictionary*)e;
        SDBOX b;
        b.bid = [m[@"id"] isKindOfClass:[NSString class]] ? (NSString*)m[@"id"] : [[m objectForKey:@"id"] description];
        NSNumber* nx = m[@"x"], *ny = m[@"y"], *nw = m[@"width"], *nh = m[@"height"];
        if (!nx || !ny || !nw || !nh) continue;
        b.x = [nx doubleValue]; b.y = [ny doubleValue]; b.w = [nw doubleValue]; b.h = [nh doubleValue];
        out.push_back(b);
    }
    return out;
}

+ (double)calculateIoU:(const cv::Rect&)a withRect:(const cv::Rect&)b {
    int xA = std::max(a.x, b.x);
    int yA = std::max(a.y, b.y);
    int xB = std::min(a.x + a.width, b.x + b.width);
    int yB = std::min(a.y + a.height, b.y + b.height);
    int interW = std::max(0, xB - xA);
    int interH = std::max(0, yB - yA);
    int interArea = interW * interH;
    int areaA = a.width * a.height;
    int areaB = b.width * b.height;
    int uni = areaA + areaB - interArea;
    return uni > 0 ? (double)interArea / (double)uni : 0.0;
}

+ (cv::Rect)normToPx:(NSDictionary*)rect width:(int)W height:(int)H {
    double x = [self getDouble:rect key:@"x" defaultValue:0.0];
    double y = [self getDouble:rect key:@"y" defaultValue:0.0];
    double w = [self getDouble:rect key:@"width" defaultValue:1.0];
    double h = [self getDouble:rect key:@"height" defaultValue:1.0];
    int px = (int)std::round(x * W);
    int py = (int)std::round(y * H);
    int pw = std::max(1, (int)std::round(w * W));
    int ph = std::max(1, (int)std::round(h * H));
    return cv::Rect(px, py, pw, ph);
}

+ (cv::Rect)enforceMinAspect:(cv::Rect)r width:(int)W height:(int)H minAspect:(double)minAspect {
    if (r.width <= 0 || r.height <= 0) return r;
    double ratio = (double)r.width / (double)r.height;
    if (ratio < minAspect) {
        int newH = std::max(1, (int)std::round(r.width / minAspect));
        int cy = r.y + r.height / 2;
        r.y = std::max(0, std::min(H - newH, cy - newH / 2));
        r.height = newH;
    }
    r.x = std::max(0, std::min(W - r.width, r.x));
    r.y = std::max(0, std::min(H - r.height, r.y));
    return r;
}

+ (BOOL)rectWithinRoi:(const cv::Rect&)test inner:(const cv::Rect&)inner outer:(const cv::Rect&)outer tolerance:(int)tol {
    int tx1 = test.x, ty1 = test.y, tx2 = test.x + test.width, ty2 = test.y + test.height;
    int ox1 = outer.x, oy1 = outer.y, ox2 = outer.x + outer.width, oy2 = outer.y + outer.height;
    int ix1 = inner.x, iy1 = inner.y, ix2 = inner.x + inner.width, iy2 = inner.y + inner.height;
    if (tx1 < ox1 - tol || ty1 < oy1 - tol || tx2 > ox2 + tol || ty2 > oy2 + tol) return NO;
    if (tx1 > ix1 + tol) return NO;
    if (ty1 > iy1 + tol) return NO;
    if (tx2 < ix2 - tol) return NO;
    if (ty2 < iy2 - tol) return NO;
    return YES;
}

+ (void)percentBoxToPts:(const SDBOX&)box templateWidth:(int)tw templateHeight:(int)th points:(std::vector<cv::Point2f>&)pts {
    double x = box.x / 100.0 * tw;
    double y = box.y / 100.0 * th;
    double w = box.w / 100.0 * tw;
    double h = box.h / 100.0 * th;
    pts.emplace_back((float)x, (float)y);
    pts.emplace_back((float)(x + w), (float)y);
    pts.emplace_back((float)(x + w), (float)(y + h));
    pts.emplace_back((float)x, (float)(y + h));
}

+ (void)rectToPts:(const cv::Rect&)r points:(std::vector<cv::Point2f>&)pts {
    float x = (float)r.x, y = (float)r.y, w = (float)r.width, h = (float)r.height;
    pts.emplace_back(x, y);
    pts.emplace_back(x + w, y);
    pts.emplace_back(x + w, y + h);
    pts.emplace_back(x, y + h);
}

+ (std::vector<cv::Point2f>)orderQuad:(const std::vector<cv::Point2f>&)p {
    std::vector<cv::Point2f> out(4);
    std::vector<double> sums(4), diffs(4);
    for (int i = 0; i < 4; ++i) { 
        sums[i] = p[i].x + p[i].y; 
        diffs[i] = p[i].x - p[i].y; 
    }
    int tl = (int)std::distance(sums.begin(), std::min_element(sums.begin(), sums.end()));
    int br = (int)std::distance(sums.begin(), std::max_element(sums.begin(), sums.end()));
    int tr = (int)std::distance(diffs.begin(), std::min_element(diffs.begin(), diffs.end()));
    int bl = (int)std::distance(diffs.begin(), std::max_element(diffs.begin(), diffs.end()));
    out[0] = p[tl]; out[1] = p[tr]; out[2] = p[br]; out[3] = p[bl];
    return out;
}

@end
