import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import type { CameraPermissionStatus } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { processFrame, type OcrFrameProcessorResult } from './FrameProcessorPlugin';

const { width: screenWidth } = Dimensions.get('window');

export default function VisionCameraExample() {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [isActive, setIsActive] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrFrameProcessorResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.back;

  // Request camera permission
  const requestPermission = useCallback(async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission);
    if (permission === 'granted') {
      setIsActive(true);
    }
  }, []);

  // Frame processor for real-time OCR
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    try {
      setIsProcessing(true);
      
      // Process frame with OCR using our plugin
      const result = processFrame(frame);
      
      // Update UI on main thread
      runOnJS(setOcrResult)(result);
      runOnJS(setIsProcessing)(false);
    } catch (error) {
      runOnJS(setIsProcessing)(false);
      runOnJS(console.error)('Frame processing error:', error);
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    setIsActive(!isActive);
  }, [isActive]);

  // Render camera view
  const renderCamera = () => {
    if (!device) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.placeholderText}>Camera not available</Text>
        </View>
      );
    }

    return (
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={isActive}
        frameProcessor={frameProcessor}
      />
    );
  };

  // Render OCR results
  const renderOcrResults = () => {
    if (!ocrResult) return null;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Real-time OCR Results:</Text>
        <Text style={styles.resultText}>{ocrResult.text}</Text>
        
        {ocrResult.blocks && ocrResult.blocks.length > 0 && (
          <View style={styles.blocksContainer}>
            <Text style={styles.blocksTitle}>Text Blocks:</Text>
            <ScrollView style={styles.blocksScroll}>
              {ocrResult.blocks.map((block, index) => (
                <View key={index} style={styles.blockItem}>
                  <Text style={styles.blockText}>"{block.text}"</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  if (hasPermission === 'not-determined') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>MLKit OCR with Vision Camera</Text>
        <Text style={styles.subtitle}>
          This example demonstrates real-time OCR processing using Vision Camera frame processor
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === 'denied') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text style={styles.subtitle}>
          Please grant camera permission in your device settings to use this feature.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Request Permission Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Real-time OCR Camera</Text>
      
      <View style={styles.cameraContainer}>
        {renderCamera()}
        
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
            <Text style={styles.controlButtonText}>
              {isActive ? 'Stop Camera' : 'Start Camera'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {isProcessing && (
        <View style={styles.processingContainer}>
          <Text style={styles.processingText}>Processing frame...</Text>
        </View>
      )}
      
      {renderOcrResults()}
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          • Point your camera at text to see real-time OCR results
        </Text>
        <Text style={styles.infoText}>
          • Frame processing runs at camera frame rate
        </Text>
        <Text style={styles.infoText}>
          • Results update in real-time as you move the camera
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ccc',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  camera: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#ccc',
    fontSize: 16,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  controlButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 10,
    marginBottom: 15,
  },
  processingText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    maxHeight: 200,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
    lineHeight: 22,
  },
  blocksContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 15,
  },
  blocksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  blocksScroll: {
    maxHeight: 100,
  },
  blockItem: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  blockText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  blockConfidence: {
    fontSize: 12,
    color: '#ccc',
  },
  infoContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    lineHeight: 20,
  },
});
