# MLKit OCR Example Setup Guide

This guide will help you set up and run the MLKit OCR example app on both iOS and Android.

## Prerequisites

- Node.js 18+ installed
- React Native development environment set up
- iOS: Xcode 14+ (for iOS development)
- Android: Android Studio with SDK (for Android development)

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install example app dependencies
cd example
npm install
```

### 2. iOS Setup

```bash
# Install iOS dependencies
cd ios
pod install
cd ..

# Run on iOS
npm run ios
```

### 3. Android Setup

```bash
# Run on Android
npm run android
```

## Features Demonstrated

The example app includes:

- ✅ Image picker integration
- ✅ Text recognition from image files
- ✅ Text recognition from base64 images
- ✅ Real-time OCR processing
- ✅ Error handling and user feedback
- ✅ Confidence scores display
- ✅ Bounding box information

## Usage

1. **Launch the app** on your device/simulator
2. **Tap "Pick Image"** to select an image from your gallery
3. **Choose OCR method**:
   - "OCR from File" - processes the image file directly
   - "OCR from Base64" - converts image to base64 first
4. **View results** - the recognized text and confidence scores will be displayed

## Troubleshooting

### iOS Issues

- **Build fails**: Run `cd ios && pod install` and clean build
- **Permission errors**: Add camera/photo library permissions to Info.plist
- **MLKit not found**: Ensure Google Play Services are installed

### Android Issues

- **Build fails**: Clean and rebuild with `cd android && ./gradlew clean`
- **Permission errors**: Add camera/storage permissions to AndroidManifest.xml
- **MLKit not found**: Ensure Google Play Services are installed on test device

### Common Solutions

1. **Clean builds**:
   ```bash
   # iOS
   cd ios && xcodebuild clean
   
   # Android
   cd android && ./gradlew clean
   ```

2. **Reset Metro cache**:
   ```bash
   npx react-native start --reset-cache
   ```

3. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules && npm install
   ```

## Permissions Required

### iOS (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos for OCR</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select images for OCR</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Testing

1. **Test with clear text images** for best results
2. **Try different image formats** (JPEG, PNG)
3. **Test with various text orientations**
4. **Verify confidence scores** are displayed correctly

## Next Steps

Once the example is working, you can:

1. **Integrate into your own app** by copying the relevant code
2. **Customize the UI** to match your app's design
3. **Add more features** like real-time camera OCR
4. **Optimize performance** for your specific use case
