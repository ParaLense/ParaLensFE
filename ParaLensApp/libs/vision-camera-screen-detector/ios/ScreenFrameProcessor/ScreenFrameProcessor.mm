#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <CoreImage/CoreImage.h>

// OpenCV-basierter Frame-Processor: Template-Box-Erkennung + optionale Bildrückgabe (Base64 JPEG)
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

- (id _Nullable)callback:(Frame* _Nonnull)frame
           withArguments:(NSDictionary* _Nullable)arguments {
  CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer);
  size_t width = CVPixelBufferGetWidth(pixelBuffer);
  size_t height = CVPixelBufferGetHeight(pixelBuffer);

  @try {
    // 1) Template lesen (Pflicht). Ohne Template -> detected=false
    std::vector<SDBOX> templateBoxes = sd_parseTemplate(arguments, self.options);
    if (templateBoxes.empty()) {
      NSDictionary *screenData = @{
        @"width": @(width),
        @"height": @(height),
        @"detected": @NO
      };
      return @{ @"screen": screenData };
    }

    // 2) Parameter (mit Defaults)
    double screenWidthRatio = sd_getDouble(arguments, @"screenWidthRatio", sd_getDouble(self.options, @"screenWidthRatio", 0.80));
    int screenAspectW = sd_getInt(arguments, @"screenAspectW", sd_getInt(self.options, @"screenAspectW", 3));
    int screenAspectH = sd_getInt(arguments, @"screenAspectH", sd_getInt(self.options, @"screenAspectH", 4));
    double minIouForMatch = sd_getDouble(arguments, @"minIouForMatch", sd_getDouble(self.options, @"minIouForMatch", 0.30));
    double accuracyThreshold = sd_getDouble(arguments, @"accuracyThreshold", sd_getDouble(self.options, @"accuracyThreshold", 0.60));
    int templateTargetW = sd_getInt(arguments, @"templateTargetW", sd_getInt(self.options, @"templateTargetW", 1200));
    int templateTargetH = sd_getInt(arguments, @"templateTargetH", sd_getInt(self.options, @"templateTargetH", 1600));

    BOOL returnWarpedImage = sd_getBool(arguments, @"returnWarpedImage", sd_getBool(self.options, @"returnWarpedImage", NO));
    int outputW = sd_getInt(arguments, @"outputW", templateTargetW);
    int outputH = sd_getInt(arguments, @"outputH", templateTargetH);
    int imageQuality = sd_getInt(arguments, @"imageQuality", 80);

    // 3) Template-Boxen -> Pixelrechtecke bezogen auf den zentralen Bereich (screenWidthRatio)
    double cropW = width * screenWidthRatio;
    double cropX = (width - cropW) / 2.0;
    std::vector<cv::Rect> templateRects;
    for (const SDBOX& b : templateBoxes) {
      int x = (int)(b.x / 100.0 * cropW + cropX);
      int y = (int)(b.y / 100.0 * height);
      int w = (int)(b.w / 100.0 * cropW);
      int h = (int)(b.h / 100.0 * height);
      templateRects.emplace_back(x, y, w, h);
    }
// Neu: Pixel-Rechtecke vorbereiten (vor Matching)
    NSMutableArray* tmplPixelArr = [NSMutableArray arrayWithCapacity:templateRects.size()];
    for (const auto& r : templateRects) {
      [tmplPixelArr addObject:@{ @"x": @(r.x), @"y": @(r.y), @"w": @(r.width), @"h": @(r.height) }];
    }

    // 5) Kontur-Rechtecke per IoU dem besten Template zuordnen
    std::vector<cv::Rect> matched(templateRects.size());
    std::vector<bool> matchedValid(templateRects.size(), false);

    for (const auto& cnt : contours) {
      double peri = cv::arcLength(cnt, true);
      std::vector<cv::Point> approx;
      cv::approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.size() == 4) {
        cv::Rect rect = cv::boundingRect(approx);
        rect &= cv::Rect(0, 0, (int)width, (int)height);
        if (rect.width <= 0 || rect.height <= 0) continue;
        double bestIou = 0.0; int bestIdx = -1;
        for (size_t i = 0; i < templateRects.size(); ++i) {
          double score = sd_iou(rect, templateRects[i]);
          if (score > bestIou) { bestIou = score; bestIdx = (int)i; }
        }
        if (bestIdx >= 0 && bestIou > minIouForMatch) {
          matched[bestIdx] = rect; matchedValid[bestIdx] = true;
        }
      }
    }

    // 6) Genauigkeit + Homographie (RANSAC)
    int matchedCount = 0;
    for (bool v : matchedValid) if (v) matchedCount++;
    int total = (int)matchedValid.size();
    double accuracy = total > 0 ? (double)matchedCount / (double)total : 0.0;

    cv::Mat H, inlierMask;
    if (matchedCount >= 1) {
      std::vector<cv::Point2f> srcPts, dstPts;
      srcPts.reserve(matchedCount * 4);
      dstPts.reserve(matchedCount * 4);
      for (size_t i = 0; i < templateBoxes.size(); ++i) {
        if (!matchedValid[i]) continue;
        sd_percentBoxToPts(templateBoxes[i], templateTargetW, templateTargetH, srcPts);
        sd_rectToPts(matched[i], dstPts);
      }
      if (srcPts.size() >= 4) {
        H = cv::findHomography(srcPts, dstPts, cv::RANSAC, 3.0, inlierMask, 2000, 0.995);
      }
    }

    // 7) Optional: entzerrtes Bild (Gray) -> JPEG Base64
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

    // 8) Ergebnis-Objekt aufbauen
    NSMutableDictionary* screenData = [NSMutableDictionary dictionary];
    screenData[@"width"] = @((int)width);
    screenData[@"height"] = @((int)height);
    screenData[@"accuracy"] = @(accuracy);
    screenData[@"accuracy_threshold"] = @(accuracyThreshold);
    BOOL detected = (accuracy >= accuracyThreshold) && !H.empty();
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

    NSMutableArray* matchedArr = [NSMutableArray arrayWithCapacity:total];
    for (int i = 0; i < total; i++) {
      if (!matchedValid[i]) {
        [matchedArr addObject:[NSNull null]];
      } else {
        cv::Rect r = matched[i];
        [matchedArr addObject:@{ @"x": @(r.x), @"y": @(r.y), @"w": @(r.width), @"h": @(r.height) }];
      }
    }
    screenData[@"matched_boxes"] = matchedArr;
// Neu: template_pixel_boxes + crop_info
    screenData[@"template_pixel_boxes"] = tmplPixelArr;
    screenData[@"crop_info"] = @{
      @"crop_x": @(cropX),
      @"crop_w": @(cropW),
      @"screen_width_ratio": @(screenWidthRatio)
    };

    // Echo der Template-Boxen
    NSMutableArray* tmplArr = [NSMutableArray arrayWithCapacity:templateBoxes.size()];
    for (const auto& b : templateBoxes) {
      NSMutableDictionary* m = [NSMutableDictionary dictionary];
      if (b.bid) m[@"id"] = b.bid;
      m[@"x"] = @(b.x); m[@"y"] = @(b.y);
      m[@"width"] = @(b.w); m[@"height"] = @(b.h);
      [tmplArr addObject:m];
    }
    screenData[@"template_boxes"] = tmplArr;

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
