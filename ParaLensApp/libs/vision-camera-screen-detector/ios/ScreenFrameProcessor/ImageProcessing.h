//
//  ImageProcessing.h
//  vision-camera-screen-detector
//
//  Created by Refactoring
//

#import <Foundation/Foundation.h>
#import <opencv2/opencv.hpp>
#import <CoreVideo/CoreVideo.h>

NS_ASSUME_NONNULL_BEGIN

@interface ImageProcessing : NSObject

// Image conversion
+ (cv::Mat)createGrayMatFromPixelBuffer:(CVPixelBufferRef)pixelBuffer;

// Image preprocessing
+ (cv::Mat)preprocessImage:(const cv::Mat&)img;

// Edge detection
+ (cv::Mat)createEdgeMap:(const cv::Mat&)normalized;

// Contour detection
+ (std::vector<std::vector<cv::Point>>)findContours:(const cv::Mat&)edges;

// Homography operations
+ (cv::Mat)buildHomography:(const std::vector<cv::Point2f>&)srcPoints 
              dstPoints:(const std::vector<cv::Point2f>&)dstPoints;

// Image warping and encoding
+ (NSString* _Nullable)warpAndEncodeToBase64:(const cv::Mat&)img 
                                   homography:(const cv::Mat&)H 
                                    outputW:(int)outputW 
                                    outputH:(int)outputH 
                                 imageQuality:(int)imageQuality;

@end

NS_ASSUME_NONNULL_END
