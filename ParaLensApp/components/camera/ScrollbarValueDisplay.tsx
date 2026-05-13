import React from "react";
import { StyleProp, ViewStyle } from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text as GluestackText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { ParsedScrollbarValue } from "@/features/ocr";
import {
  buildRowsFromScrollbar,
  extractScrollbarUnits,
} from "@/features/scan-session/utils/scrollbar-utils";

type ScrollbarTone = "filtered" | "multiple" | "raw";

type OcrBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ScrollbarValueDisplayProps = {
  fieldId: string;
  box: OcrBox;
  scrollbarValue?: ParsedScrollbarValue;
  tone?: ScrollbarTone;
  scanCount?: number;
};

const getToneClasses = (tone: ScrollbarTone) => {
  switch (tone) {
    case "filtered":
      return {
        text: "text-black",
        valueText: "text-black",
        backgroundColor: "rgba(34, 197, 94, 0.35)",
      };
    case "multiple":
      return {
        text: "text-black",
        valueText: "text-black",
        backgroundColor: "rgba(59, 130, 246, 0.35)",
      };
    case "raw":
    default:
      return {
        text: "text-black",
        valueText: "text-black",
        backgroundColor: "rgba(156, 163, 175, 0.28)",
      };
  }
};

export const ScrollbarValueDisplay: React.FC<ScrollbarValueDisplayProps> = ({
  fieldId,
  box,
  scrollbarValue,
  tone = "multiple",
  scanCount = 0,
}) => {
  if (!scrollbarValue) return null;

  const rows = buildRowsFromScrollbar(scrollbarValue);
  const units = extractScrollbarUnits(scrollbarValue);
  const isSingle = scrollbarValue.single === true;
  const labelTop = box.y + box.height - 24;

  return (
    <Box
      key={fieldId}
      style={{
        position: "absolute",
        left: box.x,
        top: labelTop - 30,
        zIndex: 200,
      } as StyleProp<ViewStyle>}
    >
      <Box
        style={{
          position: "relative",
          borderRadius: 8,
          paddingVertical: 6,
          paddingHorizontal: 8,
          minWidth: 40,
          maxWidth: Math.max(box.width * 1.5, 160),
          backgroundColor: "rgba(156, 163, 175, 0.4)",
        } as StyleProp<ViewStyle>}
      >
        <HStack className="items-start gap-3 flex-wrap">
          <HStack className="items-start gap-2 flex-wrap">
            {rows.map((row) => (
              <VStack
                key={row.index}
                className="items-center gap-0.5 min-w-12"
                style={{
                  borderRadius: 6,
                  paddingVertical: 2,
                  paddingHorizontal: 4,
                  backgroundColor: getToneClasses((row.state ?? tone) as ScrollbarTone)
                    .backgroundColor,
                }}
              >
                {!isSingle ? (
                  <GluestackText
                    className={`text-[10px] ${getToneClasses((row.state ?? tone) as ScrollbarTone).text}`}
                    numberOfLines={1}
                  >
                    {row.v ?? "-"}
                  </GluestackText>
                ) : null}
                <GluestackText
                  className={`text-xs font-medium ${getToneClasses((row.state ?? tone) as ScrollbarTone).valueText}`}
                  numberOfLines={1}
                >
                  {row.v2 ?? "-"}
                </GluestackText>
              </VStack>
            ))}
          </HStack>

          {(units.keyUnit || units.valueUnit) && (
            <VStack className="items-start gap-0.5 min-w-10">
              {units.keyUnit ? (
                <GluestackText className={`text-[10px] ${getToneClasses(tone).text}`} numberOfLines={1}>
                  {units.keyUnit}
                </GluestackText>
              ) : null}
              {units.valueUnit ? (
                <GluestackText className={`text-xs font-medium ${getToneClasses(tone).valueText}`} numberOfLines={1}>
                  {units.valueUnit}
                </GluestackText>
              ) : null}
            </VStack>
          )}
        </HStack>
      </Box>
    </Box>
  );
};
