/**
 * Scrollbar Parser
 * Handles parsing and normalization of scrollbar OCR data
 */

import type { OcrBox, ParsedScrollbarValue, ScrollbarUnits, ExpectedUnitConfig } from '../types';
import { START_KEYWORDS, END_KEYWORDS } from '../constants';
import { isValidNumericToken, normalizeNumber, detectMatchingUnit } from '../utils';

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

const extractNumericTokensAndUnit = (
  rawTokens: string[],
  expectedUnits: readonly string[]
): { tokens: string[]; unit?: string | null } => {
  const tokens: string[] = [];
  const keywordVariants = expectedUnits.map((keyword) => ({
    original: keyword,
    normalized: keyword.toLowerCase().replace(/[^a-z0-9]/gi, ''),
  }));
  let detectedUnit: string | null = null;

  rawTokens.forEach((raw, rawIndex) => {
    const str = String(raw);
    const parts = str
      .split(/[;]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    parts.forEach((part, partIndex) => {
      const isLastPart = rawIndex === rawTokens.length - 1 && partIndex === parts.length - 1;
      let shouldDropLastNumber = false;

      const unitMatch = part.match(/-?\d+(?:[\.,]\d+)?\s*([a-zA-Z°]+)/);
      if (unitMatch?.[1]) {
        const normalizedUnit = unitMatch[1].toLowerCase().replace(/[^a-z0-9]/gi, '');
        const match = keywordVariants.find((keyword) => keyword.normalized === normalizedUnit);
        if (match) {
          detectedUnit = detectedUnit ?? match.original;
          shouldDropLastNumber = isLastPart;
        }
      }

      const startIndex = tokens.length;
      const matches = part.matchAll(/-?\d+(?:[\.,]\d+)?/g);
      for (const match of matches) {
        if (match[0]) tokens.push(match[0]);
      }

      if (shouldDropLastNumber && tokens.length > startIndex) {
        tokens.pop();
      }
    });
  });

  return { tokens, unit: detectedUnit };
};

/**
 * Normalise raw scrollbar tokens:
 * - Split values on ';' so "123,3;322,4 bar;76 s" becomes individual tokens
 * - For the last two tokens, if they contain " <unit>" at the end
 *   (e.g. "322,4 bar", "76 s"), split the unit off, detect it and remember
 * - Return cleaned tokens (numeric parts only) plus detected units.
 */
export const normalizeScrollbarTokensAndUnits = (
  rawTokens: string[],
  keyKeywords: readonly string[],
  valueKeywords: readonly string[]
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

    const detected = detectMatchingUnit(unitPart, pos === 0 ? keyKeywords : valueKeywords);
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

/**
 * Extract numeric tokens from a scrollbar box and build ParsedScrollbarValue
 */
export const parseScrollbarFromScan = (box: OcrBox, commaRequired: boolean): ParsedScrollbarValue | null => {
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

  const expectedValueKeywords = extractExpectedUnitKeywords(box.expectedUnits);
  const expectedKeyKeywords = extractExpectedUnitKeywords(box.expectedKeyUnits);
  const isSingle = box.options?.single === true;

  if (isSingle) {
    console.log('[scrollbar][single] rawTokens', box.id, rawTokens);

    const valueKeywords: readonly string[] =
      expectedValueKeywords.length > 0 ? expectedValueKeywords : END_KEYWORDS;

    const extracted = extractNumericTokensAndUnit(rawTokens, valueKeywords);
    console.log('[scrollbar][single] extracted', box.id, extracted);
    if (extracted.tokens.length === 0) return null;

    const parsed: ParsedScrollbarValue = { single: true };

    for (let i = 0; i < extracted.tokens.length; i += 1) {
      const token = extracted.tokens[i];
      if (!isValidNumericToken(token, commaRequired)) continue;
      const valueNum = normalizeNumber(token);
      if (valueNum == null || !Number.isFinite(valueNum)) continue;
      parsed[i] = { key: [], value: [valueNum] };
    }

    console.log('[scrollbar][single] parsed', box.id, parsed);
    if (Object.keys(parsed).length <= 1) return null;

    if (extracted.unit) {
      parsed.valueUnit = extracted.unit;
    }

    const singleIndices = Object.keys(parsed)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    parsed.segments = singleIndices.map((idx) => ({ index: idx, ...parsed[idx] }));

    console.log('[scrollbar][single] segments', box.id, parsed.segments);
    return parsed;
  }

  const fallbackKeywords: readonly string[] =
    expectedValueKeywords.length > 0 ? expectedValueKeywords : END_KEYWORDS;
  const keyKeywords: readonly string[] =
    expectedKeyKeywords.length > 0 ? expectedKeyKeywords : fallbackKeywords;
  const valueKeywords: readonly string[] = fallbackKeywords;

  // First normalise tokens and extract possible units from the last two values.
  const { tokens: normalisedTokens, keyUnit, valueUnit } = normalizeScrollbarTokensAndUnits(
    rawTokens,
    keyKeywords,
    valueKeywords
  );
  if (normalisedTokens.length === 0) return null;

  const tokens = [...normalisedTokens];
  let detectedKeyUnit = keyUnit ?? null;
  let detectedValueUnit = valueUnit ?? null;

  // Capture standalone unit tokens at the end (e.g. "bar", "s")
  if (tokens.length >= 2) {
    const secondLast = tokens[tokens.length - 2];
    const last = tokens[tokens.length - 1];

    if (!isValidNumericToken(secondLast, commaRequired)) {
      const unit = detectMatchingUnit(secondLast, keyKeywords);
      if (unit && !detectedKeyUnit) detectedKeyUnit = unit;
    }
    if (!isValidNumericToken(last, commaRequired)) {
      const unit = detectMatchingUnit(last, valueKeywords);
      if (unit && !detectedValueUnit) detectedValueUnit = unit;
    }
  }

  // Remove potential unit/start tokens at the beginning (START_KEYWORDS)
  for (let i = 0; i < Math.min(2, tokens.length); i++) {
    const unit = detectMatchingUnit(tokens[i], START_KEYWORDS);
    if (unit) {
      tokens.splice(i, 1);
      i -= 1;
    } else {
      break;
    }
  }

  // Remove potential unit tokens at the end
  for (let removed = 0; removed < 2 && tokens.length > 0; removed++) {
    const lastIdx = tokens.length - 1;
    const unit = detectMatchingUnit(tokens[lastIdx], valueKeywords);
    if (unit) {
      tokens.splice(lastIdx, 1);
    } else {
      break;
    }
  }

  const parsed: ParsedScrollbarValue = {};

  // VERY IMPORTANT: we do not filter tokens *before* pairing, otherwise
  // the index/order of pairs would shift when a value is rejected.
  // Instead we iterate in fixed 2er-Schritten and decide per Paar
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

    if (keyNum != null && valueNum != null && Number.isFinite(keyNum) && Number.isFinite(valueNum)) {
      segment.pairs = segment.pairs ?? [];
      segment.pairs.push({ key: keyNum, value: valueNum });
    }

    // Nur speichern, wenn mindestens eine Seite etwas bekommen hat
    if (segment.key.length > 0 || segment.value.length > 0) {
      parsed[pairIndex] = segment;
    }
  }

  if (Object.keys(parsed).length === 0) return null;

  // Store detected units once at the scrollbar level
  if (detectedKeyUnit) {
    parsed.keyUnit = detectedKeyUnit;
  }
  if (detectedValueUnit) {
    parsed.valueUnit = detectedValueUnit;
  }

  const indices = Object.keys(parsed)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  parsed.segments = indices.map((idx) => ({ index: idx, ...parsed[idx] }));

  return parsed;
};

