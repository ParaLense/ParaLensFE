import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import type { OverlayBox } from '@/features/fullscan/types';
import { TemplateLayout, loadTemplateConfig, type TemplateBox } from './template';

interface UseTemplateLayoutOptions {
  layout: TemplateLayout | null;
  viewportWidth?: number;
  viewportHeight?: number;
  color?: string;
  widthPercent?: number; // 0..1, default 0.75 (75% of screen width)
  aspectRatio?: number;  // width/height, default 3/4
  containerWidth?: number;
  containerHeight?: number;
  offsetX?: number;
  offsetY?: number;
}

function scaleTemplateBoxes(boxes: TemplateBox[], w: number, h: number, color: string, offsetX: number, offsetY: number): OverlayBox[] {
  return boxes.map(b => ({
    id: b.id,
    x: Math.round((b.x / 100) * w + offsetX),
    y: Math.round((b.y / 100) * h + offsetY),
    width: Math.round((b.width / 100) * w),
    height: Math.round((b.height / 100) * h),
    color,
  }));
}

export function useTemplateLayout({
                                    layout,
                                    viewportWidth,
                                    viewportHeight,
                                    color = '#00FF88',
                                    widthPercent,
                                    aspectRatio,
                                    containerWidth,
                                    containerHeight,
                                    offsetX,
                                    offsetY,
                                  }: UseTemplateLayoutOptions): OverlayBox[] {
  const screen = Dimensions.get('window');
  const containerW = containerWidth ?? screen.width;
  const containerH = containerHeight ?? screen.height;

  const effectiveWidthPercent = widthPercent ?? 0.75; // 75% of width by default
  const effectiveAspectRatio = aspectRatio ?? (3 / 4); // width/height = 3/4 by default

  let targetW = viewportWidth;
  let targetH = viewportHeight;

  if (targetW == null && targetH == null) {
    targetW = Math.round(effectiveWidthPercent * containerW);
    targetH = Math.round(targetW / effectiveAspectRatio);
  } else if (targetW != null && targetH == null) {
    targetH = Math.round(targetW / effectiveAspectRatio);
  } else if (targetH != null && targetW == null) {
    targetW = Math.round(targetH * effectiveAspectRatio);
  }

  const w = targetW ?? 0;
  const h = targetH ?? 0;

  const resolvedOffsetX = offsetX ?? Math.round((containerW - w) / 2);
  const resolvedOffsetY = offsetY ?? Math.round((containerH - h) / 2);

  return useMemo(() => {
    if (!layout || w <= 0 || h <= 0) return [];
    const boxes = loadTemplateConfig(layout);
    return scaleTemplateBoxes(boxes, w, h, color, resolvedOffsetX, resolvedOffsetY);
  }, [layout, w, h, color, resolvedOffsetX, resolvedOffsetY]);
}

export { TemplateLayout };


