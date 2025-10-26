import React, { useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useI18n } from "@/features/settings/i18n";
import { useSettings } from "@/features/settings/settings-context";

const LANG_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
];

export default function SettingsScreen() {
  const { theme, setTheme, language, setLanguage } = useSettings();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const [isLanguageSheetOpen, setLanguageSheetOpen] = useState(false);

  const currentLanguageLabel = useMemo(
    () =>
      LANG_OPTIONS.find((opt) => opt.value === language)?.label ?? language,
    [language]
  );

  return (
    <Box
      style={{ flex: 1, padding: 24 }}
      className={isDark ? "bg-backgroundDark950" : "bg-backgroundLight0"}
    >
      <Heading size="lg" className={`mb-6 ${isDark ? "text-typography-50" : "text-typography-900"}`}>
        {t("settings")}
      </Heading>

      <VStack className="gap-6">
        <VStack className="gap-4">
          <Text className={`font-bold ${isDark ? "text-typography-50" : "text-typography-900"}`}>
            {t("theme")}
          </Text>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Text className="text-typography-500">
              {theme === "dark" ? t("dark") : t("light")}
            </Text>
            <Switch
              value={theme === "dark"}
              onValueChange={(val) => setTheme(val ? "dark" : "light")}
            />
          </HStack>
        </VStack>

        <VStack className="gap-4">
          <Text className={`font-bold ${isDark ? "text-typography-50" : "text-typography-900"}`}>
            {t("language")}
          </Text>
          <Pressable
            onPress={() => setLanguageSheetOpen(true)}
            className={`flex-row items-center justify-between rounded border px-3 py-3 ${
              isDark ? "border-backgroundDark700" : "border-backgroundLight300"
            }`}
            style={{ gap: 12 }}
          >
            <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
              {currentLanguageLabel}
            </Text>
            <Feather
              name="chevron-down"
              size={18}
              color={isDark ? "#ffffff" : "#1f2937"}
            />
          </Pressable>
        </VStack>
      </VStack>

      <Modal
        visible={isLanguageSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageSheetOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setLanguageSheetOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: isDark ? "#111827" : "#ffffff",
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 32,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              gap: 12,
            }}
            onPress={(e) => {
              e.stopPropagation();
            }}
          >
            <Text
              className={
                isDark ? "text-typography-50 text-lg" : "text-typography-900 text-lg"
              }
            >
              {t("language")}
            </Text>
            {LANG_OPTIONS.map((option) => {
              const isSelected = option.value === language;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setLanguage(option.value as "en" | "de");
                    setLanguageSheetOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    className={
                      isDark
                        ? isSelected
                          ? "text-typography-0 font-semibold"
                          : "text-typography-200"
                        : isSelected
                        ? "text-typography-900 font-semibold"
                        : "text-typography-600"
                    }
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Feather
                      name="check"
                      size={18}
                      color={isDark ? "#22d3ee" : "#2563eb"}
                    />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
}

