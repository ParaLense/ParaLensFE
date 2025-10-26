//
//  Utils.h
//  vision-camera-screen-detector
//
//  Created by Refactoring
//

#import <Foundation/Foundation.h>
#import <opencv2/opencv.hpp>

NS_ASSUME_NONNULL_BEGIN

// Template-Box (Prozentwerte relativ zur virtuellen Template-Fläche)
typedef struct {
    __unsafe_unretained NSString* _Nullable bid;
    double x, y, w, h; // percent
} SDBOX;

@interface Utils : NSObject

// Parameter parsing helpers
+ (double)getDouble:(NSDictionary* _Nullable)dict key:(NSString*)key defaultValue:(double)def;
+ (int)getInt:(NSDictionary* _Nullable)dict key:(NSString*)key defaultValue:(int)def;
+ (BOOL)getBool:(NSDictionary* _Nullable)dict key:(NSString*)key defaultValue:(BOOL)def;
+ (NSArray* _Nullable)getArray:(NSDictionary* _Nullable)dict key:(NSString*)key;
+ (NSDictionary* _Nullable)getMap:(NSDictionary* _Nullable)dict key:(NSString*)key;

// Template parsing
+ (std::vector<SDBOX>)parseTemplate:(NSDictionary* _Nullable)args options:(NSDictionary* _Nullable)options;

// Geometry utilities
+ (double)calculateIoU:(const cv::Rect&)a withRect:(const cv::Rect&)b;
+ (cv::Rect)normToPx:(NSDictionary*)rect width:(int)W height:(int)H;
+ (cv::Rect)enforceMinAspect:(cv::Rect)r width:(int)W height:(int)H minAspect:(double)minAspect;
+ (BOOL)rectWithinRoi:(const cv::Rect&)test inner:(const cv::Rect&)inner outer:(const cv::Rect&)outer tolerance:(int)tol;

// Point utilities
+ (void)percentBoxToPts:(const SDBOX&)box templateWidth:(int)tw templateHeight:(int)th points:(std::vector<cv::Point2f>&)pts;
+ (void)rectToPts:(const cv::Rect&)r points:(std::vector<cv::Point2f>&)pts;
+ (std::vector<cv::Point2f>)orderQuad:(const std::vector<cv::Point2f>&)p;

@end

NS_ASSUME_NONNULL_END
