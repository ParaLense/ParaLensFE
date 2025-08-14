import React, { memo } from "react";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import { useColorScheme } from "react-native";
import HistoryScreen from "@/screens/HistoryScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import CameraScreen from "@/screens/CameraScreen";
import { COLORS, SIZES } from '@/constants';

const Tab = createBottomTabNavigator();

export const AppNavigator = memo(() => {
    const isDarkMode = useColorScheme() === 'dark';

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light,
                    borderTopWidth: 0,
                    elevation: 10,
                    height: 60,
                },
                tabBarIcon: ({ focused, color }) => {
                    let iconName = '';
                    if (route.name === 'History') iconName = 'clock';
                    else if (route.name === 'Camera') iconName = 'camera';
                    else if (route.name === 'Settings') iconName = 'settings';
                    return <Icon name={iconName} size={SIZES.icon.large} color={focused ? COLORS.primary : color || COLORS.secondary} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: isDarkMode ? '#aaa' : COLORS.secondary,
            })}
        >
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Camera" component={CameraScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
});

AppNavigator.displayName = 'AppNavigator';