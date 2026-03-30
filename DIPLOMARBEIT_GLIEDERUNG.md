# Diplomarbeit – ParaLens IM

## Gliederung

> **Hinweis:** Kapitel 3 (Technologie) und 4 (Umsetzung) wurden auf Basis der tatsächlichen
> Codebase detailliert ausgearbeitet. Unter jeder Überschrift stehen Stichworte, die den
> geplanten Inhalt des Abschnitts beschreiben.

---

### 1. Einleitung
#### 1.1 Ausgangslage und Problemstellung
#### 1.2 Zielsetzung
#### 1.3 Kooperationspartner (Meister-Quadrat GmbH)
#### 1.4 Aufbau der Arbeit

---

### 2. Theoretische Grundlagen
#### 2.1 Spritzgussindustrie und Prozessdatenerfassung
##### 2.1.1 Aufbau von Spritzgussmaschinen
##### 2.1.2 Einstell- und Istwerte
##### 2.1.3 Probleme der manuellen Datenerfassung
#### 2.2 Optical Character Recognition (OCR)
##### 2.2.1 Funktionsweise von OCR-Systemen
##### 2.2.2 Vergleich bestehender OCR-Bibliotheken
##### 2.2.3 Herausforderungen bei industriellen Displays
#### 2.3 Bildverarbeitung und Computer Vision
##### 2.3.1 Kantenerkennung (Canny Edge Detection)
##### 2.3.2 Konturerkennung und Polygon-Approximation
##### 2.3.3 Perspektivkorrektur und Homographie
##### 2.3.4 Region of Interest (ROI)
##### 2.3.5 Intersection over Union (IoU)
#### 2.4 Cross-Platform Mobile-Entwicklung
##### 2.4.1 React Native und Expo
##### 2.4.2 Native Module und JSI-Bridge
#### 2.5 Backend-Technologien
##### 2.5.1 ASP.NET Core
##### 2.5.2 Relationale Datenmodellierung
##### 2.5.3 REST-API-Design

#### 2.6 UI/UX-Design für industrielle Anwendungen

---

### 3. Technologie

#### 3.1 Gesamtarchitektur
- Drei-Schichten-Überblick: Mobile App, Backend-API, Datenbank
- Offline-First-Prinzip der App
- Datenfluss vom Kamera-Frame bis zum exportierten Dokument

#### 3.2 Mobile App – Framework und Werkzeuge
##### 3.2.1 React Native und Expo SDK 54
- Cross-Platform-Framework, JavaScript/TypeScript
- Expo als Managed Workflow mit nativen Erweiterungen (Config Plugins)
- EAS Build für Cloud-basierte Android-Builds

##### 3.2.2 Expo Router (File-Based Routing)
- Dateibasierte Navigation (`app/`-Verzeichnis)
- Tab-Navigation: Kamera, Verlauf, Einstellungen
- Modale Screens (Scan-Review)

##### 3.2.3 UI-Bibliotheken: GlueStack UI und NativeWind
- GlueStack UI als Komponentenbibliothek
- NativeWind: TailwindCSS-Klassen in React Native
- Tailwind-Variants für konsistentes Styling

##### 3.2.4 State Management
- React Context API für globalen Zustand
- Provider-Hierarchie: Settings → API → FullScan → UI
- AsyncStorage für persistente lokale Datenspeicherung
- Kein Redux – bewusste Entscheidung für leichtgewichtige Lösung

#### 3.3 Kamerazugriff – React Native Vision Camera
##### 3.3.1 VisionCamera 4 und Frame Processors
- react-native-vision-camera als Kamerabibliothek
- Konzept der Frame Processors: synchroner Callback pro Kamera-Frame
- Worklet-Thread (react-native-worklets-core) statt JS-Thread
- JSI (JavaScript Interface) für direkten nativen Zugriff ohne Bridge-Overhead

