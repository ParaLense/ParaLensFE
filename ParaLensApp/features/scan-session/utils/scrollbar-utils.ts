import type { ParsedScrollbarValue } from "@/features/ocr";
import type { IndexValuePair } from "@/components/DynamicValueList";
import { isValidNumericToken, normalizeNumber } from "@/features/ocr";

export const buildRowsFromScrollbar = (
  scrollbar: ParsedScrollbarValue | undefined,
): IndexValuePair[] => {
  if (!scrollbar) return [{ index: "1" }];

  const indices = Object.keys(scrollbar)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (indices.length === 0) return [{ index: "1" }];

  return indices.map((idx) => {
    const seg = scrollbar[idx];
    const row: IndexValuePair = { index: String(idx + 1) };
    const key = seg?.key?.[0];
    const val = seg?.value?.[0];
    if (typeof key === "number" && Number.isFinite(key)) {
      row.v = key.toFixed(4);
    }
    if (typeof val === "number" && Number.isFinite(val)) {
      row.v2 = val.toFixed(4);
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
  unit ? `${label} (${unit})` : label;

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

