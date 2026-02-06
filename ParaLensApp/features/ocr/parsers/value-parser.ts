/**
 * Value Parser
 * Handles parsing of simple numeric value boxes
 */

import { OcrBox, ExpectedUnitConfig } from '@/features/ocr';
import { isValidNumericToken, normalizeNumber, detectMatchingUnit } from '@/features/ocr';

const extractExpectedUnitKeywords = (
  raw?: string[] | ExpectedUnitConfig
): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const keywords: string[] = [];
  const systems: Array<keyof ExpectedUnitConfig> = ['iso', 'imperial'];
  for (const system of systems) {
    const cfg = raw[system];
    if (!cfg) continue;
    if (cfg.absolute) keywords.push(cfg.absolute);
    if (cfg.relative) keywords.push(cfg.relative);
  }
  return keywords;
};

/**
 * Parse a simple numeric value box
 */
export const parseValueFromScan = (box: OcrBox, commaRequired: boolean): { value: string; unit?: string } | null => {
  if (!box || box.type !== 'value') return null;
  const raw =
    (typeof box.number === 'number' ? String(box.number) : undefined) ??
    (typeof box.text === 'string' && box.text.trim().length > 0 ? box.text.trim() : undefined);
  if (!raw) return null;

  // If sameUnitAs is set, we ignore unit detection for this box and just try to parse the number.
  // We also split by space to handle cases where OCR might have picked up a unit or text anyway.
  // We also relax the comma requirement because these values might be less strictly formatted.
  if (box.sameUnitAs) {
    const parts = raw.split(' ');
    const numericPart = parts[0];
    if (!isValidNumericToken(numericPart, false)) return null; // Relaxed comma check
    const num = normalizeNumber(numericPart);
    return num != null ? { value: num.toString() } : null;
  }

  const parts = raw.split(' ');
  const numericPart = parts[0];
  const unitPart = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

  if (!isValidNumericToken(numericPart, commaRequired)) return null;
  const num = normalizeNumber(numericPart);
  if (num == null) return null;

  const expectedKeywords = extractExpectedUnitKeywords(box.expectedUnits);
  const unit = unitPart
    ? detectMatchingUnit(unitPart, expectedKeywords as readonly string[]) ?? undefined
    : undefined;

  // STRICT MODE: If expectedUnits are defined, we MUST find a matching unit.
  if (expectedKeywords.length > 0 && !unit) {
    return null;
  }

  return { value: num.toString(), unit };
};

