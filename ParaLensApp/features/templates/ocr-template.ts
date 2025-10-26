import { TemplateLayout } from './use-template-layout';
import { loadTemplateConfig } from './template';

export type OcrTemplateBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: 'value' | 'checkbox' | 'scrollbar';
  options?: {
    orientation?: 'horizontal' | 'vertical';
    cells?: number;
    valuesRegion?: { x: number; y: number; width: number; height: number };
    checkboxThreshold?: number;
  };
};

// Default loader: reuse existing template boxes and default type to 'value'.
// You can later specialize this per layout and annotate JSONs with per-box `type` and `options`.
export function loadOcrTemplate(layout: TemplateLayout): OcrTemplateBox[] {
  return loadTemplateConfig(layout).map((b) => ({
    id: b.id,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    type: 'value',
  }));
}


