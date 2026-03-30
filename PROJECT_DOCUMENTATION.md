# ParaLens IM – Vollständige Projektdokumentation

> **Zweck:** Diese Datei dient als vollständige Wissensreferenz für das Projekt ParaLens IM. Sie beschreibt alle Komponenten, Algorithmen, Datenflüsse und Architekturentscheidungen, sodass ein neuer Leser (oder eine KI) das gesamte System verstehen kann, ohne den Quellcode durchlesen zu müssen.

---

## 1. Projektziel

**ParaLens IM** ist eine mobile App zur automatisierten Erfassung von Einstell- und Istwerten an Spritzgussmaschinen. Der Bediener fotografiert die Display-Bildschirmseiten der Maschinensteuerung mit dem Smartphone. Die App:

1. **Erkennt das Display** im Kamerabild (Computer Vision)
2. **Identifiziert die Bildschirmseite** anhand eines Template-Systems (sprachunabhängig)
3. **Liest die Zahlenwerte** per OCR ab
4. **Stabilisiert die Werte** über mehrere Frames per Majority Voting
5. **Exportiert die Daten** als Excel/PDF oder überträgt sie an ein Backend

Der Kooperationspartner ist **Meister-Quadrat Kunststoff- und Automatisierungstechnik GmbH**.

---

## 2. Tech-Stack

| Schicht | Technologie |
|---|---|
| **Framework** | React Native 0.81.4 via Expo SDK 54 |
| **Navigation** | Expo Router 6 (File-based Routing) |
| **UI** | GlueStack UI + NativeWind (TailwindCSS) |
| **Kamera** | react-native-vision-camera 4.7.2 |
| **Frame Processing** | react-native-worklets-core 1.6.2 (JSI Worklets) |
| **Computer Vision** | OpenCV 4 (Android, Kotlin, natives Plugin) |
| **OCR Engine** | Google ML Kit Text Recognition (Android) |
| **State** | React Context + Hooks + AsyncStorage |
| **Animations** | react-native-reanimated 4.1 |
| **Excel-Export** | ExcelJS 4.4 (clientseitig im App) |
| **Sprache (nativ)** | Kotlin (Android-Plugin) |
| **Sprache (App)** | TypeScript |
| **Build** | EAS Build (Expo Application Services) |
| **Backend (extern)** | ASP.NET Core REST-API (separates Repo) |

---

## 3. Projektstruktur

```
ParalensFE/
├── ParaLensApp/                    # Hauptanwendung
│   ├── app/                        # Expo Router Screens
│   │   ├── _layout.tsx             # Root-Layout (Provider-Hierarchie)
│   │   ├── index.tsx               # Startscreen → Redirect zu /camera
│   │   ├── scan-review.tsx         # Scan-Review-Screen
│   │   └── (tabs)/                 # Tab-Navigation
│   │       ├── _layout.tsx         # Tab-Bar-Konfiguration
│   │       ├── camera.tsx          # Kamera + Scan-Auswahl
│   │       ├── history.tsx         # Full-Scan-Verlauf
│   │       └── settings.tsx        # Einstellungen (Theme, Sprache)
│   ├── components/                 # UI-Komponenten
│   │   ├── UiScannerCamera.tsx     # Haupt-Kamera-Komponente mit Frame Processor
│   │   ├── TemplateOverlay.tsx     # Template-Boxen als Overlay
│   │   ├── DynamicValueList.tsx    # Dynamische Werteanzeige
│   │   ├── camera/                 # ScannerOverlays.tsx
│   │   └── ui/                     # GlueStack UI-Wrapper
│   ├── features/                   # Feature-Module (Bulletproof React)
│   │   ├── api/                    # Backend-Kommunikation
│   │   ├── camera/                 # Kamera-Logik (Geometrie, Permissions)
│   │   ├── fullscan/              # Full-Scan-Management + Excel-Export
│   │   ├── ocr/                    # OCR-Pipeline (Parsing, History, Aggregation)
│   │   ├── scan-session/          # Review-Komponenten + OCR→Form-Mapper
│   │   ├── settings/              # Theme, Sprache, i18n
│   │   ├── templates/             # Template-System (JSON + Loader)
│   │   └── utils/                 # Datum, Validierung
│   ├── libs/
│   │   └── vision-camera-screen-detector/  # Natives VisionCamera-Plugin
│   │       ├── src/index.tsx               # TS-API: performScan(), Typen
│   │       └── android/src/.../            # Kotlin: OpenCV + ML Kit
│   │           ├── ScreenFrameProcessorPlugin.kt  # Plugin-Entry (270 Z.)
│   │           ├── ScreenDetection.kt             # Display-Erkennung (465 Z.)
│   │           ├── ImageProcessing.kt             # Bildverarbeitung (651 Z.)
│   │           ├── OcrProcessor.kt                # OCR-Verarbeitung (281 Z.)
│   │           ├── Utils.kt                       # Hilfsfunktionen (138 Z.)
│   │           └── DebugHttpStreamer.kt            # HTTP-Debug-Bilder
│   └── config/api.ts              # API-Konfiguration
├── prototype/                      # Python-Prototypen (OpenCV-Vorentwicklung)
├── template-gen/                   # Python-GUI-Tool zur Template-Erstellung
├── data/                           # Projektdaten, Screenshots, Templates
└── test/                           # Testbilder
```

