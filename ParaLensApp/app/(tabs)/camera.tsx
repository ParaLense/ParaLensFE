import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Modal as RNModal } from "react-native";

import UiScannerCamera from "@/components/UiScannerCamera";
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

  const goReview = () => {
    router.push({
      pathname: "/scan-review",
      params: {
        selectedMenu: selectedMenu ?? "",
        injectionMode: injectionMode ?? "",
        holdingMode: holdingMode ?? "",
        dosingMode: dosingMode ?? "",
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
          <HStack className="gap-4">
            <Button variant="outline" action="secondary" onPress={goReview}>
              <Text>{t("continue") ?? "Continue"}</Text>
            </Button>
          </HStack>
        </Box>
      )}
    </Box>
  );
}

