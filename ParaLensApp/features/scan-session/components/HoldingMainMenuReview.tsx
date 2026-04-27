import React from "react";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";
import type { HoldingMainFormState } from "@/features/scan-session/types/scan-session-types";

type Props = {
  isDark: boolean;
  t: (key: string) => string;
  holdMainForm: HoldingMainFormState;
  setHoldMainForm: React.Dispatch<React.SetStateAction<HoldingMainFormState>>;
};

export function HoldingMainMenuReview({
  isDark,
  t,
  holdMainForm,
  setHoldMainForm,
}: Props) {
  return (
    <VStack className="gap-4">
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder={t("holdingTime")}
          value={holdMainForm.holdingTime.value}
          onChangeText={(t) =>
            setHoldMainForm((prev) => ({
              ...prev,
              holdingTime: { ...prev.holdingTime, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder={t("coolTime")}
          value={holdMainForm.coolTime.value}
          onChangeText={(t) =>
            setHoldMainForm((prev) => ({
              ...prev,
              coolTime: { ...prev.coolTime, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder={t("screwDiameter")}
          value={holdMainForm.screwDiameter.value}
          onChangeText={(t) =>
            setHoldMainForm((prev) => ({
              ...prev,
              screwDiameter: { ...prev.screwDiameter, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
    </VStack>
  );
}

