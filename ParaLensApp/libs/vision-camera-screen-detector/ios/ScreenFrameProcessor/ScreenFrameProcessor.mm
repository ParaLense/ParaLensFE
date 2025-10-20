#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <CoreImage/CoreImage.h>

// OpenCV-basierter Frame-Processor: ROI → Konturen → Polygon → Homographie (+ optionale Bildrückgabe)
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

// -----------------------------
// Helpers: Typed-Optionen lesen
// -----------------------------
static double sd_getDouble(NSDictionary* _Nullable dict, NSString* key, double def) {
  if (dict == nil) return def;
  id v = dict[key];
  if (!v) return def;
  if ([v isKindOfClass:[NSNumber class]]) return [(NSNumber*)v doubleValue];
  if ([v isKindOfClass:[NSString class]]) return [(NSString*)v doubleValue];
  return def;
}

static int sd_getInt(NSDictionary* _Nullable dict, NSString* key, int def) {
  if (dict == nil) return def;
  id v = dict[key];
  if (!v) return def;
  if ([v isKindOfClass:[NSNumber class]]) return [(NSNumber*)v intValue];
  if ([v isKindOfClass:[NSString class]]) return [(NSString*)v intValue];
  return def;
}

static BOOL sd_getBool(NSDictionary* _Nullable dict, NSString* key, BOOL def) {
  if (dict == nil) return def;
  id v = dict[key];
  if (!v) return def;
  if ([v isKindOfClass:[NSNumber class]]) return [(NSNumber*)v boolValue];
  if ([v isKindOfClass:[NSString class]]) return [(NSString*)v boolValue];
  return def;
}

static NSArray* _Nullable sd_getArray(NSDictionary* _Nullable dict, NSString* key) {
  if (dict == nil) return nil;
  id v = dict[key];
  if ([v isKindOfClass:[NSArray class]]) return (NSArray*)v;
  return nil;
}

static NSDictionary* _Nullable sd_getMap(NSDictionary* _Nullable dict, NSString* key) {
  if (dict == nil) return nil;
  id v = dict[key];
  if ([v isKindOfClass:[NSDictionary class]]) return (NSDictionary*)v;
  return nil;
}

// Template-Box (Prozentwerte relativ zur virtuellen Template-Fläche)
typedef struct {
  __unsafe_unretained NSString* _Nullable bid;
  double x, y, w, h; // percent
} SDBOX;

