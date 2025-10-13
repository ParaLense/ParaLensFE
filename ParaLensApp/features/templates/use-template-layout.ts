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

export function useTemplateLayout({ layout, viewportWidth, viewportHeight, color = '#00FF88', widthPercent, aspectRatio }: UseTemplateLayoutOptions): OverlayBox[] {
  const screen = Dimensions.get('window');
  const effectiveWidthPercent = widthPercent ?? 0.75; // 75% of screen width by default
  const effectiveAspectRatio = aspectRatio ?? (3 / 4); // width/height = 3/4 by default

  const computedW = Math.round(effectiveWidthPercent * screen.width);
  const computedH = Math.round(computedW / effectiveAspectRatio);

  const w = viewportWidth ?? computedW;
  const h = viewportHeight ?? computedH;

  // Center the layout region within the screen
  const offsetX = Math.round((screen.width - w) / 2);
  const offsetY = Math.round((screen.height - h) / 2);

  return useMemo(() => {
    if (!layout) return [];
    const boxes = loadTemplateConfig(layout);
    return scaleTemplateBoxes(boxes, w, h, color, offsetX, offsetY);
  }, [layout, w, h, color, offsetX, offsetY]);
}

export { TemplateLayout };


