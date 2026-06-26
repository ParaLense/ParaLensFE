import {
  Camera,
  useFrameOutput,
} from 'react-native-vision-camera';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import {
  OcrCheckboxBoxResult, OcrScrollBarResult,
  OcrValueBoxResult,
  performScan,
  ScanResult,
  ScreenResult
} from 'vision-camera-screen-detector';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text as GluestackText } from '@/components/ui/text';
import { scheduleOnRN } from 'react-native-worklets';
import { TemplateLayout, useTemplateLayout } from '@/features/templates/use-template-layout';
import { loadTemplateConfig } from '@/features/templates/template';
import { loadOcrTemplate } from '@/features/templates/ocr-template';
import {OcrScanResult, useOcrHistory} from '@/features/ocr';
import type { OcrFieldResult } from '@/features/ocr';
import { CameraPermissionProvider } from '@/features/camera';
import TemplateOverlay from './TemplateOverlay';
import { ScannerOverlays } from "@/components/camera/ScannerOverlays";
import {
  computeFrameToViewTransform,
  computeTemplateRect,
  FrameToViewTransform,
  mapBoxToViewStyle as mapBoxToViewStyleGeometry,
  mapWarpedBoxToViewStyle as mapWarpedBoxToViewStyleGeometry,
  Rect,
  toNumber,
} from "@/features/camera/camera-geometry";
import {ASPECT_H, ASPECT_W, IMAGE_QUALITY, ROI_INNER, ROI_OUTER, ROTATE_90_CW} from "@/features/ocr/constants";

/**
 * Compatibility shim for the old worklets-core `useRunOnJS(fn, deps)` hook.
 *
 * Returns a worklet-safe callback that hops `fn` back onto the JS thread via
 * react-native-worklets' `scheduleOnRN`. Calling `scheduleOnRN(fn, ...args)`
 * from inside the worklet is the documented pattern for VisionCamera 5 /
 * Reanimated 4; it avoids the "tried to synchronously call a non-worklet
 * function on the UI thread" error you get when a captured JS closure (e.g. one
 * that calls `console.log`) is invoked directly on the worklet runtime.
 */
function useRunOnJS<Args extends unknown[]>(
  fn: (...args: Args) => void,
  deps: React.DependencyList,
): (...args: Args) => void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFn = useCallback(fn, deps);
  return useCallback(
    (...args: Args) => {
      'worklet';
      scheduleOnRN(stableFn, ...args);
    },
    [stableFn],
  );
}

// OCR runs every N-th processed frame; screen detection runs every frame.
const OCR_EVERY_N = 3;
// Warped screenshot is captured every N-th processed frame (only needed at Continue tap).
const SCREENSHOT_EVERY_N = 5;

const SCREEN_WIDTH_RATIO = 0.8;
const SCREEN_ASPECT_W = ASPECT_W;
const SCREEN_ASPECT_H = ASPECT_H;
const SCREEN_ASPECT_RATIO = SCREEN_ASPECT_W / SCREEN_ASPECT_H;

// Centralized scan constants to keep detector behavior aligned with overlay geometry.
const SCAN_TEMPLATE_TARGET_W = 1200;
const SCAN_TEMPLATE_TARGET_H = 1600;
const SCAN_ACCURACY_THRESHOLD = 0.4;
const SCAN_IMAGE_QUALITY = IMAGE_QUALITY;
const SCAN_ROTATE_90_CW = ROTATE_90_CW;

const SCAN_ROI_OUTER = ROI_OUTER;
// Keep these values identical to ScannerOverlays inner ROI visualization.
const SCAN_ROI_INNER = ROI_INNER;

const SCAN_MIN_ASPECT_W = SCREEN_ASPECT_W;
const SCAN_MIN_ASPECT_H = SCREEN_ASPECT_H;

