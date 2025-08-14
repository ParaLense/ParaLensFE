import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from '@utils/errorBoundary';
import { AppNavigator } from "@/navigation/AppNavigator";
import { COLORS } from '@/constants';

export default function App() {
    const isDarkMode = useColorScheme() === 'dark';

    const theme = isDarkMode ? DarkTheme : DefaultTheme;

    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <NavigationContainer theme={theme}>
                        <StatusBar 
                            barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
                            backgroundColor={isDarkMode ? COLORS.background.dark : COLORS.background.light}
                        />
                        <AppNavigator />
                    </NavigationContainer>
                </GestureHandlerRootView>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}