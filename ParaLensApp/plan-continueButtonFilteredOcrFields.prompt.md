# Plan: Continue-Button bei gefilterten OCR-Feldern

## Ziel
Definiere einen „ready"-Status: Alle OCR-Felder sind „filtered" (grün) und jedes Feld hat mindestens 50 Scans. Der Status wird zentral im OCR-Hook berechnet, dann über `UiScannerCamera` an die Auswahl-Logik weitergegeben und in `camera.tsx` zum Blau-Highlight des Continue-Buttons genutzt.

## Implementation Steps

### Step 1: Ergänze `getReadyStatus`-Logik in `useOcrHistory.ts`
- Neue Methode `getReadyStatus(templateFieldIds?: string[])` in `useOcrHistory` Hook
- Prüfe Template-IDs: alle müssen in `fieldAggregations` existieren
- Validiere für jedes Feld:
  - `totalScans >= 50` (Konstante `MIN_SCANS_FOR_READY = 50`)
  - `getFilteredValue(fieldId)` !== undefined (= "filtered" Status)
  - Für Scrollbars: alle Segmente müssen `state === "filtered"` sein
- Rückgabewert: `{ isReady: boolean; filteredCount: number; totalRequired: number }`

### Step 2: Erweitere `onOcrUpdate` Payload in `UiScannerCamera.tsx`
- Aktualisiere `UiScannerCameraProps.onOcrUpdate` Callback-Typ um `isReady?: boolean`
- Vor dem `onOcrUpdateJS` Call:
  - Rufe `ocrHistory.getReadyStatus(templateFieldIds)` auf
  - Übergebe `isReady` im Payload
- Beispiel:
  ```typescript
  const readyStatus = ocrHistory.getReadyStatus(ocrTemplate.map(t => t.id));
  onOcrUpdateJS({
    bestFields,
    ocrMap,
    unitConfig: ocrHistory.unitConfig,
    isReady: readyStatus.isReady
  });
  ```

### Step 3: Update `OcrSnapshot` Type in `use-scan-selection.ts`
- Ergänze `OcrSnapshot` um `isReady?: boolean` Property
- Update Reducer-Action `setOcrSnapshot` (bereits vorhanden, kein Change nötig)
- Typ wird automatisch über Spread propagiert

### Step 4: Nutze `isReady` in `camera.tsx`
- Im Continue-Button:
  - Prüfe `ocrSnapshot?.isReady`
  - Wenn `true`: Button backgroundColor wird Blau (`#3B82F6` oder gluestack `action="primary"` mit custom color)
  - Optional: `disabled={!ocrSnapshot?.isReady}` zum Deaktivieren
- Beispiel Button-Styling:
  ```typescript
  <Button
    variant={ocrSnapshot?.isReady ? "solid" : "outline"}
    action={ocrSnapshot?.isReady ? "primary" : "secondary"}
    onPress={goReview}
  >
    <Text>{t("continue") ?? "Continue"}</Text>
  </Button>
  ```

## Konstanten
```typescript
// In ParaLensApp/features/ocr/constants.ts oder useOcrHistory.ts
const MIN_SCANS_FOR_READY = 50;
```

## Type Definitions

### useOcrHistory Return
```typescript
{
  // ...existing methods...
  getReadyStatus: (templateFieldIds?: string[]) => {
    isReady: boolean;
    filteredCount: number;
    totalRequired: number;
  };
}
```

### OcrSnapshot (updated)
```typescript
type OcrSnapshot = {
  bestFields: OcrFieldResult[];
  ocrMap: Record<string, string>;
  unitConfig?: {
    system?: UnitSystem;
    mode?: ValueMode;
  };
  screenshotBase64?: string;
  isReady?: boolean; // NEW
} | null;
```

### onOcrUpdate Payload (updated)
```typescript
{
  bestFields: OcrFieldResult[];
  ocrMap: Record<string, string>;
  unitConfig?: {
    system?: UnitSystem;
    mode?: ValueMode;
  };
  isReady?: boolean; // NEW
}
```

## Wichtige Design-Entscheidungen

### 1. Welche Felder zählen als „alle OCR-Felder"?
**Decision: Template-IDs von `loadOcrTemplate(currentLayout)`**
- Reason: Layout-spezifisch, nur relevante Felder werden geprüft
- Fallback: Wenn kein Template vorhanden → `isReady = false`

### 2. Scrollbar-Kriterium
**Decision: Alle Segmente müssen `state === "filtered"` sein**
- Reason: Strikteres Kriterium für robuste Daten
- Alternative: Mindestens eins → zu locker, zu viele False-Positives

### 3. Scan-Mindest-Anzahl
**Decision: Konstante `MIN_SCANS_FOR_READY = 50`**
- Location: In `useOcrHistory` oder separater OCR-Constants
- Reason: Benutzer kann bei Bedarf anpassen, zentrale Stelle

## Files zu ändern
1. `ParaLensApp/features/ocr/hooks/useOcrHistory.ts` – `getReadyStatus` Methode
2. `ParaLensApp/components/UiScannerCamera.tsx` – `onOcrUpdate` Payload + Call mit `isReady`
3. `ParaLensApp/features/camera/use-scan-selection.ts` – `OcrSnapshot` Type
4. `ParaLensApp/app/(tabs)/camera.tsx` – Continue-Button Styling mit `isReady`

## Testing
- Manuell: Scanne bis >= 50 Scans, prüfe ob Button Farbe wechselt (grau → blau)
- Prüfe: Bei < 50 Scans bleibt Button grau
- Prüfe: Bei nicht-gefilterten Feldern bleibt Button grau
- Debug: Console.log `readyStatus` in `UiScannerCamera` zur Verifikation

## Anmerkungen
- UI-Feedback: Optional: "Scans: 45/50" Badge neben Button zeigen
- Performance: `getReadyStatus` ist O(n) mit n = Template-Feld-Count → negligible
- Fallback: Wenn Template leer oder undefined → `isReady = false` sicher

