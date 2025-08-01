import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import {AppNavigator} from "./Nagivation/AppNavigator.tsx";

export default function App() {
    const isDarkMode = useColorScheme() === 'dark';

    return (
        <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <AppNavigator />
        </NavigationContainer>
    );
}