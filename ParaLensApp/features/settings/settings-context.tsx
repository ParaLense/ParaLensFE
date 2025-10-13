import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark";
type LanguageCode = "en" | "de";

interface SettingsContextValue {
  theme: ThemeMode;
  language: LanguageCode;
  setTheme: (mode: ThemeMode) => void;
  setLanguage: (lang: LanguageCode) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

const THEME_KEY = "settings.theme";
const LANGUAGE_KEY = "settings.language";

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [language, setLanguage] = useState<LanguageCode>("de");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedTheme, storedLanguage] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(LANGUAGE_KEY),
        ]);
        if (!mounted) return;
        if (storedTheme === "light" || storedTheme === "dark") {
          setTheme(storedTheme);
        }
        if (storedLanguage === "en" || storedLanguage === "de") {
          setLanguage(storedLanguage);
        }
      } catch (error) {
        console.warn("SettingsProvider hydration failed", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistTheme = async (mode: ThemeMode) => {
    setTheme(mode);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (error) {
      console.warn("SettingsProvider setTheme failed", error);
    }
  };

  const persistLanguage = async (lang: LanguageCode) => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    } catch (error) {
      console.warn("SettingsProvider setLanguage failed", error);
    }
  };

  const value = useMemo<SettingsContextValue>(
    () => ({
      theme,
      language,
      setTheme: persistTheme,
      setLanguage: persistLanguage,
    }),
    [theme, language],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
};

export type { ThemeMode, LanguageCode };


