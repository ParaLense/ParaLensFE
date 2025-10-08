# Context
File name: 2025-10-06_1
Created at: 2025-10-06_12:31:54
Created by: alexa
Main branch: main
Task Branch: task/Alex/rewrite-expo_2025-10-06_1
Yolo Mode: aus

# Task Description
Migration der React Native App `ParaLensApp` nach `ParaLensAppExpo` mit Expo Router und aktualisierten Versionen. Inhalte aus `src` übernehmen, Navigation auf Expo Router umstellen (Tabs), Provider-Hierarchie übernehmen, native Module (react-native-vision-camera, lokale libs) via Expo Prebuild/Dev Client integrieren. Build- und TypeScript-Probleme (z. B. "TypeScript not found") beheben.

# Project Overview
- ParaLensApp (RN 0.80):
  - Entry: `src/App.tsx` (Providers: GluestackUIProvider, ApiProvider, SettingsProvider, FullScanProvider; NavigationContainer)
  - Tabs: `src/Nagivation/AppNavigator.tsx` (History, Camera, Settings)
  - Screens: `src/Screens/*` (CameraScreen, ScanReviewScreen, HistoryScreen, SettingsScreen)
  - Camera: `react-native-vision-camera`, Custom `UiScannerCamera` und Template-Layouts unter `src/config/templates`
  - State/Contexts: `src/contexts/*`, Services unter `src/Services/*`, Types unter `src/types/*`
  - Utils: `src/utils/*` inkl. i18n
  - Native libs: `libs/vision-camera-ocr-bb2`, `libs/vision-camera-screen-detector`
- ParaLensAppExpo (Expo 54 + expo-router 6):
  - Entry: `expo-router/entry` via `package.json#main`
  - Router: `app/_layout.tsx`, `app/index.tsx` (noch Platzhalter)
  - Abhängigkeiten Expo-kompatibel; vision-camera erfordert Prebuild + Dev Client und ggf. Config Plugins für lokale libs

⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️
Execution Protocol:
1. Create feature branch
Create a new task branch from MAIN_BRANCH:
git checkout -b task/[TASK_IDENTIFIER]_[TASK_DATE_AND_NUMBER]
Add the branch name to the TASK_FILE under "Task Branch."
Verify the branch is active:
git branch --show-current
Update "Current execution step" in TASK_FILE to next step
2. Create the task file
Execute command to generate [TASK_FILE_NAME]:
[TASK_FILE_NAME]="$(date +%Y-%m-%d)_$(($(ls -1q .tasks | grep -c $(date +%Y-%m-%d)) + 1))"
Create TASK_FILE with strict naming:
mkdir -p .tasks && touch ".tasks/${TASK_FILE_NAME}_[TASK_IDENTIFIER].md"
Verify file creation:
ls -la ".tasks/${TASK_FILE_NAME}_[TASK_IDENTIFIER].md"
Copy ENTIRE Task File Template into new file
Insert Execution Protocol EXACTLY, in verbatim, by:
Copying text between "-- [START OF EXECUTION PROTOCOL]" and "-- [END OF EXECUTION PROTOCOL]"
Adding "⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️" both as header and a footer
a. Find the protocol content between [START OF EXECUTION PROTOCOL] and [END OF EXECUTION PROTOCOL] markers above
b. In the task file:
 1. Replace "[FULL EXECUTION PROTOCOL COPY]" with the ENTIRE protocol content from step 5a
 2. Keep the warning header and footer: "⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️"
Systematically populate ALL placeholders: a. Run commands for dynamic values:
[DATETIME]="$(date +'%Y-%m-%d_%H:%M:%S')"
[USER_NAME]="$(whoami)"
[TASK_BRANCH]="$(git branch --show-current)"
b. Fill PROJECT_OVERVIEW by recursively analyzing mentioned files:
find [PROJECT_ROOT] -type f -exec cat {} + | analyze_dependencies
Cross-verify completion:
Check ALL template sections exist
Confirm NO existing task files were modified
Set the "Current execution step" tp the name and number of the next planned step of the exectution protocol
Print full task file contents for verification
<<< HALT IF NOT YOLO_MODE: Confirm TASK_FILE with user before proceeding >>>