---

## 4. Architektur-Überblick

### 4.1 Provider-Hierarchie

```
SettingsProvider          (Theme + Sprache)
  └── ApiProvider         (Backend-Verbindung)
      └── FullScanProvider (Scan-Verwaltung + AsyncStorage)
          └── GlueStackProvider (UI-Theme)
              └── Tab-Navigation
                  ├── Camera-Tab
                  ├── History-Tab
                  └── Settings-Tab
```

### 4.2 Datenfluss (End-to-End)

```
Kamera-Frame (1280×720)
  ↓ useFrameProcessor (Worklet, ~10 FPS)
  ↓ performScan() → JSI-Bridge → Kotlin-Plugin
  ↓
  ├── [Native] Preprocessing (CLAHE, Rotation)
  ├── [Native] Edge Detection (2x Canny: Screen + Detail)
  ├── [Native] Konturdetektion → bestes 4-Eck finden
  ├── [Native] Homographie berechnen (RANSAC)
  ├── [Native] Perspektivkorrektur (Warp)
  ├── [Native] Template-Box-Matching (Edge/Corner/Gradient Score)
  ├── [Native] OCR via ML Kit auf gewarptem Bild
  ↓
  ↓ ScanResult { screen, ocr } → useRunOnJS → JS-Thread
  ↓
  ├── [JS] OCR-Boxen anreichern mit Template-Metadaten
  ├── [JS] addScanResult() → useOcrHistory
  │     ├── parseValueFromScan()      → Nummer + Einheit extrahieren
  │     ├── parseCheckboxFromScan()   → checked/unchecked
  │     ├── parseScrollbarFromScan()  → Key/Value-Paare parsen
  │     └── Field Aggregation aktualisieren
  ├── [JS] getBestFields() → Majority Voting pro Feld
  ├── [JS] Unit-System klassifizieren (ISO/Imperial, Absolut/Relativ)
  ↓
  ↓ onOcrUpdate → Camera-Screen → Scan-Review
  ↓
  ├── OCR→Form-Mapper → FullScan-DTO
  ├── upsertSection() → AsyncStorage
  ├── uploadScan() → REST-API
  └── Excel-Export → Datei teilen
```

---

## 5. Display-Erkennung (Computer Vision Pipeline)

### 5.1 Bildvorverarbeitung

**Datei:** `ImageProcessing.kt`

1. **Y-Plane zu Graustufen:** `yPlaneToGrayMat()` — Extrahiert die Y-Luminanz aus dem YUV-Kamerabild und erstellt ein OpenCV `Mat`-Objekt.
2. **90°-Rotation:** Optional, konfigurierbar via `rotate90CW`-Flag — nötig weil Android-Kamera-Frames in Landscape-Orientierung ankommen.
3. **CLAHE-Normalisierung:** `preprocessImage()` — Contrast Limited Adaptive Histogram Equalization mit ClipLimit=2.0 und TileGridSize=8×8. Gleicht lokale Helligkeitsunterschiede aus (Reflexionen auf Displays).

