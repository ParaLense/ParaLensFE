import {
  Camera,
  ReadonlyFrameProcessor,
  useFrameProcessor,
} from 'react-native-vision-camera';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Image,
  LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
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
const SCREEN_WIDTH_RATIO = 0.8;
const SCREEN_ASPECT_W = 3;
const SCREEN_ASPECT_H = 4;
const SCREEN_ASPECT_RATIO = SCREEN_ASPECT_W / SCREEN_ASPECT_H;

interface UiScannerCameraProps extends React.ComponentProps<typeof Camera> {
  currentLayout: TemplateLayout;
}

type CameraPermissionStatus =
  | 'authorized'
  | 'denied'
  | 'not-determined'
  | 'restricted'
  | 'granted';

interface FrameToViewTransform {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const computeTemplateRect = (frameW: number, frameH: number): Rect => {
  let templW = Math.max(1, Math.round(frameW * SCREEN_WIDTH_RATIO));
  let templH = Math.max(1, Math.round((templW * SCREEN_ASPECT_H) / SCREEN_ASPECT_W));

  if (templH > frameH) {
    const scale = frameH / templH;
    templH = frameH;
    templW = Math.max(1, Math.round(templW * scale));
  }

  const templX = Math.round((frameW - templW) / 2);
  const templY = Math.round((frameH - templH) / 2);

