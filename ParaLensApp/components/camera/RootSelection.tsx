import React from "react";
import { Heading } from "@/components/ui/heading";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import type { ScanMenu } from "@/features/fullscan/types";

interface Props {
  isDark: boolean;
  t: (key: string) => string | undefined;
  selectedLabel: string;
  selectedFullScanId: number | null;
  onOpenPicker: () => void;
  onOpenCreate: () => void;
  onSelectMenu: (menu: ScanMenu) => void;
  onResetModes: (menu: ScanMenu) => void;
}

const RootSelection: React.FC<Props> = ({
  isDark,
  t,
  selectedLabel,
  selectedFullScanId,
  onOpenPicker,
  onOpenCreate,
  onSelectMenu,
  onResetModes,
}) => {
  return (
    <Box
      style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: isDark ? "#121212" : "#ffffff" }}
    >
      <Heading size="lg" className={`mb-6 text-center ${isDark ? "text-typography-50" : "text-typography-900"}`}>
        {t("whatToScan") ?? "Was möchten Sie scannen?"}
      </Heading>

      <VStack className="w-5/6 mb-6 gap-2">
        <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
          {t("selectFullScan") ?? "Full Scan wählen"}
        </Heading>
        <HStack className="gap-2" style={{ alignItems: "center" }}>
          <Button
            variant="outline"
            action="secondary"
            className="flex-1"
            onPress={onOpenPicker}
          >
            <Text numberOfLines={1}>{selectedLabel}</Text>
          </Button>
          <Button
            variant="solid"
            action="primary"
            onPress={onOpenCreate}
            style={{ backgroundColor: isDark ? "#ffffff" : "#000000" }}
          >
            <Text style={{ color: isDark ? "#000000" : "#ffffff", fontWeight: "bold" }}>+</Text>
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
            disabled={!selectedFullScanId}
            onPress={() => {
              onSelectMenu(menu);
              onResetModes(menu);
            }}
            style={{
              backgroundColor: !selectedFullScanId ? (isDark ? "#404040" : "#a3a3a3") : (isDark ? "#ffffff" : "#000000"),
            }}
          >
            <Text
              style={{
                color: !selectedFullScanId ? (isDark ? "#a3a3a3" : "#6b7280") : (isDark ? "#000000" : "#ffffff"),
                textTransform: "capitalize",
              }}
            >
              {t(menu)}
            </Text>
          </Button>
        ))}
      </VStack>
    </Box>
  );
};

export default RootSelection;

