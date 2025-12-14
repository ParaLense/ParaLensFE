import { useCallback, useMemo, useState } from 'react';
import { OcrTemplateBox } from '../templates/ocr-template';

// ---------------------------------------------------------------------------
// Shared OCR types for field-level aggregation
// ---------------------------------------------------------------------------

export type OcrFieldType = 'scrollbar' | 'value' | 'checkbox';

// Parsed representation of a scrollbar field across multiple scans.
// Each index (0, 1, 2, ...) represents one key/value-pair of the scrollbar.
// We keep *all* numeric candidates that passed the filter in arrays so that
// we can later apply majority voting.
//
// Additionally, we store detected units once per scrollbar:
// - keyUnit:   unit for the "key"/start values (e.g. "bar")
// - valueUnit: unit for the "value"/end values  (e.g. "s")
//
// We model this as an index signature for numeric indices plus two
// optional properties. Callers that iterate over keys MUST always filter
// to numeric indices (which we already do via Number.isFinite).
type ParsedScrollbarSegments = Record<
  number,
  {
    key: number[];   // all filtered "key"/start values (e.g. 0.0000, 0.0000, ...)
    value: number[]; // all filtered "value"/end values  (e.g. 8.0001, 8.0001, ...)
  }
>;

export type ParsedScrollbarValue = ParsedScrollbarSegments & {
  keyUnit?: string | null;
  valueUnit?: string | null;
};

export type OcrFieldResult = {
  box_id: string;
  type: OcrFieldType;
  // For scrollbars we return the structured ParsedScrollbarValue,
  // for value/checkbox a simple string representation.
  value: string | ParsedScrollbarValue;
  unit?: string;
};

// Shape of a single OCR box as emitted by the screen detector.
// This mirrors the structure used in UiScannerCamera (scan.ocr.boxes).
export type OcrBox = {
  id: string;
  type: OcrFieldType;
  text?: string;
  number?: number;
  expectedUnits?: string[];
  sameUnitAs?: string;
  // checkbox specific
  checked?: boolean;
  valueText?: string;
  valueNumber?: number;
  valueBoxId?: string;
  // scrollbar specific
  positionPercent?: number;
  // Raw values array as delivered by the native module.
  // Can be a simple string[] or a mixed structure – we normalise later.
  values?: any[];
};

export type OcrScanResult = {
  timestamp: number;
  boxes: OcrBox[];
  screenDetected: boolean;
  accuracy: number;
};

// Public history entry type that callers can use if they want to inspect
// raw scans together with already parsed/aggregated field values.
export type OcrValue = OcrFieldResult;

export type OcrHistoryEntry = {
  scan: OcrScanResult;
  fields: OcrValue[];
};

// Start box should contain: V, v, P, t (we lower-case when matching)
const START_KEYWORDS = ['v', 'p', 't'];
// End box should contain: cm, bar, m/s, s
const END_KEYWORDS = ['cm', 'bar', 'm/s', 's'];

// ---------------------------------------------------------------------------
// Generic helper functions for numeric filtering + fuzzy unit detection
// ---------------------------------------------------------------------------

const NUMERIC_TOKEN_REGEX = /^[+-]?\d+(?:[.,]\d+)?$/;

const DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY = 15;
const SCROLLBAR_DECIMALS = 4;

export const isValidNumericToken = (token: string, commaRequired = false): boolean => {
  if (!token) return false;
  const trimmed = String(token).trim();
  if (trimmed.length === 0) return false;
  if (commaRequired && !trimmed.includes(',') && !trimmed.includes('.')) return false;
  // Reject if there are any letters
  if (/[a-zA-Z]/.test(trimmed)) return false;
  return NUMERIC_TOKEN_REGEX.test(trimmed.replace(/\s+/g, ''));
};

export const normalizeNumber = (token: string): number | null => {
  if (!token) return null;
  const normalized = token.replace(',', '.').trim();
  if (!NUMERIC_TOKEN_REGEX.test(normalized.replace(/\s+/g, ''))) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const pickMajorityValue = (values: number[], minOccurrences = DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY): number | null => {
  if (!values || values.length === 0) return null;

  const counts = new Map<string, { value: number; count: number }>();
  for (const v of values) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    // Use fixed precision so 0.0000 and 0.0 are treated as same value
    const key = v.toFixed(SCROLLBAR_DECIMALS);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { value: v, count: 1 });
    }
  }

  let best: { value: number; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }

  if (!best || best.count < minOccurrences) return null;
  return best.value;
};

