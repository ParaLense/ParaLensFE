import { useSettings } from '@/src/contexts/SettingsContext';
import { useI18n } from '@/src/utils/i18n';
import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  const { t } = useI18n();
  const { theme } = useSettings();
  const isDark = theme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#000' : '#fff',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#4F8EF7',
        tabBarInactiveTintColor: isDark ? '#aaa' : '#888',
      }}
    >
      <Tabs.Screen
        name="history"
        options={{
          title: t('history'),
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size ?? 26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: t('camera'),
          tabBarIcon: ({ color, size }) => <Feather name="camera" size={size ?? 26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size ?? 26} color={color} />,
        }}
      />
    </Tabs>
  );
}



