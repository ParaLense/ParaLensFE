# Template Generator - Projektstruktur

```
template-gen/
│
├── main.py                 # Hauptanwendung mit GUI
├── requirements.txt        # Python Dependencies
│
├── modules/               # Core Module
│   ├── __init__.py
│   ├── screen_capture.py   # Screenshot & Fenster-Capture
│   ├── history_manager.py  # Projekt-Historie
│   ├── template_editor.py  # Box-Editor mit Drag & Drop
│   └── resolution_tester.py # Auflösungs-Tests
│
├── utils/                 # Hilfsfunktionen
│   ├── __init__.py
│   ├── json_handler.py    # JSON Import/Export
│   └── image_utils.py     # Bildverarbeitung
│
├── gui/                   # GUI Komponenten
│   ├── __init__.py
│   ├── history_screen.py  # Startseite/Historie
│   ├── drawing_screen.py  # Template Editor
│   └── testing_screen.py  # Resolution Testing
│
├── data/                  # Daten-Speicher
│   ├── templates/        # Gespeicherte Templates
│   ├── screenshots/      # Screenshots
│   └── projects/         # Projekt-Dateien
│
└── config/               # Konfiguration
    └── settings.json     # App-Einstellungen
```
