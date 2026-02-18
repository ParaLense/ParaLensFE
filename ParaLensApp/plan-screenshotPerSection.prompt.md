# Plan: Screenshot-Bilder pro Section im FullScan speichern und in Excel exportieren

Du möchtest bei jedem Scan-Vorgang ein Screenshot-Bild des erkannten Bildschirms abspeichern, um später nachvollziehen zu können, ob das OCR-Ergebnis korrekt ist. Die Bilder sollen lokal im FullScan gespeichert und beim Excel-Export auf separate Tabellen eingefügt werden.

## Steps

1. **FullScanDto erweitern in [`types.ts`](c:\Projects\ParaLens\ParalensFE\ParaLensApp\features\fullscan\types.ts)**: Neue optionale Felder für `sectionScreenshots` hinzufügen (z.B. `{ [section: ScanMenu]: string }` für base64-Bilder pro Section).

2. **`upsertSection` in [`fullscan-context.tsx`](c:\Projects\ParaLens\ParalensFE\ParaLensApp\features\fullscan\fullscan-context.tsx) erweitern**: Die Methode anpassen, um optional ein `screenshotBase64` mit dem Payload zu akzeptieren und im FullScan zu speichern.

3. **Screenshot im [`ScanReviewScreen.tsx`](c:\Projects\ParaLens\ParalensFE\ParaLensApp\features\scan-session\components\ScanReviewScreen.tsx) übergeben**: Den `ocrData`-Parameter erweitern, um das `base64Image` (das in `UiScannerCamera` bereits existiert) an den Review-Screen zu übergeben.

4. **Screenshot beim Speichern in [`ScanReviewScreen.tsx`](c:\Projects\ParaLens\ParalensFE\ParaLensApp\features\scan-session\components\ScanReviewScreen.tsx) mitgeben**: Beim Button-Press "Speichern" das Screenshot-Bild an `upsertSection` übergeben.

5. **Excel-Export in [`excel-export.ts`](c:\Projects\ParaLens\ParalensFE\ParaLensApp\features\fullscan\excel-export.ts) erweitern**: Pro gespeichertem Screenshot ein neues Worksheet anlegen und das Bild (via `xlsx`-Bibliothek oder als externe Datei-Referenz) einfügen.

## Further Considerations

1. **Speichergröße**: Base64-Bilder können sehr groß sein. Sollen die Bilder komprimiert (z.B. JPEG-Qualität reduzieren) oder als separate Dateien im Filesystem gespeichert werden, statt direkt in AsyncStorage? **Empfehlung: Bilder als Dateien speichern, nur Pfade in FullScanDto.**

2. **Excel-Bild-Unterstützung**: Die `xlsx`-Bibliothek in React Native hat eingeschränkte Bild-Unterstützung. Soll das Bild als eingebettetes Bild im Worksheet erscheinen (komplexer, evtl. SheetJS Pro nötig) oder als separates Attachment/Link? **Empfehlung: Bild als externes Attachment oder Base64-Daten in einer Zelle.**

3. **Welche Sections sollen Screenshots haben?** Nur die aktuelle Section beim Speichern, oder ein globaler Screenshot pro FullScan?

