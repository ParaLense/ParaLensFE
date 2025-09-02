import React, { createContext, useContext, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark';
type LanguageCode = 'en' | 'de';

interface SettingsContextValue {
  theme: ThemeMode;
  language: LanguageCode;
  setTheme: (mode: ThemeMode) => void;
  setLanguage: (lang: LanguageCode) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [language, setLanguage] = useState<LanguageCode>('de');

  const value = useMemo<SettingsContextValue>(() => ({ theme, language, setTheme, setLanguage }), [theme, language]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export type { ThemeMode, LanguageCode };


