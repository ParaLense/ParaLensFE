
import {
  Camera,
  ReadonlyFrameProcessor,
  useFrameProcessor,
} from 'react-native-vision-camera';
import React, { useEffect, useRef, useState } from 'react';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { performOcr } from '../../libs/vision-camera-ocr-bb2';
import { Box } from '@gluestack-ui/themed';
import { Text as GluestackText } from '@gluestack-ui/themed/build/components/Text';
import { useRunOnJS } from 'react-native-worklets-core';

const TARGET_FPS = 5;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

interface UiScannerCameraProps extends React.ComponentProps<typeof Camera> {}

const UiScannerCamera: React.FC<UiScannerCameraProps> = props => {
  const sixtyFpsFormat = props.device?.formats?.find(f => f?.maxFps >= 60);

  const [ocrResult,setOcrResult] = useState<string>('');
  const lastFrameTime = useSharedValue(0);
  const setOcrResultJS = useRunOnJS(setOcrResult);

  useEffect(() => {
    console.log('ocrResult',ocrResult);
  }, [ocrResult]);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    try {
      const now = performance.now();
      if (now - lastFrameTime.value < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrameTime.value = now;

      const result = performOcr(frame);
      if (result?.text) {
        setOcrResultJS(result.text);
      }
    } catch (error) {
      runOnJS(console.error)(`Frame Processor Error: ${error}`);
    }
  }, []);

  return (
    <>
      <Camera
        {...props}
        frameProcessor={frameProcessor as ReadonlyFrameProcessor}
        {...(sixtyFpsFormat ? { format: sixtyFpsFormat, fps: TARGET_FPS } : {})}
      />

      {/* OCR Overlay */}
      {ocrResult && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          style={{
            transform: [{ translateX: -150 }, { translateY: -40 }],
            width: 300,
            minHeight: 80,
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 100,
          }}
        >
          <GluestackText color="$textLight50" fontSize="$lg" textAlign="center">
            {ocrResult}
          </GluestackText>
        </Box>
      )}
    </>
  );
};

export default UiScannerCamera;