// Liest Template-Boxen aus arguments oder Plugin-Optionen
static std::vector<SDBOX> sd_parseTemplate(NSDictionary* _Nullable args, NSDictionary* _Nullable options) {
  NSArray* tmpl = sd_getArray(args, @"template");
  if (!tmpl) tmpl = sd_getArray(options, @"template");
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

// IoU-Metrik zweier Rechtecke
static double sd_iou(const cv::Rect& a, const cv::Rect& b) {
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

// Prozent-Box -> 4 Eckpunkte in virtueller Template-Fläche
static void sd_percentBoxToPts(const SDBOX& b, int tw, int th, std::vector<cv::Point2f>& pts) {
  double x = b.x / 100.0 * tw;
  double y = b.y / 100.0 * th;
  double w = b.w / 100.0 * tw;
  double h = b.h / 100.0 * th;
  pts.emplace_back((float)x, (float)y);
  pts.emplace_back((float)(x + w), (float)y);
  pts.emplace_back((float)(x + w), (float)(y + h));
  pts.emplace_back((float)x, (float)(y + h));
}

// Rechteck -> 4 Eckpunkte in Ziel-Bildebene
static void sd_rectToPts(const cv::Rect& r, std::vector<cv::Point2f>& pts) {
  float x = (float)r.x, y = (float)r.y, w = (float)r.width, h = (float)r.height;
  pts.emplace_back(x, y);
  pts.emplace_back(x + w, y);
  pts.emplace_back(x + w, y + h);
  pts.emplace_back(x, y + h);
}

static cv::Rect sd_normToPx(NSDictionary* rect, int W, int H) {
  double x = sd_getDouble(rect, @"x", 0.0);
  double y = sd_getDouble(rect, @"y", 0.0);
  double w = sd_getDouble(rect, @"width", 1.0);
  double h = sd_getDouble(rect, @"height", 1.0);
  int px = (int)std::round(x * W);
  int py = (int)std::round(y * H);
  int pw = std::max(1, (int)std::round(w * W));
  int ph = std::max(1, (int)std::round(h * H));
  return cv::Rect(px, py, pw, ph);
}

static cv::Rect sd_enforceMinAspect(cv::Rect r, int W, int H, double minAspect) {
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

static BOOL sd_rectWithinRoi(const cv::Rect& t, const cv::Rect& inner, const cv::Rect& outer, int tol) {
  int tx1 = t.x, ty1 = t.y, tx2 = t.x + t.width, ty2 = t.y + t.height;
  int ox1 = outer.x, oy1 = outer.y, ox2 = outer.x + outer.width, oy2 = outer.y + outer.height;
  int ix1 = inner.x, iy1 = inner.y, ix2 = inner.x + inner.width, iy2 = inner.y + inner.height;
  if (tx1 < ox1 - tol || ty1 < oy1 - tol || tx2 > ox2 + tol || ty2 > oy2 + tol) return NO;
  if (tx1 > ix1 + tol) return NO;
  if (ty1 > iy1 + tol) return NO;
  if (tx2 < ix2 - tol) return NO;
  if (ty2 < iy2 - tol) return NO;
  return YES;
}

static std::vector<cv::Point2f> sd_orderQuad(const std::vector<cv::Point2f>& p) {
  std::vector<cv::Point2f> out(4);
  std::vector<double> sums(4), diffs(4);
  for (int i = 0; i < 4; ++i) { sums[i] = p[i].x + p[i].y; diffs[i] = p[i].x - p[i].y; }
  int tl = (int)std::distance(sums.begin(), std::min_element(sums.begin(), sums.end()));
  int br = (int)std::distance(sums.begin(), std::max_element(sums.begin(), sums.end()));
  int tr = (int)std::distance(diffs.begin(), std::min_element(diffs.begin(), diffs.end()));
  int bl = (int)std::distance(diffs.begin(), std::max_element(diffs.begin(), diffs.end()));
  out[0] = p[tl]; out[1] = p[tr]; out[2] = p[br]; out[3] = p[bl];
  return out;
}

- (id _Nullable)callback:(Frame* _Nonnull)frame
           withArguments:(NSDictionary* _Nullable)arguments {
  CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer);
  size_t width = CVPixelBufferGetWidth(pixelBuffer);
  size_t height = CVPixelBufferGetHeight(pixelBuffer);

  @try {
    // Parameters for ROI-driven detection
    int screenAspectW = sd_getInt(arguments, @"screenAspectW", sd_getInt(self.options, @"screenAspectW", 3));
    int screenAspectH = sd_getInt(arguments, @"screenAspectH", sd_getInt(self.options, @"screenAspectH", 4));
    int templateTargetW = sd_getInt(arguments, @"templateTargetW", sd_getInt(self.options, @"templateTargetW", 1200));
    int templateTargetH = sd_getInt(arguments, @"templateTargetH", sd_getInt(self.options, @"templateTargetH", 1600));
    BOOL returnWarpedImage = sd_getBool(arguments, @"returnWarpedImage", sd_getBool(self.options, @"returnWarpedImage", NO));
    int outputW = sd_getInt(arguments, @"outputW", templateTargetW);
    int outputH = sd_getInt(arguments, @"outputH", templateTargetH);
    int imageQuality = sd_getInt(arguments, @"imageQuality", 80);

    NSDictionary* roiOuterArg = sd_getMap(arguments, @"roiOuter");
    NSDictionary* roiInnerArg = sd_getMap(arguments, @"roiInner");
    if (!roiOuterArg) roiOuterArg = @{ @"x": @0.10, @"y": @0.05, @"width": @0.80, @"height": @0.90 };
    if (!roiInnerArg) roiInnerArg = @{ @"x": @0.30, @"y": @0.20, @"width": @0.45, @"height": @0.60 };
    int minAspectW = sd_getInt(arguments, @"minAspectW", 3);
    int minAspectH = sd_getInt(arguments, @"minAspectH", 4);
    double minAspect = (minAspectH != 0) ? ((double)minAspectW / (double)minAspectH) : 0.75;

    // Create gray and rotate 90 CW
    CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    size_t bytesPerRow = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0);
    void* base = CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0);
    cv::Mat gray((int)height, (int)width, CV_8UC1);
    if (base) {
      for (int row = 0; row < gray.rows; ++row) {
        memcpy(gray.ptr(row), (uint8_t*)base + row * bytesPerRow, (size_t)gray.cols);
      }
    }
    cv::Mat rotated; cv::rotate(gray, rotated, cv::ROTATE_90_CLOCKWISE);
    int frameW = rotated.cols, frameH = rotated.rows;

    cv::Rect roiOuterPx = sd_enforceMinAspect(sd_normToPx(roiOuterArg, frameW, frameH), frameW, frameH, minAspect);
    cv::Rect roiInnerPx = sd_enforceMinAspect(sd_normToPx(roiInnerArg, frameW, frameH), frameW, frameH, minAspect);

    cv::Mat edges; cv::Canny(rotated, edges, 50.0, 150.0);
    std::vector<std::vector<cv::Point>> contours; cv::findContours(edges, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);

    cv::Rect bestRect; bool hasBest = false; double bestScore = 0.0; std::vector<cv::Point2f> bestQuad;
    NSMutableArray* allRects = [NSMutableArray array];
    for (const auto& cnt : contours) {
      double peri = cv::arcLength(cnt, true);
      std::vector<cv::Point> approx; cv::approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.size() != 4) continue;
      cv::Rect rect = cv::boundingRect(approx) & cv::Rect(0,0,frameW,frameH);
      if (rect.width <= 0 || rect.height <= 0) continue;
      [allRects addObject:@{ @"x": @(rect.x), @"y": @(rect.y), @"w": @(rect.width), @"h": @(rect.height) }];
      if (!sd_rectWithinRoi(rect, roiInnerPx, roiOuterPx, 12)) continue;
      double score = sd_iou(rect, rect);
      if (score > bestScore) {
        bestScore = score; bestRect = rect; hasBest = true;
        std::vector<cv::Point2f> pts(4);
        for (int i = 0; i < 4; ++i) pts[i] = cv::Point2f((float)approx[i].x, (float)approx[i].y);
        bestQuad = sd_orderQuad(pts);
      }
    }

    cv::Mat H;
    if (hasBest) {
      std::vector<cv::Point2f> dst = {
        cv::Point2f(0.f, 0.f),
        cv::Point2f((float)templateTargetW, 0.f),
        cv::Point2f((float)templateTargetW, (float)templateTargetH),
        cv::Point2f(0.f, (float)templateTargetH)
      };
      H = cv::findHomography(bestQuad, dst, cv::RANSAC, 3.0);
    }

    // Optional: entzerrtes Bild (Gray) -> JPEG Base64
    NSString* imageBase64 = nil;
    if (!H.empty() && returnWarpedImage) {
      cv::Mat warped;
      cv::warpPerspective(gray, warped, H, cv::Size(outputW, outputH));
      std::vector<uchar> buf;
      std::vector<int> params = { cv::IMWRITE_JPEG_QUALITY, std::max(0, std::min(100, imageQuality)) };
      if (cv::imencode(".jpg", warped, buf, params)) {
        NSData* data = [NSData dataWithBytes:buf.data() length:buf.size()];
        imageBase64 = [data base64EncodedStringWithOptions:0];
      }
    }

    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

    // Ergebnis-Objekt aufbauen
    NSMutableDictionary* screenData = [NSMutableDictionary dictionary];
    screenData[@"width"] = @((int)frameW);
    screenData[@"height"] = @((int)frameH);
    BOOL detected = !H.empty();
    screenData[@"accuracy"] = detected ? @(1.0) : @(0.0);
    screenData[@"detected"] = @(detected);

    NSMutableDictionary* sizeMap = [NSMutableDictionary dictionary];
    sizeMap[@"w"] = @(templateTargetW);
    sizeMap[@"h"] = @(templateTargetH);
    screenData[@"template_target_size"] = sizeMap;

    if (!H.empty()) {
      NSMutableArray* hRows = [NSMutableArray arrayWithCapacity:3];
      cv::Mat Hd; H.convertTo(Hd, CV_64F);
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

    if (!inlierMask.empty()) {
      NSMutableArray* maskArr = [NSMutableArray arrayWithCapacity:inlierMask.rows * inlierMask.cols];
      for (int i = 0; i < inlierMask.rows; i++) {
        int v = (int)inlierMask.at<uchar>(i, 0);
        [maskArr addObject:@(v ? 1 : 0)];
      }
      screenData[@"homography_inliers_mask"] = maskArr;
    } else {
      screenData[@"homography_inliers_mask"] = [NSNull null];
    }

    // ROI + candidate reporting
    screenData[@"roi_outer_px"] = @{ @"x": @(roiOuterPx.x), @"y": @(roiOuterPx.y), @"w": @(roiOuterPx.width), @"h": @(roiOuterPx.height) };
    screenData[@"roi_inner_px"] = @{ @"x": @(roiInnerPx.x), @"y": @(roiInnerPx.y), @"w": @(roiInnerPx.width), @"h": @(roiInnerPx.height) };
    if (hasBest) {
      screenData[@"screen_rect"] = @{ @"x": @(bestRect.x), @"y": @(bestRect.y), @"w": @(bestRect.width), @"h": @(bestRect.height) };
    }
    screenData[@"all_detected_rects"] = allRects;
    screenData[@"template_rect"] = @{ @"x": @(roiOuterPx.x), @"y": @(roiOuterPx.y), @"w": @(roiOuterPx.width), @"h": @(roiOuterPx.height) };

    if (detected && imageBase64 != nil) {
      screenData[@"image_base64"] = imageBase64;
      screenData[@"image_format"] = @"jpeg";
      screenData[@"image_size"] = @{ @"w": @(outputW), @"h": @(outputH) };
    }

    return @{ @"screen": screenData };
  } @catch (NSException *exception) {
    NSLog(@"Screen detection error: %@", exception.reason);
    return nil;
  }
}

VISION_EXPORT_FRAME_PROCESSOR(ScreenDetectorFrameProcessorPlugin, detectScreen)

@end