### 5.2 Zweistufige Kantendetektion

**Datei:** `ImageProcessing.createEdgeMaps()`

Es werden **zwei separate Canny-Edge-Maps** erstellt:

#### Screen Edges (Display-Umriss)
- GaussianBlur 5×5, σ=1.5 (stärkere Glättung)
- Dynamischer Threshold basierend auf Bildmittelwert: `lower = (1 - 0.33) × mean`, `upper = (1 + 0.33) × mean`
- Morphologisches Closing (3×3 Kernel) zum Verbinden von Lücken

#### Detail Edges (Template-Boxen)
- GaussianBlur 3×3, σ=1.0 (leichtere Glättung für feinere Details)
- `lower = max(20, mean × 0.3)`, `upper = min(200, mean × 0.9)`
- Keine morphologische Nachbearbeitung

### 5.3 ROI (Region of Interest)

**Datei:** `ScreenFrameProcessorPlugin.kt` + `Utils.kt`

Zwei verschachtelte ROIs begrenzen den Suchraum:
- **Outer ROI** (Standard: x=0.10, y=0.05, w=0.80, h=0.90): Das Display muss vollständig *innerhalb* dieses Bereichs liegen.
- **Inner ROI** (Standard: x=0.30, y=0.20, w=0.45, h=0.60): Das Display muss *größer* als dieser Bereich sein (Mindestgröße).

Die Funktion `rectWithinRoi()` prüft: Das erkannte Rechteck muss innerhalb des Outer ROI liegen UND den Inner ROI vollständig umschließen.

Ein **Mindest-Seitenverhältnis** (Standard 3:4) wird via `enforceMinAspect()` durchgesetzt.

### 5.4 Konturerkennung des Displays

**Datei:** `ScreenDetection.findBestScreenCandidate()`

1. `findContours()` auf den Screen Edges
2. Für jede Kontur: `approxPolyDP()` mit ε = 2% des Umfangs
3. Nur **4-Ecke** (Vierecke) werden akzeptiert
4. ROI-Check: Muss innerhalb Outer ROI liegen und größer als Inner ROI sein
5. Das **beste Quad** wird ausgewählt (größte Fläche, die den ROI-Test besteht)
6. Ecken werden via `orderQuad()` sortiert: Top-Left, Top-Right, Bottom-Right, Bottom-Left

### 5.5 Homographie-Berechnung

**Datei:** `ScreenDetection.buildScreenHomography()`

- **Source-Punkte:** Kanonische Template-Ecken `(0,0), (1200,0), (1200,1600), (0,1600)`
- **Ziel-Punkte:** Die 4 geordneten Ecken des erkannten Displays im Kamerabild
- **Methode:** `Calib3d.findHomography(src, dst, RANSAC, 3.0)` — RANSAC mit Reproj.-Threshold 3 Pixel
- Ergebnis: 3×3 Homographie-Matrix H, die Template-Koordinaten auf Bild-Koordinaten abbildet

### 5.6 Perspektivkorrektur (Warping)

```kotlin
val warped = Mat(outputH, outputW, CvType.CV_8UC1)
Imgproc.warpPerspective(img, warped, H.inv(), Size(outputW, outputH))
```

Die **inverse Homographie** H⁻¹ wird verwendet, um das Kamerabild in den kanonischen Template-Raum (1200×1600 Pixel) zu entzerren. Danach liegen alle Template-Boxen an ihren definierten Prozent-Positionen.

### 5.7 Template-Box-Matching (Warped-Space-Methode)

**Datei:** `ScreenDetection.matchTemplateBoxesInWarped()`

Dies ist die **verbesserte Methode** (statt der Legacy-IoU-Methode). Für jede Template-Box im gewarpten Bild:

1. **Box-Position berechnen:** Prozent-Koordinaten → Pixel im gewarpten Bild (+ 1% Padding)
2. **Canny Edge Detection** auf den ROI mit Padding
3. **Edge Score:** Border-Edge-Ratio (Kanten an den Box-Rändern) → 0..0.5
4. **Corner Score:** Harris Corner Detection an den 4 Box-Ecken → 0..0.3
5. **Gradient Score:** Sobel-Gradient an Top/Bottom-Rändern → 0 oder 0.2
6. **Gesamt-Score** = Edge + Corner + Gradient (Minimum: 0.4 für Match)

