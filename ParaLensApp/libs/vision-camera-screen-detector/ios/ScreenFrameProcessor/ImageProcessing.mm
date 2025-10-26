//
//  ImageProcessing.mm
//  vision-camera-screen-detector
//
//  Created by Refactoring
//

#import "ImageProcessing.h"
#import <algorithm>
#import <cmath>

@implementation ImageProcessing

+ (cv::Mat)createGrayMatFromPixelBuffer:(CVPixelBufferRef)pixelBuffer {
    size_t width = CVPixelBufferGetWidth(pixelBuffer);
    size_t height = CVPixelBufferGetHeight(pixelBuffer);
    
    CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    size_t bytesPerRow = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0);
    void* base = CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0);
    
    cv::Mat gray((int)height, (int)width, CV_8UC1);
    if (base) {
        for (int row = 0; row < gray.rows; ++row) {
            memcpy(gray.ptr(row), (uint8_t*)base + row * bytesPerRow, (size_t)gray.cols);
        }
    }
    
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    return gray;
}

+ (cv::Mat)preprocessImage:(const cv::Mat&)img {
    // Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    cv::Mat normalized;
    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(2.0, cv::Size(8, 8));
    clahe->apply(img, normalized);
    return normalized;
}

+ (cv::Mat)createEdgeMap:(const cv::Mat&)normalized {
    cv::Mat edges;
    cv::Canny(normalized, edges, 50.0, 150.0);
    return edges;
}

+ (std::vector<std::vector<cv::Point>>)findContours:(const cv::Mat&)edges {
    std::vector<std::vector<cv::Point>> contours;
    cv::findContours(edges, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);
    return contours;
}

+ (cv::Mat)buildHomography:(const std::vector<cv::Point2f>&)srcPoints 
              dstPoints:(const std::vector<cv::Point2f>&)dstPoints {
    if (srcPoints.size() < 4 || dstPoints.size() < 4) {
        return cv::Mat();
    }
    return cv::findHomography(srcPoints, dstPoints, cv::RANSAC, 3.0);
}

+ (NSString* _Nullable)warpAndEncodeToBase64:(const cv::Mat&)img 
                                   homography:(const cv::Mat&)H 
                                    outputW:(int)outputW 
                                    outputH:(int)outputH 
                                 imageQuality:(int)imageQuality {
    if (H.empty()) return nil;
    
    cv::Mat warped;
    cv::warpPerspective(img, warped, H, cv::Size(outputW, outputH));
    
    std::vector<uchar> buf;
    std::vector<int> params = { 
        cv::IMWRITE_JPEG_QUALITY, 
        std::max(0, std::min(100, imageQuality)) 
    };
    
    if (cv::imencode(".jpg", warped, buf, params)) {
        NSData* data = [NSData dataWithBytes:buf.data() length:buf.size()];
        return [data base64EncodedStringWithOptions:0];
    }
    
    return nil;
}

@end
