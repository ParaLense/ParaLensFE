import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ApiProvider } from "./contexts/ApiContext";
import {AppNavigator} from "./Nagivation/AppNavigator.tsx";

export default function App() {
    const isDarkMode = useColorScheme() === 'dark';

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <ApiProvider>
                    <GluestackUIProvider config={config}>
                        <StatusBar 
                            barStyle={isDarkMode ? "light-content" : "dark-content"}
                            backgroundColor="transparent"
                            translucent={true}
                        />
                        <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#000' : '#fff' }}>
                            <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
                                <AppNavigator />
                            </NavigationContainer>
                        </SafeAreaView>
                    </GluestackUIProvider>
                </ApiProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
