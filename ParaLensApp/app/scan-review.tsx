import React, { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import DynamicValueList, {
  IndexValuePair,
} from "@/components/DynamicValueList";
import { useFullScan } from "@/features/fullscan/fullscan-context";
import { useSettings } from "@/features/settings/settings-context";
import { useI18n } from "@/features/settings/i18n";
import {VStack} from "@/components/ui/vstack";
import {Text} from "@/components/ui/text";
import {Input, InputField} from "@/components/ui/input";
import { Heading } from "@/components/ui/heading";
import {Button} from "@/components/ui/button";
import {HStack} from "@/components/ui/hstack";

type ScanMenu = "injection" | "dosing" | "holdingPressure" | "cylinderHeating";
type InjectionMode = "mainMenu" | "subMenuGraphic" | "switchType" | "";
type HoldingPressureMode = "mainMenu" | "subMenuGraphic" | "";
type DosingMode = "mainMenu" | "subMenuGraphic" | "";

export default function ScanReviewScreen() {
  const params = useLocalSearchParams<{
    selectedMenu?: ScanMenu;
    injectionMode?: InjectionMode;
    holdingMode?: HoldingPressureMode;
    dosingMode?: DosingMode;
  }>();
  const router = useRouter();
  const { selectedFullScanId, upsertSection } = useFullScan();
  const { theme } = useSettings();
  const { t } = useI18n();
  const isDark = theme === "dark";

  const selectedMenu = params.selectedMenu ?? null;
  const injectionMode = params.injectionMode ?? null;
  const holdingMode = params.holdingMode ?? null;
  const dosingMode = params.dosingMode ?? null;

  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedMenu) parts.push(selectedMenu);
    if (injectionMode) parts.push(injectionMode);
    if (!injectionMode && holdingMode) parts.push(holdingMode);
    if (!injectionMode && !holdingMode && dosingMode) parts.push(dosingMode);
    return parts.join(" · ");
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

  const [injMainForm, setInjMainForm] = useState({
    sprayPressureLimit: "",
    increasedSpecificPointPrinter: "",
  });
  const [injSwitchForm, setInjSwitchForm] = useState({
    transshipmentPosition: "",
    switchOverTime: "",
    switchingPressure: "",
  });
  const [injGraphicValues, setInjGraphicValues] = useState<IndexValuePair[]>([
    { index: "1" },
  ]);
  const [doseMainForm, setDoseMainForm] = useState({
    dosingStroke: "",
    dosingDelayTime: "",
    relieveDosing: "",
    relieveAfterDosing: "",
    dischargeSpeedBeforeDosing: "",
    dischargeSpeedAfterDosing: "",
  });
  const [doseSpeedValues, setDoseSpeedValues] = useState<IndexValuePair[]>([
    { index: "1" },
  ]);
  const [dosePressureValues, setDosePressureValues] = useState<IndexValuePair[]>([
    { index: "1" },
  ]);
  const [holdMainForm, setHoldMainForm] = useState({
    holdingTime: "",
    coolTime: "",
    screwDiameter: "",
  });
  const [holdGraphicValues, setHoldGraphicValues] = useState<IndexValuePair[]>([
    { index: "1" },
  ]);
  const [cylinderForm, setCylinderForm] = useState({
    setpoint1: "",
    setpoint2: "",
    setpoint3: "",
    setpoint4: "",
    setpoint5: "",
  });

  const onBack = () => router.back();
  const onSave = () => router.back();

  return (
    <ScrollView
      style={{ backgroundColor: isDark ? "#000" : "#fff" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Heading
        size="lg"
        className={`mb-4 ${isDark ? "text-typography-50" : "text-typography-900"}`}
      >
        Review · {headerLabel}
      </Heading>

      {selectedMenu === "injection" && injectionMode === "mainMenu" && (
        <VStack className="gap-4">
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Spray Pressure Limit"
              value={injMainForm.sprayPressureLimit}
              onChangeText={(t) =>
                setInjMainForm({ ...injMainForm, sprayPressureLimit: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Increased Specific Point Printer"
              value={injMainForm.increasedSpecificPointPrinter}
              onChangeText={(t) =>
                setInjMainForm({
                  ...injMainForm,
                  increasedSpecificPointPrinter: t,
                })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
        </VStack>
      )}

      {selectedMenu === "injection" && injectionMode === "subMenuGraphic" && (
        <VStack className="gap-4">
          <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
            Werte (Index, v, v2)
          </Heading>
          <DynamicValueList
            rows={injGraphicValues}
            setRows={setInjGraphicValues}
            labels={{ v: "v", v2: "v2" }}
            isDark={isDark}
          />
        </VStack>
      )}

      {selectedMenu === "injection" && injectionMode === "switchType" && (
        <VStack className="gap-4">
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Transshipment Position"
              value={injSwitchForm.transshipmentPosition}
              onChangeText={(t) =>
                setInjSwitchForm({ ...injSwitchForm, transshipmentPosition: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Switch Over Time"
              value={injSwitchForm.switchOverTime}
              onChangeText={(t) =>
                setInjSwitchForm({ ...injSwitchForm, switchOverTime: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Switching Pressure"
              value={injSwitchForm.switchingPressure}
              onChangeText={(t) =>
                setInjSwitchForm({ ...injSwitchForm, switchingPressure: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
        </VStack>
      )}

      {selectedMenu === "holdingPressure" && holdingMode === "mainMenu" && (
        <VStack className="gap-4">
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Holding Time"
              value={holdMainForm.holdingTime}
              onChangeText={(t) =>
                setHoldMainForm({ ...holdMainForm, holdingTime: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Cool Time"
              value={holdMainForm.coolTime}
              onChangeText={(t) =>
                setHoldMainForm({ ...holdMainForm, coolTime: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Screw Diameter"
              value={holdMainForm.screwDiameter}
              onChangeText={(t) =>
                setHoldMainForm({ ...holdMainForm, screwDiameter: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
        </VStack>
      )}

      {selectedMenu === "holdingPressure" && holdingMode === "subMenuGraphic" && (
        <VStack className="gap-4">
          <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
            Werte (Index, t, p)
          </Heading>
          <DynamicValueList
            rows={holdGraphicValues}
            setRows={setHoldGraphicValues}
            labels={{ t: "t", p: "p" }}
            isDark={isDark}
          />
        </VStack>
      )}

      {selectedMenu === "dosing" && dosingMode === "mainMenu" && (
        <VStack className="gap-4">
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Dosing Stroke"
              value={doseMainForm.dosingStroke}
              onChangeText={(t) =>
                setDoseMainForm({ ...doseMainForm, dosingStroke: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Dosing Delay Time"
              value={doseMainForm.dosingDelayTime}
              onChangeText={(t) =>
                setDoseMainForm({ ...doseMainForm, dosingDelayTime: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Relieve Dosing"
              value={doseMainForm.relieveDosing}
              onChangeText={(t) =>
                setDoseMainForm({ ...doseMainForm, relieveDosing: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Relieve After Dosing"
              value={doseMainForm.relieveAfterDosing}
              onChangeText={(t) =>
                setDoseMainForm({ ...doseMainForm, relieveAfterDosing: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Discharge Speed Before"
              value={doseMainForm.dischargeSpeedBeforeDosing}
              onChangeText={(t) =>
                setDoseMainForm({
                  ...doseMainForm,
                  dischargeSpeedBeforeDosing: t,
                })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Discharge Speed After"
              value={doseMainForm.dischargeSpeedAfterDosing}
              onChangeText={(t) =>
                setDoseMainForm({
                  ...doseMainForm,
                  dischargeSpeedAfterDosing: t,
                })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
        </VStack>
      )}

      {selectedMenu === "dosing" && dosingMode === "subMenuGraphic" && (
        <VStack className="gap-6">
          <VStack className="gap-4">
            <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
              Dosing Speed (Index, v, v2)
            </Heading>
            <DynamicValueList
              rows={doseSpeedValues}
              setRows={setDoseSpeedValues}
              labels={{ v: "v", v2: "v2" }}
              isDark={isDark}
            />
          </VStack>
          <VStack className="gap-4">
            <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
              Dosing Pressure (Index, v, v2)
            </Heading>
            <DynamicValueList
              rows={dosePressureValues}
              setRows={setDosePressureValues}
              labels={{ v: "v", v2: "v2" }}
              isDark={isDark}
            />
          </VStack>
        </VStack>
      )}

      {selectedMenu === "cylinderHeating" && (
        <VStack className="gap-4">
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 1"
              value={cylinderForm.setpoint1}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint1: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 2"
              value={cylinderForm.setpoint2}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint2: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 3"
              value={cylinderForm.setpoint3}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint3: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 4"
              value={cylinderForm.setpoint4}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint4: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 5"
              value={cylinderForm.setpoint5}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint5: t })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
        </VStack>
      )}

      <HStack
        className="gap-4 mt-6 items-center justify-between"
      >
        <Button variant="outline" action="secondary" onPress={onBack}>
          <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
            {t("cancel")}
          </Text>
        </Button>
        <Button
          action="primary"
          variant="solid"
          onPress={() => {
            if (!selectedMenu || !selectedFullScanId) {
              onSave();
              return;
            }
            let payload: any = {};
            if (selectedMenu === "injection") {
              if (injectionMode === "mainMenu")
                payload = { mainMenu: { ...injMainForm } };
              if (injectionMode === "subMenuGraphic")
                payload = { subMenuValues: { values: injGraphicValues } };
              if (injectionMode === "switchType")
                payload = { switchType: { ...injSwitchForm } };
            } else if (selectedMenu === "holdingPressure") {
              if (holdingMode === "mainMenu")
                payload = { mainMenu: { ...holdMainForm } };
              if (holdingMode === "subMenuGraphic")
                payload = { subMenusValues: { values: holdGraphicValues } };
            } else if (selectedMenu === "dosing") {
              if (dosingMode === "mainMenu")
                payload = { mainMenu: { ...doseMainForm } };
              if (dosingMode === "subMenuGraphic")
                payload = {
                  dosingSpeedsValues: { values: doseSpeedValues },
                  dosingPressuresValues: { values: dosePressureValues },
                };
            } else if (selectedMenu === "cylinderHeating") {
              payload = { ...cylinderForm };
            }
            upsertSection(selectedFullScanId, selectedMenu, payload);
            onSave();
          }}
        >
          <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
            {t("create") || "Speichern"}
          </Text>
        </Button>
      </HStack>
    </ScrollView>
  );
}


