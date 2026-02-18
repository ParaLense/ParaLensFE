import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text as GluestackText } from "@/components/ui/text";
import TemplateOverlay from "@/components/TemplateOverlay";
import { TemplateLayout } from "@/features/templates/use-template-layout";

type RectLike = { x: any; y: any; w: any; h: any };

type TemplateViewport = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
} | null;

type ScannerOverlaysProps = {
  currentLayout: TemplateLayout;
  cameraLayoutSize: { width: number; height: number } | null;
  templateViewport: TemplateViewport;
  screenResult: any | null;
  ocrMap: Record<string, string>;
  ocrLayoutBoxes: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  ocrHistory: {
    getFieldStats: (fieldId: string) => any;
    getFilteredValue: (fieldId: string) => string | null | undefined;
  };
  mapBoxToViewStyle: (box: RectLike) =>
    | {
        left: number;
        top: number;
        width: number;
        height: number;
      }
    | null;
  mapWarpedBoxToViewStyle: (
    box: RectLike,
    homography: number[][] | null | undefined,
    outputW: number,
    outputH: number,
  ) =>
    | {
        left: number;
        top: number;
        width: number;
        height: number;
      }
    | null;
  widthPercent: number;
  aspectRatio: number;
};

export const ScannerOverlays: React.FC<ScannerOverlaysProps> = ({
  currentLayout,
  cameraLayoutSize,
  templateViewport,
  screenResult,
  ocrMap,
  ocrLayoutBoxes,
  ocrHistory,
  mapBoxToViewStyle,
  mapWarpedBoxToViewStyle,
  widthPercent,
  aspectRatio,
}) => {
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
          widthPercent={widthPercent}
          aspectRatio={aspectRatio}
          containerWidth={cameraLayoutSize?.width}
          containerHeight={cameraLayoutSize?.height}
        />
        <TemplateOverlay
          layout={TemplateLayout.ScreenDetection}
          isActive
          color="#FF0000"
          widthPercent={widthPercent}
          aspectRatio={aspectRatio}
          containerWidth={cameraLayoutSize?.width}
          containerHeight={cameraLayoutSize?.height}
        />
      </>
    );
  };

  const roiOverlay = (
    <TemplateOverlay
      layout={null}
      isActive
      boxes={
        templateViewport
          ? [
              {
                id: "roi-outer",
                x: templateViewport.offsetX,
                y: templateViewport.offsetY,
                width: templateViewport.width,
                height: templateViewport.height,
                color: "#FFFFFF",
              },
              {
                id: "roi-inner",
                x:
                  templateViewport.offsetX +
                  (templateViewport.width * (1 - 0.45)) / 2,
                y:
                  templateViewport.offsetY +
                  (templateViewport.height * (1 - 0.6)) / 2,
                width: templateViewport.width * 0.45,
                height: templateViewport.height * 0.6,
                color: "#FFFFFF",
                isInner: true,
              },
            ]
          : []
      }
      widthPercent={widthPercent}
      aspectRatio={aspectRatio}
      containerWidth={cameraLayoutSize?.width}
      containerHeight={cameraLayoutSize?.height}
    />
  );

  const screenDebug =
    screenResult && (
      <Box
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          zIndex: 300,
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 8,
          borderRadius: 8,
        }}
      >
        <GluestackText className="text-typography-50 text-sm">
          detected: {String(screenResult?.detected)} | acc:{" "}
          {(screenResult?.accuracy ?? 0).toFixed?.(2) ??
            screenResult?.accuracy}
        </GluestackText>
      </Box>
    );

  const ocrDebug =
    Object.keys(ocrMap).length > 0 && (
      <Box
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          zIndex: 300,
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 8,
          borderRadius: 8,
          maxWidth: 200,
        }}
      >
        <GluestackText className="text-typography-50 text-xs">
          OCR History:
        </GluestackText>
        {Object.keys(ocrMap)
          .slice(0, 3)
          .map((fieldId) => {
            const stats = ocrHistory.getFieldStats(fieldId);
            const filteredValue = ocrHistory.getFilteredValue(fieldId);
            const typeBreakdown = stats.typeBreakdown;
            return (
              <GluestackText
                key={fieldId}
                className="text-typography-50 text-xs"
              >
                {fieldId}: {stats.totalScans} scans, {stats.uniqueValues} unique
                <GluestackText className="text-blue-400">
                  {" "}
                  (V:{typeBreakdown.value} C:{typeBreakdown.checkbox} S:
                  {typeBreakdown.scrollbar})
                </GluestackText>
                {filteredValue && (
                  <GluestackText className="text-green-400">
                    {" "}
                    → {filteredValue}
                  </GluestackText>
                )}
              </GluestackText>
            );
          })}
      </Box>
    );

  const matchedBoxes =
    screenResult?.matched_boxes?.map(
      (box: RectLike, idx: number) => {
        if (!box) return null;

        const outputW = Number(
          screenResult?.template_target_size?.w ?? 1200,
        );
        const outputH = Number(
          screenResult?.template_target_size?.h ?? 1600,
        );
        const homography = screenResult?.homography;

        const style = mapWarpedBoxToViewStyle(
          box,
          homography,
          outputW,
          outputH,
        );
        if (!style) return null;

        return (
          <Box
            key={`matched_box_${idx}`}
            style={
              {
                position: "absolute",
                ...style,
                borderWidth: 2,
                borderColor: "blue",
                borderRadius: 4,
                zIndex: 250,
              } as StyleProp<ViewStyle>
            }
            pointerEvents="none"
          />
        );
      },
    ) ?? null;

  const allDetectedRects =
    screenResult?.all_detected_rects?.map(
      (rect: RectLike, idx: number) => {
        if (!rect) return null;
        const style = mapBoxToViewStyle(rect);
        if (!style) return null;

        return (
          <Box
            key={`all_rect_${idx}`}
            style={
              {
                position: "absolute",
                ...style,
                borderWidth: 2,
                borderColor: "yellow",
                borderRadius: 2,
                zIndex: 200,
                opacity: 0.5,
              } as StyleProp<ViewStyle>
            }
            pointerEvents="none"
          />
        );
      },
    ) ?? null;

  const ocrValueLabels = ocrLayoutBoxes.map((box) => {
    const filteredValue = ocrHistory.getFilteredValue(box.id);
    const rawValue = ocrMap[box.id];
    const displayValue = filteredValue || rawValue;
    if (!displayValue) return null;

    const labelTop = box.y + box.height - 24;
    return (
      <Box
        key={box.id}
        style={{
          position: "absolute",
          left: box.x,
          top: labelTop + 30,
          alignItems: "center",
          zIndex: 200,
        }}
      >
        <Box
          style={{
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: 8,
            paddingVertical: 4,
            paddingHorizontal: 8,
            minWidth: 40,
            maxWidth: Math.max(box.width * 1.5, 120),
          }}
        >
          <GluestackText
            className={`text-sm text-center ${
              filteredValue ? "text-green-400" : "text-yellow-400"
            }`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayValue}
            {filteredValue && rawValue !== filteredValue && (
              <GluestackText className="text-xs text-gray-400">
                {" "}
                (filtered)
              </GluestackText>
            )}
          </GluestackText>
        </Box>
      </Box>
    );
  });

  return (
    <>
      {renderTemplateOverlays()}
      {roiOverlay}
      {screenDebug}
      {ocrDebug}
      {matchedBoxes}
      {allDetectedRects}
      {ocrValueLabels}
    </>
  );
};

