import React, { useEffect, useMemo, useState } from "react";
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
import {Button, ButtonText} from "@/components/ui/button";
import {HStack} from "@/components/ui/hstack";
import type { OcrFieldResult, ParsedScrollbarValue } from "@/features/ocr/useOcrHistory";
import { isValidNumericToken, normalizeNumber } from "@/features/ocr/useOcrHistory";

type ScanMenu = "injection" | "dosing" | "holdingPressure" | "cylinderHeating";
type InjectionMode = "mainMenu" | "subMenuGraphic" | "switchType" | "";
type HoldingPressureMode = "mainMenu" | "subMenuGraphic" | "";
type DosingMode = "mainMenu" | "subMenuGraphic" | "";

type OcrSnapshot = {
  bestFields: OcrFieldResult[];
  ocrMap: Record<string, string>;
} | null;

const buildRowsFromScrollbar = (scrollbar: ParsedScrollbarValue | undefined): IndexValuePair[] => {
  if (!scrollbar) return [{ index: "1" }];

  const indices = Object.keys(scrollbar)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (indices.length === 0) return [{ index: "1" }];

  return indices.map((idx) => {
    const seg = scrollbar[idx];
    const row: IndexValuePair = { index: String(idx + 1) };
    const key = seg?.key?.[0];
    const val = seg?.value?.[0];
    if (typeof key === "number" && Number.isFinite(key)) {
      row.v = key.toFixed(4);
    }
    if (typeof val === "number" && Number.isFinite(val)) {
      row.v2 = val.toFixed(4);
    }
    return row;
  });
};

const extractNumberStrings = (raw: string | undefined | null, maxCount: number): string[] => {
  if (!raw) return [];
  const tokens = String(raw).split(/[\s,;]+/).filter(Boolean);
  const result: string[] = [];
  for (const token of tokens) {
    if (!isValidNumericToken(token, false)) continue;
    const num = normalizeNumber(token);
    if (num == null || !Number.isFinite(num)) continue;
    result.push(num.toString());
    if (result.length >= maxCount) break;
  }
  return result;
};

