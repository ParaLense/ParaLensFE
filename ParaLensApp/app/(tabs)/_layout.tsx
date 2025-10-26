import React from "react";
import { Tabs } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/features/settings/i18n";
import { useSettings } from "@/features/settings/settings-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();
  const isDark = theme === "dark";
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#4F8EF7",
        tabBarInactiveTintColor: isDark ? "#A0AEC0" : "#64748B",
        tabBarStyle: {
          backgroundColor: isDark ? "#000" : "#fff",
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
            history: "clock",
            camera: "camera",
            settings: "settings",
          };
          const iconName = iconMap[route.name] ?? "circle";
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="history" options={{ title: t("history"), href: "/(tabs)/history" }} />
      <Tabs.Screen name="camera" options={{ title: t("camera"), href: "/(tabs)/camera" }} />
      <Tabs.Screen name="settings" options={{ title: t("settings"), href: "/(tabs)/settings" }} />
    </Tabs>
  );
}