##### 3.3.2 Natives Frame-Processor-Plugin (Kotlin)
- Lokales npm-Paket: `vision-camera-screen-detector`
- Klasse `ScreenDetectorFrameProcessorPlugin extends FrameProcessorPlugin`
- `callback(frame, arguments)` als Einstiegspunkt
- Rückgabe als `HashMap<String, Any?>` über JSI zurück an JavaScript

##### 3.3.3 JS/TS-Bridge: performScan()
- Worklet-Funktion mit `'worklet'`-Direktive
- Serialisierung aller Parameter als JSI-kompatible Primitive
- `plugin.call(frame, args)` → natives Plugin → `ScanResult`
- Typdefinitionen: `ScreenResult`, `ScanResult`, `PerformScanOptions`

#### 3.4 Computer Vision – OpenCV
##### 3.4.1 OpenCV für Android
- OpenCV 4 als Gradle-Dependency im nativen Plugin
- Mat-Datenstruktur als zentrale Bildrepräsentation
- Nutzung von: Imgproc, Calib3d, Core-Modulen

##### 3.4.2 Bildverarbeitungsfunktionen
- CLAHE (Contrast Limited Adaptive Histogram Equalization)
- Canny Edge Detection mit dynamischen Thresholds
- GaussianBlur, morphologisches Closing
- Konturerkennung (findContours, approxPolyDP)
- Harris Corner Detection, Sobel-Gradienten
- warpPerspective für Perspektivkorrektur

#### 3.5 OCR-Engine – Google ML Kit
##### 3.5.1 ML Kit Text Recognition
- On-Device-OCR (kein Cloud-Zugriff nötig)
- Lateinische Schrifterkennung (`TextRecognizerOptions.DEFAULT_OPTIONS`)
- Eingabe: `InputImage.fromBitmap()` – erfordert RGBA-Bitmap
- Ausgabe: `TextBlock` → `Line` → `Element`-Hierarchie

##### 3.5.2 Synchrone Verarbeitung im Plugin
- `Tasks.await(task)` für synchrone Ausführung im Frame-Processor-Thread
- Lazy Initialization des TextRecognizers (`by lazy`)
- Konvertierung: OpenCV Mat (Graustufen) → RGBA → Bitmap → InputImage

#### 3.6 Template-Generator (Python-Tool)
- Eigenentwickeltes GUI-Tool (tkinter) zur Template-Erstellung
- Zeichnen von Boxen auf Maschinenfotos
- Testen verschiedener Auflösungen
- Export als JSON-Dateien für die App

#### 3.7 Prototyp-Entwicklung (Python/OpenCV)
- Erste OpenCV-Pipeline in Python (main.py, main2.py)
- Jupyter Notebook (testing.ipynb) für interaktive Parametersuche
- Proof-of-Concept vor der Kotlin-Implementierung

#### 3.8 Backend-Technologie (Überblick)
- ASP.NET Core REST-API (separates Repository)
- Relationales Datenmodell für Prozessdaten
- Excel-/PDF-Generierung serverseitig

---

### 4. Umsetzung (Alexander Resch – OCR und Bilderkennung)

#### 4.1 Display-Erkennungsalgorithmus

##### 4.1.1 Überblick: Pipeline-Architektur
- Ablauf: Frame → Preprocessing → Edge Detection → Konturen → Homographie → Warp → Matching → OCR
- Dateien: `ScreenFrameProcessorPlugin.kt` (Orchestrierung), `ImageProcessing.kt` (Bildverarbeitung), `ScreenDetection.kt` (Erkennung)
- Zweistufiges Verfahren: erst Display finden, dann Template-Boxen verifizieren
- Entscheidung: „detected" erst wenn Display UND Template-Accuracy-Schwelle erreicht

##### 4.1.2 Bildvorverarbeitung
- Y-Plane-Extraktion aus YUV-Kamerabild (`yPlaneToGrayMat()`)
- Optionale 90°-Rotation (Android-Kamera-Orientierung)
- CLAHE-Normalisierung: ClipLimit=2.0, TileGridSize=8×8
- Zweck: Ausgleich von Reflexionen und Helligkeitsschwankungen auf dem Display

