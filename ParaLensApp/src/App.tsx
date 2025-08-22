import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {AppNavigator} from "./Nagivation/AppNavigator.tsx";
import { ApiProvider } from "./contexts/ApiContext";

export default function App() {
    const isDarkMode = useColorScheme() === 'dark';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ApiProvider>
                <GluestackUIProvider config={config}>
                    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
                        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                        <AppNavigator />
                    </NavigationContainer>
                </GluestackUIProvider>
            </ApiProvider>
        </GestureHandlerRootView>
    );
}