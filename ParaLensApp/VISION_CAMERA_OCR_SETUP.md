# Vision Camera OCR Integration

This document explains the integration of the `vision-camera-ocr` library into the ParaLensApp project.

## Installation

The `vision-camera-ocr` library has been installed via npm:

```bash
npm install vision-camera-ocr
```

## Integration Details

### 1. Frame Processor Integration

The OCR functionality has been integrated into the existing frame processor in `src/hooks/useTextFrameProcessor.ts`. The implementation:

- Uses the `scanOCR` function from `vision-camera-ocr`
- Processes frames in real-time using Vision Camera's frame processor
- Extracts text from detected blocks
- Provides confidence scores (defaulted to 0.8 since the library doesn't provide actual confidence)
- Updates the UI with detected text and block count

### 2. UI Updates

The CameraScreen has been updated to display:
- Real-time OCR results from the frame processor
- Number of detected text blocks
- Confidence scores
- Debug information including OCR block count

### 3. Type Definitions

The integration includes proper TypeScript definitions for:
- `OCRFrame` - The main result structure
- `TextBlock` - Individual text blocks with positioning information

## Usage

The OCR functionality is automatically active when the camera is running. The frame processor will:

1. Capture frames from the camera
2. Process each frame for text detection
3. Extract and display detected text
4. Show debug information in the overlay

## Platform Support

### Android
- Fully supported
- No additional configuration required
- Uses the native Android OCR capabilities

### iOS
- Requires CocoaPods installation
- Run `cd ios && pod install` to install native dependencies
- Uses iOS Vision framework for OCR

## Testing

A test component `FrameProcessorTest.tsx` has been created to verify the OCR integration. You can use this component to test the OCR functionality independently.

## Performance Considerations

- OCR processing happens on every frame, which may impact performance
- Consider implementing frame skipping or processing intervals for better performance
- The library uses native OCR capabilities for optimal performance

## Troubleshooting

### Common Issues

1. **No text detected**: Ensure the camera has good lighting and the text is clearly visible
2. **Performance issues**: Consider reducing frame processing frequency
3. **iOS build errors**: Make sure to run `pod install` in the iOS directory

### Debug Information

The app displays debug information including:
- Frame count
- OCR block count
- Processing status
- Error messages

## Future Enhancements

Potential improvements:
- Add confidence threshold filtering
- Implement text block highlighting on the camera view
- Add language detection and filtering
- Optimize frame processing frequency based on device performance