##### 4.1.3 Definition der Region of Interest (ROI)
- Zwei verschachtelte ROIs: Outer ROI und Inner ROI
- Outer ROI (Standard: 10%/5%/80%/90%): Display muss innerhalb liegen
- Inner ROI (Standard: 30%/20%/45%/60%): Display muss größer sein
- `rectWithinRoi()`: Prüft ob Kandidat innerhalb Outer und größer als Inner
- `enforceMinAspect()`: Mindest-Seitenverhältnis 3:4 erzwingen
- Normalisierte Koordinaten (0..1) → Pixel via `normRectToPx()`

##### 4.1.4 Zweistufige Kantendetektion
- **Screen Edges** (für Display-Umriss):
  - GaussianBlur 5×5, σ=1.5
  - Dynamische Canny-Thresholds: lower = (1-0.33)×mean, upper = (1+0.33)×mean
  - Morphologisches Closing 3×3 zum Verbinden von Kantenlücken
- **Detail Edges** (für Template-Box-Matching):
  - GaussianBlur 3×3, σ=1.0
  - lower = max(20, mean×0.3), upper = min(200, mean×0.9)
  - Keine Morphologie (feinere Details erhalten)
- Begründung der Zweistufigkeit: Display-Umriss braucht robuste Kanten, Box-Matching braucht feine Details

##### 4.1.5 Erkennung großer Rechtecke innerhalb der ROI
- `findContours()` auf Screen Edges (RETR_EXTERNAL)
- `approxPolyDP()` mit ε = 2% des Kontur-Umfangs
- Filter: Nur exakt 4-eckige Polygone (Vierecke)
- ROI-Validierung: Muss innerhalb Outer ROI und größer als Inner ROI
- Auswahl des besten Kandidaten: größtes Viereck das den ROI-Test besteht
- `orderQuad()`: Sortierung der 4 Ecken (TL, TR, BR, BL) über Schwerpunkt-Partitionierung

##### 4.1.6 Homographie-Berechnung
- Source: Kanonische Template-Ecken (0,0), (1200,0), (1200,1600), (0,1600)
- Destination: 4 sortierte Ecken des erkannten Display-Vierecks
- `Calib3d.findHomography(src, dst, RANSAC, 3.0)`
- RANSAC für Robustheit gegen einzelne fehlerhafte Eckpunkte
- Ergebnis: 3×3 Homographie-Matrix H (Template → Bild)

##### 4.1.7 Perspektivkorrektur (Warping)
- Inverse Homographie H⁻¹: Bild → kanonischer Template-Raum
- `warpPerspective(img, warped, H.inv(), Size(1200, 1600))`
- Ergebnis: Entzerrtes Graustufenbild, in dem alle Template-Boxen an ihren definierten %-Positionen liegen
- Optionaler Base64-JPEG-Export des gewarpten Bildes für die Review-Ansicht

##### 4.1.8 Template-Box-Matching im gewarpten Bild
- Verbesserte Methode: `matchTemplateBoxesInWarped()` (statt Legacy-IoU)
- Pro Template-Box:
  - Box-Position in Pixeln berechnen (+ 1% Padding)
  - **Edge Score** (0..0.5): Canny auf ROI mit Padding, Border-Edge-Ratio messen
  - **Corner Score** (0..0.3): Harris Corner Detection an den 4 Box-Ecken
  - **Gradient Score** (0 oder 0.2): Sobel-Gradient an Top/Bottom-Rändern
  - **Gesamtscore** = Edge + Corner + Gradient → Match wenn ≥ 0.4
- Accuracy = gematchte Boxen / Gesamt-Template-Boxen
- Display gilt als erkannt wenn Accuracy ≥ `accuracyThreshold` (Standard: 40%)

