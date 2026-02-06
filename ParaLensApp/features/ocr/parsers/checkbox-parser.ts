/**
 * Checkbox Parser
 * Handles parsing of checkbox state boxes
 */

import { OcrBox } from '../types/ocr-types';

/**
 * Parse checkbox state into a stable string value
 */
export const parseCheckboxFromScan = (box: OcrBox): { value: string; unit?: string } | null => {
  if (!box || box.type !== 'checkbox') return null;
  if (typeof box.checked !== 'boolean') return null;
  return { value: box.checked ? 'checked' : 'unchecked' };
};

