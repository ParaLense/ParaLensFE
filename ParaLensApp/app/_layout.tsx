import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ApiProvider } from "@/features/api/api-context";
import { FullScanProvider } from "@/features/fullscan/fullscan-context";
import { SettingsProvider, useSettings } from "@/features/settings/settings-context";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

function AppContent() {
  const { theme } = useSettings();
  
  return (
    <GluestackUIProvider mode={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ApiProvider>
            <FullScanProvider>
              <AppContent />
            </FullScanProvider>
          </ApiProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
