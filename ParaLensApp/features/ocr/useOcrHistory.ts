import { useCallback, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Shared OCR types for field-level aggregation
// ---------------------------------------------------------------------------

export type OcrFieldType = 'scrollbar' | 'value' | 'checkbox';

// Parsed representation of a scrollbar field across multiple scans.
// Each index (0, 1, 2, ...) represents one key/value-pair of the scrollbar.
// We keep *all* numeric candidates that passed the filter in arrays so that
// we can later apply majority voting.
export type ParsedScrollbarValue = Record<
  number, // index: 0, 1, 2, ...
  {
    key: number[];   // all filtered "key"/start values (e.g. 0.00, 0.00, ...)
    value: number[]; // all filtered "value"/end values  (e.g. 8.00, 8.01, ...)
  }
>;

export type OcrFieldResult = {
  box_id: string;
  type: OcrFieldType;
  // For scrollbars we return the structured ParsedScrollbarValue,
  // for value/checkbox a simple string representation.
  value: string | ParsedScrollbarValue;
};

// Shape of a single OCR box as emitted by the screen detector.
// This mirrors the structure used in UiScannerCamera (scan.ocr.boxes).
export type OcrBox = {
  id: string;
  type: OcrFieldType;
  text?: string;
  number?: number;
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
    // Use fixed precision so 0.00 and 0.0 are treated as same value
    const key = v.toFixed(2);
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

// Fuzzy detection of units / start-keywords like "v", "cm", "bar", "m/s", "s".
// Handles common OCR mistakes such as "cms" -> "cm", "ms" -> "m/s".
export const detectMatchingEinheit = (raw: string, keywords: string[]): string | null => {
  if (!raw) return null;
  const cleaned = raw.toLowerCase().replace(/[^a-z/]/g, '');
  if (!cleaned) return null;

  for (const kw of keywords) {
    const kwClean = kw.toLowerCase().replace(/[^a-z/]/g, '');
    if (!kwClean) continue;

    // Normalise by removing slashes for comparison
    const cleanedNoSlash = cleaned.replace(/\//g, '');
    const kwNoSlash = kwClean.replace(/\//g, '');

    // Exact or substring match (e.g. "cms" contains "cm", "ms" == "ms")
    if (
      cleanedNoSlash === kwNoSlash ||
      cleanedNoSlash.startsWith(kwNoSlash) ||
      cleanedNoSlash.endsWith(kwNoSlash) ||
      cleanedNoSlash.includes(kwNoSlash)
    ) {
      // Return the canonical keyword (e.g. always "m/s" instead of "ms")
      return kw;
    }
  }

  return null;
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
  rawValues: string[];
  typeBreakdown: FieldTypeBreakdown;
  scrollbar?: ParsedScrollbarValue;
};

export type UseOcrHistoryConfig = {
  maxHistoryPerField?: number;
  minOccurrencesForMajority?: number;
  commaRequired?: boolean;
};

const DEFAULT_MAX_HISTORY_PER_FIELD = 30;

const mergeParsedScrollbar = (
  existing: ParsedScrollbarValue | undefined,
  incoming: ParsedScrollbarValue
): ParsedScrollbarValue => {
  const result: ParsedScrollbarValue = existing ? { ...existing } : {};
  for (const [indexKey, segment] of Object.entries(incoming)) {
    const idx = Number(indexKey);
    const current = result[idx] ?? { key: [], value: [] };
    if (Array.isArray(segment.key)) current.key.push(...segment.key);
    if (Array.isArray(segment.value)) current.value.push(...segment.value);
    result[idx] = current;
  }
  return result;
};

const computeMajorityString = (values: string[], minOccurrences: number): string | null => {
  if (!values || values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts.entries()) {
    if (!best || count > best.count) {
      best = { value, count };
    }
  }
  if (!best || best.count < minOccurrences) return null;
  return best.value;
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
    parts.push(`${idx}: (${bestKey.toFixed(2)},${bestValue.toFixed(2)})`);
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

  // Remove potential unit/start tokens at the beginning (START_KEYWORDS)
  const tokens = [...rawTokens];
  for (let i = 0; i < Math.min(2, tokens.length); i++) {
    const unit = detectMatchingEinheit(tokens[i], START_KEYWORDS);
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
    const unit = detectMatchingEinheit(tokens[lastIdx], END_KEYWORDS);
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

  return Object.keys(parsed).length > 0 ? parsed : null;
};

// Parse a simple numeric value box
const parseValueFromScan = (box: OcrBox, commaRequired: boolean): string | null => {
  if (!box || box.type !== 'value') return null;
  const raw =
    (typeof box.number === 'number' ? String(box.number) : undefined) ??
    (typeof box.text === 'string' && box.text.trim().length > 0 ? box.text.trim() : undefined);
  if (!raw) return null;
  if (!isValidNumericToken(raw, commaRequired)) return null;
  const num = normalizeNumber(raw);
  if (num == null) return null;
  return num.toString();
};

// Parse checkbox state into a stable string value
const parseCheckboxFromScan = (box: OcrBox): string | null => {
  if (!box || box.type !== 'checkbox') return null;
  if (typeof box.checked !== 'boolean') return null;
  return box.checked ? 'checked' : 'unchecked';
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
            };
          }

          agg.totalScans += 1;
          if (type === 'value' || type === 'checkbox' || type === 'scrollbar') {
            agg.typeBreakdown[type] += 1;
          }

          if (type === 'value') {
            const valueStr = parseValueFromScan(box, commaRequired);
            if (valueStr != null) {
              agg.rawValues = [valueStr, ...agg.rawValues];
              if (agg.rawValues.length > maxHistoryPerField) {
                agg.rawValues = agg.rawValues.slice(0, maxHistoryPerField);
              }
              agg.uniqueValues = new Set(agg.rawValues).size;
            }
          } else if (type === 'checkbox') {
            const valueStr = parseCheckboxFromScan(box);
            if (valueStr != null) {
              agg.rawValues = [valueStr, ...agg.rawValues];
              if (agg.rawValues.length > maxHistoryPerField) {
                agg.rawValues = agg.rawValues.slice(0, maxHistoryPerField);
              }
              agg.uniqueValues = new Set(agg.rawValues).size;
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
    [commaRequired, maxHistoryPerField]
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
      const bestString = computeMajorityString(agg.rawValues, minOccurrencesForMajority);
      return bestString ?? undefined;
    },
    [fieldAggregations, minOccurrencesForMajority]
  );

  const getBestFields = useCallback(
    (): OcrFieldResult[] => {
      const results: OcrFieldResult[] = [];

      for (const [fieldId, agg] of Object.entries(fieldAggregations)) {
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
        const bestString = computeMajorityString(agg.rawValues, minOccurrencesForMajority);
        if (!bestString) continue;

        const tb = agg.typeBreakdown;
        let dominantType: OcrFieldType = 'value';
        if (tb.scrollbar >= tb.value && tb.scrollbar >= tb.checkbox) {
          dominantType = 'scrollbar';
        } else if (tb.checkbox >= tb.value && tb.checkbox >= tb.scrollbar) {
          dominantType = 'checkbox';
        } else {
          dominantType = 'value';
        }

        results.push({
          box_id: fieldId,
          type: dominantType,
          value: bestString,
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
