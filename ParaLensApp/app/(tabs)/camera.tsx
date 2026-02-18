import React, { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Modal as RNModal } from "react-native";

import UiScannerCamera from "@/components/UiScannerCamera";
import RootSelection from "@/components/camera/RootSelection";
import FullScanPickerModal from "@/components/camera/FullScanPickerModal";
import FullScanCreateModal from "@/components/camera/FullScanCreateModal";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
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
import type { ScanMenu } from "@/features/fullscan/types";
import { useScanSelection } from "@/features/camera/use-scan-selection";
import InjectionSelection from "@/components/camera/InjectionSelection";
import HoldingSelection from "@/components/camera/HoldingSelection";
import DosingSelection from "@/components/camera/DosingSelection";

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

  const {
    selectedMenu,
    injectionMode,
    holdingMode,
    dosingMode,
    ocrSnapshot,
    headerLabel,
    currentLayout,
    setSelectedMenu,
    setInjectionMode,
    setHoldingMode,
    setDosingMode,
    resetToRootMenu,
    setOcrSnapshot,
  } = useScanSelection();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [authorInput, setAuthorInput] = useState("");

  // Reference to get the latest screenshot on demand
  const getScreenshotRef = useRef<(() => string | null) | null>(null);

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

  const goReview = useCallback(() => {
    const params: Record<string, string> = {
      selectedMenu: selectedMenu ?? "",
      injectionMode: injectionMode ?? "",
      holdingMode: holdingMode ?? "",
      dosingMode: dosingMode ?? "",
    };

    if (ocrSnapshot && ocrSnapshot.bestFields.length > 0) {
      try {
        // Get the latest screenshot on demand (only when navigating)
        const screenshotBase64 = getScreenshotRef.current?.() ?? undefined;

        params.ocrData = JSON.stringify({
          bestFields: ocrSnapshot.bestFields,
          ocrMap: ocrSnapshot.ocrMap,
          unitConfig: ocrSnapshot.unitConfig,
          screenshotBase64,
        });
      } catch {
        // Ignore serialization errors and navigate without OCR data
      }
    }

    router.push({
      pathname: "/scan-review",
      params,
    });
  }, [selectedMenu, injectionMode, holdingMode, dosingMode, ocrSnapshot, router]);

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
      <>
        <RootSelection
          isDark={isDark}
          t={t}
          selectedLabel={selectedLabel}
          selectedFullScanId={selectedFullScanId}
          onOpenPicker={() => setIsPickerOpen(true)}
          onOpenCreate={() => setIsAddOpen(true)}
          onSelectMenu={setSelectedMenu}
          onResetModes={(menu) => {
            if (menu === "injection") setInjectionMode(null);
            if (menu === "holdingPressure") setHoldingMode(null);
            if (menu === "dosing") setDosingMode(null);
          }}
        />

        <FullScanPickerModal
          visible={isPickerOpen}
          isDark={isDark}
          fullScans={fullScans}
          selectedFullScanId={selectedFullScanId}
          onSelect={selectFullScan}
          onClose={() => setIsPickerOpen(false)}
          t={t}
        />

        <FullScanCreateModal
          visible={isAddOpen}
          isDark={isDark}
          authorInput={authorInput}
          onChangeAuthor={setAuthorInput}
          onCreate={(name) => createFullScan(name)}
          onClose={() => setIsAddOpen(false)}
          t={t}
        />
      </>
    );
  }

  if (selectedMenu === "injection" && injectionMode === null) {
    return (
      <InjectionSelection
        isDark={isDark}
        t={t}
        onPickMain={() => setInjectionMode("mainMenu")}
        onPickSubMenu={() => setInjectionMode("subMenuGraphic")}
        onPickSwitchType={() => setInjectionMode("switchType")}
        onBack={resetToRootMenu}
      />
    );
  }

  if (selectedMenu === "holdingPressure" && holdingMode === null) {
    return (
      <HoldingSelection
        isDark={isDark}
        t={t}
        onPickMain={() => setHoldingMode("mainMenu")}
        onPickSubMenu={() => setHoldingMode("subMenuGraphic")}
        onBack={resetToRootMenu}
      />
    );
  }

  if (selectedMenu === "dosing" && dosingMode === null) {
    return (
      <DosingSelection
        isDark={isDark}
        t={t}
        onPickMain={() => setDosingMode("mainMenu")}
        onPickSubMenu={() => setDosingMode("subMenuGraphic")}
        onBack={resetToRootMenu}
      />
    );
  }

  return (
    <Box style={{ flex: 1 }}>
      <UiScannerCamera
        currentLayout={currentLayout ?? TemplateLayout.ScreenDetection}
        style={{ flex: 1 }}
        isActive
        device={device}
        onOcrUpdate={(payload) => setOcrSnapshot({ ...payload, screenshotBase64: undefined })}
        onScreenshotReady={(getScreenshot) => { getScreenshotRef.current = getScreenshot; }}
        onScanComplete={goReview}
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
