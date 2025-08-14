import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCameraDevices, CameraRuntimeError } from 'react-native-vision-camera';

import CanvasOverlay from '@components/CanvasOverlay';
import LoadingSpinner from '@components/common/LoadingSpinner';
import ErrorDisplay from '@components/common/ErrorDisplay';
import { useCameraPermission } from '@hooks/useCameraPermission';
import { useTextFrameProcessor } from '@hooks/useTextFrameProcessor';
import { useAppState } from '@hooks/useAppState';
import { CameraScreenProps } from '@/types';
import { COLORS, SPACING, SIZES, CAMERA_FPS_TARGET, LOADING_MESSAGES } from '@/constants';

const CameraScreen: React.FC<CameraScreenProps> = memo(() => {

  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const { permission, isLoading: permissionLoading, error: permissionError, requestPermission } = useCameraPermission();
  const { frameProcessor, frameState, resetFrameCount } = useTextFrameProcessor();
  const { appState, updateBoxes, selectBox, updateCameraPermission } = useAppState();
  
  const cameraRef = useRef<Camera>(null);
  
  const devices = useCameraDevices();
  const device = useCameraDevice('back');

  // Update app state with camera permission
  useEffect(() => {
    updateCameraPermission(permission);
  }, [permission, updateCameraPermission]);

  // Request camera permission on mount
  useEffect(() => {
    if (permission === 'not-determined') {
      requestPermission();
    }
  }, [permission, requestPermission]);



  const sixtyFpsFormat = device?.formats?.find(f => f?.maxFps >= CAMERA_FPS_TARGET);

  const handleRetryPermission = useCallback(() => {
    setCameraError(null);
    requestPermission();
  }, [requestPermission]);

  const handleCameraError = useCallback((error: CameraRuntimeError) => {
    console.error('Camera error:', error);
    setCameraError(error.message || 'Camera error occurred');
  }, []);

  const handleRefresh = useCallback(() => {
    setCameraError(null);
    resetFrameCount();
  }, [resetFrameCount]);

  // Handle permission errors
  if (permissionError) {
    return (
      <ErrorDisplay
        message={permissionError}
        onRetry={handleRetryPermission}
        fullScreen
      />
    );
  }

  // Handle permission denied
  if (!['authorized', 'granted'].includes(permission)) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No camera permission ({permission})</Text>
        <Text style={styles.text}>{frameState.debugStatus}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetryPermission}>
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle loading state
  if (permissionLoading) {
    return (
      <LoadingSpinner
        message={LOADING_MESSAGES.PERMISSION_CHECKING}
        fullScreen
      />
    );
  }

  // Handle camera not available
  if (!device) {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <LoadingSpinner message={LOADING_MESSAGES.CAMERA_LOADING} />
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
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Handle camera errors
  if (cameraError) {
    return (
      <ErrorDisplay
        message={cameraError}
        onRetry={() => setCameraError(null)}
        fullScreen
      />
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        {...(sixtyFpsFormat ? { format: sixtyFpsFormat, fps: CAMERA_FPS_TARGET } : {})}
        onError={handleCameraError}
      />

      <CanvasOverlay
        onBoxesChange={updateBoxes}
        isActive={true}
        selectedBoxId={appState.selectedBoxId}
        onBoxSelect={selectBox}
      />

      {/* Debug overlay for frame processor status */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Frame Processor: ACTIVE</Text>
        <Text style={styles.debugText}>Frames: {frameState.frameCount}</Text>
        <Text style={styles.debugText}>Faces: {frameState.faceCount}</Text>
        <Text style={styles.debugText}>OCR Blocks: {frameState.ocrResults.length}</Text>
        <Text style={styles.debugText}>Status: {frameState.debugStatus}</Text>
      </View>

      {/* OCR Results Overlay */}
      {frameState.ocrText && (
        <View style={styles.ocrContainer}>
          <Text style={styles.ocrTitle}>📝 DETECTED TEXT:</Text>
          <Text style={styles.ocrText}>{frameState.ocrText}</Text>
          <Text style={styles.ocrConfidence}>
            Confidence: {(frameState.ocrConfidence * 100).toFixed(1)}%
          </Text>
          <Text style={styles.ocrBlocks}>
            Blocks: {frameState.ocrResults.length}
          </Text>
        </View>
      )}

      {/* OCR Status Info */}
      <View style={styles.controlsContainer}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            OCR is running in real-time
          </Text>
          <Text style={styles.statusText}>
            Point camera at text to see results
          </Text>
        </View>
      </View>

      {!sixtyFpsFormat && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            {CAMERA_FPS_TARGET}fps not supported, using default format
          </Text>
        </View>
      )}
    </View>
  );
});

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
    padding: SPACING.lg,
  },
  text: {
    color: '#fff',
    fontSize: SIZES.text.large,
    marginTop: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: SIZES.text.medium,
    fontWeight: 'bold',
  },
  warningContainer: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  warningText: {
    color: '#fff',
    backgroundColor: '#222a',
    padding: SPACING.sm,
    borderRadius: 8,
    fontSize: SIZES.text.small,
  },
  debugContainer: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: '#222a',
    padding: SPACING.sm,
    borderRadius: 8,
    zIndex: 10,
  },
  debugText: {
    color: '#fff',
    fontSize: SIZES.text.small,
  },
  ocrContainer: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: '#222a',
    padding: SPACING.md,
    borderRadius: 8,
    zIndex: 10,
    maxWidth: 300,
    minWidth: 200,
  },
  ocrTitle: {
    color: COLORS.primary,
    fontSize: SIZES.text.medium,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  ocrText: {
    color: '#fff',
    fontSize: SIZES.text.large,
    marginBottom: SPACING.sm,
    fontWeight: '500',
  },
  ocrConfidence: {
    color: '#aaa',
    fontSize: SIZES.text.small,
    fontStyle: 'italic',
  },
  ocrBlocks: {
    color: '#aaa',
    fontSize: SIZES.text.small,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },

  controlsContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: SIZES.text.small,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
});

CameraScreen.displayName = 'CameraScreen';

export default CameraScreen;
