# @alex8734/vision-camera-screen-detector

<div align="center">

![React Native](https://img.shields.io/badge/React%20Native-0.79+-blue.svg)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

**A high-performance React Native Vision Camera plugin for screen detection**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [API Reference](#-api-reference) • [Examples](#-examples) • [Contributing](#-contributing)

</div>

---

## 🚀 Overview

`@alex8734/vision-camera-screen-detector` is a powerful React Native library that provides screen detection capabilities directly within your camera app. Built on top of `react-native-vision-camera`, it enables real-time screen detection for various use cases.

Perfect for applications requiring screen detection, display analysis, or any screen-related functionality.

## ✨ Features

- 🔥 **Real-time Processing** - Instant screen detection from camera frames
- 📱 **Cross-platform** - Native implementation for both Android & iOS
- 🚀 **High Performance** - Optimized native APIs with minimal overhead
- 🌐 **Offline First** - No internet connection required, all processing on-device
- 🎯 **Easy Integration** - Simple API that works seamlessly with Vision Camera
- 📊 **Configurable** - Support for different detection models and options
- 🛡️ **Production Ready** - Built with TypeScript and comprehensive error handling

## 📦 Installation

### Prerequisites

- React Native 0.79+
- `react-native-vision-camera` >= 3.0
- `react-native-worklets-core` ^1.5.0

### Install the package

```bash
# Using yarn (recommended)
yarn add @alex8734/vision-camera-screen-detector

# Using npm
npm install @alex8734/vision-camera-screen-detector

# Using pnpm
pnpm add @alex8734/vision-camera-screen-detector
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
import { performScan } from '@alex8734/vision-camera-screen-detector';

function MyCameraComponent() {
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const result = performScan(frame);
    if (result?.screen) {
      console.log('Screen detected:', result.screen);
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
import { performScan } from '@alex8734/vision-camera-screen-detector';

function AdvancedCameraComponent() {
  const [detectedScreen, setDetectedScreen] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      setIsProcessing(true);
      const result = performScan(frame);
      
      if (result?.screen) {
        setDetectedScreen(result.screen);
        // You can also send to your app's state management
        runOnJS(handleScreenDetected)(result.screen);
      }
    } catch (error) {
      console.error('Screen detection error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleScreenDetected = (screen: any) => {
    // Handle the detected screen in your app
    console.log('Screen detected:', screen);
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
      
      {detectedScreen && (
        <View style={styles.screenOverlay}>
          <Text style={styles.text}>Screen: {detectedScreen.width}x{detectedScreen.height}</Text>
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
  screenOverlay: {
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

### `performScan(frame: Frame, crop?: { x: number; y: number; width: number; height: number }): { screen: any } | null`

Performs screen detection on a camera frame and returns the detected screen information.

#### Parameters

- `frame` (Frame): The camera frame to process from `react-native-vision-camera`
- `crop` (optional): Normalized region-of-interest in the frame buffer coordinates
  - `x`, `y`, `width`, `height` in range 0..1
  - Values are clamped; ignored if invalid
  - Applied natively before screen detection on both Android and iOS

#### Returns

- `{ screen: any } | null`: Object containing the detected screen information, or `null` if no screen detected

#### Example

```typescript
// Full-frame screen detection
const result = performScan(frame);
if (result) {
  console.log('Detected screen:', result.screen);
  // Use the screen data in your app
} else {
  console.log('No screen detected');
}
```

#### Example with crop/ROI

```typescript
// Scan only a specific area (e.g., middle band)
const roi = { x: 0.1, y: 0.4, width: 0.8, height: 0.2 };
const result = performScan(frame, roi);
```

## 🔧 Configuration

### Frame Processor Options

The plugin supports configuration options when initializing:

```typescript
// Configuration options can be added here in the future
const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectScreen', {
  // Configuration options can be added here in the future
});
```

> **Note**: Advanced configuration options are planned for future releases. Currently, the plugin uses default settings optimized for performance and accuracy.

## 📱 Platform-Specific Details

### Android
- Uses native Android APIs for screen detection
- Optimized for performance with minimal memory usage
- Fast processing capabilities

### iOS
- Uses native iOS APIs for screen detection
- Native integration with iOS camera system
- Optimized for iOS performance characteristics

## 🎨 Use Cases

This library is perfect for:

- **Screen Detection Apps** - Detect and analyze screens in real-time
- **Display Analysis** - Analyze screen properties and characteristics
- **Screen Recording Detection** - Detect when screens are being recorded
- **Accessibility Tools** - Help users interact with screens
- **Screen Monitoring** - Monitor screen activity and changes
- **Display Management** - Manage multiple displays and screens

## 🚀 Performance Tips

- **Frame Rate**: Use `frameProcessorFps={3-5}` for optimal performance
- **Error Handling**: Always wrap screen detection calls in try-catch blocks
- **State Management**: Debounce screen updates to avoid excessive re-renders
- **Memory**: Process frames efficiently and avoid storing large amounts of data

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Alex8734/vision-camera-screen-detector.git
cd vision-camera-screen-detector

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
- Native implementation for both Android and iOS platforms

## 💖 Support This Project

If you find this library useful and would like to support ongoing development, please consider:

- ⭐ **Starring** this repository
- 🐛 **Reporting bugs** and feature requests
- 💻 **Contributing** code improvements
- 💰 **Sponsoring** us on GitHub

👉 [**Become a Sponsor**](https://github.com/sponsors/Alex8734)

---

<div align="center">

**Made with ❤️ by [Alex8734](https://github.com/Alex8734)**

[GitHub](https://github.com/Alex8734) • [Issues](https://github.com/Alex8734/vision-camera-screen-detector/issues) • [Discussions](https://github.com/Alex8734/vision-camera-screen-detector/discussions)

</div>