##### 4.1.9 Legacy-Methode: IoU-basiertes Template-Matching
- `matchTemplateBoxes()`: Template-Boxen via H projizieren, IoU gegen Detail-Konturen
- `perspectiveTransform()` projiziert %-Boxen in Bild-Koordinaten
- IoU-Vergleich mit allen erkannten Detail-Konturen
- Schwelle: minIouForMatch = 0.30
- Wurde durch Warped-Space-Methode ersetzt (robuster für kleine Boxen)

##### 4.1.10 Validierung und Ergebnisaufbereitung
- `createScreenData()`: Kompiliert alle Ergebnisse in HashMap
- Enthält: detected, accuracy, homography, ROIs, matched_boxes mit Scores
- Detections-Counter (kumulativ über alle Frames)
- Detection-Rate = Detections / Total Frames

#### 4.2 VisionCamera-Implementierung

##### 4.2.1 Plugin-Registrierung und Lebenszyklus
- `ScreenDetectorFrameProcessorPlugin(proxy, options)`
- Plugin-Optionen als Default-Werte (template, thresholds)
- Statische Counter: `detectionCounter`, `totalFrameCounter` (überleben Recompositions)

##### 4.2.2 Frame-Processor-Konfiguration
- `useFrameProcessor()` mit `'worklet'`-Direktive
- FPS-Throttling: `performance.now()` mit 100ms Intervall (~10 FPS)
- `useSharedValue()` für lastFrameTime (Shared Memory zwischen Threads)
- Kameraformat: 1280×720 bevorzugt, min. 15 FPS

##### 4.2.3 Thread-Kommunikation: Worklet → JS
- `useRunOnJS()` für asynchronen Thread-Wechsel
- Separate Callbacks für: setScreenResult, setOcrMap, setBase64Image, addScanResult
- Stabile Referenzen via `useRef` (vermeidet Dependency-Neuauslösung)
- OCR-Update-Propagation via `onOcrUpdate` Callback an Parent

##### 4.2.4 Kamera-Geometrie und Overlay-Mapping
- `computeFrameToViewTransform()`: Frame-Koordinaten → View-Koordinaten (contain-Fitting)
- `applyHomography()`: JS-seitige 3×3 Homographie-Anwendung
- `transformWarpedBoxToCameraFeed()`: OCR-Box-Position aus Warped-Space → Kamera-Feed
- `mapBoxToViewStyle()` / `mapWarpedBoxToViewStyle()`: Box → CSS-Style {left, top, width, height}

##### 4.2.5 Performance-Optimierungen
- ~10 FPS statt 30 FPS (reicht für statisches Display, spart Batterie/CPU)
- Debug-Streams nur alle N Frames (3, 5, 7, 10) aktualisiert
- Wiederverwendung des gewarpten Bildes zwischen Matching und OCR
- Lazy-Initialization von ML Kit TextRecognizer

#### 4.3 Bildschirm-Templates

##### 4.3.1 Konzept: Sprachunabhängige Seitenidentifikation
- Templates basieren auf geometrischen Merkmalen (Position/Größe von UI-Elementen)
- Keine Textabhängigkeit → funktioniert unabhängig von der Maschinensprache
- ScreenDetection-Template: ~30 Boxen für feste UI-Elemente (Icons, Rahmen, Symbole)

##### 4.3.2 Template-Datenstruktur
- JSON-Dateien mit Box-Arrays
- Box-Felder: `id`, `x`, `y`, `width`, `height` (alle in Prozent)
- `label`: Menschenlesbare Beschreibung
- `type`: `value` | `checkbox` | `scrollbar`
- `expectedUnits`: Einheitenkonfiguration pro System (ISO/Imperial × Absolut/Relativ)
- `expectedKeyUnits`: Separate Einheiten für Scrollbar-Schlüssel
- `sameUnitAs`: Verweis auf anderes Feld für geteilte Einheiten
- `options`: Typ-spezifische Konfiguration