**Accuracy** = Anzahl gematchter Boxen / Gesamtanzahl Template-Boxen

**Detection-Kriterium:** Accuracy ≥ `accuracyThreshold` (Standard: 0.40 = 40% der Boxen müssen matchen)

### 5.8 Debug-Visualisierung

**Datei:** `DebugHttpStreamer.kt`

Ein HTTP-Server streamt Debug-Bilder als JPEG-Streams an einen Browser:
- `gray` — Graustufen-Eingabe
- `normalized` — CLAHE-normalisiert
- `screenEdges` / `detailEdges` — Kantenbilder
- `screenContourRects` / `detailContourRects` — Erkannte Rechtecke
- `templateBoxes` — Projizierte Template-Boxen
- `matchedBoxes` — Gematchte Boxen mit Scores
- `warped` — Entzerrtes Bild
- `overlay` — Kombinierte Visualisierung mit allen Elementen

---

## 6. VisionCamera Integration

### 6.1 Natives Plugin

**Datei:** `libs/vision-camera-screen-detector/`

Das Plugin ist als lokales npm-Paket implementiert (`"vision-camera-screen-detector": "file:./libs/vision-camera-screen-detector"`).

- **Registrierung:** `ScreenDetectorFrameProcessorPlugin` extends `FrameProcessorPlugin`
- **Entry:** `callback(frame, arguments)` — wird pro Frame aufgerufen
- Zugriff auf den nativen `Frame` → `Image` (Y-Plane)
- Ergebnis als `HashMap<String, Any?>` zurück an JS

### 6.2 JS/TS-Bridge

**Datei:** `libs/vision-camera-screen-detector/src/index.tsx`

- `performScan(frame, opts)` — Worklet-Funktion (markiert mit `'worklet'`)
- Serialisiert alle Optionen als JSI-kompatible primitive Werte
- Ruft `plugin.call(frame, args)` auf → Kotlin-Plugin
- Empfängt `ScanResult { screen: ScreenResult, ocr?: { boxes: [...] } }`

### 6.3 Frame Processor

**Datei:** `components/UiScannerCamera.tsx`

```typescript
const frameProcessor = useFrameProcessor(frame => {
  'worklet';
  const now = performance.now();
  if (now - lastFrameTime.value < FRAME_INTERVAL_MS) return; // ~10 FPS Throttle
  lastFrameTime.value = now;
  const scan = performScan(frame, { ... });
  if (scan?.screen) { setScreenResultJS(scan.screen); }
  if (scan?.ocr?.boxes?.length) { addScanResultJS(fullScanResult); }
}, []);
```

**Performance-Optimierungen:**
- FPS-Throttling auf 10 FPS (`FRAME_INTERVAL_MS = 100ms`)
- `useRunOnJS()` für Thread-Übergang Worklet → JS
- Stabile Referenzen via `useRef` für Callbacks
- Debug-Streams werden nur alle N Frames aktualisiert (3, 5, 7, 10)

### 6.4 Kamera-Geometrie

**Datei:** `features/camera/camera-geometry.ts`

- `computeFrameToViewTransform()` — Berechnet Skalierung + Offset von Frame-Koordinaten (z.B. 1920×1080) zu View-Koordinaten (Bildschirmgröße), mit "contain" Fitting
- `applyHomography()` — JS-seitige Homographie-Transformation (3×3 Matrix)
- `transformWarpedBoxToCameraFeed()` — Transformiert OCR-Box aus dem Warped-Space zurück in Kamera-Feed-Koordinaten
- `mapBoxToViewStyle()` / `mapWarpedBoxToViewStyle()` — Berechnet `{ left, top, width, height }` für Overlay-Positionierung

---

## 7. Template-System

### 7.1 Konzept

Jede Bildschirmseite der Spritzgussmaschine wird durch ein **JSON-Template** beschrieben. Die Erkennung ist **sprachunabhängig**, da sie auf **geometrischen Merkmalen** (Position und Größe von Rechtecken/Boxen) basiert, nicht auf Text.

### 7.2 Template-Typen (Enum `TemplateLayout`)

