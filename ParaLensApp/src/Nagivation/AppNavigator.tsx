import React from "react";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import { useColorScheme } from "react-native";
import HistoryScreen from "../Screens/HistoryScreen.tsx";
import SettingsScreen from "../Screens/SettingsScreen.tsx";
import CameraScreen from "../Screens/CameraScreen.tsx";

const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
    const isDarkMode = useColorScheme() === 'dark';

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: isDarkMode ? '#181818' : '#fff',
                    borderTopWidth: 0,
                    elevation: 10,
                    height: 60,
                },
                tabBarIcon: ({ focused, color }) => {
                    let iconName = '';
                    if (route.name === 'History') iconName = 'clock';
                    else if (route.name === 'Camera') iconName = 'camera';
                    else if (route.name === 'Settings') iconName = 'settings';
                    return <Icon name={iconName} size={28} color={focused ? '#4F8EF7' : color || '#888'} />;
                },
                tabBarActiveTintColor: '#4F8EF7',
                tabBarInactiveTintColor: isDarkMode ? '#aaa' : '#888',
            })}
        >
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Camera" component={CameraScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};