// Fuzzy detection of units. Handles common OCR mistakes.
export const detectMatchingUnit = (raw: string, keywords: string[]): string | null => {
  if (!raw || !keywords || keywords.length === 0) return null;
  
  // Pre-process raw string to handle common OCR substitutions
  let cleaned = raw.toLowerCase().trim();
  
  // Common OCR fixes
  cleaned = cleaned.replace('cn', 'cm'); // cn -> cm
  cleaned = cleaned.replace('°', '%');   // ° -> % (often confused in OCR if % is expected)
  
  // Fix common /s misinterpretations at the end of units
  // e.g. "cm^3s", "cm^3is", "cm^3ls" -> "cm^3/s"
  if (cleaned.endsWith('s') && !cleaned.endsWith('/s')) {
      // Check for patterns like "is", "ls", "1s" at the end which are likely "/s"
      if (cleaned.endsWith('is')) cleaned = cleaned.slice(0, -2) + '/s';
      else if (cleaned.endsWith('ls')) cleaned = cleaned.slice(0, -2) + '/s';
      else if (cleaned.endsWith('1s')) cleaned = cleaned.slice(0, -2) + '/s';
      // If it ends with just "s" but preceded by a number/power (e.g. "cm^3s"), assume it means "/s"
      else if (cleaned.match(/[\d³²]s$/)) cleaned = cleaned.slice(0, -1) + '/s';
  }

  // Remove characters that are usually noise, but keep relevant ones
  // We keep letters, numbers, %, /, ^, ³, ²
  let simplified = cleaned.replace(/[^a-z0-9%/\^³²]/g, '');
  
  if (!simplified) return null;

  for (const kw of keywords) {
    const kwClean = kw.toLowerCase();
    
    // 1. Exact match (after basic cleaning)
    if (cleaned === kwClean) return kw;
    
    // 2. Simplified match (ignoring special chars)
    const kwSimplified = kwClean.replace(/[^a-z0-9%/\^³²]/g, '');
    if (simplified === kwSimplified) return kw;

    // 3. Partial/Base match logic
    // If the expected unit is complex (e.g. "cm^3/s") and we found the base (e.g. "cm"),
    // we consider it a match.
    // if it's /s and we found /s then we remove it
    
    if (kwClean.endsWith('/s') && simplified.endsWith('/s')){
      const simplifiedForComparison = simplified.slice(0, -2);
    }

    // Check for "cm" matching "cm^3/s" or "cm³"
    if (kwClean.startsWith('cm') && simplifiedForComparison === 'cm') return kw;
    
    // Check for "in" matching "in^3/s" or "in³"
    if (kwClean.startsWith('in') && simplifiedForComparison === 'in') return kw;
    
    // Check for "mm" matching "mm/s"
    if (kwClean.startsWith('mm') && simplifiedForComparison === 'mm') return kw;
    
    // Check for "%" matching
    if (kwClean === '%' && (simplified === '%' || simplified === 'o' || simplified === '0')) return kw;

    // 4. Permutations for other common OCR errors
    const permutations = [
      kwSimplified.replace('/', ''),
      kwSimplified.replace('^', ''),
      kwSimplified.replace('³', '3'),
      kwSimplified.replace('²', '2'),
      // Add permutation for missing slash in per-second units
      kwSimplified.replace('/s', 's'),
    ];

    if (permutations.some(p => simplified.includes(p))) {
      return kw;
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Scrollbar-specific helpers (units, token normalisation)
// ---------------------------------------------------------------------------

type ScrollbarUnits = {
  keyUnit?: string | null;
  valueUnit?: string | null;
};

/**
 * Normalise raw scrollbar tokens:
 * - Split values on ';' so "123,3;322,4 bar;76 s" becomes individual tokens
 * - For the last two tokens, if they contain " <unit>" at the end
 *   (e.g. "322,4 bar", "76 s"), split the unit off, detect it via
 *   detectMatchingUnit + END_KEYWORDS and remember:
 *      - first of the last two -> keyUnit
 *      - second of the last two -> valueUnit
 * - Return cleaned tokens (numeric parts only) plus detected units.
 */
const normalizeScrollbarTokensAndUnits = (
  rawTokens: string[]
): { tokens: string[] } & ScrollbarUnits => {
  if (!rawTokens || rawTokens.length === 0) {
    return { tokens: [] };
  }

  // First expand any ";" separated values into individual tokens.
  const expanded: string[] = [];
  for (const raw of rawTokens) {
    const str = String(raw);
    const parts = str
      .split(/[;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length > 0) {
      expanded.push(...parts);
    }
  }

  if (expanded.length === 0) {
    return { tokens: [] };
  }

  const tokens = [...expanded];
  let keyUnit: string | null | undefined;
  let valueUnit: string | null | undefined;

  // Determine indices of the last two "values"
  const indexCandidates: number[] = [];
  if (tokens.length >= 2) {
    indexCandidates.push(tokens.length - 2, tokens.length - 1);
  } else {
    indexCandidates.push(tokens.length - 1);
  }

  indexCandidates.forEach((idx, pos) => {
    if (idx < 0 || idx >= tokens.length) return;
    const token = tokens[idx];
    if (!token) return;

    // Look for "<number> <unit>" pattern using the last space
    const lastSpace = token.lastIndexOf(' ');
    if (lastSpace <= 0 || lastSpace >= token.length - 1) return;

    const numericPart = token.slice(0, lastSpace).trim();
    const unitPart = token.slice(lastSpace + 1).trim();
    if (!numericPart || !unitPart) return;

    const detected = detectMatchingUnit(unitPart, END_KEYWORDS);
    if (!detected) return;

    // Store unit depending on whether this is the first or second from the end
    if (pos === 0 && keyUnit == null) {
      keyUnit = detected;
    } else if (pos === 1 && valueUnit == null) {
      valueUnit = detected;
    }

    // Replace token with numeric part only so downstream numeric parsing works
    tokens[idx] = numericPart;
  });

  return { tokens, keyUnit, valueUnit };
};

// ---------------------------------------------------------------------------
// Field-level aggregation helpers
// ---------------------------------------------------------------------------

type FieldTypeBreakdown = {
  value: number;
  checkbox: number;
  scrollbar: number;
};

type FieldAggregation = {
  id: string;
  totalScans: number;
  uniqueValues: number;
  rawValues: { value: string; unit?: string }[];
  typeBreakdown: FieldTypeBreakdown;
  scrollbar?: ParsedScrollbarValue;
  sameUnitAs?: string;
};

export type UseOcrHistoryConfig = {
  maxHistoryPerField?: number;
  minOccurrencesForMajority?: number;
  commaRequired?: boolean;
  template?: OcrTemplateBox[];
};

const DEFAULT_MAX_HISTORY_PER_FIELD = 30;

const mergeParsedScrollbar = (
  existing: ParsedScrollbarValue | undefined,
  incoming: ParsedScrollbarValue
): ParsedScrollbarValue => {
  const result: ParsedScrollbarValue = existing ? { ...existing } : {};

  // Merge numeric segments (skip non-numeric properties like keyUnit/valueUnit)
  for (const [indexKey, segment] of Object.entries(incoming)) {
    const idx = Number(indexKey);
    if (!Number.isFinite(idx)) continue;
    const current = (result[idx] ?? { key: [], value: [] }) as {
      key: number[];
      value: number[];
    };
    if (Array.isArray((segment as any).key)) current.key.push(...(segment as any).key);
    if (Array.isArray((segment as any).value)) current.value.push(...(segment as any).value);
    result[idx] = current;
  }

  // Merge units at the "overarching" scrollbar level – all values belong to them.
  const incomingKeyUnit = (incoming as ParsedScrollbarValue).keyUnit;
  const incomingValueUnit = (incoming as ParsedScrollbarValue).valueUnit;

  if (incomingKeyUnit) {
    result.keyUnit = incomingKeyUnit;
  }
  if (incomingValueUnit) {
    result.valueUnit = incomingValueUnit;
  }

  return result;
};

const computeMajorityString = (values: { value: string; unit?: string }[], minOccurrences: number): { value: string; unit?: string } | null => {
  if (!values || values.length === 0) return null;
  const counts = new Map<string, { value: string; unit?: string; count: number }>();
  for (const v of values) {
    const key = `${v.value}|${v.unit || ''}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { ...v, count: 1 });
    }
  }
  let best: { value: string; unit?: string; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }
  if (!best || best.count < minOccurrences) return null;
  return { value: best.value, unit: best.unit };
};

const computeBestScrollbar = (
  agg: ParsedScrollbarValue,
  minOccurrences: number
): { parsed: ParsedScrollbarValue; formatted: string } | null => {
  if (!agg) return null;
  const indices = Object.keys(agg)
    .map((k) => Number(k))
    .sort((a, b) => a - b);

  const bestParsed: ParsedScrollbarValue = {};
  const parts: string[] = [];

  const keyUnit = agg.keyUnit ?? null;
  const valueUnit = agg.valueUnit ?? null;

  for (const idx of indices) {
    const segment = agg[idx];
    if (!segment) continue;
    const bestKey = pickMajorityValue(segment.key, minOccurrences);
    const bestValue = pickMajorityValue(segment.value, minOccurrences);
    if (bestKey == null || bestValue == null) continue;

    bestParsed[idx] = {
      key: [bestKey],
      value: [bestValue],
    };
    // Format with four decimal places and append units (once per side)
    const keySuffix = keyUnit ? ` ${keyUnit}` : '';
    const valueSuffix = valueUnit ? ` ${valueUnit}` : '';
    parts.push(
      `${idx}: (${bestKey.toFixed(SCROLLBAR_DECIMALS)}${keySuffix},${bestValue.toFixed(
        SCROLLBAR_DECIMALS
      )}${valueSuffix})`
    );
  }

  if (parts.length === 0) return null;
  return {
    parsed: bestParsed,
    formatted: parts.join(', '),
  };
};

// Extract numeric tokens from a scrollbar box and build ParsedScrollbarValue
const parseScrollbarFromScan = (box: OcrBox, commaRequired: boolean): ParsedScrollbarValue | null => {
  if (!box || box.type !== 'scrollbar' || !Array.isArray(box.values)) return null;

  // Normalise all values to string tokens
  const rawTokens: string[] = [];
  for (const v of box.values ?? []) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > 0) rawTokens.push(t);
    } else if (typeof v === 'number') {
      rawTokens.push(String(v));
    } else if (v && typeof v === 'object') {
      const text = (v as any).text;
      const num = (v as any).number;
      if (typeof text === 'string' && text.trim().length > 0) {
        rawTokens.push(text.trim());
      } else if (typeof num === 'number') {
        rawTokens.push(String(num));
      }
    }
  }

  if (rawTokens.length === 0) return null;

  // First normalise tokens and extract possible units from the last two values.
  const { tokens: normalisedTokens, keyUnit, valueUnit } = normalizeScrollbarTokensAndUnits(rawTokens);
  if (normalisedTokens.length === 0) return null;

  // Remove potential unit/start tokens at the beginning (START_KEYWORDS)
  const tokens = [...normalisedTokens];
  for (let i = 0; i < Math.min(2, tokens.length); i++) {
    const unit = detectMatchingUnit(tokens[i], START_KEYWORDS);
    if (unit) {
      tokens.splice(i, 1);
      i -= 1;
    } else {
      break;
    }
  }

  // Remove potential unit tokens at the end (END_KEYWORDS)
  for (let removed = 0; removed < 2 && tokens.length > 0; removed++) {
    const lastIdx = tokens.length - 1;
    const unit = detectMatchingUnit(tokens[lastIdx], END_KEYWORDS);
    if (unit) {
      tokens.splice(lastIdx, 1);
    } else {
      break;
    }
  }

  const parsed: ParsedScrollbarValue = {};

  // VERY IMPORTANT: we do not filter tokens *before* pairing, otherwise
  // the index/order of pairs would shift when a value is rejected.
  // Instead we iterate in fixed 2er-Schritten and decide per Paar, ob
  // key/value in die Arrays aufgenommen werden.
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const keyToken = tokens[i];
    const valueToken = tokens[i + 1];

    let keyNum: number | null = null;
    let valueNum: number | null = null;

    if (isValidNumericToken(keyToken, commaRequired)) {
      keyNum = normalizeNumber(keyToken);
    }
    if (isValidNumericToken(valueToken, commaRequired)) {
      valueNum = normalizeNumber(valueToken);
    }

    // Wenn beide ungültig sind, nichts für dieses Paar hinzufügen
    if (keyNum == null && valueNum == null) continue;

    const pairIndex = i / 2; // 0-based index: 0 -> first pair, 1 -> second pair, ...
    const segment = parsed[pairIndex] ?? { key: [], value: [] };

    if (keyNum != null && Number.isFinite(keyNum)) {
      segment.key.push(keyNum);
    }
    if (valueNum != null && Number.isFinite(valueNum)) {
      segment.value.push(valueNum);
    }

    // Nur speichern, wenn mindestens eine Seite etwas bekommen hat
    if (segment.key.length > 0 || segment.value.length > 0) {
      parsed[pairIndex] = segment;
    }
  }

  if (Object.keys(parsed).length === 0) return null;

  // Store detected units once at the scrollbar level so that all segments
  // in this field can re-use them.
  if (keyUnit) {
    parsed.keyUnit = keyUnit;
  }
  if (valueUnit) {
    parsed.valueUnit = valueUnit;
  }

  return parsed;
};

// Parse a simple numeric value box
const parseValueFromScan = (box: OcrBox, commaRequired: boolean): { value: string; unit?: string } | null => {
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

  const unit = unitPart ? detectMatchingUnit(unitPart, box.expectedUnits || []) : undefined;

  // STRICT MODE: If expectedUnits are defined, we MUST find a matching unit.
  if (box.expectedUnits && box.expectedUnits.length > 0 && !unit) {
    return null;
  }

  return { value: num.toString(), unit };
};

// Parse checkbox state into a stable string value
const parseCheckboxFromScan = (box: OcrBox): { value: string; unit?: string } | null => {
  if (!box || box.type !== 'checkbox') return null;
  if (typeof box.checked !== 'boolean') return null;
  return { value: box.checked ? 'checked' : 'unchecked' };
};

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export const useOcrHistory = (config?: UseOcrHistoryConfig) => {
  // Field-level aggregation based on full scan results
  const [scanHistory, setScanHistory] = useState<OcrScanResult[]>([]);
  const [fieldAggregations, setFieldAggregations] = useState<Record<string, FieldAggregation>>({});

  const maxHistoryPerField = config?.maxHistoryPerField ?? DEFAULT_MAX_HISTORY_PER_FIELD;
  const minOccurrencesForMajority = config?.minOccurrencesForMajority ?? DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY;
  const commaRequired = !!config?.commaRequired;
  // Add a full OCR scan result (with boxes) and update field aggregations
  const addFullScanResult = useCallback(
    (scanResult: OcrScanResult) => {
      setScanHistory((prev) => [scanResult, ...prev]);

      setFieldAggregations((prev) => {
        const next: Record<string, FieldAggregation> = { ...prev };

        for (const box of scanResult.boxes ?? []) {
          if (!box || !box.id || !box.type) continue;
          const fieldId = box.id;
          const type = box.type;

          let agg = next[fieldId];
          if (!agg) {
            agg = {
              id: fieldId,
              totalScans: 0,
              uniqueValues: 0,
              rawValues: [],
              typeBreakdown: { value: 0, checkbox: 0, scrollbar: 0 },
              sameUnitAs: box.sameUnitAs,
            };
          } else {
            // Ensure sameUnitAs is updated if present in the new box
            if (box.sameUnitAs) {
              agg.sameUnitAs = box.sameUnitAs;
            }
          }

          agg.totalScans += 1;
          if (type === 'value' || type === 'checkbox' || type === 'scrollbar') {
            agg.typeBreakdown[type] += 1;
          }

          if (type === 'value') {
            const parsed = parseValueFromScan(box, commaRequired);
            if (parsed != null) {
              
              // If this field has sameUnitAs, try to grab the unit from the source field immediately
              // so it's stored with the value. This is a "best effort" for direct storage.
              if (box.sameUnitAs && !parsed.unit) {
                const sourceAgg = next[box.sameUnitAs]; // Look in current state (next is copy of prev)
                if (sourceAgg && sourceAgg.rawValues.length > 0) {
                   const sourceBest = computeMajorityString(sourceAgg.rawValues, minOccurrencesForMajority);
                   if (sourceBest?.unit) {
                     parsed.unit = sourceBest.unit;
                   }
                }
              }

              agg.rawValues = [parsed, ...agg.rawValues];
              if (agg.rawValues.length > maxHistoryPerField) {
                agg.rawValues = agg.rawValues.slice(0, maxHistoryPerField);
              }
              agg.uniqueValues = new Set(agg.rawValues.map(v => `${v.value}|${v.unit || ''}`)).size;
            }
          } else if (type === 'checkbox') {
            const parsed = parseCheckboxFromScan(box);
            if (parsed != null) {
              agg.rawValues = [parsed, ...agg.rawValues];
              if (agg.rawValues.length > maxHistoryPerField) {
                agg.rawValues = agg.rawValues.slice(0, maxHistoryPerField);
              }
              agg.uniqueValues = new Set(agg.rawValues.map(v => v.value)).size;
            }
          } else if (type === 'scrollbar') {
            const parsedScrollbar = parseScrollbarFromScan(box, commaRequired);
            if (parsedScrollbar) {
              agg.scrollbar = mergeParsedScrollbar(agg.scrollbar, parsedScrollbar);
            }
          }

          next[fieldId] = agg;
        }

        return next;
      });

      return scanResult;
    },
    [commaRequired, maxHistoryPerField, minOccurrencesForMajority]
  );

  // Convenience alias that matches the wording from the plan
  const addScanResult = useCallback(
    (scanResult: OcrScanResult) => {
      return addFullScanResult(scanResult);
    },
    [addFullScanResult]
  );

  const getFieldStats = useCallback(
    (fieldId: string) => {
      const agg = fieldAggregations[fieldId];
      if (!agg) {
        return {
          totalScans: 0,
          uniqueValues: 0,
          typeBreakdown: { value: 0, checkbox: 0, scrollbar: 0 },
        };
      }
      return {
        totalScans: agg.totalScans,
        uniqueValues: agg.uniqueValues,
        typeBreakdown: { ...agg.typeBreakdown },
      };
    },
    [fieldAggregations]
  );

  const getFilteredValue = useCallback(
    (fieldId: string): string | undefined => {
      const agg = fieldAggregations[fieldId];
      if (!agg) return undefined;

      // Scrollbar: try to compute best numeric ranges and format them
      if (agg.scrollbar) {
        const best = computeBestScrollbar(agg.scrollbar, minOccurrencesForMajority);
        if (best) return best.formatted;
      }

      if (!agg.rawValues || agg.rawValues.length === 0) return undefined;
      const best = computeMajorityString(agg.rawValues, minOccurrencesForMajority);
      if (!best) return undefined;

      let unit = best.unit;
      if (agg.sameUnitAs) {
        const sourceAgg = fieldAggregations[agg.sameUnitAs];
        if (sourceAgg && sourceAgg.rawValues.length > 0) {
          const sourceBest = computeMajorityString(sourceAgg.rawValues, minOccurrencesForMajority);
          // Prefer source unit if available, otherwise keep existing (if any)
          if (sourceBest?.unit) {
            unit = sourceBest.unit;
          }
        }
      }

      return unit ? `${best.value} ${unit}` : best.value;
    },
    [fieldAggregations, minOccurrencesForMajority]
  );

  const getBestFields = useCallback(
    (): OcrFieldResult[] => {
      const results: OcrFieldResult[] = [];
      const fieldIds = Object.keys(fieldAggregations);

      for (const fieldId of fieldIds) {
        const agg = fieldAggregations[fieldId];
        if (!agg) continue;

        // Scrollbar fields: return structured ParsedScrollbarValue
        if (agg.scrollbar) {
          const best = computeBestScrollbar(agg.scrollbar, minOccurrencesForMajority);
          if (best) {
            results.push({
              box_id: fieldId,
              type: 'scrollbar',
              value: best.parsed,
            });
          }
          continue;
        }

        if (!agg.rawValues || agg.rawValues.length === 0) continue;
        const best = computeMajorityString(agg.rawValues, minOccurrencesForMajority);
        if (!best) continue;

        const tb = agg.typeBreakdown;
        let dominantType: OcrFieldType = 'value';
        if (tb.scrollbar >= tb.value && tb.scrollbar >= tb.checkbox) {
          dominantType = 'scrollbar';
        } else if (tb.checkbox >= tb.value && tb.checkbox >= tb.scrollbar) {
          dominantType = 'checkbox';
        } else {
          dominantType = 'value';
        }

        let unit = best.unit;
        if (agg.sameUnitAs) {
          const sourceAgg = fieldAggregations[agg.sameUnitAs];
          if (sourceAgg && sourceAgg.rawValues.length > 0) {
            const sourceBest = computeMajorityString(sourceAgg.rawValues, minOccurrencesForMajority);
            if (sourceBest?.unit) {
              unit = sourceBest.unit;
            }
          }
        }

        results.push({
          box_id: fieldId,
          type: dominantType,
          value: best.value,
          unit: unit,
        });
      }

      return results;
    },
    [fieldAggregations, minOccurrencesForMajority]
  );

  return {
    // Scan + field aggregation API
    scanHistory,
    fieldAggregations,
    addFullScanResult,
    addScanResult,
    getFieldStats,
    getFilteredValue,
    getBestFields,
    // also export the keyword lists in case callers want to re-use them
    START_KEYWORDS,
    END_KEYWORDS,
  } as const;
};
