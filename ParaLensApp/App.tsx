import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import HistoryScreen from './HistoryScreen';
import CameraScreen from './CameraScreen';
import SettingsScreen from './SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
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
            // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ focused, color}) => {
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
    </NavigationContainer>
  );
}
