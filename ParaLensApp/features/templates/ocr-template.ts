import { TemplateLayout } from './use-template-layout';
import { loadTemplateConfig } from './template';

export type OcrTemplateBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: 'value' | 'checkbox' | 'scrollbar';
  expectedUnits?: string[];
  sameUnitAs?: string;
  options?: {
    orientation?: 'horizontal' | 'vertical';
    cells?: number;
    valuesRegion?: { x: number; y: number; width: number; height: number };
    blackRatioMin?: number;
  };
};

// Load OCR template with proper type mapping from JSON configuration
export function loadOcrTemplate(layout: TemplateLayout): OcrTemplateBox[] {
  return loadTemplateConfig(layout).map((b) => ({
    id: b.id,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    type: b.type || 'value', // Use the type from JSON, default to 'value'
    expectedUnits: b.expectedUnits,
    sameUnitAs: b.sameUnitAs,
    options: b.options, // Include options for checkboxes and scrollbars
  }));
}
