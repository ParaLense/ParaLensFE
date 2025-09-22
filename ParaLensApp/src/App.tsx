import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ApiProvider } from "./contexts/ApiContext";
import {AppNavigator} from "./Nagivation/AppNavigator.tsx";
import { FullScanProvider } from './contexts/FullScanContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { GuideProvider } from './contexts/GuideContext';
import GuideOverlay from './Components/GuideOverlay';

const AppInner = () => {
    const { theme } = useSettings();
    const isDarkMode = theme === 'dark';
    return (
        <>
            <StatusBar 
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor="transparent"
                translucent={true}
            />
            <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#000' : '#fff' }}>
                <FullScanProvider>
                    <GuideProvider>
                        <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
                            <AppNavigator />
                        </NavigationContainer>
                        <GuideOverlay />
                    </GuideProvider>
                </FullScanProvider>
            </SafeAreaView>
        </>
    );
};

export default function App() {
    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SettingsProvider>
                    <ApiProvider>
                        <GluestackUIProvider config={config}>
                            <AppInner />
                        </GluestackUIProvider>
                    </ApiProvider>
                </SettingsProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