export default function ScanReviewScreen() {
  const params = useLocalSearchParams<{
    selectedMenu?: ScanMenu;
    injectionMode?: InjectionMode;
    holdingMode?: HoldingPressureMode;
    dosingMode?: DosingMode;
    ocrData?: string;
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

  const [ocrSnapshot, setOcrSnapshot] = useState<OcrSnapshot>(null);
  const [ocrApplied, setOcrApplied] = useState(false);

  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedMenu) parts.push(selectedMenu);
    if (injectionMode) parts.push(injectionMode);
    if (!injectionMode && holdingMode) parts.push(holdingMode);
    if (!injectionMode && !holdingMode && dosingMode) parts.push(dosingMode);
    return parts.join(" · ");
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

  const [injMainForm, setInjMainForm] = useState({
    sprayPressureLimit: { value: "", unit: "" },
    increasedSpecificPointPrinter: { value: "", unit: "" },
  });
  const [injSwitchForm, setInjSwitchForm] = useState({
    transshipmentPosition: { value: "", unit: "" },
    switchOverTime: { value: "", unit: "" },
    switchingPressure: { value: "", unit: "" },
    switch_over_way: { value: "0" },
    switch_over_time: { value: "0" },
    switch_over_hydraulic: { value: "0" },
  });
  const [injGraphicValues, setInjGraphicValues] = useState<IndexValuePair[]>([
    { index: "1" },
  ]);
  const [doseMainForm, setDoseMainForm] = useState({
    dosingStroke: { value: "", unit: "" },
    dosingDelayTime: { value: "", unit: "" },
    relieveDosing: { value: "", unit: "" },
    relieveAfterDosing: { value: "", unit: "" },
    dischargeSpeedBeforeDosing: { value: "", unit: "" },
    dischargeSpeedAfterDosing: { value: "", unit: "" },
  });
  const [doseSpeedValues, setDoseSpeedValues] = useState<IndexValuePair[]>([
    { index: "1" },
  ]);
  const [dosePressureValues, setDosePressureValues] = useState<IndexValuePair[]>([
    { index: "1" },
  ]);
  const [holdMainForm, setHoldMainForm] = useState({
    holdingTime: { value: "", unit: "" },
    coolTime: { value: "", unit: "" },
    screwDiameter: { value: "", unit: "" },
  });
  const [holdGraphicValues, setHoldGraphicValues] = useState<IndexValuePair[]>([
    { index: "1" },
  ]);
  const [cylinderForm, setCylinderForm] = useState({
    setpoint1: { value: "", unit: "" },
    setpoint2: { value: "", unit: "" },
    setpoint3: { value: "", unit: "" },
    setpoint4: { value: "", unit: "" },
    setpoint5: { value: "", unit: "" },
  });

  // Parse OCR data once on mount (if provided via navigation)
  useEffect(() => {
    if (ocrApplied) return;
    if (!params.ocrData) return;
    try {
      const parsed = JSON.parse(String(params.ocrData)) as {
        bestFields?: OcrFieldResult[];
        ocrMap?: Record<string, string>;
      };
      if (parsed && parsed.bestFields && parsed.ocrMap) {
        setOcrSnapshot({
          bestFields: parsed.bestFields,
          ocrMap: parsed.ocrMap,
        });
      }
    } catch {
      // ignore parse errors
    }
  }, [params.ocrData, ocrApplied]);

  // Helper accessors for OCR snapshot
  const findField = (boxId: string): OcrFieldResult | undefined =>
    ocrSnapshot?.bestFields?.find((f) => f.box_id === boxId);

  const findFieldWithUnit = (boxId: string): { value: string, unit?: string } | undefined => {
    const f = findField(boxId);
    if (!f) return undefined;
    if (typeof f.value === "string") {
      return { value: f.value, unit: f.unit };
    }
    return undefined;
  };

  const getScrollbarValue = (boxId: string): ParsedScrollbarValue | undefined => {
    const f = findField(boxId);
    if (!f || f.type !== "scrollbar" || !f.value || typeof f.value === "string") return undefined;
    return f.value as ParsedScrollbarValue;
  };

  // Apply OCR snapshot to form states once (when available)
  useEffect(() => {
    if (ocrApplied || !ocrSnapshot) return;

    // Injection · Main Menu
    if (selectedMenu === "injection" && injectionMode === "mainMenu") {
      setInjMainForm((prev) => {
        const spray = findFieldWithUnit("spray_pessure_limit");
        const incCheckbox = findFieldWithUnit("increase_specific_point_printer_checkbox");
        return {
          sprayPressureLimit: spray ?? prev.sprayPressureLimit,
          increasedSpecificPointPrinter:
            incCheckbox?.value === "checked"
              ? { value: "1" }
              : incCheckbox?.value === "unchecked"
              ? { value: "0" }
              : prev.increasedSpecificPointPrinter,
        };
      });
    }

    // Injection · Sub Menu Graphic (scrollbar: v, v2)
    if (selectedMenu === "injection" && injectionMode === "subMenuGraphic") {
      const scroll = getScrollbarValue("injection_speed_items");
      setInjGraphicValues(buildRowsFromScrollbar(scroll));
    }

    // Injection · Switch Type
    if (selectedMenu === "injection" && injectionMode === "switchType") {
      setInjSwitchForm((prev) => {
        const transshipment = findFieldWithUnit("transshipment_position");
        const switchTime = findFieldWithUnit("switch_over_time");
        const switchingPressure = findFieldWithUnit("switching_pressure");
        const switchWay = findFieldWithUnit("transshipment_position_checkbox");
        const switchTimeCb = findFieldWithUnit("switch_over_time_checkbox");
        const switchHydraulic = findFieldWithUnit("switching_pressure_checkbox");
        
        const isWayActive = switchWay?.value === "checked";
        const isTimeActive = switchTimeCb?.value === "checked";
        const isHydraulicActive = switchHydraulic?.value === "checked";

        return {
          transshipmentPosition: transshipment ?? prev.transshipmentPosition,
          switchOverTime: switchTime ?? prev.switchOverTime,
          switchingPressure: switchingPressure ?? prev.switchingPressure,
          switch_over_way: { value: isWayActive ? "1" : "0" },
          switch_over_time: { value: isTimeActive ? "1" : "0" },
          switch_over_hydraulic: { value: isHydraulicActive ? "1" : "0" },
        };
      });
    }

    // Holding Pressure · Main Menu
    if (selectedMenu === "holdingPressure" && holdingMode === "mainMenu") {
      setHoldMainForm((prev) => {
        const holdingTime = findFieldWithUnit("holding_pressure_time");
        const coolTime = findFieldWithUnit("cooling_time");
        const screwDiameter = findFieldWithUnit("screw_diameter");
        return {
          holdingTime: holdingTime ?? prev.holdingTime,
          coolTime: coolTime ?? prev.coolTime,
          screwDiameter: screwDiameter ?? prev.screwDiameter,
        };
      });
    }

    // Holding Pressure · Sub Menu Graphic (scrollbar: t, p)
    if (selectedMenu === "holdingPressure" && holdingMode === "subMenuGraphic") {
      const scroll = getScrollbarValue("specific_back_pressure_items");
      setHoldGraphicValues(
        buildRowsFromScrollbar(scroll).map((row) => ({
          index: row.index,
          t: row.v,
          p: row.v2,
        })),
      );
    }

    // Dosing · Main Menu
    if (selectedMenu === "dosing" && dosingMode === "mainMenu") {
      setDoseMainForm((prev) => {
        const dosingStroke = findFieldWithUnit("dosing_stroke");
        const dosingDelayTime = findFieldWithUnit("dosing_delay_time");
        const relieveDosing = findFieldWithUnit("relieve_dosing");
        const relieveAfterDosing = findFieldWithUnit("relieve_after_dosing");
        const dischargeBefore = findFieldWithUnit("discharge_speed_before");
        const dischargeAfter = findFieldWithUnit("discharge_speed_after");
        return {
          dosingStroke: dosingStroke ?? prev.dosingStroke,
          dosingDelayTime: dosingDelayTime ?? prev.dosingDelayTime,
          relieveDosing: relieveDosing ?? prev.relieveDosing,
          relieveAfterDosing: relieveAfterDosing ?? prev.relieveAfterDosing,
          dischargeSpeedBeforeDosing:
            dischargeBefore ?? prev.dischargeSpeedBeforeDosing,
          dischargeSpeedAfterDosing:
            dischargeAfter ?? prev.dischargeSpeedAfterDosing,
        };
      });
    }

    // Dosing · Sub Menu Graphic
    if (selectedMenu === "dosing" && dosingMode === "subMenuGraphic") {
      const dosingSpeedScroll = getScrollbarValue("dosing_speed_items");
      const dosingPressureScroll = getScrollbarValue("specific_back_pressure_items");

      setDoseSpeedValues(buildRowsFromScrollbar(dosingSpeedScroll));
      setDosePressureValues(buildRowsFromScrollbar(dosingPressureScroll));
    }

    // Cylinder Heating · Main Menu
    if (selectedMenu === "cylinderHeating") {
      const raw =
        ocrSnapshot.ocrMap["cylinder_heating_items"] ??
        findFieldWithUnit("cylinder_heating_items")?.value;
      const nums = extractNumberStrings(raw, 5);
      const unit = findFieldWithUnit("cylinder_heating_items")?.unit;
      setCylinderForm((prev) => ({
        setpoint1: nums[0] ? { value: nums[0], unit } : prev.setpoint1,
        setpoint2: nums[1] ? { value: nums[1], unit } : prev.setpoint2,
        setpoint3: nums[2] ? { value: nums[2], unit } : prev.setpoint3,
        setpoint4: nums[3] ? { value: nums[3], unit } : prev.setpoint4,
        setpoint5: nums[4] ? { value: nums[4], unit } : prev.setpoint5,
      }));
    }

    setOcrApplied(true);
  }, [
    ocrSnapshot,
    ocrApplied,
    selectedMenu,
    injectionMode,
    holdingMode,
    dosingMode,
    findFieldWithUnit,
    getScrollbarValue,
  ]);

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
              value={injMainForm.sprayPressureLimit.value}
              onChangeText={(t) =>
                setInjMainForm({ ...injMainForm, sprayPressureLimit: { ...injMainForm.sprayPressureLimit, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Increased Specific Point Printer"
              value={injMainForm.increasedSpecificPointPrinter.value}
              onChangeText={(t) =>
                setInjMainForm({
                  ...injMainForm,
                  increasedSpecificPointPrinter: { ...injMainForm.increasedSpecificPointPrinter, value: t },
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
              value={injSwitchForm.transshipmentPosition.value}
              onChangeText={(t) =>
                setInjSwitchForm({ ...injSwitchForm, transshipmentPosition: { ...injSwitchForm.transshipmentPosition, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Switch Over Time"
              value={injSwitchForm.switchOverTime.value}
              onChangeText={(t) =>
                setInjSwitchForm({ ...injSwitchForm, switchOverTime: { ...injSwitchForm.switchOverTime, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Switching Pressure"
              value={injSwitchForm.switchingPressure.value}
              onChangeText={(t) =>
                setInjSwitchForm({ ...injSwitchForm, switchingPressure: { ...injSwitchForm.switchingPressure, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          
          <VStack className="gap-2 mt-2">
            <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
              Active Switch Over Mode
            </Heading>
            <HStack className="gap-2 flex-wrap">
              <Button
                size="sm"
                variant={injSwitchForm.switch_over_way.value === "1" ? "solid" : "outline"}
                action={injSwitchForm.switch_over_way.value === "1" ? "primary" : "secondary"}
                onPress={() => setInjSwitchForm(prev => ({
                  ...prev,
                  switch_over_way: { value: "1" },
                  switch_over_time: { value: "0" },
                  switch_over_hydraulic: { value: "0" }
                }))}
              >
                <ButtonText>Way</ButtonText>
              </Button>
              <Button
                size="sm"
                variant={injSwitchForm.switch_over_time.value === "1" ? "solid" : "outline"}
                action={injSwitchForm.switch_over_time.value === "1" ? "primary" : "secondary"}
                onPress={() => setInjSwitchForm(prev => ({
                  ...prev,
                  switch_over_way: { value: "0" },
                  switch_over_time: { value: "1" },
                  switch_over_hydraulic: { value: "0" }
                }))}
              >
                <ButtonText>Time</ButtonText>
              </Button>
              <Button
                size="sm"
                variant={injSwitchForm.switch_over_hydraulic.value === "1" ? "solid" : "outline"}
                action={injSwitchForm.switch_over_hydraulic.value === "1" ? "primary" : "secondary"}
                onPress={() => setInjSwitchForm(prev => ({
                  ...prev,
                  switch_over_way: { value: "0" },
                  switch_over_time: { value: "0" },
                  switch_over_hydraulic: { value: "1" }
                }))}
              >
                <ButtonText>Hydraulic</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </VStack>
      )}

      {selectedMenu === "holdingPressure" && holdingMode === "mainMenu" && (
        <VStack className="gap-4">
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Holding Time"
              value={holdMainForm.holdingTime.value}
              onChangeText={(t) =>
                setHoldMainForm({ ...holdMainForm, holdingTime: { ...holdMainForm.holdingTime, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Cool Time"
              value={holdMainForm.coolTime.value}
              onChangeText={(t) =>
                setHoldMainForm({ ...holdMainForm, coolTime: { ...holdMainForm.coolTime, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Screw Diameter"
              value={holdMainForm.screwDiameter.value}
              onChangeText={(t) =>
                setHoldMainForm({ ...holdMainForm, screwDiameter: { ...holdMainForm.screwDiameter, value: t } })
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
              value={doseMainForm.dosingStroke.value}
              onChangeText={(t) =>
                setDoseMainForm({ ...doseMainForm, dosingStroke: { ...doseMainForm.dosingStroke, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Dosing Delay Time"
              value={doseMainForm.dosingDelayTime.value}
              onChangeText={(t) =>
                setDoseMainForm({ ...doseMainForm, dosingDelayTime: { ...doseMainForm.dosingDelayTime, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Relieve Dosing"
              value={doseMainForm.relieveDosing.value}
              onChangeText={(t) =>
                setDoseMainForm({ ...doseMainForm, relieveDosing: { ...doseMainForm.relieveDosing, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Relieve After Dosing"
              value={doseMainForm.relieveAfterDosing.value}
              onChangeText={(t) =>
                setDoseMainForm({ ...doseMainForm, relieveAfterDosing: { ...doseMainForm.relieveAfterDosing, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Discharge Speed Before"
              value={doseMainForm.dischargeSpeedBeforeDosing.value}
              onChangeText={(t) =>
                setDoseMainForm({
                  ...doseMainForm,
                  dischargeSpeedBeforeDosing: { ...doseMainForm.dischargeSpeedBeforeDosing, value: t },
                })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Discharge Speed After"
              value={doseMainForm.dischargeSpeedAfterDosing.value}
              onChangeText={(t) =>
                setDoseMainForm({
                  ...doseMainForm,
                  dischargeSpeedAfterDosing: { ...doseMainForm.dischargeSpeedAfterDosing, value: t },
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
              value={cylinderForm.setpoint1.value}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint1: { ...cylinderForm.setpoint1, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 2"
              value={cylinderForm.setpoint2.value}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint2: { ...cylinderForm.setpoint2, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 3"
              value={cylinderForm.setpoint3.value}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint3: { ...cylinderForm.setpoint3, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 4"
              value={cylinderForm.setpoint4.value}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint4: { ...cylinderForm.setpoint4, value: t } })
              }
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
          </Input>
          <Input>
            <InputField
              keyboardType="numeric"
              placeholder="Setpoint 5"
              value={cylinderForm.setpoint5.value}
              onChangeText={(t) =>
                setCylinderForm({ ...cylinderForm, setpoint5: { ...cylinderForm.setpoint5, value: t } })
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
          <ButtonText>
            {t("cancel")}
          </ButtonText>
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
          <ButtonText className={isDark ? "text-typography-900" : undefined}>
            {t("create") || "Speichern"}
          </ButtonText>
        </Button>
      </HStack>
    </ScrollView>
  );
}
