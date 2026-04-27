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
  values: IndexValuePair[];
  setValues: (rows: IndexValuePair[]) => void;
  units: ScrollbarUnits;
};

export function HoldingSubMenuGraphicReview({
  isDark,
  t,
  values,
  setValues,
  units,
}: Props) {
  return (
    <VStack className="gap-4">
      <Heading
        size="sm"
        className={isDark ? "text-typography-50" : "text-typography-900"}
      >
        {t("specificHoldingPressure")} (Index, t, p)
      </Heading>
      <DynamicValueList
        rows={values}
        setRows={setValues}
        labels={{
          t: formatUnitLabel("t", units.keyUnit),
          p: formatUnitLabel("p", units.valueUnit),
        }}
        units={{
          t: units.keyUnit,
          p: units.valueUnit,
        }}
        isDark={isDark}
      />
    </VStack>
  );
}