##### 4.3.3 Unterstützte Bildschirmseiten
- **Einspritzen (Injection)**: Hauptmenü (2 Werte + 1 Checkbox), Geschwindigkeits-Scrollbar, Umschaltart (3 Checkboxen + 3 Werte)
- **Nachdruck (Holding Pressure)**: Hauptmenü (3 Werte), Nachdruck-Scrollbar
- **Dosieren (Dosing)**: Hauptmenü (6 Werte), 2 Scrollbars (Geschwindigkeit + Druck)
- **Zylinderheizung (Cylinder Heating)**: 5 Temperatur-Sollwerte
- Insgesamt: 9 Templates, ca. 40+ OCR-Boxen

##### 4.3.4 Template-Laden und -Verwaltung
- Statisches `require()` aller JSON-Dateien (Metro-Bundler-kompatibel)
- `TEMPLATE_DATA: Record<TemplateLayout, TemplateBox[]>` als Lookup
- `loadTemplateConfig(layout)`: Gibt Box-Array für ein Layout zurück
- `loadOcrTemplate(layout)`: Konvertiert zu OCR-Boxen mit Type-Defaults

##### 4.3.5 Template-Layout-Skalierung
- `useTemplateLayout()` Hook: %-Koordinaten → Pixel auf dem Bildschirm
- Berücksichtigt: Container-Größe, Viewport, Offset, Seitenverhältnis
- Ergebnis: `OverlayBox[]` mit `{id, x, y, width, height, color}` in Pixeln

##### 4.3.6 Template-Generator-Tool
- Python-GUI (tkinter): `template-gen/`
- Workflow: Screenshot laden → Boxen zeichnen → Koordinaten als % speichern → JSON exportieren
- Testscreen: Template gegen verschiedene Bilder validieren
- Auflösungstester: Verhalten bei unterschiedlichen Bildgrößen prüfen
- Versionshistorie für iterative Verbesserungen

#### 4.4 OCR-Pipeline

##### 4.4.1 Natives OCR: Verarbeitung im gewarpten Bild
- `OcrProcessor.processOcrBoxes()`: Iteriert über alle OCR-Boxen
- Box-Position: %-Koordinaten → Pixel im 1200×1600 Warped Image
- ROI-Ausschnitt: `warped.submat(ry, y2, rx, x2)`
- Dispatch nach Typ: `processValue()`, `processCheckbox()`, `processScrollbar()`

##### 4.4.2 Value-Erkennung (Zahlenwerte + Einheiten)
- Nativ: Graustufen → RGBA → Bitmap → ML Kit → Text + Number-Parsing
- JS-Parser (`value-parser.ts`):
  - Aufteilen in Nummer und Einheit (Leerzeichen-Trennung)
  - `isValidNumericToken()`: Regex-Validierung, optionale Komma-Pflicht, Buchstaben-Ausschluss
  - `normalizeNumber()`: Komma→Punkt, parseFloat
  - `detectMatchingUnit()`: Fuzzy Matching gegen erwartete Einheiten
  - Strict Mode: Bei definierten `expectedUnits` muss eine Einheit erkannt werden
  - `sameUnitAs`: Einheit von Referenzfeld übernehmen

##### 4.4.3 Checkbox-Erkennung
- Nativ (`OcrProcessor.processCheckbox()`):
  - CLAHE + GaussianBlur 3×3 auf ROI
  - Otsu-Binarisierung (invertiert: Dunkel = Weiß)
  - Schwarzanteil berechnen: `blackRatio = whiteCount / area`
  - Vergleich mit `blackRatioMin` (konfigurierbar pro Box, Standard: 0.30)
  - Confidence aus Distanz zum Threshold
- JS-Parser: Einfache Abbildung `checked → "checked" / "unchecked"`

##### 4.4.4 Scrollbar-Erkennung
- Nativ (`OcrProcessor.processScrollbar()`):
  - Gesamten ROI an ML Kit übergeben
  - Alle `TextBlock` → `Line`-Texte sammeln
  - Rohtext-Array zurückgeben (kein Parsing nativ)
