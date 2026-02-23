import React from "react";
import { Modal as RNModal, Pressable } from "react-native";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Button } from "@/components/ui/button";
import type { FullScanDto } from "@/features/fullscan/types";

interface Props {
  visible: boolean;
  isDark: boolean;
  fullScans: FullScanDto[];
  selectedFullScanId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
  t: (key: string) => string | undefined;
}

const FullScanPickerModal: React.FC<Props> = ({
  visible,
  isDark,
  fullScans,
  selectedFullScanId,
  onSelect,
  onClose,
  t,
}) => {
  return (
    <RNModal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            borderRadius: 12,
            padding: 16,
            backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            minWidth: 280,
            maxWidth: 400,
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
                        onSelect(fs.id);
                        onClose();
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
                        className={isDark ? "text-typography-200" : "text-typography-600"}
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
              onPress={onClose}
            >
              <Text>{t("close") ?? "Schließen"}</Text>
            </Button>
          </HStack>
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

export default FullScanPickerModal;

