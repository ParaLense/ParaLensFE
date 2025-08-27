import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Camera, Frame, useCameraDevice, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import CanvasOverlay, { Box } from '../Components/CanvasOverlay';
import { runOnJS } from 'react-native-reanimated';
import { performOcr } from '@bear-block/vision-camera-ocr';

// Frame rate limiting constants
const TARGET_FPS = 5;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

// Extend global type for frame rate limiting
declare global {
  var lastFrameTime: number | undefined;
}

type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';

const CameraScreen = () => {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [ocr, setOcr] = React.useState<string>();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [frameProcessorError, setFrameProcessorError] = useState<string>('');
  const devices = useCameraDevices();
  const device = useCameraDevice('back');

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status);
      setDebugStatus(`Camera.requestCameraPermission() returned: ${status}`);
    })();
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      // Frame rate limiting - only process every 200ms (5 FPS)
      const currentTime = Date.now();
      if (global.lastFrameTime && (currentTime - global.lastFrameTime) < FRAME_INTERVAL_MS) {
        return; // Skip this frame if not enough time has passed
      }
      global.lastFrameTime = currentTime;
      
      const ocrResult = performOcr(frame);
      if (ocrResult && ocrResult.text) {
        console.log('Detected text:', ocrResult.text);
      }
    } catch (error) {
      runOnJS(setFrameProcessorError)(`Frame Processor Error: ${error}`);
    }
  }, []);

  const sixtyFpsFormat = device?.formats?.find(f => f?.maxFps >= 60);

  if (!['authorized', 'granted'].includes(hasPermission)) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No camera permission ({hasPermission})</Text>
        <Text style={styles.text}>{debugStatus}</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text style={styles.text}>Loading camera...</Text>
        <Text style={styles.text}>Gefundene Kameras:</Text>
        {Object.values(devices).length === 0 ? (
          <Text style={styles.text}>Keine Kameras gefunden.</Text>
        ) : (
          Object.entries(devices).map(([key, dev]) => (
            <Text style={styles.text} key={key}>
              {key}: {dev?.name || 'Unbekannt'} ({dev?.position || 'unknown'})
            </Text>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        enableFpsGraph={true}
        {...(sixtyFpsFormat ? { format: sixtyFpsFormat, fps:TARGET_FPS } : {})}
      />

      <CanvasOverlay
        onBoxesChange={setBoxes}
        isActive={true}
      />


      {frameProcessorError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{frameProcessorError}</Text>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  controls: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CameraScreen; 