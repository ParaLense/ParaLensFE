import React from "react";
import { Modal as RNModal, Pressable } from "react-native";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import type { FullScanDto } from "@/features/fullscan/types";

interface Props {
  visible: boolean;
  isDark: boolean;
  authorInput: string;
  onChangeAuthor: (value: string) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
  t: (key: string) => string | undefined;
}

const FullScanCreateModal: React.FC<Props> = ({
  visible,
  isDark,
  authorInput,
  onChangeAuthor,
  onCreate,
  onClose,
  t,
}) => {
  return (
    <RNModal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 }}
        onPress={() => {
          onClose();
          onChangeAuthor("");
        }}
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
            {t("createNewFullScan") ?? "Neuen Full Scan erstellen"}
          </Heading>
          <Box className="mt-4">
            <Input>
              <InputField
                  className={isDark ? "text-typography-50" : "text-typography-900"}
                value={authorInput}
                onChangeText={onChangeAuthor}
                placeholder={t("author") ?? "Autor"}
              />
            </Input>
          </Box>
          <HStack className="mt-6 gap-3 justify-end">
            <Button
              variant="outline"
              action="secondary"
              onPress={() => {
                onClose();
                onChangeAuthor("");
              }}
            >
              <ButtonText>
                {t("cancel") ?? "Abbrechen"}
              </ButtonText>
            </Button>
            <Button
              onPress={() => {
                const name = authorInput.trim() || "Unbekannt";
                onCreate(name);
                onClose();
                onChangeAuthor("");
              }}
            >
              <ButtonText className={isDark ? "text-typography-900" : undefined}>
                {t("create") ?? "Erstellen"}
              </ButtonText>
            </Button>
          </HStack>
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

export default FullScanCreateModal;

