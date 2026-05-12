/**
 * Field Aggregator
 * Handles aggregation logic for OCR field values
 */

import type { ParsedScrollbarValue } from '../types';
import { pickMajorityValue } from '../utils';
import { SCROLLBAR_DECIMALS } from '../constants';

/**
 * Rebuild segments array in scrollbar value (for ordered access)
 */
const rebuildScrollbarSegments = (value: ParsedScrollbarValue): void => {
  const indices = Object.keys(value)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (indices.length === 0) {
    delete value.segments;
    return;
  }
  value.segments = indices.map((idx) => ({ index: idx, ...value[idx] }));
};

/**
 * Merge two parsed scrollbar values
 */
export const mergeParsedScrollbar = (
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
      pairs?: Array<{ key: number; value: number }>;
    };
    if (Array.isArray((segment as any).key)) current.key.push(...(segment as any).key);
    if (Array.isArray((segment as any).value)) current.value.push(...(segment as any).value);
    if (Array.isArray((segment as any).pairs)) {
      current.pairs = current.pairs ?? [];
      current.pairs.push(...(segment as any).pairs);
    }
    result[idx] = current;
  }

  // Merge units at the "overarching" scrollbar level
  const incomingKeyUnit = (incoming as ParsedScrollbarValue).keyUnit;
  const incomingValueUnit = (incoming as ParsedScrollbarValue).valueUnit;

  if (incomingKeyUnit) {
    result.keyUnit = incomingKeyUnit;
  }
  if (incomingValueUnit) {
    result.valueUnit = incomingValueUnit;
  }

  const incomingSingle = incoming.single;
  if (incomingSingle != null) {
    result.single = incomingSingle || result.single;
  }

  rebuildScrollbarSegments(result);

  return result;
};

/**
 * Compute majority string value from array of value/unit pairs
 */
export const computeMajorityString = (
  values: { value: string; unit?: string }[],
  minOccurrences: number
): { value: string; unit?: string } | null => {
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

/**
 * Compute best scrollbar values from aggregated data
 */
export const computeBestScrollbar = (
  agg: ParsedScrollbarValue,
  minOccurrences: number
): { parsed: ParsedScrollbarValue; formatted: string } | null => {
  if (!agg) return null;
  const indices = agg.segments
    ? agg.segments.map((segment) => segment.index)
    : Object.keys(agg)
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);

  const bestParsed: ParsedScrollbarValue = {};
  const parts: string[] = [];

  const keyUnit = agg.keyUnit ?? null;
  const valueUnit = agg.valueUnit ?? null;
  const isSingle = !!agg.single;

  if (isSingle) {
    for (const idx of indices) {
      const segment = agg[idx];
      if (!segment || !Array.isArray(segment.value)) continue;

      const counts = new Map<string, { value: number; count: number }>();
      for (const value of segment.value) {
        if (!Number.isFinite(value)) continue;
        const key = value.toString();
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { value, count: 1 });
        }
      }

      if (counts.size === 0) continue;

      let best: { value: number; count: number } | null = null;
      for (const entry of counts.values()) {
        if (!best || entry.count > best.count) {
          best = entry;
        }
      }
      if (!best) continue;

      const uniqueValues = counts.size;
      const state = best.count >= minOccurrences ? 'filtered' : uniqueValues > 1 ? 'multiple' : 'raw';

      bestParsed[idx] = {
        key: [],
        value: [best.value],
        state,
      };

      if (state === 'filtered') {
        const valueSuffix = valueUnit ? ` ${valueUnit}` : '';
        parts.push(`${idx}: ${best.value.toFixed(SCROLLBAR_DECIMALS)}${valueSuffix}`);
      }
    }

    if (parts.length === 0) {
      if (Object.keys(bestParsed).length === 0) return null;
    }

    if (valueUnit) bestParsed.valueUnit = valueUnit;
    bestParsed.single = true;
    rebuildScrollbarSegments(bestParsed);

    return {
      parsed: bestParsed,
      formatted: parts.join(', '),
    };
  }

  for (const idx of indices) {
    const segment = agg[idx];
    if (!segment) continue;

    let bestKey: number | null = null;
    let bestValue: number | null = null;
    let bestCount = 0;
    let uniquePairs = 0;

    if (Array.isArray(segment.pairs) && segment.pairs.length > 0) {
      const counts = new Map<string, { key: number; value: number; count: number }>();
      for (const pair of segment.pairs) {
        const key = `${pair.key}|${pair.value}`;
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { key: pair.key, value: pair.value, count: 1 });
        }
      }
      uniquePairs = counts.size;
      for (const entry of counts.values()) {
        if (entry.count > bestCount) {
          bestCount = entry.count;
          bestKey = entry.key;
          bestValue = entry.value;
        }
      }
    } else {
      const fallbackKey = pickMajorityValue(segment.key, 1);
      const fallbackValue = pickMajorityValue(segment.value, 1);
      bestKey = fallbackKey ?? null;
      bestValue = fallbackValue ?? null;
      bestCount = 0;
      uniquePairs = 0;
    }

    if (bestKey == null || bestValue == null) continue;

    const state = bestCount >= minOccurrences ? 'filtered' : uniquePairs > 1 ? 'multiple' : 'raw';

    bestParsed[idx] = {
      key: [bestKey],
      value: [bestValue],
      state,
    };

    if (state === 'filtered') {
      const keySuffix = keyUnit ? ` ${keyUnit}` : '';
      const valueSuffix = valueUnit ? ` ${valueUnit}` : '';
      parts.push(
        `${idx}: (${bestKey.toFixed(SCROLLBAR_DECIMALS)}${keySuffix},${bestValue.toFixed(
          SCROLLBAR_DECIMALS
        )}${valueSuffix})`
      );
    }
  }

  if (parts.length === 0) {
    if (Object.keys(bestParsed).length === 0) return null;
  }

  // Store units in result
  if (keyUnit) bestParsed.keyUnit = keyUnit;
  if (valueUnit) bestParsed.valueUnit = valueUnit;
  rebuildScrollbarSegments(bestParsed);

  return {
    parsed: bestParsed,
    formatted: parts.join(', '),
  };
};