interface UiScannerCameraProps extends React.ComponentProps<typeof Camera> {
  currentLayout: TemplateLayout;
  /**
   * Optional callback to expose the current best OCR field values and raw map
   * to parent components (e.g. CameraScreen for scan-review prefill).
   */
  onOcrUpdate?: (payload: {
    bestFields: OcrFieldResult[];
    ocrMap: Record<string, string>;
    unitConfig?: {
      system?: import('@/features/ocr').UnitSystem;
      mode?: import('@/features/ocr').ValueMode;
    };
    isReady?: boolean;
  }) => void;
  onScanComplete?: (payload: any) => void;
  /** Callback to expose the latest warped base64 screenshot to parent */
  onScreenshotUpdate?: (base64: string) => void;
}
const UiScannerCamera: React.FC<UiScannerCameraProps> = ({
  currentLayout,
  style: cameraStyleProp,
  device,
  onOcrUpdate,
    onScanComplete,
    onScreenshotUpdate,
  ...restCameraProps
}: UiScannerCameraProps) => {

  const [cameraLayoutSize, setCameraLayoutSize] = useState<{ width: number; height: number } | null>(null);

  // VisionCamera v5 negotiates the frame resolution from a target (no more
  // explicit `format`). VisionCamera prioritizes the aspect ratio over exact
  // pixel count, so we request 3:4 to match the scan template / ROI geometry
  // (ASPECT_W=3, ASPECT_H=4). A 16:9 target would shift the normalized ROIs onto
  // a differently-cropped frame. ~960x1280 keeps the OpenCV/OCR scan fast.
  const targetResolution = useMemo(() => ({ width: 864, height: 1152 }), []);

  const windowDimensions = Dimensions.get('window');
  const viewWidth = cameraLayoutSize?.width ?? windowDimensions.width;
  const viewHeight = cameraLayoutSize?.height ?? windowDimensions.height;

  const [ocrMap, setOcrMap] = useState<Record<string, string>>({});
  const [screenResult, setScreenResult] = useState<ScreenResult | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  // Counts every frame handed off to runAsync — drives OCR and screenshot cadence.
  const scanFrameCounter = useSharedValue(0);

  // Keep a stable ref so the useRunOnJS callback never changes identity
  const onOcrUpdateRef = useRef(onOcrUpdate);
  onOcrUpdateRef.current = onOcrUpdate;

  const onOcrUpdateJS = useRunOnJS(
    (payload: {
      bestFields: OcrFieldResult[];
      ocrMap: Record<string, string>;
      unitConfig?: {
        system?: import('@/features/ocr').UnitSystem;
        mode?: import('@/features/ocr').ValueMode;
      };
      isReady?: boolean;
    }) => {
      onOcrUpdateRef.current?.(payload);
    },
    []
  );

  const onScreenshotUpdateRef = useRef(onScreenshotUpdate);
  onScreenshotUpdateRef.current = onScreenshotUpdate;

  const debugLogJS = useRunOnJS(
    (...args: any[]) => {
      if (!__DEV__) return;
      console.log("[ocr-debug]", ...args);
    },
    []
  );

  const ocrTemplate = useMemo(() => loadOcrTemplate(currentLayout), [currentLayout]);
  const templateFieldIds = useMemo(
    () => ocrTemplate.map((entry) => entry?.id).filter(Boolean) as string[],
    [ocrTemplate]
  );

  // OCR History Hook for filtering and storing recognized values
  const ocrHistory = useOcrHistory({
    maxHistoryPerField: 30,
    minOccurrencesForMajority: 3,
    commaRequired: true, // Keep comma requirement for numeric value fields
    template: ocrTemplate,
  });

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

  // Stable ref to the latest ocrHistory so the worklet callback never needs to change identity.
  const ocrHistoryRef = useRef(ocrHistory);
  ocrHistoryRef.current = ocrHistory;

  // Single batched JS update per processed frame → one React render instead of four.
  const setScanFrameJS = useRunOnJS((payload: {
    screen: ScreenResult;
    map: Record<string, string>;
    scanResult: OcrScanResult | null;
    base64: string | null;
  }) => {
    // Only update screenResult when detection succeeded — keeps the last good overlay visible
    // instead of clearing the blue boxes every time contour detection misses a frame.
    if (payload.screen.detected) setScreenResult(payload.screen);
    if (Object.keys(payload.map).length > 0) setOcrMap(payload.map);
    if (payload.scanResult) ocrHistoryRef.current.addScanResult(payload.scanResult);
    if (payload.base64) setBase64Image(payload.base64);
  }, []);

  // Whenever OCR history / map change, compute best fields and notify parent (on JS thread)
  useEffect(() => {
    if (!onOcrUpdateRef.current) return;
    const bestFields = ocrHistory.getBestFields();
    if (!bestFields || bestFields.length === 0) return;
    const readyStatus = ocrHistory.getReadyStatus(templateFieldIds);
    onOcrUpdateJS({
      bestFields,
      ocrMap,
      unitConfig: ocrHistory.unitConfig,
      isReady: readyStatus.isReady,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ocrHistory.fieldAggregations,
    ocrHistory.unitConfig,
    ocrMap,
    onOcrUpdateJS,
    templateFieldIds,
    // Intentionally omit `ocrHistory` — its object identity changes on every render.
    // fieldAggregations + unitConfig are the stable deps that carry the actual data.
  ]);

  // Forward the latest warped base64 screenshot to parent
  useEffect(() => {
    if (base64Image && onScreenshotUpdateRef.current) {
      onScreenshotUpdateRef.current(base64Image);
    }
  }, [base64Image]);

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
    return computeFrameToViewTransform(
      frameDimensions.width,
      frameDimensions.height,
      cameraLayoutSize.width,
      cameraLayoutSize.height,
    );
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
      return computeTemplateRect(
        frameDimensions.width,
        frameDimensions.height,
        SCREEN_WIDTH_RATIO,
        SCREEN_ASPECT_W,
        SCREEN_ASPECT_H,
      );
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

  const frameOutput = useFrameOutput({
    targetResolution,
    // YUV is OpenCV/MLKit's native input — no conversion in the camera pipeline.
    pixelFormat: 'yuv',
    // Drop frames while the (heavy) scan is busy instead of queueing them up.
    dropFramesWhileBusy: true,
    onFrame: frame => {
      'worklet';
      // The scan runs synchronously on the camera worklet thread. The frame
      // buffer MUST be disposed before returning, otherwise the camera pipeline
      // runs out of buffers and stalls.
      try {
        const cnt = scanFrameCounter.value + 1;
      scanFrameCounter.value = cnt;
      const doOcr = cnt % OCR_EVERY_N === 0;
      const doScreenshot = cnt % SCREENSHOT_EVERY_N === 0;

      const scan = performScan(frame, {
        screenTemplate,
        ocrTemplate,
        runOcr: doOcr,
        templateTargetW: SCAN_TEMPLATE_TARGET_W,
        templateTargetH: SCAN_TEMPLATE_TARGET_H,
        returnWarpedImage: doScreenshot,
        accuracyThreshold: SCAN_ACCURACY_THRESHOLD,
        roiOuter: SCAN_ROI_OUTER,
        roiInner: SCAN_ROI_INNER,
        minAspectW: SCAN_MIN_ASPECT_W,
        minAspectH: SCAN_MIN_ASPECT_H,
        imageQuality: SCAN_IMAGE_QUALITY,
        rotate90CW: SCAN_ROTATE_90_CW,
      });

      if (__DEV__) {
        debugLogJS("scan", {
          hasScreen: !!scan?.screen,
          boxCount: scan?.ocr?.boxes?.length ?? 0,
          doOcr,
          doScreenshot,
        });
      }

      if (scan?.screen) {
        const map: Record<string, string> = {};
        let enrichedBoxes: Array<OcrValueBoxResult | OcrCheckboxBoxResult | OcrScrollBarResult> = [];

        if (doOcr && scan.ocr?.boxes?.length) {
          if (__DEV__) {
            debugLogJS("boxes", scan.ocr.boxes.map((b) => ({ id: b.id, type: b.type })));
          }

          for (const b of scan.ocr.boxes) {
            if (!b || !b.id) continue;
            if (b.type === 'value') {
              map[b.id] = (b.number != null ? String(b.number) : (b.text ?? '')) ?? '';
            } else if (b.type === 'checkbox') {
              map[b.id] = b.checked ? 'true' : 'false';
              if (b.checked && b.valueBoxId && (b.valueText || b.valueNumber != null)) {
                const valueKey = `${b.id}_value`;
                map[valueKey] = (b.valueNumber != null ? String(b.valueNumber) : (b.valueText ?? '')) ?? '';
              }
            } else if (b.type === 'scrollbar') {
              const values = Array.isArray(b.values) ? b.values : [];
              const tokens: string[] = [];

              for (const v of values) {
                if (typeof v === 'string') {
                  const trimmed = v.trim();
                  if (trimmed.length > 0) tokens.push(trimmed);
                  continue;
                }
                if (typeof v === 'number') {
                  tokens.push(String(v));
                  continue;
                }
                if (v && typeof v === 'object') {
                  const { text } = v as { text?: string };
                  const num = (v as { number?: number }).number;
                  if (typeof text === 'string' && text.trim().length > 0) {
                    tokens.push(text.trim());
                  } else if (typeof num === 'number') {
                    tokens.push(String(num));
                  }
                }
              }

              if (tokens.length > 0) {
                map[b.id] = tokens.join(', ');
              }
            }
          }

          enrichedBoxes = scan.ocr.boxes.map((box: OcrValueBoxResult | OcrCheckboxBoxResult | OcrScrollBarResult) => {
            const templateBox = ocrTemplate.find(t => t.id === box.id);
            return {
              ...box,
              sameUnitAs: templateBox?.sameUnitAs,
              expectedUnits: templateBox?.expectedUnits,
              expectedKeyUnits: templateBox?.expectedKeyUnits,
              options: templateBox?.options,
            };
          });

          if (__DEV__) {
            if (Object.keys(map).length > 0) debugLogJS("ocrMap", map);
            debugLogJS("enrichedBoxes", enrichedBoxes.map((b) => ({
              id: b.id,
              type: b.type,
              options: (b as any).options,
              expectedUnits: (b as any).expectedUnits,
            })));
          }
        }

        setScanFrameJS({
          screen: scan.screen,
          map,
          scanResult: doOcr ? {
            timestamp: Date.now(),
            boxes: enrichedBoxes,
            screenDetected: scan.screen.detected,
            accuracy: scan.screen.accuracy,
          } : null,
          base64: doScreenshot ? (scan.screen.image_base64 ?? null) : null,
        });
        }
      } finally {
        frame.dispose();
      }
    },
  });
  
  type FrameBox = {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  const mapBoxToViewStyle = useCallback(
    (box: FrameBox) =>
      mapBoxToViewStyleGeometry(box, frameToViewTransform),
    [frameToViewTransform],
  );

  const mapWarpedBoxToViewStyle = useCallback(
    (
      box: FrameBox,
      homography: number[][] | null | undefined,
      outputW: number,
      outputH: number,
    ) =>
      mapWarpedBoxToViewStyleGeometry(
        box,
        homography,
        outputW,
        outputH,
        frameToViewTransform,
      ),
    [frameToViewTransform],
  );

  return (
    <CameraPermissionProvider>
      {({ hasPermission }) => {
        // Check permission and render appropriate UI
        if (!['authorized', 'granted'].includes(hasPermission)) {
          return (
            <>
              <Box className="flex-1 items-center justify-center bg-background-950 px-6">
                <Heading size="md" className="text-typography-50">
                  Kamera-Berechtigung erforderlich
                </Heading>
                <Heading size="sm" className="text-typography-50 mt-2">
                  Um die Kamera zu verwenden, benötigen wir Ihre Erlaubnis.
                </Heading>
              </Box>
            </>
          );
        }

  return (
    <Box 
      style={[
        styles.container, 
        cameraStyleProp,
        { backgroundColor: '#000000' } // Ensure camera has black background
      ]} 
      onLayout={handleLayout}
    >
      <Camera
        {...restCameraProps}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        resizeMode="contain"
        outputs={[frameOutput]}
      />

      <ScannerOverlays
        currentLayout={currentLayout}
        cameraLayoutSize={cameraLayoutSize}
        templateViewport={templateViewport}
        screenResult={screenResult}
        ocrMap={ocrMap}
        ocrLayoutBoxes={ocrLayoutBoxes}
        ocrHistory={ocrHistory}
        mapBoxToViewStyle={mapBoxToViewStyle}
        mapWarpedBoxToViewStyle={mapWarpedBoxToViewStyle}
        widthPercent={SCREEN_WIDTH_RATIO}
        aspectRatio={SCREEN_ASPECT_RATIO}
      />
    </Box>
        );
      }}
    </CameraPermissionProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default UiScannerCamera;
