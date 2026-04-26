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
  t: (key: string) => string;
  speedValues: IndexValuePair[];
  setSpeedValues: (rows: IndexValuePair[]) => void;
  pressureValues: IndexValuePair[];
  setPressureValues: (rows: IndexValuePair[]) => void;
  speedUnits: ScrollbarUnits;
  pressureUnits: ScrollbarUnits;
};

export function DosingSubMenuGraphicReview({
  isDark,
  t,
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
          {t("dosingSpeed")} (Index, s, v)
        </Heading>
        <DynamicValueList
          rows={speedValues}
          setRows={setSpeedValues}
          labels={{
            v: formatUnitLabel("s", speedUnits.keyUnit),
            v2: formatUnitLabel("v", speedUnits.valueUnit),
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
          {t("dosingPressure")} (Index, s, p)
        </Heading>
        <DynamicValueList
          rows={pressureValues}
          setRows={setPressureValues}
          labels={{
            v: formatUnitLabel("s", pressureUnits.keyUnit),
            v2: formatUnitLabel("p", pressureUnits.valueUnit),
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
