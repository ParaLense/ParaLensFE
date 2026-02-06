import React from "react";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { InjectionMainFormState } from "@/features/scan-session/types/scan-session-types";

type Props = {
  isDark: boolean;
  injMainForm: InjectionMainFormState;
  setInjMainForm: React.Dispatch<React.SetStateAction<InjectionMainFormState>>;
};

export function InjectionMainMenuReview({
  isDark,
  injMainForm,
  setInjMainForm,
}: Props) {
  const sprayUnit = injMainForm.sprayPressureLimit.unit || "";
  const printerUnit = injMainForm.increasedSpecificPointPrinter.unit || "";

  return (
    <VStack className="gap-4">
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder="Spray Pressure Limit"
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
          placeholder="Increased Specific Point Printer"
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

