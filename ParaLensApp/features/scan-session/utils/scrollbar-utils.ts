import type { ParsedScrollbarValue } from "@/features/ocr";
import type { IndexValuePair } from "@/components/DynamicValueList";
import { isValidNumericToken, normalizeNumber } from "@/features/ocr";

export const SCROLLBAR_DISPLAY_DECIMALS = 2;

export const formatScrollbarNumber = (value: number): string =>
  value.toFixed(SCROLLBAR_DISPLAY_DECIMALS);

export const buildRowsFromScrollbar = (
  scrollbar: ParsedScrollbarValue | undefined,
): IndexValuePair[] => {
  if (!scrollbar) return [{ index: "1" }];

  const segments = scrollbar.segments ?? Object.keys(scrollbar)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((idx) => ({ index: idx, ...scrollbar[idx] }));

  if (segments.length === 0) return [{ index: "1" }];

  const isSingle = scrollbar.single === true;

  return segments.map((seg) => {
    const row: IndexValuePair = { index: String(seg.index + 1), state: seg.state };
    const key = seg.key?.[0];
    const val = seg.value?.[0];
    if (!isSingle && typeof key === "number" && Number.isFinite(key)) {
      row.v = formatScrollbarNumber(key);
    }
    if (typeof val === "number" && Number.isFinite(val)) {
      row.v2 = formatScrollbarNumber(val);
    }
    return row;
  });
};

export const extractScrollbarUnits = (
  scrollbar: ParsedScrollbarValue | undefined,
): { keyUnit?: string; valueUnit?: string } => ({
  keyUnit: scrollbar?.keyUnit ?? undefined,
  valueUnit: scrollbar?.valueUnit ?? undefined,
});

export const formatUnitLabel = (label: string, unit?: string): string =>
  unit ? `${label} [${unit}]` : label;

export const extractNumberStrings = (
  raw: string | undefined | null,
  maxCount: number,
): string[] => {
  if (!raw) return [];
  const tokens = String(raw).split(/[\s,;]+/).filter(Boolean);
  const result: string[] = [];
  for (const token of tokens) {
    if (!isValidNumericToken(token, false)) continue;
    const num = normalizeNumber(token);
    if (num == null || !Number.isFinite(num)) continue;
    result.push(num.toString());
    if (result.length >= maxCount) break;
  }
  return result;
};

