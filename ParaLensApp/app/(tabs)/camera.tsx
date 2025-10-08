import UiScannerCamera from '@/src/Components/UiScannerCamera';
import { TemplateLayout } from '@/src/hooks/useTemplateLayout';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useCameraDevice } from 'react-native-vision-camera';

export default function CameraTab() {
  const device = useCameraDevice('back');

  if (!device) {
    return null;
  }

  const currentLayout = useMemo(() => TemplateLayout.ScreenDetection, []);

  return (
    <UiScannerCamera
      currentLayout={currentLayout}
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      enableFpsGraph={true}
    />
  );
}