| Layout | Datei | Beschreibung |
|---|---|---|
| `ScreenDetection` | `0.12 Bildschirmaufbau_Screendetection.json` | ~30 Boxen für die Seitenidentifikation |
| `Injection` | `1. Einspritzen.json` | Einspritz-Hauptmenü (Value + Checkbox) |
| `InjectionSpeed_ScrollBar` | `1.1 Einspritzgeschwindigkeit_ScrollBar.json` | Einspritzgeschwindigkeit (Scrollbar + Start/End) |
| `Injection_SwitchType` | `1.2 Umschaltart_Switch.json` | Umschaltart (Checkboxen + Values) |
| `HoldingPressure` | `2. Nachdruck.json` | Nachdruck-Hauptmenü |
| `HoldingPressure_ScrollBar` | `2.1 Nachdruck_ScrollBar.json` | Nachdruck-Grafik (Scrollbar) |
| `Dosing` | `3. Dosieren.json` | Dosier-Hauptmenü |
| `Dosing_ScrollBar` | `3.1 Dosieren_ScrollBar.json` | Dosier-Grafik (Scrollbar) |
| `CylinderHeating` | `4. ZylinerHeizung.json` | Zylinderheizung |

### 7.3 Template-Box-Struktur (JSON)

```json
{
  "id": "spray_pessure_limit",
  "x": 73.65,           // X-Position in % des Display-Bereichs
  "y": 41.98,           // Y-Position in % des Display-Bereichs
  "width": 12.64,       // Breite in %
  "height": 2.75,       // Höhe in %
  "label": "Spray Pessure Limit",
  "type": "value",      // value | checkbox | scrollbar
  "expectedUnits": {    // Erwartete Einheiten pro Einheitensystem
    "iso": { "absolute": "bar", "relative": "%" },
    "imperial": { "absolute": "psi", "relative": "%" }
  },
  "sameUnitAs": "...",  // Verweis auf eine andere Box für gemeinsame Einheit
  "options": { ... }    // Typ-spezifische Optionen
}
```

### 7.4 Box-Typen

- **`value`**: Einzelner Zahlenwert mit optionaler Einheit. OCR liest Text, Parser extrahiert Nummer + Einheit.
- **`checkbox`**: Zustandserkennung (checked/unchecked) über Schwarzanteil (Otsu-Binarisierung). Optionen: `blackRatioMin` (Standard: 0.30).
- **`scrollbar`**: Grafische Darstellung mit mehreren Key/Value-Paaren. ML Kit liest alle Textblöcke, Parser extrahiert Zahlenpaare. Optionen: `orientation`, `cells`, `valuesRegion`.

### 7.5 ScreenDetection-Template

Das Template `0.12 Bildschirmaufbau_Screendetection.json` enthält ~30 sprachunabhängige Boxen, die auf jeder Bildschirmseite der Maschine an festen Positionen sichtbar sind (Icons, Symbole, Rahmenlinien). Diese werden nur für die **Seitenidentifikation** verwendet, nicht für OCR.

### 7.6 Template-Generator (Python-Tool)

**Verzeichnis:** `template-gen/`

Ein Python-Tool mit GUI (`tkinter`) zum Erstellen und Testen von Templates:
- `drawing_screen.py` — Zeichne Boxen auf Screenshots der Maschine
- `testing_screen.py` — Teste Templates gegen Bilder
- `history_screen.py` — Template-Versionshistorie
- `template_editor.py` — Kernlogik zum Bearbeiten
- `resolution_tester.py` — Teste verschiedene Auflösungen

---

## 8. OCR-Pipeline

### 8.1 Native OCR (ML Kit)

**Datei:** `OcrProcessor.kt`

Für jede OCR-Box im gewarpten Bild:
1. ROI ausschneiden (Prozent → Pixel)
2. Je nach Typ verarbeiten:
   - **Value:** Graustufen → RGBA → Bitmap → ML Kit `TextRecognition` → Text + Number
   - **Checkbox:** CLAHE → GaussianBlur → Otsu-Binarisierung (invertiert) → Schwarzanteil berechnen → Vergleich mit `blackRatioMin`
   - **Scrollbar:** Graustufen → RGBA → Bitmap → ML Kit auf gesamten ROI → Alle Textblöcke zurückgeben

