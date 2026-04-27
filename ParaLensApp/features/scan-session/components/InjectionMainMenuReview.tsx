import React from "react";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";
import type { InjectionMainFormState } from "@/features/scan-session/types/scan-session-types";

type Props = {
  isDark: boolean;
  t: (key: string) => string;
  injMainForm: InjectionMainFormState;
  setInjMainForm: React.Dispatch<React.SetStateAction<InjectionMainFormState>>;
};

export function InjectionMainMenuReview({
  isDark,
  t,
  injMainForm,
  setInjMainForm,
}: Props) {
  return (
    <VStack className="gap-4">
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder={t("sprayPressureLimit")}
          value={injMainForm.sprayPressureLimit.value}
          onChangeText={(t) =>
            setInjMainForm((prev) => ({
              ...prev,
              sprayPressureLimit: {
                ...prev.sprayPressureLimit,
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
          placeholder={t("increasedSpecificPointPrinter")}
          value={injMainForm.increasedSpecificPointPrinter.value}
          onChangeText={(t) =>
            setInjMainForm((prev) => ({
              ...prev,
              increasedSpecificPointPrinter: {
                ...prev.increasedSpecificPointPrinter,
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

