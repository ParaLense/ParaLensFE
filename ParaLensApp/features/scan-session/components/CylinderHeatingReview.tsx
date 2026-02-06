import React from "react";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";
import type { CylinderHeatingFormState } from "@/features/scan-session/types/scan-session-types";

type Props = {
  isDark: boolean;
  cylinderForm: CylinderHeatingFormState;
  setCylinderForm: React.Dispatch<React.SetStateAction<CylinderHeatingFormState>>;
};

export function CylinderHeatingReview({
  isDark,
  cylinderForm,
  setCylinderForm,
}: Props) {
  return (
    <VStack className="gap-4">
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Setpoint 1"
          value={cylinderForm.setpoint1.value}
          onChangeText={(t) =>
            setCylinderForm((prev) => ({
              ...prev,
              setpoint1: { ...prev.setpoint1, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Setpoint 2"
          value={cylinderForm.setpoint2.value}
          onChangeText={(t) =>
            setCylinderForm((prev) => ({
              ...prev,
              setpoint2: { ...prev.setpoint2, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Setpoint 3"
          value={cylinderForm.setpoint3.value}
          onChangeText={(t) =>
            setCylinderForm((prev) => ({
              ...prev,
              setpoint3: { ...prev.setpoint3, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Setpoint 4"
          value={cylinderForm.setpoint4.value}
          onChangeText={(t) =>
            setCylinderForm((prev) => ({
              ...prev,
              setpoint4: { ...prev.setpoint4, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Setpoint 5"
          value={cylinderForm.setpoint5.value}
          onChangeText={(t) =>
            setCylinderForm((prev) => ({
              ...prev,
              setpoint5: { ...prev.setpoint5, value: t },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>
    </VStack>
  );
}