### 8.2 OCR-Ergebnis-Typen

```typescript
OcrValueBoxResult     { id, type: 'value', text, number, confidence }
OcrCheckboxBoxResult  { id, type: 'checkbox', checked, confidence, valueText, valueNumber }
OcrScrollBarResult    { id, type: 'scrollbar', values: [...], cells, orientation }
```

### 8.3 JS-seitige Parser

**Verzeichnis:** `features/ocr/parsers/`

#### Value Parser (`value-parser.ts`)
1. Extrahiere `number` oder `text` aus der OCR-Box
2. Splitte in Nummern-Teil und Einheiten-Teil (Leerzeichen-Trennung)
3. Validiere Nummern-Token (`isValidNumericToken`) — Optional: Komma erforderlich
4. Normalisiere Nummer (`normalizeNumber`) — Komma → Punkt
5. Fuzzy Einheiten-Erkennung (`detectMatchingUnit`) gegen erwartete Einheiten
6. **Strict Mode:** Wenn `expectedUnits` definiert sind, MUSS eine Einheit erkannt werden
7. Bei `sameUnitAs`: Einheit wird von einer anderen Box übernommen

#### Checkbox Parser (`checkbox-parser.ts`)
- Einfach: `checked` → `"checked"` / `"unchecked"` als String

#### Scrollbar Parser (`scrollbar-parser.ts`)
1. Raw-Tokens sammeln (Strings/Numbers aus ML Kit)
2. Auf `;` splitten (`normalizeScrollbarTokensAndUnits`)
3. Einheiten aus den letzten beiden Tokens extrahieren (`keyUnit`, `valueUnit`)
4. Start/End-Keywords entfernen (`v`, `p`, `t`, `cm`, `bar`, etc.)
5. Tokens in **2er-Paaren** durchgehen: (Key, Value) pro Segment
6. Validierung: `isValidNumericToken` + `normalizeNumber`
7. Ergebnis: `ParsedScrollbarValue { [index]: { key: number[], value: number[] }, keyUnit?, valueUnit? }`

### 8.4 Fuzzy Einheiten-Erkennung

**Datei:** `numeric-utils.ts` → `detectMatchingUnit()`

Häufige OCR-Fehler werden korrigiert:
- `cn` → `cm`
- `°` → `%`
- `ins`, `in's` → `in^3/s`
- Endung `'s`, `is`, `ls` → `/s`
- Endung `s` nach Zahl/³/² → `/s`
- Vergleich: Exakt, Simplifiziert (Sonderzeichen entfernt), Partial-Match, Permutationen

---

## 9. OCR-History und Fehlerkorrektur

### 9.1 Prinzip

Da ein einzelner OCR-Scan oft fehlerhaft ist (Beleuchtung, Unschärfe, Reflexionen), werden **viele Scans** desselben Displays gesammelt und per **Majority Voting** der stabilste Wert ermittelt.

### 9.2 Konfiguration

| Parameter | Standard | Beschreibung |
|---|---|---|
| `maxHistoryPerField` | 30 | Max. Anzahl gespeicherter Scans pro Feld |
| `minOccurrencesForMajority` | 3* | Mindestanzahl identischer Werte für Akzeptanz |
| `commaRequired` | true | Muss der Wert ein Dezimalzeichen enthalten? |

*In der UI-Kamera auf 3 gesetzt, Standard-Default ist 15.

### 9.3 Field Aggregation (`useOcrHistory`)

**Datei:** `features/ocr/hooks/useOcrHistory.ts`

Pro OCR-Box-ID wird eine `FieldAggregation` geführt:
- `rawValues[]` — Alle geparsten Werte (max. 30)
- `scrollbar` — Aggregierte Scrollbar-Daten (alle Segments mit allen Key/Value-Arrays)
- `typeBreakdown` — Wie oft wurde diese Box als value/checkbox/scrollbar erkannt?
- `sameUnitAs` — Verweis auf Einheits-Quellfeld

### 9.4 Majority Voting

#### Für Value/Checkbox-Felder (`computeMajorityString`)
- Zähle Vorkommen von `"value|unit"` Kombinationen
- Wähle den häufigsten Wert, wenn ≥ `minOccurrences`

