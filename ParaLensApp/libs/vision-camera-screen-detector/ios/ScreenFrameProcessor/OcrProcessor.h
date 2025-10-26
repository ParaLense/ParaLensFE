//
//  OcrProcessor.h
//  vision-camera-screen-detector
//
//  Created by Refactoring
//

#import <Foundation/Foundation.h>
#import <opencv2/opencv.hpp>
#import "Utils.h"

NS_ASSUME_NONNULL_BEGIN

@interface OcrProcessor : NSObject

// OCR template parsing
+ (NSArray* _Nullable)parseOcrTemplate:(NSDictionary* _Nullable)args;

// OCR processing
+ (NSMutableArray*)processOcrBoxes:(const cv::Mat&)warped
                          ocrBoxes:(NSArray*)ocrBoxes
                           outputW:(int)outputW
                           outputH:(int)outputH;

// Individual OCR type processing
+ (NSMutableDictionary*)processCheckbox:(const cv::Mat&)roi
                                options:(NSDictionary* _Nullable)options
                                   boxId:(NSString*)boxId;

+ (NSMutableDictionary*)processScrollbar:(const cv::Mat&)roi
                                 options:(NSDictionary* _Nullable)options
                                    boxId:(NSString*)boxId;

+ (NSMutableDictionary*)processValue:(const cv::Mat&)roi
                               boxId:(NSString*)boxId;

// Checkbox with value reading
+ (NSMutableDictionary*)processCheckboxWithValue:(const cv::Mat&)warped
                                      checkboxBox:(NSDictionary*)checkboxBox
                                        valueBox:(NSDictionary*)valueBox
                                         outputW:(int)outputW
                                         outputH:(int)outputH;

@end

NS_ASSUME_NONNULL_END
