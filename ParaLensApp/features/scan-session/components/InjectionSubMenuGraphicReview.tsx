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

export function InjectionSubMenuGraphicReview({
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
        {t("injectionSpeed")} (Index, s, v)
      </Heading>
      <DynamicValueList
        rows={values}
        setRows={setValues}
        labels={{
          v: formatUnitLabel("s", units.keyUnit),
          v2: formatUnitLabel("v", units.valueUnit),
        }}
        units={{
          v: units.keyUnit,
          v2: units.valueUnit,
        }}
        isDark={isDark}
      />
    </VStack>
  );
}
