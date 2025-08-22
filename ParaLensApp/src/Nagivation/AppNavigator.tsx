import React from "react";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import { useColorScheme } from "react-native";
import { Box, HStack, Pressable } from '@gluestack-ui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HistoryScreen from "../Screens/HistoryScreen.tsx";
import SettingsScreen from "../Screens/SettingsScreen.tsx";
import CameraScreen from "../Screens/CameraScreen.tsx";

const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
    const isDarkMode = useColorScheme() === 'dark';
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{ 
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDarkMode ? '#000' : '#fff',
                    borderTopWidth: 0,
                    elevation: 10,
                    height: 60,
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingTop: 8,
                }
            }}
            tabBar={({ state, descriptors, navigation }) => (
                <Box 
                    bg={isDarkMode ? "$backgroundDark950" : "$backgroundLight0"} 
                    borderTopWidth={0} 
                    elevation={10} 
                    h={60}
                    pb={Math.max(insets.bottom, 8)}
                    pt={2}
                >
                    <HStack flex={1} alignItems="center" justifyContent="space-around">
                        {state.routes.map((route, index) => {
                            const { options } = descriptors[route.key];
                            const isFocused = state.index === index;
                            let iconName = '';
                            if (route.name === 'History') iconName = 'clock';
                            else if (route.name === 'Camera') iconName = 'camera';
                            else if (route.name === 'Settings') iconName = 'settings';

                            const onPress = () => {
                                const event = navigation.emit({
                                    type: 'tabPress',
                                    target: route.key,
                                    canPreventDefault: true,
                                });
                                if (!isFocused && !event.defaultPrevented) {
                                    navigation.navigate(route.name as never);
                                }
                            };

                            return (
                                <Pressable key={route.key} onPress={onPress}>
                                    <Box alignItems="center" justifyContent="center">
                                        <Icon name={iconName} size={26} color={isFocused ? '#4F8EF7' : (isDarkMode ? '#aaa' : '#888')} />
                                    </Box>
                                </Pressable>
                            );
                        })}
                    </HStack>
                </Box>
            )}>
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Camera" component={CameraScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};