3. Analysis
Analyze code related to TASK:
Identify core files/functions
Trace code flow
Document findings in "Analysis" section
Set the "Current execution step" tp the name and number of the next planned step of the exectution protocol
<<< HALT IF NOT YOLO_MODE: Wait for analysis confirmation >>>

4. Proposed Solution
Create plan based on analysis:
Research dependencies
Add to "Proposed Solution"
NO code changes yet
Set the "Current execution step" tp the name and number of the next planned step of the exectution protocol
<<< HALT IF NOT YOLO_MODE: Get solution approval >>>

5. Iterate on the task
Review "Task Progress" history
Plan next changes
Present for approval:
[CHANGE PLAN]
- Files: [CHANGED_FILES]
- Rationale: [EXPLANATION]
If approved:
Implement changes
Append to "Task Progress":
[DATETIME]
- Modified: [list of files and code changes]
- Changes: [the changes made as a summary]
- Reason: [reason for the changes]
- Blockers: [list of blockers preventing this update from being successful]
- Status: [UNCONFIRMED|SUCCESSFUL|UNSUCCESSFUL]
Ask user: "Status: SUCCESSFUL/UNSUCCESSFUL?"
If UNSUCCESSFUL: Repeat from 5.1
If SUCCESSFUL: a. Commit? → git add [FILES] && git commit -m "[SHORT_MSG]" b. More changes? → Repeat step 5 c. Continue? → Proceed
Set the "Current execution step" tp the name and number of the next planned step of the exectution protocol
6. Task Completion
Stage changes (exclude task files):
git add --all :!.tasks/*
Commit with message:
git commit -m "[COMMIT_MESSAGE]"
Set the "Current execution step" tp the name and number of the next planned step of the exectution protocol
<<< HALT IF NOT YOLO_MODE: Confirm merge with MAIN_BRANCH >>>

7. Merge Task Branch
Merge explicitly:
git checkout [MAIN_BRANCH]
git merge task/[TASK_IDENTIFIER]_[TASK_DATE_AND_NUMBER]
Verify merge:
git diff [MAIN_BRANCH] task/[TASK_IDENTIFIER]_[TASK_DATE_AND_NUMBER]
Set the "Current execution step" tp the name and number of the next planned step of the exectution protocol
8. Delete Task Branch
Delete if approved:
git branch -d task/[TASK_IDENTIFIER]_[TASK_DATE_AND_NUMBER]
Set the "Current execution step" tp the name and number of the next planned step of the exectution protocol
9. Final Review
Complete "Final Review" after user confirmation
Set step to "All done!"
⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️

# Analysis
Architektur und Codefluss
- Entry/Provider: `src/App.tsx` setzt StatusBar, `SafeAreaProvider`, `GestureHandlerRootView`, `SettingsProvider`, `ApiProvider`, `GluestackUIProvider`, `FullScanProvider`, dann `NavigationContainer` mit `AppNavigator`.
- Navigation: `src/Nagivation/AppNavigator.tsx` nutzt Bottom Tabs (History, Camera, Settings) mit custom `tabBar` (Gluestack UI, Feather Icons). Header ist hidden. i18n via `useI18n()`.
- Screens:
  - `CameraScreen.tsx`: Kern-Flow. Menü-Auswahl (Injection/Holding/Dosing/CylinderHeating) → je nach Auswahl dynamische Template-Layouts (`TemplateLayout.*`) und Kamera-Overlay via `UiScannerCamera`. Review per Modal/Screen `ScanReviewScreen`.
  - `HistoryScreen.tsx`: Listet gespeicherte FullScans aus `FullScanContext`, Details-Modal zeigt strukturierte Daten pro Bereich.
  - `SettingsScreen.tsx`: Theme und Sprache (Persistenz in AsyncStorage via `SettingsContext`).
  - `ScanReviewScreen.tsx`: Formulare je Modus, schreibt per `upsertSection` in `FullScanContext` und schließt.
- Contexts/State:
  - `SettingsContext`: `theme`, `language`, Persistenz mit `@react-native-async-storage/async-storage`.
  - `FullScanContext`: Lädt/speichert FullScans via `Services/fullScanStore`, hält `selectedFullScanId`, `createFullScan`, `upsertSection`.
  - `ApiContext`: stellt Services (`scanService`, `injectionService`, etc.) bereit.
- Kamera/Scan:
  - `UiScannerCamera.tsx`: `react-native-vision-camera` mit `useFrameProcessor`. Nutzt lokale native Module: `@bear-block/vision-camera-ocr` (file: libs/vision-camera-ocr-bb2) und `vision-camera-screen-detector` (file: libs/vision-camera-screen-detector). Erzeugt zusätzlich Overlays für matched boxes, OCR Labels etc.
  - `hooks/useTemplateLayout.ts`: skaliert Prozent-Templates aus `config/templates` auf Bildschirm.
  - `utils/i18n.ts`: einfache Dictionary-basierte Übersetzung (de/en) mit `SettingsContext`.

Navigation Migrationspfad zu Expo Router
- Tabs-Struktur: `app/(tabs)/_layout.tsx` mit `<Tabs>`; Screens: `app/(tabs)/history.tsx`, `app/(tabs)/camera.tsx`, `app/(tabs)/settings.tsx`.
- Provider-Wrapping: `app/_layout.tsx` als Root-Layout; dort `SafeAreaProvider`, `GestureHandlerRootView`, `SettingsProvider`, `ApiProvider`, `GluestackUIProvider`, `FullScanProvider` einbetten. `StatusBar` über `expo-status-bar`.
- i18n: unverändert nutzbar, nur Importpfade anpassen (`@/` alias oder relative Pfade in Expo).

Native Abhängigkeiten / Expo
- Expo SDK 54 + RN 0.81.4. `react-native-vision-camera` erfordert `expo prebuild` und `expo-dev-client` sowie `react-native-reanimated` kompatibel (Expo 54 nutzt ~4.1.1, passt zu AppExpo).
- Lokale native libs in `libs/`: brauchen Config Plugins (app.plugin.js oder plugin packages) und Gradle/iOS integration nach `prebuild`. Alternativ können wir beide libs als npm packages mit config plugins einbinden, oder minimale plugins inline schreiben.

Import-/Pfad-Anpassungen
- Alle Imports aus `src/...` werden nach Expo unter `app`/`src` oder direkt `src` übernommen. Empfehlung: `src` auf Projektebene lassen und über tsconfig `baseUrl` + `paths` (z. B. `@/*`) auflösen.

Risikopunkte
- TypeScript not found beim Expo start: sicherstellen `typescript` als devDependency (~5.9.2 vorhanden), `tsconfig.json` korrekt, ggf. `node_modules` neu installieren.
- VisionCamera + lokale libs: Prebuild + Dev Client zwingend; EAS Build ggf. notwendig. iOS/Android permissions im `app.json` setzen.

# Proposed Solution
Struktur
- Root: `app/_layout.tsx` wrappt alle Provider (SafeArea, Gesture, Settings, Api, Gluestack, FullScan). `Stack`/`Tabs` via Expo Router.
- Tabs: `app/(tabs)/_layout.tsx` mit `<Tabs>`; drei Dateien: `history.tsx`, `camera.tsx`, `settings.tsx` importieren jeweils bisherige Implementierungen aus `src` oder migrierte Komponenten.
- Codeübernahme: komplettes `src/` aus ParaLensApp nach AppExpo root kopieren (`src` Ordner). Importpfade belassen und `tsconfig` alias `@/*` setzen.

Native Setup
- Installieren: `npm i expo-dev-client react-native-vision-camera react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-screens @react-native-async-storage/async-storage @gluestack-ui/themed @gluestack-ui/config @gluestack-style/react react-native-svg` (Versionen Expo-kompatibel prüfen; viele sind bereits vorhanden).
- Prebuild: `npx expo prebuild --non-interactive`.
- Dev Client: `npx expo run:android` / `npx expo run:ios` für lokale Tests.
- Lokale libs: Schritt 1 ohne libs lauffähig machen. Dann Config Plugins schreiben:
  - `plugins/vision-camera-ocr-bb2.js` und `plugins/vision-camera-screen-detector.js` die Gradle/iOS Pfade einbinden.
  - `app.json` → `expo.plugins` Einträge hinzufügen.

Navigation Migration
- `AppNavigator`-Logik in Tabs portieren: Custom TabBar kann mit Expo Router `screenOptions.tabBar` und `tabBar` Custom-Renderer umgesetzt werden. Icons via `@expo/vector-icons/Feather`.
- `NavigationContainer` entfällt, da Expo Router verwaltet.

TS/Build Stabilisierung
- TypeScript Fehler „not found“: `npm i -D typescript@~5.9.2` sicherstellen, ggf. `node_modules` neu installieren. Start mit `npm run start`.

Schritte (iterativ)
1) Router & Provider im Expo Projekt implementieren (ohne VisionCamera).
2) `src/` kopieren und Imports fixen.
3) Tabs/Screens anbinden (History, Camera, Settings) – Camera zunächst mit Platzhalter.
4) VisionCamera + Dev Client integrieren, Permissions setzen, dann lokale libs.
5) Smoke Tests Android/iOS, Fixes.

# Current execution step: "5. Iterate on the task"
- Eg. "Implement config plugins and wire camera"

# Task Progress
- 2025-10-06_12:31:54
  - Modified: .tasks/2025-10-06_1_Alex/rewrite-expo.md (erstellt)
  - Changes: Taskfile angelegt und Platzhalter gefüllt, Protokoll eingefügt
  - Reason: Schritt 2 des Execution Protocols
  - Blockers: Keine
  - Status: UNCONFIRMED

- 2025-10-06_12:37:18
  - Modified: .tasks/2025-10-06_1_Alex/rewrite-expo.md (Analysis, Proposed Solution, Step aktualisiert)
  - Changes: Architektur dokumentiert, Migrationsplan erstellt, nächster Schritt gesetzt
  - Reason: Schritt 3 und 4 Vorbereitung
  - Blockers: Native libs via config plugins (folgt Schrittweise)
  - Status: UNCONFIRMED

# Final Review:
[Post-completion summary]



- 2025-10-06_12:51:51
  - Modified: app/*, src/*, package.json, package-lock.json
  - Changes: Expo Router Tabs & Root Providers, src kopiert, Camera Platzhalter, deps installiert
  - Reason: Schritt 5 - erste Iteration (Navigation/Struktur)
  - Blockers: Kamera native libs (VisionCamera, lokale libs) stehen aus
  - Status: UNCONFIRMED

- 2025-10-06_13:01:03
  - Modified: app.json, babel.config.js, src/Components/UiScannerCamera.tsx, package.json, package-lock.json
  - Changes: VisionCamera + Dev Client installiert, Permissions/Plugins ergänzt, Reanimated runOnJS genutzt
  - Reason: Schritt 5 - native camera setup
  - Blockers: Lokale libs via config plugins fehlen noch
  - Status: UNCONFIRMED

- 2025-10-07_00:00:00
  - Modified: app/(tabs)/camera.tsx, app.json, plugins/vision-camera-ocr-bb2.js, plugins/vision-camera-screen-detector.js
  - Changes: Camera Tab auf UiScannerCamera umgestellt; doppelte Permission entfernt; Expo Config Plugins für lokale libs hinzugefügt; abi-filters Plugin registriert
  - Reason: Schritt 5 - lokale native libs via Config Plugins einbinden und Kamera aktivieren
  - Blockers: Prebuild/Dev Client Lauf erforderlich (expo prebuild, expo run:android/ios); iOS plugin validation ausstehend
  - Status: UNCONFIRMED

- 2025-10-07_00:10:00
  - Modified: app.json, plugins/abi-filters.js
  - Changes: Konflikte mit Autolinking behoben – lokale Plugins aus app.json entfernt; ABI Filters um armeabi-v7a ergänzt
  - Reason: Gradle Task-Dependency Fehler bei Codegen vermeiden und breitere Geräteabdeckung
  - Blockers: Falls Codegen weiterhin fehlschlägt: clean build und caches löschen; ggf. tasks dependency in local lib hinzufügen
  - Status: UNCONFIRMED

- 2025-10-07_00:18:00
  - Modified: android/settings.gradle, android/app/build.gradle
  - Changes: Manuelle include-/implementation-Einträge für lokale libs entfernt; rely on Expo/React Native Autolinking; NDK abiFilters auf arm64-v8a, armeabi-v7a, x86_64 erweitert
  - Reason: Beheben der Gradle Codegen-Task-Abhängigkeit und Duplikate der Module
  - Blockers: Falls Build erneut fehlschlägt: Gradle clean & caches löschen; ggf. Codegen tasks im lokalen Lib-Gradle verketten
  - Status: UNCONFIRMED
