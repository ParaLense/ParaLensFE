import {
  Camera,
  ReadonlyFrameProcessor,
  useFrameProcessor,
} from 'react-native-vision-camera';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, AppState, AppStateStatus, Image } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { performOcr } from '@bear-block/vision-camera-ocr';
import { performScan } from 'vision-camera-screen-detector';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text as GluestackText } from '@/components/ui/text';
import { useRunOnJS } from 'react-native-worklets-core';
import { TemplateLayout, useTemplateLayout } from '@/features/templates/use-template-layout';
import { loadTemplateConfig } from '@/features/templates/template';
import TemplateOverlay from './TemplateOverlay';

const TARGET_FPS = 10;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

interface UiScannerCameraProps extends React.ComponentProps<typeof Camera> {
  currentLayout: TemplateLayout;
}

type CameraPermissionStatus = 'authorized' | 'denied' | 'not-determined' | 'restricted' | 'granted';


const UiScannerCamera: React.FC<UiScannerCameraProps> = (props:UiScannerCameraProps) => {
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');

  const cameraFormat = props.device?.formats?.filter( f => f.maxFps >= 15 &&  f.videoWidth === 1280 && f.photoHeight >= 1280)
                                                                                  .sort((a, b) => a.photoWidth - b.photoWidth)[0]


  const layout = useTemplateLayout({  layout: props.currentLayout, widthPercent: 0.80 });
  const screen = Dimensions.get('window');
  const screenW = screen.width;
  const screenH = screen.height;
  
  const [ocrMap, setOcrMap] = useState<Record<string, string>>({});
  const [screenResult, setScreenResult] = useState<any | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const lastFrameTime = useSharedValue(0);
  const setOcrMapJS = useRunOnJS(setOcrMap, []);
  const setScreenResultJS = useRunOnJS(setScreenResult, []);
  const setBase64ImageJS = useRunOnJS(setBase64Image, []);


  // Prozent-Template-Boxen für die ScreenDetection laden (id,x,y,width,height in %)
  const screenTemplate = useMemo(() =>
    loadTemplateConfig(TemplateLayout.ScreenDetection).map(b => ({
      id: b.id,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
    })),
  []);

  useEffect(() => {
    let isMounted = true;

    const checkAndRequestPermission = async () => {
      try {
        const current = await Camera.getCameraPermissionStatus();
        if (!isMounted) return;
        if (current === 'not-determined') {
          const status = await Camera.requestCameraPermission();
          if (!isMounted) return;
          setHasPermission(status);
          setDebugStatus(`Camera.requestCameraPermission() returned: ${status}`);
        } else {
          setHasPermission(current as CameraPermissionStatus);
          setDebugStatus(`Camera.getCameraPermissionStatus() returned: ${current}`);
        }
      } catch (error) {
        if (!isMounted) return;
        setDebugStatus(`Permission check error: ${String(error)}`);
      }
    };

    // Initial check on mount
    checkAndRequestPermission();

    // Re-check when app comes back to foreground
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        checkAndRequestPermission();
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    try {
      const now = performance.now();
      if (now - lastFrameTime.value < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrameTime.value = now;


      // 1) Screen-Scan mit Prozent-Template (gesamtes Bild, keine Crop-Logik)
      const scan = performScan(frame, {
        template: screenTemplate,
        // screenWidthRatio: Anteil der Bildbreite, auf die sich die Templates beziehen (z.B. 0.8 = 80% zentral)
        screenWidthRatio: 0.8,
        screenAspectW: 3,
        screenAspectH: 4,
        minIouForMatch: 0.30,
        accuracyThreshold: 0.60,
        templateTargetW: 720 ,
        templateTargetH: 1280,
        // Bild zurückgeben (Base64 JPEG)
        returnWarpedImage: true,
        outputW: 600,
        outputH: 800,
        imageQuality: 80,
      });

      if (scan?.screen) {
        setScreenResultJS(scan.screen);
        if (scan.screen.image_base64) {
          setBase64ImageJS(scan.screen.image_base64);
        }

        // 2) OCR über die sichtbaren Overlay-Boxen in Pixeln
        const results: Record<string, string> = {};
        for (const box of layout) {
          const result = performOcr(
            frame,
            { x: box.x, y: box.y, width: box.width, height: box.height },
            { width: screenW, height: screenH }
          );
          if (result?.text) {
            results[box.id] = result.text;
          }
        }

        if (Object.keys(results).length > 0) {
          setOcrMapJS(results);
        }
      }


    } catch (error) {
      console.error(`Frame Processor Error: ${error}`);
    }
  }, [layout, screenW, screenH, screenTemplate]);
  if (!['authorized', 'granted'].includes(hasPermission)) {
    return (
      <Box className="flex-1 items-center justify-center bg-background-950 px-6">
        <Heading size="md" className="text-typography-50">No camera permission ({hasPermission})</Heading>
        <Heading size="sm" className="text-typography-50 mt-2">{debugStatus}</Heading>
      </Box>
    );
  }


  return (
    <>


      <Camera
        {...props}
        frameProcessor={frameProcessor as ReadonlyFrameProcessor}
        format={cameraFormat}
      />
      <TemplateOverlay layout={props.currentLayout} isActive={true} color="#00FF00" widthPercent={.80}/>
      <TemplateOverlay layout={TemplateLayout.ScreenDetection} isActive={true} color="#FF0000" widthPercent={.80} />

      {/* Debug: Screen-Detection-Status & optional Base64-Bild */}
      {screenResult && (
        <Box style={{ position: 'absolute', left: 12, top: 12, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 }}>
          <GluestackText className="text-typography-50 text-sm">
            detected: {String(screenResult?.detected)} | acc: {(screenResult?.accuracy ?? 0).toFixed?.(2) ?? screenResult?.accuracy}
          </GluestackText>
          {base64Image && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${base64Image}` }}
              style={{ width: 120, height: 160, marginTop: 8, borderRadius: 6 }}
              resizeMode="cover"
            />
          )}
        </Box>
      )}

      {/* Erkannte Boxen (matched_boxes) als blaue Overlays anzeigen */}
      {screenResult?.matched_boxes?.map((box: { x: any; y: any; w: any; h: any; }, idx: any) => {
        if (!box) return null;
        // Box: { x, y, w, h }
        return (
          <Box
            key={`matched_box_${idx}`}
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              borderWidth: 2,
              borderColor: 'blue',
              borderRadius: 4,
              zIndex: 250,
            }}
            pointerEvents="none"
          />
        );
      })}

      {/* Alle erkannten Rechtecke (all_detected_rects) als gelbe Overlays anzeigen */}
      {screenResult?.all_detected_rects?.map((rect: { x: any; y: any; w: any; h: any; }, idx: any) => {
        if (!rect) return null;
        // rect: { x, y, w, h }
        return (
          <Box
            key={`all_rect_${idx}`}
            style={{
              position: 'absolute',
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              borderWidth: 2,
              borderColor: 'yellow',
              borderRadius: 2,
              zIndex: 200,
              opacity: 0.5,
            }}
            pointerEvents="none"
          />
        );
      })}

      {/* Neu: Pixel-Template-Rechtecke (vor Matching) */}
      {screenResult?.template_pixel_boxes?.map((r: { x: any; y: any; w: any; h: any; }, idx: any) => {
        if (!r) return null;
        return (
          <Box
            key={`tmpl_px_${idx}`}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              borderWidth: 1,
              borderColor: 'magenta',
              borderStyle: 'dashed',
              zIndex: 170,
            }}
            pointerEvents="none"
          />
        );
      })}

      {/* OCR per-box labels at bottom-center of each box */}
      {layout.map(box => {
        const text = ocrMap[box.id];
        if (!text) return null;
        const labelTop = box.y + box.height - 24; // inside box near bottom
        return (
          <Box
            key={box.id}
            style={{ position: 'absolute', left: box.x, top: labelTop+30, width: box.width, alignItems: 'center', zIndex: 200 }}
          >
            <Box
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 8,
                paddingVertical: 4,
                paddingHorizontal: 8,
              }}
            >
              <GluestackText className="text-typography-50 text-sm text-center">
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