- JS-Parser (`scrollbar-parser.ts`):
  - Tokens auf `;` splitten für zusammenhängende Werte
  - Einheiten-Extraktion aus den letzten beiden Tokens (`keyUnit`, `valueUnit`)
  - Start-Keywords entfernen (`v`, `p`, `t`)
  - End-Keywords entfernen (`cm`, `bar`, `s`)
  - Tokens paarweise durchgehen: (Key₀, Value₀), (Key₁, Value₁), ...
  - Pro Paar: Validierung + Normalisierung
  - Ergebnis: `ParsedScrollbarValue` mit Segment-Index → {key[], value[]}

##### 4.4.5 Fuzzy Einheiten-Korrektur
- `detectMatchingUnit()` in `numeric-utils.ts`
- Häufige OCR-Fehlinterpretationen:
  - `cn` → `cm`, `°` → `%`, `ins` → `in^3/s`
  - Endungen: `'s`, `is`, `ls` → `/s`
  - Endung `s` nach Ziffern/Hochzeichen → `/s`
- Vergleichsstrategie (Reihenfolge):
  1. Exakter Match (nach Bereinigung)
  2. Simplifizierter Match (Sonderzeichen entfernt)
  3. Partial/Base Match (z.B. `cm3` → `cm^3`)
  4. Spezialfall `%` → auch `o` oder `0` akzeptieren
  5. Permutationen (`/` entfernt, `^` entfernt, `³`→`3` etc.)

#### 4.5 OCR-History und Wertstabilisierung

##### 4.5.1 Prinzip: Majority Voting über mehrere Scans
- Ein einzelner OCR-Scan ist oft fehlerhaft (Reflexionen, Unschärfe, Bildrauschen)
- Lösung: Werte über N Scans sammeln, häufigsten Wert auswählen
- Konfigurierbar: maxHistoryPerField=30, minOccurrencesForMajority=3

##### 4.5.2 Field Aggregation (`useOcrHistory` Hook)
- Pro Box-ID: `FieldAggregation` mit `rawValues[]`, `scrollbar`, `typeBreakdown`
- `addScanResult()`: Parst jede Box, fügt Ergebnis zum Feld hinzu
- Ringpuffer: Alte Werte fallen nach 30 Einträgen heraus
- `sameUnitAs`-Auflösung: Einheit vom Quellfeld kopieren falls eigene fehlt

##### 4.5.3 Majority Voting für Werte und Checkboxen
- `computeMajorityString()`: Zählt `"value|unit"` Kombinationen
- Wählt häufigsten, nur wenn ≥ minOccurrences
- Beispiel: 20× „123.5 bar", 5× „123,5 bar", 3× „12.5 bar" → „123.5 bar"

##### 4.5.4 Majority Voting für Scrollbar-Segmente
- `mergeParsedScrollbar()`: Aggregiert alle Segments über Scans hinweg
- Pro Segment-Index: key[] und value[] wachsen über mehrere Scans
- `computeBestScrollbar()`: `pickMajorityValue()` pro key/value-Array
- `pickMajorityValue()`: toFixed(4) als Vergleichsschlüssel, häufigsten wählen
- Formatierte Ausgabe: „0: (0.0000 cm³, 8.0001 cm³/s), 1: (10.0000 cm³, 15.5000 cm³/s)"

##### 4.5.5 getBestFields(): Aggregierte Ergebnisse abrufen
- Iteriert über alle fieldAggregations
- Scrollbar-Felder: `computeBestScrollbar()` → strukturiertes `ParsedScrollbarValue`
- Value/Checkbox-Felder: `computeMajorityString()` → `{value, unit}`
- Dominanter Typ per `typeBreakdown` bestimmen (value vs. checkbox vs. scrollbar)
- `sameUnitAs`-Auflösung: Einheit vom Majority-Ergebnis des Quellfelds