#### Für Scrollbar-Felder (`computeBestScrollbar`)
- Pro Segment (Index): `pickMajorityValue(key[])` und `pickMajorityValue(value[])`
- `pickMajorityValue()`: Runde auf 4 Dezimalstellen, zähle, wähle häufigstes

#### Für Numerische Werte (`pickMajorityValue`)
- `toFixed(4)` als Vergleichsschlüssel (damit 0.0000 und 0.0 gleich sind)
- Wähle den Wert mit den meisten Vorkommen, wenn ≥ `minOccurrences`

### 9.5 Unit-System-Klassifikation

**Datei:** `useOcrHistory.ts` → `unitConfig`

Aus allen erkannten Einheiten wird per Voting das Einheitensystem bestimmt:
- **System:** `iso` (metrisch: bar, cm, °C) vs. `imperial` (psi, in, °F)
- **Mode:** `absolute` (cm³, bar) vs. `relative` (%, mm)

Dies nutzt die `ExpectedUnitConfig` in den Templates:
```json
"expectedUnits": {
  "iso": { "absolute": "bar", "relative": "%" },
  "imperial": { "absolute": "psi", "relative": "%" }
}
```

---

## 10. Full-Scan-System

### 10.1 Konzept

Ein "Full Scan" ist ein kompletter Datensatz aller Bildschirmseiten einer Spritzgussmaschine. Er wird lokal in `AsyncStorage` gespeichert und kann ans Backend übertragen werden.

### 10.2 FullScan-DTO (`types.ts`)

```
FullScanDto
├── injection: InjectionDto
│   ├── mainMenu: { sprayPressureLimit, increasedSpecificPointPrinter }
│   ├── subMenuValues: { values: [{index, v, v2}...], keyUnit, valueUnit }
│   └── switchType: { transshipmentPosition, switchOverTime, ... checkboxes }
├── holdingPressure: HoldingPressureDto
│   ├── mainMenu: { holdingTime, coolTime, screwDiameter }
│   └── subMenusValues: { values: [{index, t, p}...] }
├── dosing: DosingDto
│   ├── mainMenu: { dosingStroke, dosingDelayTime, ... }
│   ├── dosingSpeedsValues: { values: [...] }
│   └── dosingPressuresValues: { values: [...] }
├── cylinderHeating: CylinderHeatingDto
│   └── mainMenu: { setpoint1..5 }
└── sectionScreenshots: Record<string, base64>
```

### 10.3 Speicherung

- **Lokal:** `AsyncStorage` mit Key `"paralens.fullscans.v1"`
- **Backend:** REST-API (POST/PUT) via `scanUploadService`
- **Status-Tracking:** `not_uploaded` | `uploading` | `uploaded` | `error` | `needs_update`

### 10.4 Excel-Export (`excel-export.ts`)

- Verwendet **ExcelJS** clientseitig
- Erstellt ein Workbook mit Worksheets pro Sektion (Injection, Dosing, etc.)
- Styling: Farbige Header, Sub-Header, Value/Unit-Spalten
- Export via `expo-sharing` (Teilen-Dialog)

---

## 11. Scan-Workflow (User-Perspektive)

1. **Full Scan auswählen/erstellen** — Camera-Tab → Dropdown
2. **Sektion wählen** — z.B. "Einspritzen"
3. **Kamera auf Display richten** — Template-Overlay zeigt erwartete Position
4. **Automatische Erkennung** — App erkennt Display, liest OCR, zeigt Werte im Overlay
5. **"Weiter" drücken** — Navigiert zum Scan-Review-Screen
6. **Werte prüfen/korrigieren** — Erkannte Werte werden angezeigt, ggf. editierbar
7. **Speichern** — Werte werden in den Full Scan übernommen
8. **Nächste Sektion** — Zurück zur Kamera
9. **Export/Upload** — Excel-Export oder Backend-Upload

---

## 12. Scan-Review-Komponenten

**Verzeichnis:** `features/scan-session/components/`