  return { x: templX, y: templY, w: templW, h: templH };
};

const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const UiScannerCamera: React.FC<UiScannerCameraProps> = ({
  currentLayout,
  style: cameraStyleProp,
  device,
  ...restCameraProps
}: UiScannerCameraProps) => {

  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [cameraLayoutSize, setCameraLayoutSize] = useState<{ width: number; height: number } | null>(null);

  const cameraFormat = useMemo(() => {
    if (!device?.formats) return undefined;
    return device.formats
      .filter(f => f.maxFps >= 15 && f.videoWidth === 1280 && f.photoHeight >= 1280)
      .sort((a, b) => a.photoWidth - b.photoWidth)[0];
  }, [device]);

  const windowDimensions = Dimensions.get('window');
  const viewWidth = cameraLayoutSize?.width ?? windowDimensions.width;
  const viewHeight = cameraLayoutSize?.height ?? windowDimensions.height;

  const [ocrMap, setOcrMap] = useState<Record<string, string>>({});
  const [screenResult, setScreenResult] = useState<any | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const lastFrameTime = useSharedValue(0);
  const setOcrMapJS = useRunOnJS(setOcrMap, []);
  const setScreenResultJS = useRunOnJS(setScreenResult, []);
  const setBase64ImageJS = useRunOnJS(setBase64Image, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!width || !height) return;

    setCameraLayoutSize(prev => {
      if (prev && prev.width === width && prev.height === height) {
        return prev;
      }
      return { width, height };
    });
  }, []);

  const screenTemplate = useMemo(
    () =>
      loadTemplateConfig(TemplateLayout.ScreenDetection).map(b => ({
        id: b.id,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      })),
    []
  );

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

    checkAndRequestPermission();

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

  const frameDimensions = useMemo(() => {
    const frameW = toNumber(screenResult?.width, 0);
    const frameH = toNumber(screenResult?.height, 0);
    if (frameW > 0 && frameH > 0) {
      return { width: frameW, height: frameH };
    }
    return null;
  }, [screenResult]);

  const frameToViewTransform = useMemo<FrameToViewTransform | null>(() => {
    if (!frameDimensions || !cameraLayoutSize) return null;

    const { width: frameW, height: frameH } = frameDimensions;
    const { width: layoutW, height: layoutH } = cameraLayoutSize;
    if (frameW <= 0 || frameH <= 0 || layoutW <= 0 || layoutH <= 0) return null;

    const scale = Math.min(layoutW / frameW, layoutH / frameH);
    const scaledW = frameW * scale;
    const scaledH = frameH * scale;

    return {
      scaleX: scale,
      scaleY: scale,
      offsetX: (layoutW - scaledW) / 2,
      offsetY: (layoutH - scaledH) / 2,
    };
  }, [cameraLayoutSize, frameDimensions]);

  const templateRectFrame = useMemo<Rect | null>(() => {
    if (screenResult?.template_rect) {
      const rect = screenResult.template_rect;
      return {
        x: toNumber(rect.x),
        y: toNumber(rect.y),
        w: Math.max(1, toNumber(rect.w)),
        h: Math.max(1, toNumber(rect.h)),
      };
    }

    if (frameDimensions) {
      return computeTemplateRect(frameDimensions.width, frameDimensions.height);
    }

    return null;
  }, [frameDimensions, screenResult]);

  const templateViewport = useMemo(() => {
    if (!frameToViewTransform || !templateRectFrame) return null;

    const { scaleX, scaleY, offsetX, offsetY } = frameToViewTransform;
    return {
      width: templateRectFrame.w * scaleX,
      height: templateRectFrame.h * scaleY,
      offsetX: offsetX + templateRectFrame.x * scaleX,
      offsetY: offsetY + templateRectFrame.y * scaleY,
    };
  }, [frameToViewTransform, templateRectFrame]);

  const ocrLayoutBoxes = useTemplateLayout({
    layout: currentLayout,
    widthPercent: SCREEN_WIDTH_RATIO,
    aspectRatio: SCREEN_ASPECT_RATIO,
    containerWidth: cameraLayoutSize?.width,
    containerHeight: cameraLayoutSize?.height,
    viewportWidth: templateViewport?.width,
    viewportHeight: templateViewport?.height,
    offsetX: templateViewport?.offsetX,
    offsetY: templateViewport?.offsetY,
  });

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    try {
      const now = performance.now();
      if (now - lastFrameTime.value < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrameTime.value = now;

      const scan = performScan(frame, {
        template: screenTemplate,
        screenWidthRatio: SCREEN_WIDTH_RATIO,
        screenAspectW: SCREEN_ASPECT_W,
        screenAspectH: SCREEN_ASPECT_H,
        minIouForMatch: 0.3,
        accuracyThreshold: 0.6,
        templateTargetW: 720,
        templateTargetH: 1280,
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

        const results: Record<string, string> = {};
        for (const box of ocrLayoutBoxes) {
          const result = performOcr(
            frame,
            { x: box.x, y: box.y, width: box.width, height: box.height },
            { width: viewWidth, height: viewHeight }
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
  }, [lastFrameTime, ocrLayoutBoxes, screenTemplate, setBase64ImageJS, setOcrMapJS, setScreenResultJS, viewHeight, viewWidth]);

  const mapBoxToViewStyle = (box: { x: any; y: any; w: any; h: any }) => {
    if (!frameToViewTransform) return null;

    const { scaleX, scaleY, offsetX, offsetY } = frameToViewTransform;
    const x = toNumber(box.x);
    const y = toNumber(box.y);
    const w = toNumber(box.w);
    const h = toNumber(box.h);

    return {
      left: offsetX + x * scaleX,
      top: offsetY + y * scaleY,
      width: Math.max(0, w * scaleX),
      height: Math.max(0, h * scaleY),
    };
  };

  if (!['authorized', 'granted'].includes(hasPermission)) {
    return (
      <Box className="flex-1 items-center justify-center bg-background-950 px-6">
        <Heading size="md" className="text-typography-50">
          No camera permission ({hasPermission})
        </Heading>
        <Heading size="sm" className="text-typography-50 mt-2">
          {debugStatus}
        </Heading>
      </Box>
    );
  }

  const renderTemplateOverlays = () => {
    if (templateViewport) {
      return (
        <>
          <TemplateOverlay
            layout={currentLayout}
            isActive
            color="#00FF00"
            viewportWidth={templateViewport.width}
            viewportHeight={templateViewport.height}
            offsetX={templateViewport.offsetX}
            offsetY={templateViewport.offsetY}
          />
          <TemplateOverlay
            layout={TemplateLayout.ScreenDetection}
            isActive
            color="#FF0000"
            viewportWidth={templateViewport.width}
            viewportHeight={templateViewport.height}
            offsetX={templateViewport.offsetX}
            offsetY={templateViewport.offsetY}
          />
        </>
      );
    }

    return (
      <>
        <TemplateOverlay
          layout={currentLayout}
          isActive
          color="#00FF00"
          widthPercent={SCREEN_WIDTH_RATIO}
          aspectRatio={SCREEN_ASPECT_RATIO}
          containerWidth={cameraLayoutSize?.width}
          containerHeight={cameraLayoutSize?.height}
        />
        <TemplateOverlay
          layout={TemplateLayout.ScreenDetection}
          isActive
          color="#FF0000"
          widthPercent={SCREEN_WIDTH_RATIO}
          aspectRatio={SCREEN_ASPECT_RATIO}
          containerWidth={cameraLayoutSize?.width}
          containerHeight={cameraLayoutSize?.height}
        />
      </>
    );
  };

  return (
    <Box style={[styles.container, cameraStyleProp]} onLayout={handleLayout}>
      <Camera
        {...restCameraProps}
        style={StyleSheet.absoluteFill}
        device={device}
        resizeMode="contain"
        frameProcessor={frameProcessor as ReadonlyFrameProcessor}
        format={cameraFormat}
      />

      {renderTemplateOverlays()}

      {screenResult && (
        <Box
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            zIndex: 300,
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: 8,
            borderRadius: 8,
          }}
        >
          <GluestackText className="text-typography-50 text-sm">
            detected: {String(screenResult?.detected)} | acc:{' '}
            {(screenResult?.accuracy ?? 0).toFixed?.(2) ?? screenResult?.accuracy}
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

      {screenResult?.matched_boxes?.map(
        (box: { x: any; y: any; w: any; h: any }, idx: number) => {
          if (!box) return null;
          const style = mapBoxToViewStyle(box);
          if (!style) return null;

          return (
            <Box
              key={`matched_box_${idx}`}
              style={{
                position: 'absolute',
                ...style,
                borderWidth: 2,
                borderColor: 'blue',
                borderRadius: 4,
                zIndex: 250,
              }}
              pointerEvents="none"
            />
          );
        }
      )}

      {screenResult?.all_detected_rects?.map(
        (rect: { x: any; y: any; w: any; h: any }, idx: number) => {
          if (!rect) return null;
          const style = mapBoxToViewStyle(rect);
          if (!style) return null;

          return (
            <Box
              key={`all_rect_${idx}`}
              style={{
                position: 'absolute',
                ...style,
                borderWidth: 2,
                borderColor: 'yellow',
                borderRadius: 2,
                zIndex: 200,
                opacity: 0.5,
              }}
              pointerEvents="none"
            />
          );
        }
      )}

      {screenResult?.template_pixel_boxes?.map(
        (rect: { x: any; y: any; w: any; h: any }, idx: number) => {
          if (!rect) return null;
          const style = mapBoxToViewStyle(rect);
          if (!style) return null;

          return (
            <Box
              key={`tmpl_px_${idx}`}
              style={{
                position: 'absolute',
                ...style,
                borderWidth: 1,
                borderColor: 'magenta',
                borderStyle: 'dashed',
                zIndex: 170,
              }}
              pointerEvents="none"
            />
          );
        }
      )}

      {ocrLayoutBoxes.map(box => {
        const text = ocrMap[box.id];
        if (!text) return null;

        const labelTop = box.y + box.height - 24;
        return (
          <Box
            key={box.id}
            style={{
              position: 'absolute',
              left: box.x,
              top: labelTop + 30,
              width: box.width,
              alignItems: 'center',
              zIndex: 200,
            }}
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
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default UiScannerCamera;
