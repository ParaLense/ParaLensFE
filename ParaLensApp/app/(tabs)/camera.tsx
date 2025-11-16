import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Modal as RNModal } from "react-native";

import UiScannerCamera, { CurrentScanSummary } from "@/components/UiScannerCamera";
import { IndexValuePair } from "@/components/DynamicValueList";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useFullScan } from "@/features/fullscan/fullscan-context";
import { TemplateLayout } from "@/features/templates/use-template-layout";
import { useI18n } from "@/features/settings/i18n";
import { useSettings } from "@/features/settings/settings-context";
import { useCameraDevice, useCameraDevices, type CameraDevice } from "react-native-vision-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScanMenu = "injection" | "dosing" | "holdingPressure" | "cylinderHeating";
type InjectionMode = "mainMenu" | "subMenuGraphic" | "switchType" | null;
type HoldingPressureMode = "mainMenu" | "subMenuGraphic" | null;
type DosingMode = "mainMenu" | "subMenuGraphic" | null;

export default function CameraScreen() {
  const { theme } = useSettings();
  const isDark = theme === "dark";
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const devices = useCameraDevices();
  const device = useCameraDevice("back");

  const { fullScans, selectedFullScanId, selectFullScan, createFullScan } =
    useFullScan();

  const [selectedMenu, setSelectedMenu] = useState<ScanMenu | null>(null);
  const [injectionMode, setInjectionMode] = useState<InjectionMode>(null);
  const [holdingMode, setHoldingMode] = useState<HoldingPressureMode>(null);
  const [dosingMode, setDosingMode] = useState<DosingMode>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [authorInput, setAuthorInput] = useState("");
  const [scanSummary, setScanSummary] = useState<CurrentScanSummary | null>(null);

  const selectedLabel = useMemo(() => {
    if (!selectedFullScanId) {
      return fullScans.length
        ? t("selectFullScan") ?? "Full Scan auswählen"
        : t("noFullScans") ?? "Kein Full Scan vorhanden";
    }
    const fs = fullScans.find((f) => f.id === selectedFullScanId);
    return fs
      ? `${fs.author || t("unknown") || "Unbekannt"} · ${new Date(
          fs.date,
        ).toLocaleString()}`
      : t("selectFullScan") ?? "Full Scan auswählen";
  }, [fullScans, selectedFullScanId, t]);

  const headerLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedMenu) parts.push(selectedMenu);
    if (injectionMode) parts.push(injectionMode);
    if (!injectionMode && holdingMode) parts.push(holdingMode);
    if (!injectionMode && !holdingMode && dosingMode) parts.push(dosingMode);
    return parts.join(" · ");
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

  const currentLayout: TemplateLayout | null = useMemo(() => {
    if (!selectedMenu) return null;
    if (selectedMenu === "injection") {
      if (injectionMode === "subMenuGraphic")
        return TemplateLayout.InjectionSpeed_ScrollBar;
      if (injectionMode === "switchType")
        return TemplateLayout.Injection_SwitchType;
      return TemplateLayout.Injection;
    }
    if (selectedMenu === "holdingPressure") {
      if (holdingMode === "subMenuGraphic")
        return TemplateLayout.HoldingPressure_ScrollBar;
      return TemplateLayout.HoldingPressure;
    }
    if (selectedMenu === "dosing") {
      if (dosingMode === "subMenuGraphic")
        return TemplateLayout.Dosing_ScrollBar;
      return TemplateLayout.Dosing;
    }
    if (selectedMenu === "cylinderHeating") {
      return TemplateLayout.CylinderHeating;
    }
    return null;
  }, [selectedMenu, injectionMode, holdingMode, dosingMode]);

  const resetToRootMenu = () => {
    setSelectedMenu(null);
    setInjectionMode(null);
    setHoldingMode(null);
    setDosingMode(null);
  };

  const buildOcrPrefill = () => {
    if (!scanSummary) return null;
    const byId = scanSummary.byFieldId;
    const getVal = (id: string): string =>
      byId[id]?.value ?? "";

    const mapCheckbox = (raw: string): string => {
      const n = raw.toLowerCase().trim();
      if (n === "true") return "1";
      if (n === "false") return "0";
      return raw;
    };

    const buildPairs = (value: string | undefined) => {
      if (!value) return [{ index: "1" }];
      const parts = value
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const rows: IndexValuePair[] = parts.map((item, idx) => {
        const [kPart, ...rest] = item.split(":");
        const k = (kPart || "").trim();
        const v = rest.join(":").trim();
        return { index: String(idx + 1), v: k, v2: v };
      });
      return rows.length ? rows : [{ index: "1" }];
    };

    // For holding-pressure scrollbar (t, p) we map to (t, p) instead of (v, v2)
    const buildPairsTP = (value: string | undefined) => {
      if (!value) return [{ index: "1" }];
      const parts = value
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const rows: IndexValuePair[] = parts.map((item, idx) => {
        const [kPart, ...rest] = item.split(":");
        const k = (kPart || "").trim();
        const v = rest.join(":").trim();
        return { index: String(idx + 1), t: k, p: v };
      });
      return rows.length ? rows : [{ index: "1" }];
    };

    const payload: any = {};

    if (selectedMenu === "injection") {
      payload.injection = {};
      if (injectionMode === "mainMenu") {
        payload.injection.mainMenu = {
          sprayPressureLimit: getVal("spray_pessure_limit"),
          increasedSpecificPointPrinter: mapCheckbox(
            getVal("increase_specific_point_printer_checkbox"),
          ),
        };
      } else if (injectionMode === "subMenuGraphic") {
        payload.injection.subMenuGraphic = {
          values: buildPairs(getVal("injection_speed_items")),
        };
      } else if (injectionMode === "switchType") {
        payload.injection.switchType = {
          transshipmentPosition: getVal("transshipment_position"),
          switchOverTime: getVal("switch_over_time"),
          switchingPressure: getVal("switching_pressure"),
        };
      }
    } else if (selectedMenu === "holdingPressure") {
      payload.holdingPressure = {};
      if (holdingMode === "mainMenu") {
        payload.holdingPressure.mainMenu = {
          holdingTime: getVal("holding_pressure_time"),
          coolTime: getVal("cooling_time"),
          screwDiameter: getVal("screw_diameter"),
        };
      } else if (holdingMode === "subMenuGraphic") {
        payload.holdingPressure.subMenuGraphic = {
          values: buildPairsTP(getVal("specific_back_pressure_items")),
        };
      }
    } else if (selectedMenu === "dosing") {
      payload.dosing = {};
      if (dosingMode === "mainMenu") {
        payload.dosing.mainMenu = {
          dosingStroke: getVal("dosing_stroke"),
          dosingDelayTime: getVal("dosing_delay_time"),
          relieveDosing: getVal("relieve_dosing"),
          relieveAfterDosing: getVal("relieve_after_dosing"),
          dischargeSpeedBeforeDosing: getVal("discharge_speed_before"),
          dischargeSpeedAfterDosing: getVal("discharge_speed_after"),
        };
      } else if (dosingMode === "subMenuGraphic") {
        payload.dosing.subMenuGraphic = {
          dosingSpeedsValues: buildPairs(getVal("dosing_speed_items")),
          dosingPressuresValues: buildPairs(
            getVal("specific_back_pressure_items"),
          ),
        };
      }
    } else if (selectedMenu === "cylinderHeating") {
      const raw = getVal("cylinder_heating_items");
      if (raw) {
        const parts = raw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        payload.cylinderHeating = {
          setpoint1: parts[0] ?? "",
          setpoint2: parts[1] ?? "",
          setpoint3: parts[2] ?? "",
          setpoint4: parts[3] ?? "",
          setpoint5: parts[4] ?? "",
        };
      }
    }

    return payload;
  };

  const goReview = () => {
    console.log("goReview", scanSummary);
    const ocrPrefill = buildOcrPrefill();
    router.push({
      pathname: "/scan-review",
      params: {
        selectedMenu: selectedMenu ?? "",
        injectionMode: injectionMode ?? "",
        holdingMode: holdingMode ?? "",
        dosingMode: dosingMode ?? "",
        ocrPrefill: ocrPrefill ? JSON.stringify(ocrPrefill) : "",
      },
    });
  };

  if (!device) {
    return (
      <Box
        style={{ 
          flex: 1, 
          padding: 24, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: isDark ? '#121212' : '#ffffff'
        }}
      >
        <Text className={`text-lg mb-4 ${isDark ? "text-typography-50" : "text-typography-900"}`}>
          {t("loadingCamera") ?? "Loading camera..."}
        </Text>
        <Text className={`text-lg ${isDark ? "text-typography-50" : "text-typography-900"}`}>
          {t("foundCameras") ?? "Gefundene Kameras:"}
        </Text>
        <FlatList
          data={Object.entries(devices)}
          keyExtractor={(item) => item[0]}
          renderItem={({ item }: {item: [string, CameraDevice]}) => (
            <Text className={`text-lg mt-2 ${isDark ? "text-typography-200" : "text-typography-700"}`}>
              {item[0]}: {item[1]?.name ?? t("unknown") ?? "Unbekannt"} (
              {item[1]?.position ?? "unknown"})
            </Text>
          )}
        />
      </Box>
    );
  }

  if (!selectedMenu) {
    return (
      <Box
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 24,
          backgroundColor: isDark ? '#121212' : '#ffffff'
        }}
      >
        <Heading size="lg" className={`mb-6 text-center ${isDark ? "text-typography-50" : "text-typography-900"}`}>
          {t("whatToScan") ?? "Was möchten Sie scannen?"}
        </Heading>

        <VStack className="w-5/6 mb-6 gap-2">
          <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
            {t("selectFullScan") ?? "Full Scan wählen"}
          </Heading>
          <HStack className="gap-2" style={{ alignItems: 'center' }}>
            <Button
              variant="outline"
              action="secondary"
              className="flex-1"
              onPress={() => setIsPickerOpen(true)}
            >
              <Text numberOfLines={1}>{selectedLabel}</Text>
            </Button>
            <Button
              variant="solid"
              action="primary"
              onPress={() => setIsAddOpen(true)}
              style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
            >
              <Text style={{ color: isDark ? '#000000' : '#ffffff', fontWeight: 'bold' }}>+</Text>
            </Button>
          </HStack>
        </VStack>

        <VStack className="w-5/6 gap-4">
          {([
            "injection",
            "dosing",
            "holdingPressure",
            "cylinderHeating",
          ] as ScanMenu[]).map((menu) => (
            <Button
              key={menu}
              action="primary"
              variant="solid"
              onPress={() => {
                setSelectedMenu(menu);
                if (menu === "injection") setInjectionMode(null);
                if (menu === "holdingPressure") setHoldingMode(null);
                if (menu === "dosing") setDosingMode(null);
              }}
              style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
            >
              <Text style={{ color: isDark ? '#000000' : '#ffffff', textTransform: 'capitalize' }}>{menu}</Text>
            </Button>
          ))}
        </VStack>

        <RNModal
          
          visible={isPickerOpen}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setIsPickerOpen(false)}
        >
          <Pressable
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 }}
            
            onPress={() => setIsPickerOpen(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ 
                borderRadius: 12, 
                padding: 16,
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
                minWidth: 280,
                maxWidth: 400
              }}
            >
              <Heading size="md" className={isDark ? "text-typography-50" : "text-typography-900"}>
                {t("chooseFullScan") ?? "Full Scan auswählen"}
              </Heading>
              <Box className="mt-4">
                {fullScans.length === 0 ? (
                  <Text className={isDark ? "text-typography-200" : "text-typography-600"}>
                    {t("noFullScans") ?? "Keine Full Scans vorhanden"}
                  </Text>
                ) : (
                  <VStack className="gap-3">
                    {fullScans.map((fs) => {
                      const isSelected = selectedFullScanId === fs.id;
                      return (
                        <Pressable
                          key={fs.id}
                          className={`rounded-lg border px-3 py-2 ${
                            isSelected
                              ? "border-primary-500 bg-primary-500/10"
                              : isDark
                              ? "border-backgroundDark700"
                              : "border-backgroundLight300"
                          }`}
                          onPress={() => {
                            selectFullScan(fs.id);
                            setIsPickerOpen(false);
                          }}
                        >
                          <Text
                            className={
                              isDark
                                ? "text-typography-50 font-semibold"
                                : "text-typography-900 font-semibold"
                            }
                          >
                            {fs.author || t("unknown") || "Unbekannt"}
                          </Text>
                          <Text
                            className={
                              isDark ? "text-typography-200" : "text-typography-600"
                            }
                          >
                            {new Date(fs.date).toLocaleString()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </VStack>
                )}
              </Box>
              <HStack className="mt-6 justify-end">
                <Button
                  variant="outline"
                  action="secondary"
                  onPress={() => setIsPickerOpen(false)}
                >
                  <Text>{t("close") ?? "Schließen"}</Text>
                </Button>
              </HStack>
            </Pressable>
          </Pressable>
        </RNModal>

        <RNModal
          transparent
          visible={isAddOpen}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setIsAddOpen(false)}
        >
          <Pressable
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 }}
            onPress={() => {
              setIsAddOpen(false);
              setAuthorInput("");
            }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ 
                borderRadius: 12, 
                padding: 16,
                backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
                minWidth: 280,
                maxWidth: 400
              }}
            >
              <Heading size="md" className={isDark ? "text-typography-50" : "text-typography-900"}>
                {t("createNewFullScan") ?? "Neuen Full Scan erstellen"}
              </Heading>
              <Box className="mt-4">
                <Input>
                  <InputField
                    value={authorInput}
                    onChangeText={setAuthorInput}
                    placeholder={t("author") ?? "Autor"}
                  />
                </Input>
              </Box>
              <HStack className="mt-6 gap-3 justify-end">
                <Button
                  variant="outline"
                  action="secondary"
                  onPress={() => {
                    setIsAddOpen(false);
                    setAuthorInput("");
                  }}
                >
                  <Text>{t("cancel") ?? "Abbrechen"}</Text>
                </Button>
                <Button
                  onPress={() => {
                    const name = authorInput.trim() || "Unbekannt";
                    createFullScan(name);
                    setIsAddOpen(false);
                    setAuthorInput("");
                  }}
                >
                  <Text className="text-typography-0">{t("create") ?? "Erstellen"}</Text>
                </Button>
              </HStack>
            </Pressable>
          </Pressable>
        </RNModal>
      </Box>
    );
  }

  if (selectedMenu === "injection" && injectionMode === null) {
    return (
      <Box
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 24,
          backgroundColor: isDark ? '#121212' : '#ffffff'
        }}
      >
        <Heading size="lg" className="mb-6" style={{ color: isDark ? '#ffffff' : '#000000' }}>
          Injection · Auswahl
        </Heading>
        <VStack className="w-5/6 gap-4">
          <Button 
            onPress={() => setInjectionMode("mainMenu")}
            style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
          >
            <Text style={{ color: isDark ? '#000000' : '#ffffff' }}>Main Menu</Text>
          </Button>
          <Button 
            onPress={() => setInjectionMode("subMenuGraphic")}
            style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
          >
            <Text style={{ color: isDark ? '#000000' : '#ffffff' }}>Sub Menu Graphic</Text>
          </Button>
          <Button 
            onPress={() => setInjectionMode("switchType")}
            style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
          >
            <Text style={{ color: isDark ? '#000000' : '#ffffff' }}>Switch Type</Text>
          </Button>
        </VStack>
        <Button
          variant="outline"
          action="secondary"
          className="mt-8"
          onPress={resetToRootMenu}
        >
          <Text>{t("cancel") ?? "Zurück"}</Text>
        </Button>
      </Box>
    );
  }

  if (selectedMenu === "holdingPressure" && holdingMode === null) {
    return (
      <Box
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 24,
          backgroundColor: isDark ? '#121212' : '#ffffff'
        }}
      >
        <Heading size="lg" className="mb-6" style={{ color: isDark ? '#ffffff' : '#000000' }}>
          Nachdruck · Auswahl
        </Heading>
        <VStack className="w-5/6 gap-4">
          <Button 
            onPress={() => setHoldingMode("mainMenu")}
            style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
          >
            <Text style={{ color: isDark ? '#000000' : '#ffffff' }}>Main Menu</Text>
          </Button>
          <Button 
            onPress={() => setHoldingMode("subMenuGraphic")}
            style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
          >
            <Text style={{ color: isDark ? '#000000' : '#ffffff' }}>Sub Menu Graphic</Text>
          </Button>
        </VStack>
        <Button
          variant="outline"
          action="secondary"
          className="mt-8"
          onPress={resetToRootMenu}
        >
          <Text>{t("cancel") ?? "Zurück"}</Text>
        </Button>
      </Box>
    );
  }

  if (selectedMenu === "dosing" && dosingMode === null) {
    return (
      <Box
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 24,
          backgroundColor: isDark ? '#121212' : '#ffffff'
        }}
      >
        <Heading size="lg" className="mb-6" style={{ color: isDark ? '#ffffff' : '#000000' }}>
          Dosing · Auswahl
        </Heading>
        <VStack className="w-5/6 gap-4">
          <Button 
            onPress={() => setDosingMode("mainMenu")}
            style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
          >
            <Text style={{ color: isDark ? '#000000' : '#ffffff' }}>Main Menu</Text>
          </Button>
          <Button 
            onPress={() => setDosingMode("subMenuGraphic")}
            style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
          >
            <Text style={{ color: isDark ? '#000000' : '#ffffff' }}>Sub Menu Graphic</Text>
          </Button>
        </VStack>
        <Button
          variant="outline"
          action="secondary"
          className="mt-8"
          onPress={resetToRootMenu}
        >
          <Text>{t("cancel") ?? "Zurück"}</Text>
        </Button>
      </Box>
    );
  }

  return (
    <Box style={{ flex: 1 }}>
      <UiScannerCamera
        currentLayout={currentLayout ?? TemplateLayout.ScreenDetection}
        style={{ flex: 1 }}
        isActive
        device={device}
        onScanSummaryChange={setScanSummary}
      />

      <Box
        style={{ position: 'absolute', top: 24 + insets.top, left: 20 }}
        className={`rounded px-3 py-2 ${isDark ? "bg-backgroundDark700" : "bg-backgroundLight700"}`}
      >
        <Button
          size="sm"
          variant="solid"
          action="primary"
          onPress={resetToRootMenu}
          style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
        >
          <Text style={{ color: isDark ? '#000000' : '#ffffff' }}>
            {headerLabel
              ? `${headerLabel} · ${t("change") ?? "Ändern"}`
              : t("change") ?? "Ändern"}
          </Text>
        </Button>
      </Box>

      {(injectionMode || holdingMode || dosingMode ||
        selectedMenu === "cylinderHeating") && (
        <Box style={{ position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' }}>
          <VStack className="gap-2 items-center">
            {scanSummary && (
              <Text className="text-typography-50 text-xs">
                {scanSummary.isComplete
                  ? "Scan finished (≥ 80% majority)"
                  : "Scan not stable yet"}
              </Text>
            )}
            <HStack className="gap-4">
              <Button variant="outline" action="secondary" onPress={goReview}>
                <Text>{t("continue") ?? "Continue"}</Text>
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}
    </Box>
  );
}

