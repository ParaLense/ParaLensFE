import { useMemo } from "react";

import { useSettings } from "./settings-context";

type Dictionary = Record<string, Record<string, string>>;

const DICT: Dictionary = {
  en: {
    settings: "Settings",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    language: "Language",
    german: "German",
    english: "English",
    history: "History",
    camera: "Camera",
    details: "Details",
    fullScanDetails: "Full Scan Details",
    noSelection: "No selection",
    author: "Author",
    date: "Date",
    savedSections: "Saved Sections",
    notAvailable: "Not available",
    loadingCamera: "Loading camera...",
    foundCameras: "Found cameras:",
    noCameras: "No cameras found.",
    unknown: "Unknown",
    whatToScan: "What do you want to scan?",
    selectFullScan: "Select Full Scan",
    chooseFullScan: "Choose Full Scan",
    noFullScans: "No Full Scans available",
    close: "Close",
    createNewFullScan: "Create new Full Scan",
    cancel: "Cancel",
    create: "Create",
    change: "Change",
    continue: "Continue",
  },
  de: {
    settings: "Einstellungen",
    theme: "Theme",
    light: "Hell",
    dark: "Dunkel",
    language: "Sprache",
    german: "Deutsch",
    english: "Englisch",
    history: "Verlauf",
    camera: "Kamera",
    details: "Details",
    fullScanDetails: "Full Scan Details",
    noSelection: "Keine Auswahl",
    author: "Autor",
    date: "Datum",
    savedSections: "Gespeicherte Bereiche",
    notAvailable: "Nicht vorhanden",
    loadingCamera: "Kamera wird geladen...",
    foundCameras: "Gefundene Kameras:",
    noCameras: "Keine Kameras gefunden.",
    unknown: "Unbekannt",
    whatToScan: "Was möchten Sie scannen?",
    selectFullScan: "Full Scan wählen",
    chooseFullScan: "Full Scan auswählen",
    noFullScans: "Keine Full Scans vorhanden",
    close: "Schließen",
    createNewFullScan: "Neuen Full Scan erstellen",
    cancel: "Abbrechen",
    create: "Erstellen",
    change: "Ändern",
    continue: "Weiter",
  },
};

export const useI18n = () => {
  const { language } = useSettings();
  const t = useMemo(() => {
    return (key: string): string => {
      const table = DICT[language] || DICT.en;
      return table[key] || key;
    };
  }, [language]);
  return { t };
};