##### 4.5.6 Einheitensystem-Erkennung
- `unitConfig` (useMemo): Klassifiziert erkannte Einheiten gegen `ExpectedUnitConfig`
- `classifyUnitAgainstConfig()`: Vergleicht z.B. „bar" mit iso.absolute="bar" → system=iso, mode=absolute
- Voting über alle Felder: system-Counts + mode-Counts
- Schwelle: ≥50% für eindeutige Klassifikation
- Ergebnis: `{ system: 'iso'|'imperial', mode: 'absolute'|'relative' }`
- Wird an Parent propagiert für korrekte Dateninterpretation

#### 4.6 Debug-System

##### 4.6.1 HTTP-basierter Bild-Streamer
- `DebugHttpStreamer.kt`: HTTP-Server auf dem Android-Gerät
- Streams für jeden Pipeline-Schritt (gray, normalized, edges, contours, matched, warped, overlay)
- Zugriff via Browser auf dem Entwickler-PC
- Farbcodierung: Grün=Screen, Rot=Detail-Konturen, Blau=Template, Gelb=OCR-Values, Magenta=Scrollbar
- Nur im Debug-Build aktiv (`BuildConfig.DEBUG`)

##### 4.6.2 Logging und Diagnostik
- Detailliertes Logging pro Box: Score-Breakdown (Edge, Corner, Gradient)
- Checkbox-Logging: blackRatio, mean, min, max, threshold
- Scrollbar-Logging: Alle erkannten Textblöcke
- Accuracy-Summary pro Frame: „X/Y boxes matched (Z%)"

#### 4.7 Nicht implementierte Features und Einschränkungen

##### 4.7.1 Scrollbare Listen auf dem Display
- Problem: Manche Bildschirmseiten zeigen scrollbare Listen (z.B. Zylinderheizung mit >5 Zonen)
- Aktueller Stand: Nur der sichtbare Bereich wird gescannt
- Die App kann nicht erkennen, ob eine Liste weitergescrollt wurde

##### 4.7.2 Automatische Scroll-Erkennung (nicht implementiert)
- Scrollbalken-Position müsste visuell erkannt werden (Pixel-Analyse des Scrollbar-Bereichs)
- Mehrere Aufnahmen müssten automatisch zusammengeführt werden (Stitching)
- Zuordnung der Werte zu den richtigen Listenzeilen wäre komplex
- Erkennung von Duplikaten bei überlappenden Aufnahmen nötig
- Zeitlich im Rahmen der Diplomarbeit nicht umsetzbar
- Möglicher Ansatz für Zukunft: Scrollbalken-Tracking + Frame-Differenzierung

##### 4.7.3 iOS-Unterstützung
- Natives Plugin nur für Android implementiert (Kotlin + OpenCV Android SDK)
- iOS würde Swift-Implementierung mit OpenCV iOS Framework erfordern
- React-Native-Schicht ist plattformunabhängig, nur das Plugin müsste portiert werden

##### 4.7.4 Begrenzungen der OCR-Qualität
- ML Kit erkennt industrielle Displays nicht immer zuverlässig
- Besondere Schwierigkeiten: Monospace-Schriften, Invertierte Darstellung (heller Text auf dunklem Grund)
- Reflexionen und Blendung auf dem Display
- Kein Custom-Training des OCR-Modells möglich

##### 4.7.5 Einzelbild-Modus
- Kein manueller Foto-Modus implementiert (nur Live-Scan)
- Potenziell höhere Qualität bei Einzelaufnahme (volle Auflösung, Autofokus)
- Live-Scan wurde priorisiert für bessere Benutzerführung

---

### 5. Umsetzung (Andreas Hasenschwandtner – Mobile App)

#### 5.1 Projektstruktur und Technologie-Stack
- Bulletproof-React-Architektur mit Feature-Modulen
- Feature-Verzeichnisse: api, camera, fullscan, ocr, scan-session, settings, templates
- Barrel-Exports (index.ts) pro Feature

#### 5.2 Kamera-Komponente und Berechtigungen
##### 5.2.1 UiScannerCamera-Komponente
##### 5.2.2 Kamera-Berechtigungshandling (CameraPermissionProvider)
##### 5.2.3 Kamera-Format-Auswahl

