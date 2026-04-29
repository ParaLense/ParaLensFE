# Plan: Screenshot-Bilder pro Section im FullScan speichern und in Excel exportieren

**Status: ✅ IMPLEMENTIERT**

Du möchtest bei jedem Scan-Vorgang ein Screenshot-Bild des erkannten Bildschirms abspeichern, um später nachvollziehen zu können, ob das OCR-Ergebnis korrekt ist. Die Bilder sollen lokal im FullScan gespeichert und beim Excel-Export auf separate Tabellen eingefügt werden.

## Steps

1. ✅ **FullScanDto erweitern in [`types.ts`](features/fullscan/types.ts)**: Neue Felder `SectionScreenshot` und `SectionScreenshots` hinzugefügt sowie `sectionScreenshots` im `FullScanDto`.

2. ✅ **`upsertSection` in [`fullscan-context.tsx`](features/fullscan/fullscan-context.tsx) erweitern**: Die Methode akzeptiert jetzt optional ein `screenshot: { imageBase64: string; subMode?: string }` und speichert es im FullScan unter dem Key `${section}_${subMode}`.

3. ✅ **Screenshot im [`use-scan-selection.ts`](features/camera/use-scan-selection.ts) übergeben**: `OcrSnapshot` Typ erweitert um `screenshotBase64`.

4. ✅ **Screenshot in [`UiScannerCamera.tsx`](components/UiScannerCamera.tsx) mitgeben**: `onOcrUpdate` Callback erweitert um `screenshotBase64` (das `base64Image` vom Frame Processor).

5. ✅ **Screenshot via Navigation in [`camera.tsx`](app/(tabs)/camera.tsx) übergeben**: `goReview()` serialisiert jetzt auch `screenshotBase64` im `ocrData` Parameter.

6. ✅ **Screenshot im [`ScanReviewScreen.tsx`](features/scan-session/components/ScanReviewScreen.tsx) parsen und speichern**: Beim Speichern wird das Screenshot an `upsertSection` mit dem entsprechenden `subMode` übergeben.

7. ✅ **Excel-Export in [`excel-export.ts`](features/fullscan/excel-export.ts) erweitern**: Pro gespeichertem Screenshot wird ein neues Worksheet erstellt mit Metadaten (Timestamp, SubMode, Base64-Länge).

## Technische Details

### Datenstruktur

```typescript
interface SectionScreenshot {
    imageBase64: string;  // Base64-encoded JPEG
    timestamp: string;    // ISO timestamp
    subMode?: string;     // z.B. 'mainMenu', 'subMenuGraphic', 'switchType'
}

type SectionScreenshots = {
    [key: string]: SectionScreenshot;  // Key: section oder section_subMode
};
```

### Excel-Worksheets

Die Excel-Datei enthält folgende Worksheets:

1. **Parameters** - Alle Scan-Daten (wie bisher)
2. **Injection** - Screenshots für Injection (mainMenu, subMenuGraphic, switchType)
3. **Holding Pressure** - Screenshots für Holding Pressure (mainMenu, subMenuGraphic)
4. **Dosing** - Screenshots für Dosing (mainMenu, subMenuGraphic)
5. **Cylinder Heating** - Screenshots für Cylinder Heating

Jedes Screenshot-Worksheet enthält:
- Header mit Scan-ID, Author, Datum
- Pro Unterkategorie: Label, Timestamp und das **echte eingebettete Bild**

### Technische Umsetzung

- **exceljs** wird für die Excel-Generierung mit Bild-Unterstützung verwendet
- Bilder werden als JPEG mit `workbook.addImage()` und `worksheet.addImage()` eingefügt
- Base64 → ArrayBuffer Konvertierung für React Native Kompatibilität

### Limitierungen

- **SheetJS Community Version**: Unterstützt keine eingebetteten Bilder. Die Base64-Daten werden als Text in Zellen gespeichert.
- **AsyncStorage**: Bei sehr vielen/großen Screenshots könnte das Storage-Limit erreicht werden. Für Produktions-Use könnte man die Bilder als Dateien speichern und nur Pfade im FullScanDto referenzieren.

