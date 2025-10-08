import { ApiProvider } from "@/src/contexts/ApiContext";
import { FullScanProvider } from "@/src/contexts/FullScanContext";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import { config } from '@gluestack-ui/config';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SettingsProvider>
          <ApiProvider>
            <GluestackUIProvider config={config}>
              <FullScanProvider>
                <StatusBar style="auto" />
                <Slot />
              </FullScanProvider>
            </GluestackUIProvider>
          </ApiProvider>
        </SettingsProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