#### 5.3 Scanner-Overlays und Template-Overlay
##### 5.3.1 ScannerOverlays-Komponente
##### 5.3.2 TemplateOverlay: Visuelle Box-Darstellung
##### 5.3.3 DynamicValueList: Live-Werteanzeige

#### 5.4 Scan-Workflow
##### 5.4.1 Sektionsauswahl und Full-Scan-Management
##### 5.4.2 Live-Scan-Prozess
##### 5.4.3 Scan-Review-Screen
##### 5.4.4 OCR→Form-Mapper

#### 5.5 Full-Scan-Verwaltung
##### 5.5.1 FullScan-Context und Provider
##### 5.5.2 Lokale Speicherung (AsyncStorage)
##### 5.5.3 Upload-Status-Tracking

#### 5.6 Excel-Export
##### 5.6.1 Client-seitige Excel-Generierung (ExcelJS)
##### 5.6.2 Worksheet-Aufbau pro Sektion
##### 5.6.3 Datei-Export via Sharing-Dialog

#### 5.7 Einstellungen und Internationalisierung
##### 5.7.1 Settings-Context (Theme, Sprache)
##### 5.7.2 i18n: Deutsch/Englisch Dictionary

#### 5.8 Offline-First-Ansatz
- AsyncStorage als primärer Speicher
- Backend-Upload optional und nachträglich
- Kein Internet für Kernfunktionalität (Scan + Review) erforderlich

---

### 6. Umsetzung (Jannis Katsanis – Backend)

#### 6.1 Datenbank und Datenmodell
##### 6.1.1 ER-Modell und Datenbankschema
##### 6.1.2 Migrationen

#### 6.2 REST-API
##### 6.2.1 API-Endpunkte
##### 6.2.2 Scan-CRUD
##### 6.2.3 Sektions-Endpunkte (Injection, Dosing, Holding Pressure, Cylinder Heating)

#### 6.3 Datenverarbeitung
##### 6.3.1 Plausibilitätsprüfung
##### 6.3.2 Datenvalidierung

#### 6.4 Berichterstellung
##### 6.4.1 PDF-Generierung
##### 6.4.2 Excel-Generierung (serverseitig)

#### 6.5 Skalierbarkeit und Erweiterbarkeit

---

### 7. Test und Validierung
#### 7.1 Testkonzept
#### 7.2 OCR-Tests unter variierenden Bedingungen
##### 7.2.1 Lichtverhältnisse
##### 7.2.2 Kamerawinkel
##### 7.2.3 Erkennungsgenauigkeit
#### 7.3 Usability-Tests mit Anwendern
#### 7.4 Backend-Lasttests
#### 7.5 Integrationstests (Gesamtsystem)
#### 7.6 Validierung mit realen Spritzgussmaschinen

---

### 8. Ergebnisse und Diskussion
#### 8.1 Erreichte Erkennungsraten
#### 8.2 Vergleich mit manueller Erfassung
#### 8.3 Benutzerfeedback
#### 8.4 Limitierungen und Fehlerquellen

---

### 9. Zusammenfassung und Ausblick
#### 9.1 Zusammenfassung der Ergebnisse
#### 9.2 Erfüllung der Zielsetzung
#### 9.3 Ausblick und Erweiterungsmöglichkeiten
##### 9.3.1 Zusätzliche Maschinentypen
##### 9.3.2 Scrollbare Listen und automatisches Stitching
##### 9.3.3 iOS-Portierung
##### 9.3.4 Custom-OCR-Modell für industrielle Displays

---

### 10. Literaturverzeichnis

### 11. Abbildungsverzeichnis

### 12. Tabellenverzeichnis

### 13. Anhang
#### 13.1 Quellcode-Auszüge
#### 13.2 Testprotokolle
#### 13.3 Benutzerhandbuch
#### 13.4 Template-JSON-Beispiele

