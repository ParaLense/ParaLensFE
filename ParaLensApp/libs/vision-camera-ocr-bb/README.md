# @bear-block/vision-camera-ocr

<div align="center">

![React Native](https://img.shields.io/badge/React%20Native-0.79+-blue.svg)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

**A high-performance React Native Vision Camera plugin for real-time OCR (Optical Character Recognition)**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [API Reference](#-api-reference) • [Examples](#-examples) • [Contributing](#-contributing)

</div>

---

## 🚀 Overview

`@bear-block/vision-camera-ocr` is a powerful React Native library that provides real-time text recognition capabilities directly within your camera app. Built on top of `react-native-vision-camera`, it leverages native OCR engines for optimal performance:

- **Android**: Powered by Google ML Kit Text Recognition
- **iOS**: Powered by Apple's Vision Framework

Perfect for applications requiring real-time text extraction, document scanning, business card readers, or any OCR functionality.

## ✨ Features

- 🔥 **Real-time Processing** - Instant text recognition from camera frames
- 📱 **Cross-platform** - Native implementation for both Android & iOS
- 🚀 **High Performance** - Optimized native APIs with minimal overhead
- 🌐 **Offline First** - No internet connection required, all processing on-device
- 🎯 **Easy Integration** - Simple API that works seamlessly with Vision Camera
- 📊 **Configurable** - Support for different recognition models and options
- 🛡️ **Production Ready** - Built with TypeScript and comprehensive error handling

## 📦 Installation

### Prerequisites

- React Native 0.79+
- `react-native-vision-camera` >= 3.0
- `react-native-worklets-core` ^1.5.0

### Install the package

```bash
# Using yarn (recommended)
yarn add @bear-block/vision-camera-ocr

# Using npm
npm install @bear-block/vision-camera-ocr

# Using pnpm
pnpm add @bear-block/vision-camera-ocr
```

### iOS Setup

```bash
cd ios && pod install
```

### Android Setup

No additional setup required - the package is auto-linked.

## 🎯 Quick Start

### Basic Usage

```typescript
import { Camera, useFrameProcessor } from 'react-native-vision-camera';
import { performOcr } from '@bear-block/vision-camera-ocr';

function MyCameraComponent() {
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const result = performOcr(frame);
    if (result?.text) {
      console.log('Detected text:', result.text);
    }
  }, []);

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      frameProcessor={frameProcessor}
      frameProcessorFps={5}
    />
  );
}
```

### Advanced Usage with Error Handling

```typescript
import { Camera, useFrameProcessor } from 'react-native-vision-camera';
import { performOcr } from '@bear-block/vision-camera-ocr';

function AdvancedCameraComponent() {
  const [detectedText, setDetectedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      setIsProcessing(true);
      const result = performOcr(frame);
      
      if (result?.text) {
        setDetectedText(result.text);
        // You can also send to your app's state management
        runOnJS(handleTextDetected)(result.text);
      }
    } catch (error) {
      console.error('OCR processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleTextDetected = (text: string) => {
    // Handle the detected text in your app
    console.log('New text detected:', text);
  };

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={3} // Lower FPS for better performance
      />
      
      {detectedText && (
        <View style={styles.textOverlay}>
          <Text style={styles.text}>{detectedText}</Text>
        </View>
      )}
      
      {isProcessing && (
        <View style={styles.processingIndicator}>
          <Text>Processing...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
  },
  text: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  processingIndicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
  },
});
```

## 📚 API Reference

### `performOcr(frame: Frame): { text: string } | null`

Performs OCR on a camera frame and returns the detected text.

#### Parameters

- `frame` (Frame): The camera frame to process from `react-native-vision-camera`

#### Returns

- `{ text: string } | null`: Object containing the recognized text, or `null` if no text detected

#### Example

```typescript
const result = performOcr(frame);
if (result) {
  console.log('Detected text:', result.text);
  // Use the text in your app
} else {
  console.log('No text detected');
}
```

## 🔧 Configuration

### Frame Processor Options

The plugin supports configuration options when initializing:

```typescript
// Currently supported options (implementation pending)
const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectText', {
  model: 'fast', // ⚠️ Note: Model option is currently logged but not fully implemented
});
```

> **Note**: Advanced configuration options are planned for future releases. Currently, the plugin uses default settings optimized for performance and accuracy.

## 📱 Platform-Specific Details

### Android
- Uses Google ML Kit Text Recognition
- Optimized for Latin script languages
- Automatic language detection
- Fast processing with minimal memory usage

### iOS
- Uses Apple's Vision Framework
- Native integration with iOS camera system
- Support for multiple text recognition languages
- Optimized for iOS performance characteristics

## 🎨 Use Cases

This library is perfect for:

- **Document Scanners** - Convert paper documents to digital text
- **Business Card Readers** - Extract contact information from business cards
- **Receipt Scanners** - Automate expense tracking and receipt processing
- **Text Translation Apps** - Real-time text recognition for translation
- **Accessibility Tools** - Help visually impaired users read text
- **Form Processing** - Automate data entry from paper forms
- **License Plate Recognition** - Vehicle identification systems
- **Product Label Scanners** - Extract information from product packaging

## 🚀 Performance Tips

- **Frame Rate**: Use `frameProcessorFps={3-5}` for optimal performance
- **Error Handling**: Always wrap OCR calls in try-catch blocks
- **State Management**: Debounce text updates to avoid excessive re-renders
- **Memory**: Process frames efficiently and avoid storing large amounts of data

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/bear-block/vision-camera-ocr.git
cd vision-camera-ocr

# Install dependencies
yarn install

# Run tests
yarn test

# Type checking
yarn typecheck

# Linting
yarn lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on top of [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera)
- Android OCR powered by [Google ML Kit](https://developers.google.com/ml-kit/vision/text-recognition)
- iOS OCR powered by [Apple Vision Framework](https://developer.apple.com/documentation/vision)

## 💖 Support This Project

If you find this library useful and would like to support ongoing development, please consider:

- ⭐ **Starring** this repository
- 🐛 **Reporting bugs** and feature requests
- 💻 **Contributing** code improvements
- 💰 **Sponsoring** us on GitHub

👉 [**Become a Sponsor**](https://github.com/sponsors/bear-block)

---

<div align="center">

**Made with ❤️ by [Bear Block](https://github.com/bear-block)**

[GitHub](https://github.com/bear-block) • [Issues](https://github.com/bear-block/vision-camera-ocr/issues) • [Discussions](https://github.com/bear-block/vision-camera-ocr/discussions)

</div>
