import {
  Camera,
  ReadonlyFrameProcessor,
  useFrameProcessor,
} from 'react-native-vision-camera';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { performScan } from 'vision-camera-screen-detector';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text as GluestackText } from '@/components/ui/text';
import { useRunOnJS } from 'react-native-worklets-core';
import { TemplateLayout, useTemplateLayout } from '@/features/templates/use-template-layout';
import { loadTemplateConfig } from '@/features/templates/template';
import { loadOcrTemplate } from '@/features/templates/ocr-template';
import { useOcrHistory } from '@/features/ocr';
import { CameraPermissionProvider } from '@/features/camera';
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

  // OCR History Hook for filtering and storing recognized values
  const ocrHistory = useOcrHistory({
    maxHistoryPerField: 30,
    minOccurrencesForMajority: 3,
    commaRequired: true, // Keep comma requirement for value fields
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

  // Function to add OCR values to history - wrapped with useRunOnJS
  const addOcrToHistory = useCallback((ocrMap: Record<string, string>) => {
    ocrHistory.addScanResult(ocrMap);
  }, [ocrHistory]);
  const addOcrToHistoryJS = useRunOnJS(addOcrToHistory, []);

  // Function to add full scan result to history - wrapped with useRunOnJS
  const addFullScanResult = useCallback((scanResult: any) => {
    ocrHistory.addFullScanResult(scanResult);
  }, [ocrHistory]);
  const addFullScanResultJS = useRunOnJS(addFullScanResult, []);

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

  // TODO: load OCR template for currentLayout (percent over warped image)
  const ocrTemplate = useMemo(() => loadOcrTemplate(currentLayout), [currentLayout]);

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
        screenTemplate,
        ocrTemplate,
        runOcr: true,
        screenAspectW: SCREEN_ASPECT_W,
        screenAspectH: SCREEN_ASPECT_H,
        templateTargetW: 1200,
        templateTargetH: 1600,
        returnWarpedImage: true,
        accuracyThreshold: 0.40,
        // ROI in normalized coordinates (defaults equivalent to main2.py)
        roiOuter: { x: 0.10, y: 0.05, width: 0.80, height: 0.90 },
        roiInner: { x: 0.30, y: 0.20, width: 0.45, height: 0.60 },
        minAspectW: 3,
        minAspectH: 4,
        imageQuality: 80,
        rotate90CW: true,
      });

      if (scan?.screen) {
        setScreenResultJS(scan.screen);
        if (scan.screen.image_base64) {
          setBase64ImageJS(scan.screen.image_base64);
        }

        if (scan.ocr?.boxes?.length) {
          const map: Record<string, string> = {};
          const scrollbarBoxes: any[] = [];
          
          // First pass: process all non-scrollbar boxes to populate the map
          for (const b of scan.ocr.boxes as any[]) {
            if (!b || !b.id) continue;
            if (b.type === 'value') {
              map[b.id] = (b.number != null ? String(b.number) : (b.text ?? '')) ?? '';
            } else if (b.type === 'checkbox') {
              map[b.id] = b.checked ? 'true' : 'false';
              // If checkbox has an associated value, also store it
              if (b.checked && b.valueBoxId && (b.valueText || b.valueNumber != null)) {
                const valueKey = `${b.id}_value`;
                map[valueKey] = (b.valueNumber != null ? String(b.valueNumber) : (b.valueText ?? '')) ?? '';
              }
            } else if (b.type === 'scrollbar') {
              // Store scrollbar boxes for second pass
              scrollbarBoxes.push(b);
            }
          }
          
          // Second pass: process scrollbar boxes now that we have all start values
          for (const b of scrollbarBoxes) {
            // Handle scrollbar values - convert array of text blocks to key-value pairs
            const scrollbarValues = b.values;
            if (Array.isArray(scrollbarValues)) {
              // Check if this is a scrollbar with a corresponding _start field
              const hasStartValue = b.id.endsWith('_items');
              const startValueFieldId = hasStartValue ? b.id.replace('_items', '_start') : null;
              
              // Get start value from map if it exists
              const startValue = startValueFieldId ? map[startValueFieldId] : null;
              
              // Filter out start value from the beginning of the array
              let filteredValues = [...scrollbarValues];
              if (startValue && filteredValues.length > 0) {
                const startValueTrimmed = startValue.trim();
                // Remove first value if it matches start value
                if (filteredValues[0]?.trim() === startValueTrimmed) {
                  filteredValues = filteredValues.slice(1);
                } else if (filteredValues.length > 1 && filteredValues[1]?.trim() === startValueTrimmed) {
                  // Remove second value if it matches start value
                  filteredValues = filteredValues.slice(2);
                }
              }
              
              // Group into key-value pairs: block[0]=key, block[1]=value, block[2]=key, etc.
              const keyValueMap: Record<string, string> = {};
              for (let i = 0; i < filteredValues.length; i += 2) {
                const key = filteredValues[i]?.trim() || '';
                const value = filteredValues[i + 1]?.trim() || '';
                if (key) {
                  keyValueMap[key] = value;
                }
              }
              // Format as key:value pairs
              const scrollbarValue = Object.entries(keyValueMap)
                .map(([key, val]) => `${key}:${val}`)
                .join(', ');
              map[b.id] = scrollbarValue;
            }
          }
          if (Object.keys(map).length > 0) {
            setOcrMapJS(map);
            // Add to OCR history for filtering (legacy method)
            addOcrToHistoryJS(map);
            
            // Add full scan result to history with complete box information
            const fullScanResult = {
              timestamp: Date.now(),
              boxes: scan.ocr.boxes,
              screenDetected: true, // We know screen was detected if we're here
              accuracy: 0.5, // Default accuracy since we don't have direct access
            };
            addFullScanResultJS(fullScanResult);
          }
        }
      }
    } catch (error) {
      console.error(`Frame Processor Error: ${error}`);
    }
  }, [lastFrameTime, ocrLayoutBoxes, screenTemplate, setBase64ImageJS, setOcrMapJS, setScreenResultJS, addOcrToHistoryJS, addFullScanResultJS, viewHeight, viewWidth]);

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

  return (
    <CameraPermissionProvider>
      {({ hasPermission, debugStatus, showPermissionDialog, setShowPermissionDialog, requestPermission }) => {
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
        resizeMode="contain"
        androidPreviewViewType="texture-view"
        frameProcessor={frameProcessor as ReadonlyFrameProcessor}
        format={cameraFormat}
      />

      {/* Draw only ROI overlays using TemplateOverlay */}
      {templateViewport ? (
        <>
          <TemplateOverlay
            layout={null}
            isActive
            boxes={[{
              id: 'roi-outer',
              x: templateViewport.offsetX,
              y: templateViewport.offsetY,
              width: templateViewport.width,
              height: templateViewport.height,
              color: '#FF0000',
            }]}
          />
          {/* Optional inner ROI estimate at 30/20/45/60 of viewport */}
          <TemplateOverlay
            layout={null}
            isActive
            boxes={[{
              id: 'roi-inner',
              x: templateViewport.offsetX + templateViewport.width * 0.30,
              y: templateViewport.offsetY + templateViewport.height * 0.20,
              width: templateViewport.width * 0.45,
              height: templateViewport.height * 0.60,
              color: '#00FF00',
            }]}
          />
        </>
      ) : (
        <TemplateOverlay
          layout={null}
          isActive
          widthPercent={SCREEN_WIDTH_RATIO}
          aspectRatio={SCREEN_ASPECT_RATIO}
          containerWidth={cameraLayoutSize?.width}
          containerHeight={cameraLayoutSize?.height}
          boxes={[]}
        />
      )}

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
        </Box>
      )}

      {/* OCR History Debug Info */}
      {Object.keys(ocrMap).length > 0 && (
        <Box
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            zIndex: 300,
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: 8,
            borderRadius: 8,
            maxWidth: 200,
          }}
        >
          <GluestackText className="text-typography-50 text-xs">
            OCR History:
          </GluestackText>
          {Object.keys(ocrMap).slice(0, 3).map(fieldId => {
            const stats = ocrHistory.getFieldStats(fieldId);
            const filteredValue = ocrHistory.getFilteredValue(fieldId);
            const typeBreakdown = stats.typeBreakdown;
            return (
              <GluestackText key={fieldId} className="text-typography-50 text-xs">
                {fieldId}: {stats.totalScans} scans, {stats.uniqueValues} unique
                <GluestackText className="text-blue-400">
                  {' '}(V:{typeBreakdown.value} C:{typeBreakdown.checkbox} S:{typeBreakdown.scrollbar})
                </GluestackText>
                {filteredValue && (
                  <GluestackText className="text-green-400">
                    {' '}→ {filteredValue}
                  </GluestackText>
                )}
              </GluestackText>
            );
          })}
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

      {/* No template-pixel boxes overlay anymore */}

      {ocrLayoutBoxes.map(box => {
        // Use filtered value from history instead of raw OCR map
        const filteredValue = ocrHistory.getFilteredValue(box.id);
        const rawValue = ocrMap[box.id];
        
        // Show filtered value if available, otherwise show raw value
        const displayValue = filteredValue || rawValue;
        if (!displayValue) return null;

        const labelTop = box.y + box.height - 24;
        return (
          <Box
            key={box.id}
            style={{
              position: 'absolute',
              left: box.x,
              top: labelTop + 30,
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
                minWidth: 40,
                maxWidth: Math.max(box.width * 1.5, 120), // Allow 50% more width or minimum 120px
              }}
            >
              <GluestackText 
                className={`text-sm text-center ${
                  filteredValue ? 'text-green-400' : 'text-yellow-400'
                }`}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayValue}
                {filteredValue && rawValue !== filteredValue && (
                  <GluestackText className="text-xs text-gray-400">
                    {' '}(filtered)
                  </GluestackText>
                )}
              </GluestackText>
            </Box>
          </Box>
        );
      })}
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
