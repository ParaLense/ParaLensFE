import React from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import type { InjectionSwitchTypeFormState } from "@/features/scan-session/types/scan-session-types";

type Props = {
  isDark: boolean;
  t: (key: string) => string;
  injSwitchForm: InjectionSwitchTypeFormState;
  setInjSwitchForm: React.Dispatch<
    React.SetStateAction<InjectionSwitchTypeFormState>
  >;
};

export function InjectionSwitchTypeReview({
  isDark,
  t,
  injSwitchForm,
  setInjSwitchForm,
}: Props) {
  return (
    <VStack className="gap-4">
      <Input>
        <InputField
          keyboardType="numeric"
          placeholder={t("transshipmentPosition")}
          value={injSwitchForm.transshipmentPosition.value}
          onChangeText={(t) =>
            setInjSwitchForm((prev) => ({
              ...prev,
              transshipmentPosition: {
                ...prev.transshipmentPosition,
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
          placeholder={t("switchOverTime")}
          value={injSwitchForm.switchOverTime.value}
          onChangeText={(t) =>
            setInjSwitchForm((prev) => ({
              ...prev,
              switchOverTime: {
                ...prev.switchOverTime,
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
          placeholder={t("switchingPressure")}
          value={injSwitchForm.switchingPressure.value}
          onChangeText={(t) =>
            setInjSwitchForm((prev) => ({
              ...prev,
              switchingPressure: {
                ...prev.switchingPressure,
                value: t,
              },
            }))
          }
          style={{ color: isDark ? "#ffffff" : "#000000" }}
        />
      </Input>

      <VStack className="gap-2 mt-2">
        <Heading
          size="sm"
          className={isDark ? "text-typography-50" : "text-typography-900"}
        >
          {t("activeSwitchOverMode")}
        </Heading>
        <HStack className="gap-2 flex-wrap">
          <Button
            size="sm"
            variant={injSwitchForm.switch_over_way.value === "1" ? "solid" : "outline"}
            action={injSwitchForm.switch_over_way.value === "1" ? "primary" : "secondary"}
            onPress={() =>
              setInjSwitchForm((prev) => ({
                ...prev,
                switch_over_way: { value: "1" },
                switch_over_time: { value: "0" },
                switch_over_hydraulic: { value: "0" },
              }))
            }
          >
            <ButtonText>{t("switchOverWay")}</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={injSwitchForm.switch_over_time.value === "1" ? "solid" : "outline"}
            action={injSwitchForm.switch_over_time.value === "1" ? "primary" : "secondary"}
            onPress={() =>
              setInjSwitchForm((prev) => ({
                ...prev,
                switch_over_way: { value: "0" },
                switch_over_time: { value: "1" },
                switch_over_hydraulic: { value: "0" },
              }))
            }
          >
            <ButtonText>{t("switchOverTimeActive")}</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={
              injSwitchForm.switch_over_hydraulic.value === "1" ? "solid" : "outline"
            }
            action={
              injSwitchForm.switch_over_hydraulic.value === "1"
                ? "primary"
                : "secondary"
            }
            onPress={() =>
              setInjSwitchForm((prev) => ({
                ...prev,
                switch_over_way: { value: "0" },
                switch_over_time: { value: "0" },
                switch_over_hydraulic: { value: "1" },
              }))
            }
          >
            <ButtonText>{t("switchOverHydraulic")}</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </VStack>
  );
}

