import React, { useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { IndexValuePair } from "@/components/DynamicValueList";
import { useFullScan } from "@/features/fullscan/fullscan-context";
import { useSettings } from "@/features/settings/settings-context";
import { useI18n } from "@/features/settings/i18n";
import { VStack } from "@/components/ui/vstack";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import type { OcrFieldResult } from "@/features/ocr";
import {
  buildRowsFromScrollbar,
  extractNumberStrings,
  extractScrollbarUnits,
} from "@/features/scan-session/utils/scrollbar-utils";
import type {
  DosingMode,
  HoldingPressureMode,
  InjectionMode,
  OcrSnapshot,
  ScanMenu,
  InjectionMainFormState,
  InjectionSwitchTypeFormState,
  DosingMainFormState,
  HoldingMainFormState,
  CylinderHeatingFormState,
} from "@/features/scan-session/types/scan-session-types";
import {
  findFieldWithUnit,
  getScrollbarValue,
} from "@/features/scan-session/mappers/ocr-to-form-mapper";
import { InjectionMainMenuReview } from "@/features/scan-session/components/InjectionMainMenuReview";
import { InjectionSubMenuGraphicReview } from "@/features/scan-session/components/InjectionSubMenuGraphicReview";
import { InjectionSwitchTypeReview } from "@/features/scan-session/components/InjectionSwitchTypeReview";
import { HoldingMainMenuReview } from "@/features/scan-session/components/HoldingMainMenuReview";
import { HoldingSubMenuGraphicReview } from "@/features/scan-session/components/HoldingSubMenuGraphicReview";
import { DosingMainMenuReview } from "@/features/scan-session/components/DosingMainMenuReview";
import { DosingSubMenuGraphicReview } from "@/features/scan-session/components/DosingSubMenuGraphicReview";
import { CylinderHeatingReview } from "@/features/scan-session/components/CylinderHeatingReview";
import {
  mapInjectionMainMenu,
  mapInjectionSwitchType,
  mapHoldingMainMenu,
  mapDosingMainMenu,
  mapCylinderHeating,
} from "@/features/fullscan/form-to-dto";
import {
  BOX_ID_COOLING_TIME,
  BOX_ID_CYLINDER_HEATING_ITEMS,
  BOX_ID_DISCHARGE_SPEED_AFTER,
  BOX_ID_DISCHARGE_SPEED_BEFORE,
  BOX_ID_DOSING_DELAY_TIME,
  BOX_ID_DOSING_SPEED_ITEMS,
  BOX_ID_DOSING_STROKE,
  BOX_ID_HOLDING_PRESSURE_TIME,
  BOX_ID_INCREASE_SPECIFIC_POINT_PRINTER_CHECKBOX,
  BOX_ID_INJECTION_SPEED_ITEMS,
  BOX_ID_RELIEVE_AFTER_DOSING,
  BOX_ID_RELIEVE_DOSING,
  BOX_ID_SCREW_DIAMETER,
  BOX_ID_SPRAY_PRESSURE_LIMIT,
  BOX_ID_SPECIFIC_BACK_PRESSURE_ITEMS,
  BOX_ID_SWITCHING_PRESSURE,
  BOX_ID_SWITCHING_PRESSURE_CHECKBOX,
  BOX_ID_SWITCH_OVER_TIME,
  BOX_ID_SWITCH_OVER_TIME_CHECKBOX,
  BOX_ID_TRANSSHIPMENT_POSITION,
  BOX_ID_TRANSSHIPMENT_POSITION_CHECKBOX,
} from "@/features/ocr/constants/box-id-constants";

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
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);

  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedMenu) parts.push(t(selectedMenu));

    const selectedMode = injectionMode ?? holdingMode ?? dosingMode;
    if (selectedMode) parts.push(t(selectedMode));

    return parts.join(" · ");
  }, [selectedMenu, injectionMode, holdingMode, dosingMode, t]);

  const [injMainForm, setInjMainForm] = useState<InjectionMainFormState>({
    sprayPressureLimit: { value: "", unit: "" },
    increasedSpecificPointPrinter: { value: "", unit: "" },
  });
  const [injSwitchForm, setInjSwitchForm] =
    useState<InjectionSwitchTypeFormState>({
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
  const [injGraphicUnits, setInjGraphicUnits] = useState<{
    keyUnit?: string;
    valueUnit?: string;
  }>({});
  const [doseMainForm, setDoseMainForm] = useState<DosingMainFormState>({
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
  const [dosePressureValues, setDosePressureValues] = useState<
    IndexValuePair[]
  >([{ index: "1" }]);
  const [doseSpeedUnits, setDoseSpeedUnits] = useState<{
    keyUnit?: string;
    valueUnit?: string;
  }>({});
  const [dosePressureUnits, setDosePressureUnits] = useState<{
    keyUnit?: string;
    valueUnit?: string;
  }>({});
  const [holdMainForm, setHoldMainForm] = useState<HoldingMainFormState>({
    holdingTime: { value: "", unit: "" },
    coolTime: { value: "", unit: "" },
    screwDiameter: { value: "", unit: "" },
  });
  const [holdGraphicValues, setHoldGraphicValues] = useState<IndexValuePair[]>(
    [{ index: "1" }],
  );
  const [holdGraphicUnits, setHoldGraphicUnits] = useState<{
    keyUnit?: string;
    valueUnit?: string;
  }>({});
  const [cylinderForm, setCylinderForm] =
    useState<CylinderHeatingFormState>({
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
        unitConfig?: {
          system?: import('@/features/ocr').UnitSystem;
          mode?: import('@/features/ocr').ValueMode;
        };
        screenshotBase64?: string;
      };
      if (parsed && parsed.bestFields && parsed.ocrMap) {
        setOcrSnapshot({
          bestFields: parsed.bestFields,
          ocrMap: parsed.ocrMap,
          unitConfig: parsed.unitConfig,
        });
      }
      if (parsed?.screenshotBase64) {
        setScreenshotBase64(parsed.screenshotBase64);
      }
    } catch {
      // ignore parse errors
    }
  }, [params.ocrData, ocrApplied]);

  // Apply OCR snapshot to form states once (when available)
  useEffect(() => {
    if (ocrApplied || !ocrSnapshot) return;

    // Injection · Main Menu
    if (selectedMenu === "injection" && injectionMode === "mainMenu") {
      setInjMainForm((prev) => {
        const spray = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_SPRAY_PRESSURE_LIMIT,
        );
        const incCheckbox = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_INCREASE_SPECIFIC_POINT_PRINTER_CHECKBOX,
        );
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
      const scroll = getScrollbarValue(
        ocrSnapshot,
        BOX_ID_INJECTION_SPEED_ITEMS,
      );
      setInjGraphicValues(buildRowsFromScrollbar(scroll));
      setInjGraphicUnits(extractScrollbarUnits(scroll));
    }

    // Injection · Switch Type
    if (selectedMenu === "injection" && injectionMode === "switchType") {
      setInjSwitchForm((prev) => {
        const transshipment = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_TRANSSHIPMENT_POSITION,
        );
        const switchTime = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_SWITCH_OVER_TIME,
        );
        const switchingPressure = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_SWITCHING_PRESSURE,
        );
        const switchWay = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_TRANSSHIPMENT_POSITION_CHECKBOX,
        );
        const switchTimeCb = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_SWITCH_OVER_TIME_CHECKBOX,
        );
        const switchHydraulic = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_SWITCHING_PRESSURE_CHECKBOX,
        );

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
        const holdingTime = findFieldWithUnit(ocrSnapshot, BOX_ID_HOLDING_PRESSURE_TIME);
        const coolTime = findFieldWithUnit(ocrSnapshot, BOX_ID_COOLING_TIME);
        const screwDiameter = findFieldWithUnit(ocrSnapshot, BOX_ID_SCREW_DIAMETER);
        return {
          holdingTime: holdingTime ?? prev.holdingTime,
          coolTime: coolTime ?? prev.coolTime,
          screwDiameter: screwDiameter ?? prev.screwDiameter,
        };
      });
    }

    // Holding Pressure · Sub Menu Graphic (scrollbar: t, p)
    if (selectedMenu === "holdingPressure" && holdingMode === "subMenuGraphic") {
      const scroll = getScrollbarValue(
        ocrSnapshot,
        BOX_ID_SPECIFIC_BACK_PRESSURE_ITEMS,
      );
      setHoldGraphicValues(
        buildRowsFromScrollbar(scroll).map((row) => ({
          index: row.index,
          t: row.v,
          p: row.v2,
        })),
      );
      setHoldGraphicUnits(extractScrollbarUnits(scroll));
    }

    // Dosing · Main Menu
    if (selectedMenu === "dosing" && dosingMode === "mainMenu") {
      setDoseMainForm((prev) => {
        const dosingStroke = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_DOSING_STROKE,
        );
        const dosingDelayTime = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_DOSING_DELAY_TIME,
        );
        const relieveDosing = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_RELIEVE_DOSING,
        );
        const relieveAfterDosing = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_RELIEVE_AFTER_DOSING,
        );
        const dischargeBefore = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_DISCHARGE_SPEED_BEFORE,
        );
        const dischargeAfter = findFieldWithUnit(
          ocrSnapshot,
          BOX_ID_DISCHARGE_SPEED_AFTER,
        );
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
      const dosingSpeedScroll = getScrollbarValue(
        ocrSnapshot,
        BOX_ID_DOSING_SPEED_ITEMS,
      );
      const dosingPressureScroll = getScrollbarValue(
        ocrSnapshot,
        BOX_ID_SPECIFIC_BACK_PRESSURE_ITEMS,
      );

      setDoseSpeedValues(buildRowsFromScrollbar(dosingSpeedScroll));
      setDosePressureValues(buildRowsFromScrollbar(dosingPressureScroll));
      setDoseSpeedUnits(extractScrollbarUnits(dosingSpeedScroll));
      setDosePressureUnits(extractScrollbarUnits(dosingPressureScroll));
    }

    // Cylinder Heating · Main Menu
    if (selectedMenu === "cylinderHeating") {
      const raw =
        ocrSnapshot.ocrMap[BOX_ID_CYLINDER_HEATING_ITEMS] ??
        findFieldWithUnit(ocrSnapshot, BOX_ID_CYLINDER_HEATING_ITEMS)?.value;
      const nums = extractNumberStrings(raw, 5);
      const unit = findFieldWithUnit(
        ocrSnapshot,
        BOX_ID_CYLINDER_HEATING_ITEMS,
      )?.unit;
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
        {t("review")} · {headerLabel}
      </Heading>

      {selectedMenu === "injection" && injectionMode === "mainMenu" && (
        <InjectionMainMenuReview
          isDark={isDark}
          t={t}
          injMainForm={injMainForm}
          setInjMainForm={setInjMainForm}
        />
      )}

      {selectedMenu === "injection" && injectionMode === "subMenuGraphic" && (
        <InjectionSubMenuGraphicReview
          isDark={isDark}
          t={t}
          values={injGraphicValues}
          setValues={setInjGraphicValues}
          units={injGraphicUnits}
        />
      )}

      {selectedMenu === "injection" && injectionMode === "switchType" && (
        <InjectionSwitchTypeReview
          isDark={isDark}
          t={t}
          injSwitchForm={injSwitchForm}
          setInjSwitchForm={setInjSwitchForm}
        />
      )}

      {selectedMenu === "holdingPressure" && holdingMode === "mainMenu" && (
        <HoldingMainMenuReview
          isDark={isDark}
          t={t}
          holdMainForm={holdMainForm}
          setHoldMainForm={setHoldMainForm}
        />
      )}

      {selectedMenu === "holdingPressure" && holdingMode === "subMenuGraphic" && (
        <HoldingSubMenuGraphicReview
          isDark={isDark}
          t={t}
          values={holdGraphicValues}
          setValues={setHoldGraphicValues}
          units={holdGraphicUnits}
        />
      )}

      {selectedMenu === "dosing" && dosingMode === "mainMenu" && (
        <DosingMainMenuReview
          isDark={isDark}
          t={t}
          doseMainForm={doseMainForm}
          setDoseMainForm={setDoseMainForm}
        />
      )}

      {selectedMenu === "dosing" && dosingMode === "subMenuGraphic" && (
        <DosingSubMenuGraphicReview
          isDark={isDark}
          t={t}
          speedValues={doseSpeedValues}
          setSpeedValues={setDoseSpeedValues}
          pressureValues={dosePressureValues}
          setPressureValues={setDosePressureValues}
          speedUnits={doseSpeedUnits}
          pressureUnits={dosePressureUnits}
        />
      )}

      {selectedMenu === "cylinderHeating" && (
        <CylinderHeatingReview
          isDark={isDark}
          t={t}
          cylinderForm={cylinderForm}
          setCylinderForm={setCylinderForm}
        />
      )}

      <HStack className="gap-4 mt-6 items-center justify-between">
        <Button variant="outline" action="secondary" onPress={onBack}>
          <ButtonText>{t("cancel")}</ButtonText>
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
                payload = mapInjectionMainMenu(injMainForm);
              if (injectionMode === "subMenuGraphic")
                payload = {
                  subMenuValues: {
                    values: injGraphicValues,
                    keyUnit: injGraphicUnits.keyUnit,
                    valueUnit: injGraphicUnits.valueUnit,
                  },
                };
              if (injectionMode === "switchType")
                payload = mapInjectionSwitchType(injSwitchForm);
            } else if (selectedMenu === "holdingPressure") {
              if (holdingMode === "mainMenu")
                payload = mapHoldingMainMenu(holdMainForm);
              if (holdingMode === "subMenuGraphic")
                payload = {
                  subMenusValues: {
                    values: holdGraphicValues,
                    keyUnit: holdGraphicUnits.keyUnit,
                    valueUnit: holdGraphicUnits.valueUnit,
                  },
                };
            } else if (selectedMenu === "dosing") {
              if (dosingMode === "mainMenu")
                payload = mapDosingMainMenu(doseMainForm);
              if (dosingMode === "subMenuGraphic")
                payload = {
                  dosingSpeedsValues: {
                    values: doseSpeedValues,
                    keyUnit: doseSpeedUnits.keyUnit,
                    valueUnit: doseSpeedUnits.valueUnit,
                  },
                  dosingPressuresValues: {
                    values: dosePressureValues,
                    keyUnit: dosePressureUnits.keyUnit,
                    valueUnit: dosePressureUnits.valueUnit,
                  },
                };
            } else if (selectedMenu === "cylinderHeating") {
              payload = mapCylinderHeating(cylinderForm);
            }
            // Determine the sub-mode for screenshot keying
            let subMode: string | undefined;
            if (selectedMenu === "injection") subMode = injectionMode ?? undefined;
            else if (selectedMenu === "holdingPressure") subMode = holdingMode ?? undefined;
            else if (selectedMenu === "dosing") subMode = dosingMode ?? undefined;

            upsertSection(selectedFullScanId, selectedMenu, payload, screenshotBase64 ?? undefined, subMode);
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

