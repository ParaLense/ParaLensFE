import React, { useMemo } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Box } from "@/components/ui/box";
import { Text as GluestackText } from "@/components/ui/text";
import { ScrollbarValueDisplay } from "@/components/camera/ScrollbarValueDisplay";

type OcrBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrFieldDisplayProps = {
  fieldId: string;
  box: OcrBox;
  ocrHistory: {
    getFieldStats: (fieldId: string) => any;
    getFilteredValue: (fieldId: string) => string | null | undefined;
    getScrollbarValue?: (fieldId: string) => any;
  };
};

type ValueState = "filtered" | "multiple" | "raw";

interface DisplayData {
  state: ValueState;
  displayValue: string;
}

const getScrollbarTone = (
  filteredValue: string | null | undefined,
  scanCount: number
): ValueState => {
  if (filteredValue) return "filtered";
  if (scanCount > 1) return "multiple";
  return "raw";
};

/**
 * Berechnet den häufigsten Wert aus einem Array von rawValues
 */
const getMajorityValue = (
  rawValues: Array<{ value?: string; unit?: string }> | undefined
): string | null => {
  if (!rawValues || rawValues.length === 0) return null;

  const valueCounts: Record<string, number> = {};
  const valueList: string[] = [];

  for (const entry of rawValues) {
    const val = entry?.value;
    if (!val) continue;

    if (!valueCounts[val]) {
      valueCounts[val] = 0;
      valueList.push(val);
    }
    valueCounts[val] += 1;
  }

  if (valueList.length === 0) return null;

  // Finde den häufigsten Wert
  let maxCount = 0;
  let majorityValue = valueList[0];
  for (const val of valueList) {
    const count = valueCounts[val] ?? 0;
    if (count > maxCount) {
      maxCount = count;
      majorityValue = val;
    }
  }

  return majorityValue;
};

/**
 * Bestimmt den Display-State und Wert basierend auf ocrHistory
 */
const getDisplayData = (
  fieldId: string,
  filteredValue: string | null | undefined,
  stats: any
): DisplayData | null => {
  // State 1: Gefilterte Werte (grün)
  if (filteredValue) {
    return {
      state: "filtered",
      displayValue: String(filteredValue),
    };
  }

  // State 2: Mehrfache Werte (blau)
  if (stats?.uniqueValues && stats.uniqueValues > 1) {
    const majorityValue = getMajorityValue(stats.rawValues);
    if (majorityValue) {
      return {
        state: "multiple",
        displayValue: majorityValue,
      };
    }
  }

  // State 3: Raw Werte (grau)
  if (stats?.rawValues && stats.rawValues.length > 0) {
    const firstValue = stats.rawValues[0]?.value;
    if (firstValue) {
      return {
        state: "raw",
        displayValue: String(firstValue),
      };
    }
  }

  return null;
};

/**
 * OcrFieldDisplay Component
 * Zeigt OCR-Feldwerte mit hierarchischen States an:
 * - Grün: Gefilterte Werte
 * - Blau: Mehrfache Werte (Majority-Vote)
 * - Grau: Raw Werte
 */
export const OcrFieldDisplay: React.FC<OcrFieldDisplayProps> = ({
  fieldId,
  box,
  ocrHistory,
}) => {
  const filteredValue = ocrHistory.getFilteredValue(fieldId);
  const stats = ocrHistory.getFieldStats(fieldId);
  const scanCount = stats?.totalScans ?? 0;
  const displayData = useMemo(
    () => getDisplayData(fieldId, filteredValue, stats),
    [fieldId, filteredValue, stats]
  );

  const scrollbarValue = ocrHistory.getScrollbarValue?.(fieldId);

  if (!displayData && !scrollbarValue) return null;

  if (scrollbarValue && stats?.typeBreakdown?.scrollbar > 0) {
    const tone = getScrollbarTone(filteredValue, scanCount);
    return (
      <ScrollbarValueDisplay
        fieldId={fieldId}
        box={box}
        scrollbarValue={scrollbarValue}
        tone={tone}
        scanCount={scanCount}
      />
    );
  }

  if (!displayData) return null;

  const { state, displayValue } = displayData;

  // Bestimme Styling basierend auf State
  let textColorClass = "text-black"; // raw
  let backgroundStyle: { backgroundColor?: string };

  if (state === "filtered") {
    backgroundStyle = { backgroundColor: "rgba(34, 197, 94, 0.4)" };
  } else if (state === "multiple") {
    backgroundStyle = { backgroundColor: "rgba(59, 130, 246, 0.4)" };
  } else {
    backgroundStyle = { backgroundColor: "rgba(156, 163, 175, 0.3)" };
  }

  const labelTop = box.y + box.height - 24;

  return (
    <Box
      style={{
        position: "absolute",
        left: box.x,
        top: labelTop + 30,
        alignItems: "center",
        zIndex: 200,
      } as StyleProp<ViewStyle>}
    >
      <Box
        style={{
          position: "relative",
          borderRadius: 8,
          paddingVertical: 4,
          paddingHorizontal: 8,
          minWidth: 40,
          maxWidth: Math.max(box.width * 1.5, 120),
          ...backgroundStyle,
        } as StyleProp<ViewStyle>}
      >

        <GluestackText
          className={`text-sm text-center ${textColorClass}`}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayValue}
        </GluestackText>
      </Box>
    </Box>
  );
};

export default OcrFieldDisplay;













