import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {AppNavigator} from "./Nagivation/AppNavigator.tsx";

export default function App() {
    const isDarkMode = useColorScheme() === 'dark';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <AppNavigator />
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}