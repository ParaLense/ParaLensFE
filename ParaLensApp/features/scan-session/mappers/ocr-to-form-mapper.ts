import type { OcrFieldResult, ParsedScrollbarValue } from "@/features/ocr";
import type { OcrSnapshot } from "@/features/scan-session/types/scan-session-types";

export const findField = (
  snapshot: OcrSnapshot,
  boxId: string,
): OcrFieldResult | undefined =>
  snapshot?.bestFields?.find((f) => f.box_id === boxId);

export const findFieldWithUnit = (
  snapshot: OcrSnapshot,
  boxId: string,
): { value: string; unit?: string } | undefined => {
  const f = findField(snapshot, boxId);
  if (!f) return undefined;
  if (typeof f.value === "string") {
    return { value: f.value, unit: f.unit };
  }
  return undefined;
};

export const getScrollbarValue = (
  snapshot: OcrSnapshot,
  boxId: string,
): ParsedScrollbarValue | undefined => {
  const f = findField(snapshot, boxId);
  if (!f || f.type !== "scrollbar" || !f.value || typeof f.value === "string") {
    return undefined;
  }
  return f.value as ParsedScrollbarValue;
};

