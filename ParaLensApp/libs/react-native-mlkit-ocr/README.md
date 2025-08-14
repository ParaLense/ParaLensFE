# React Native MLKit OCR

A React Native library that provides MLKit OCR (Optical Character Recognition) functionality for both iOS and Android platforms. This library allows you to extract text from images using Google's MLKit Text Recognition API.

## Features

- ✅ Text recognition from image files
- ✅ Text recognition from base64 encoded images
- ✅ Support for both iOS and Android
- ✅ Built with React Native Nitro modules for optimal performance
- ✅ TypeScript support
- ✅ Comprehensive error handling
- ✅ Confidence scores and bounding box information

## Installation

### 1. Install the library

```bash
npm install react-native-mlkit-ocr
# or
yarn add react-native-mlkit-ocr
```

### 2. iOS Setup

For iOS, the MLKit dependencies are automatically added via CocoaPods. Run:

```bash
cd ios
pod install
```

### 3. Android Setup

For Android, the MLKit dependencies are automatically added via Gradle. No additional setup required.

## Usage

### Basic Text Recognition

```typescript
import { recognizeText, recognizeTextFromBase64 } from 'react-native-mlkit-ocr';

// Recognize text from an image file
const result = await recognizeText('/path/to/image.jpg');
if (result.success) {
  console.log('Recognized text:', result.text);
  console.log('Text blocks:', result.blocks);
} else {
  console.error('OCR failed:', result.error);
}

// Recognize text from a base64 encoded image
const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
const result = await recognizeTextFromBase64(base64Image);
```

### Check Availability

```typescript
import { isAvailable } from 'react-native-mlkit-ocr';

const available = await isAvailable();
console.log('MLKit OCR available:', available);
```

### Complete Example

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { recognizeText, type OcrResult } from 'react-native-mlkit-ocr';

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0].uri || null);
      }
    });
  };

  const performOcr = async () => {
    if (!selectedImage) return;

    try {
      const result = await recognizeText(selectedImage);
      setOcrResult(result);
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'OCR failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to perform OCR');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TouchableOpacity onPress={pickImage}>
        <Text>Pick Image</Text>
      </TouchableOpacity>
      
      {selectedImage && (
        <>
          <Image source={{ uri: selectedImage }} style={{ width: 200, height: 200 }} />
          <TouchableOpacity onPress={performOcr}>
            <Text>Perform OCR</Text>
          </TouchableOpacity>
        </>
      )}
      
      {ocrResult && (
        <Text>Result: {ocrResult.text}</Text>
      )}
    </View>
  );
}
```

## API Reference

### Types

```typescript
interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  cornerPoints: Array<{ x: number; y: number }>;
}

interface OcrResult {
  text: string;
  blocks: TextBlock[];
  success: boolean;
  error?: string;
}
```

### Functions

#### `recognizeText(imagePath: string): Promise<OcrResult>`

Recognizes text from an image file.

- **Parameters:**
  - `imagePath` (string): Path to the image file
- **Returns:** Promise<OcrResult>

#### `recognizeTextFromBase64(base64Image: string): Promise<OcrResult>`

Recognizes text from a base64 encoded image.

- **Parameters:**
  - `base64Image` (string): Base64 encoded image string
- **Returns:** Promise<OcrResult>

#### `isAvailable(): Promise<boolean>`

Checks if MLKit OCR is available on the device.

- **Returns:** Promise<boolean>

## Platform Support

- ✅ iOS 12.0+
- ✅ Android API 21+

## Dependencies

### iOS
- GoogleMLKit/TextRecognition

### Android
- com.google.mlkit:text-recognition:16.0.0
- com.google.mlkit:vision-common:17.3.0

## Troubleshooting

### Common Issues

1. **iOS: Build fails with MLKit errors**
   - Make sure you've run `pod install` in the ios directory
   - Clean and rebuild: `cd ios && xcodebuild clean`

2. **Android: MLKit not found**
   - Make sure you have Google Play Services installed on your test device
   - Clean and rebuild: `cd android && ./gradlew clean`

3. **Permission errors**
   - For iOS, add camera and photo library permissions to Info.plist
   - For Android, add camera and storage permissions to AndroidManifest.xml

### Example Permissions

#### iOS (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos for OCR</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select images for OCR</string>
```

#### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google MLKit for providing the OCR capabilities
- React Native Nitro modules for the native bridge implementation
