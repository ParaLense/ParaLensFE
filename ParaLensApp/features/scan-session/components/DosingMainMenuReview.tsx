import React from "react";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";
import type { DosingMainFormState } from "@/features/scan-session/types/scan-session-types";

type Props = {
  isDark: boolean;
  doseMainForm: DosingMainFormState;
  setDoseMainForm: React.Dispatch<React.SetStateAction<DosingMainFormState>>;
};

export function DosingMainMenuReview({
  isDark,
  doseMainForm,
  setDoseMainForm,
}: Props) {
  return (
    <VStack className="gap-4">
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Dosing Stroke"
          value={doseMainForm.dosingStroke.value}
          onChangeText={(t) =>
            setDoseMainForm((prev) => ({
              ...prev,
              dosingStroke: { ...prev.dosingStroke, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Dosing Delay Time"
          value={doseMainForm.dosingDelayTime.value}
          onChangeText={(t) =>
            setDoseMainForm((prev) => ({
              ...prev,
              dosingDelayTime: { ...prev.dosingDelayTime, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Relieve Dosing"
          value={doseMainForm.relieveDosing.value}
          onChangeText={(t) =>
            setDoseMainForm((prev) => ({
              ...prev,
              relieveDosing: { ...prev.relieveDosing, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Relieve After Dosing"
          value={doseMainForm.relieveAfterDosing.value}
          onChangeText={(t) =>
            setDoseMainForm((prev) => ({
              ...prev,
              relieveAfterDosing: { ...prev.relieveAfterDosing, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Discharge Speed Before"
          value={doseMainForm.dischargeSpeedBeforeDosing.value}
          onChangeText={(t) =>
            setDoseMainForm((prev) => ({
              ...prev,
              dischargeSpeedBeforeDosing: {
                ...prev.dischargeSpeedBeforeDosing,
                value: t,
              },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Discharge Speed After"
          value={doseMainForm.dischargeSpeedAfterDosing.value}
          onChangeText={(t) =>
            setDoseMainForm((prev) => ({
              ...prev,
              dischargeSpeedAfterDosing: {
                ...prev.dischargeSpeedAfterDosing,
                value: t,
              },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
    </VStack>
  );
}

