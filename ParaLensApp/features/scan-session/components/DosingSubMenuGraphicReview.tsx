import React from "react";
import { VStack } from "@/components/ui/vstack";
import { Heading } from "@/components/ui/heading";
import DynamicValueList, {
  IndexValuePair,
} from "@/components/DynamicValueList";
import type { ScrollbarUnits } from "@/features/scan-session/types/scan-session-types";
import { formatUnitLabel } from "@/features/scan-session/utils/scrollbar-utils";

type Props = {
  isDark: boolean;
  speedValues: IndexValuePair[];
  setSpeedValues: (rows: IndexValuePair[]) => void;
  pressureValues: IndexValuePair[];
  setPressureValues: (rows: IndexValuePair[]) => void;
  speedUnits: ScrollbarUnits;
  pressureUnits: ScrollbarUnits;
};

export function DosingSubMenuGraphicReview({
  isDark,
  speedValues,
  setSpeedValues,
  pressureValues,
  setPressureValues,
  speedUnits,
  pressureUnits,
}: Props) {
  return (
    <VStack className="gap-6">
      <VStack className="gap-4">
        <Heading
          size="sm"
          className={isDark ? "text-typography-50" : "text-typography-900"}
        >
          Dosing Speed (Index, v, v2)
        </Heading>
        <DynamicValueList
          rows={speedValues}
          setRows={setSpeedValues}
          labels={{
            v: formatUnitLabel("v", speedUnits.keyUnit),
            v2: formatUnitLabel("v2", speedUnits.valueUnit),
          }}
          units={{
            v: speedUnits.keyUnit,
            v2: speedUnits.valueUnit,
          }}
          isDark={isDark}
        />
      </VStack>
      <VStack className="gap-4">
        <Heading
          size="sm"
          className={isDark ? "text-typography-50" : "text-typography-900"}
        >
          Dosing Pressure (Index, v, v2)
        </Heading>
        <DynamicValueList
          rows={pressureValues}
          setRows={setPressureValues}
          labels={{
            v: formatUnitLabel("v", pressureUnits.keyUnit),
            v2: formatUnitLabel("v2", pressureUnits.valueUnit),
          }}
          units={{
            v: pressureUnits.keyUnit,
            v2: pressureUnits.valueUnit,
          }}
          isDark={isDark}
        />
      </VStack>
    </VStack>
  );
}