Pro Maschinenansicht gibt es eine eigene Review-Komponente:
- `InjectionMainMenuReview.tsx`
- `InjectionSubMenuGraphicReview.tsx`
- `InjectionSwitchTypeReview.tsx`
- `HoldingMainMenuReview.tsx`
- `HoldingSubMenuGraphicReview.tsx`
- `DosingMainMenuReview.tsx`
- `DosingSubMenuGraphicReview.tsx`
- `CylinderHeatingReview.tsx`
- `ScanReviewScreen.tsx` (Container)

Der **OCR→Form-Mapper** (`ocr-to-form-mapper.ts`) extrahiert Felder aus dem OCR-Snapshot:
- `findField(snapshot, boxId)` — Findet ein Feld nach Box-ID
- `findFieldWithUnit(snapshot, boxId)` — Gibt `{ value, unit }` zurück
- `getScrollbarValue(snapshot, boxId)` — Gibt `ParsedScrollbarValue` zurück

---

## 13. API-Schicht

### 13.1 Konfiguration (`config/api.ts`)

- Base-URL: `http://192.168.31.153:5200`
- Endpoints: `/api/scans`, `/api/scans/{scanId}/injection`, etc.
- Excel: `/excel/{name}`

### 13.2 Services (`features/api/services/`)

- `http-client.ts` — Generischer HTTP-Client
- `injection-service.ts`, `dosing-service.ts`, `holding-pressure-service.ts`, `cylinder-heating-service.ts` — CRUD pro Sektion
- `scanUploadService.ts` — Orchestriert den Upload eines Full Scans
- `excelService.ts` — Excel-Generierung über Backend

---

## 14. Internationalisierung (i18n)

**Datei:** `features/settings/i18n.ts`

- 2 Sprachen: Deutsch (`de`), Englisch (`en`)
- Dictionary-basiert: `DICT[language][key]`
- Hook: `useI18n()` → `t("settings")` → "Einstellungen"
- Sprache gespeichert in AsyncStorage

---

## 15. Einschränkungen und nicht implementierte Features

### 15.1 Scrollbare Listen

Einige Bildschirmseiten der Maschine zeigen Listen, die über den sichtbaren Bereich hinausgehen (z.B. Zylinderheizung mit vielen Zonen). Die App kann derzeit **nur den sichtbaren Bereich** scannen.

### 15.2 Automatische Scroll-Erkennung

Wurde nicht implementiert. Gründe:
- Die Position des Scrollbalkens müsste visuell erkannt werden
- Mehrere Aufnahmen müssten automatisch zusammengeführt werden
- Die Zuordnung der Werte zu den richtigen Zeilen wäre komplex
- Zeitlich im Rahmen der Diplomarbeit nicht umsetzbar

### 15.3 iOS-Unterstützung

Das native Plugin ist derzeit **nur für Android** implementiert (Kotlin + OpenCV Android SDK). iOS würde eine Neuimplementierung in Swift/Objective-C mit dem iOS OpenCV Framework erfordern.

### 15.4 Offline-OCR

ML Kit Text Recognition ist Cloud-unabhängig (on-device), aber die Modellqualität ist begrenzt. Keine Möglichkeit, ein Custom-Modell für industrielle Displays zu trainieren.

---

## 16. Python-Prototypen

### 16.1 `prototype/main.py` / `main2.py`

Erste OpenCV-Prototypen zur Display-Erkennung. Implementieren die gleiche Pipeline (ROI, Canny, Konturen, Homographie) in Python. Dienten als Proof-of-Concept vor der Kotlin-Implementierung.

### 16.2 `prototype/testing.ipynb`

Jupyter Notebook für interaktive Tests mit verschiedenen Testbildern und Parametern.

---

## 17. Build-Konfiguration

- **Expo Config Plugins:** `withCustomGradleProps.js` — Setzt JVM-Speicher auf 4GB (`-Xmx4g`) für OpenCV-Kompilierung
- **Metro Config:** Konfiguriert für lokale Lib-Pakete
- **EAS Build:** `eas.json` für Cloud-Builds (Development, Preview, Production)
- **OpenCV:** Eingebunden als Android-Dependency im nativen Plugin (`build.gradle`)
- **ML Kit:** `com.google.mlkit:text-recognition` als Android-Dependency

---

*Letzte Aktualisierung: März 2026*
