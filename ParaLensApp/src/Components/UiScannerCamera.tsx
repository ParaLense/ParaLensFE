import {
  Camera,
  ReadonlyFrameProcessor,
  useFrameProcessor,
} from 'react-native-vision-camera';
import React, { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { performOcr } from '../../libs/vision-camera-ocr-bb2';
import { Box, Heading } from '@gluestack-ui/themed';
import { Text as GluestackText } from '@gluestack-ui/themed/build/components/Text';
import { useRunOnJS } from 'react-native-worklets-core';
import {
  TemplateLayout,
  useTemplateLayout,
} from '../hooks/useTemplateLayout.ts';
import TemplateOverlay from './TemplateOverlay.tsx';

const TARGET_FPS = 1;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

interface UiScannerCameraProps extends React.ComponentProps<typeof Camera> {
  currentLayout: TemplateLayout;
}

type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';


const UiScannerCamera: React.FC<UiScannerCameraProps> = (props:UiScannerCameraProps) => {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');

  const sixtyFpsFormat = props.device?.formats?.find(f => f?.maxFps >= 60);
  const layout = useTemplateLayout({ layout: props.currentLayout });
  const screenLayout = useTemplateLayout({ layout: TemplateLayout.ScreenDetection });
  const screen = Dimensions.get('window');
  const screenW = screen.width;
  const screenH = screen.height;
  
  const [ocrMap, setOcrMap] = useState<Record<string, string>>({});
  const lastFrameTime = useSharedValue(0);
  const setOcrMapJS = useRunOnJS(setOcrMap, []);


  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status);
      setDebugStatus(`Camera.requestCameraPermission() returned: ${status}`);
    })();
  }, []);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    try {
      const now = performance.now();
      if (now - lastFrameTime.value < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrameTime.value = now;
      const results: Record<string, string> = {};
      for (const box of layout) {
        const nx = Math.max(0, Math.min(1, box.x / screenW));
        const ny = Math.max(0, Math.min(1, box.y / screenH));
        const nw = Math.max(0, Math.min(1, box.width / screenW));
        const nh = Math.max(0, Math.min(1, box.height / screenH));

        const result = performOcr(frame, { x: nx, y: ny, width: nw, height: nh });
        if (result?.text) {
          results[box.id] = result.text;
        }
      }

      if (Object.keys(results).length > 0) {
        setOcrMapJS(results);
      }
    } catch (error) {
      runOnJS(console.error)(`Frame Processor Error: ${error}`);
    }
  }, []);
  if (!['authorized', 'granted'].includes(hasPermission)) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" bg="$backgroundDark950" px={24}>
        <Heading size="md" color="$textLight50">No camera permission ({hasPermission})</Heading>
        <Heading mt={8} size="sm" color="$textLight50">{debugStatus}</Heading>
      </Box>
    );
  }


  return (
    <>


      <Camera
        {...props}
        frameProcessor={frameProcessor as ReadonlyFrameProcessor}
        {...(sixtyFpsFormat ? { format: sixtyFpsFormat, fps: TARGET_FPS } : {})}
      />
      <TemplateOverlay layout={props.currentLayout} isActive={true} color="#00FF00" />
      <TemplateOverlay layout={TemplateLayout.ScreenDetection} isActive={true} color="#FF0000" />

      {/* OCR per-box labels at bottom-center of each box */}
      {layout.map(box => {
        const text = ocrMap[box.id];
        if (!text) return null;
        const labelTop = box.y + box.height - 24; // inside box near bottom
        return (
          <Box
            key={box.id}
            position="absolute"
            left={box.x}
            top={labelTop+30}
            style={{ width: box.width, alignItems: 'center', zIndex: 200 }}
          >
            <Box
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 8,
                paddingVertical: 4,
                paddingHorizontal: 8,
              }}
            >
              <GluestackText color="$textLight50" fontSize="$sm" textAlign="center">
                {text}
              </GluestackText>
            </Box>
          </Box>
        );
      })}
    </>
  );
};

export default UiScannerCamera;
