# Plan: OCR Field Display Component mit History-basierter State-Anzeige

## Übersicht

Erstelle einen neuen `OcrFieldDisplay` Component, der OCR-Feldwerte hierarchisch anzeigt. Der Component nutzt bereits berechnete Daten aus der `ocrHistory`:
- **Gefilterte Werte (Grün)**: Höchste Priorität - wenn vorhanden
- **Mehrfache Werte (Blau)**: Majority-Vote Wert aus mehreren Erkennungen
- **Raw Werte (Grau)**: Fallback, wenn nur eine Erkennung

Die Logik ist bereits in `ocrHistory` vorhanden via `getFieldStats()` und `getFilteredValue()`. Der Component nutzt diese bestehenden APIs.

## Steps

### 1. Erstelle `OcrFieldDisplay.tsx`

Neuer Component unter: `components/camera/OcrFieldDisplay.tsx`

**Props:**
- `fieldId: string` - ID des Feldes
- `box: { id: string; x: number; y: number; width: number; height: number }` - Position/Größe
- `ocrHistory: { getFieldStats: (id: string) => any; getFilteredValue: (id: string) => string | null | undefined }` - History-Referenz

**State-Bestimmung Logik:**
```
1. Hole filteredValue = ocrHistory.getFilteredValue(fieldId)
2. Hole stats = ocrHistory.getFieldStats(fieldId)
3. Bestimme State:
   - if filteredValue → "filtered" (grün)
   - else if stats.uniqueValues > 1 → "multiple" (blau)
   - else → "raw" (grau)
```

### 2. Implementiere State-spezifische Render-Varianten

**Filtered (Grün):**
- HStack mit schwarzem 0.7 Hintergrund
- Text: `filteredValue`
- Farbe: `text-green-300`
- Hintergrund: `bg-green-500/30`
- Kein Label oder Suffix

**Multiple (Blau):**
- HStack mit schwarzem 0.7 Hintergrund
- Text: Majority-Vote Wert aus `stats.rawValues`
- Farbe: `text-blue-400`
- Kein Hintergrund
- Optional: Suffix wie "3x" oder "..." um zu zeigen, dass mehrfach

**Raw (Grau):**
- HStack mit schwarzem 0.7 Hintergrund
- Text: Letzter erkannter Wert (aus `stats.rawValues[0]` oder ähnlich)
- Farbe: `text-gray-400`
- Kein Hintergrund
- Kein Label oder Suffix

### 3. Implementiere Majority-Vote Funktion

Hilfsfunktion im Component: `getMajorityValue(rawValues: any[]): string | null`
- Zähle Häufigkeiten aller Werte in Array
- Return häufigsten Wert
- Bei Gleichstand: Return erster oder letzter?

Nutze `computeMajorityString` aus `@/features/ocr` falls exportiert, sonst selbst implementieren.

### 4. Modifiziere `ScannerOverlays.tsx`

In der `ocrValueLabels` Berechnung:
- Ersetze komplexe Inline-Logik mit `<OcrFieldDisplay />` Component Call
- Loop über `ocrLayoutBoxes` und rufe Component auf

**Vorher (jetzt):**
```typescript
const ocrValueLabels = ocrLayoutBoxes.map((box) => {
  const filteredValue = ocrHistory.getFilteredValue(box.id);
  const rawValue = ocrMap[box.id];
  const displayValue = filteredValue || rawValue;
  if (!displayValue) return null;
  // ... komplexer render code
});
```

**Nachher:**
```typescript
const ocrValueLabels = ocrLayoutBoxes.map((box) => {
  return <OcrFieldDisplay key={box.id} fieldId={box.id} box={box} ocrHistory={ocrHistory} />;
});
```

### 5. Position und Styling

- Absolute Positioning wie jetzt: `left: box.x`, `top: box.y + box.height + 30`
- Beibehalten: `borderRadius: 8`, `paddingVertical: 4`, `paddingHorizontal: 8`
- Beibehalten: `minWidth: 40`, `maxWidth: Math.max(box.width * 1.5, 120)`
- Beibehalten: `numberOfLines: 1`, `ellipsizeMode: "tail"` für Text-Truncation

## Implementierungs-Details

### Majority-Vote bei Multiple

Bei `stats.rawValues: [{ value: "val1" }, { value: "val1" }, { value: "val1" }, { value: "val2" }]`:
- Zähle: val1 = 3x, val2 = 1x
- Return: "val1" (Majority)
- Zeige in blau an

### State-Priorität

Die Hierarchie ist fix:
1. Filtered (wenn vorhanden)
2. Multiple (wenn uniqueValues > 1)
3. Raw (Fallback)

Nur einer wird angezeigt, nicht mehrere übereinander.

### Labels entfernen

- ✅ Entferne "(filtered)" Suffix
- ✅ Keine zusätzlichen Annotations
- ✅ Nur der Wert + Farbe kommuniziert den State

## Abhängigkeiten

- `@/components/ui/box` - Für Box-Komponenten
- `@/components/ui/text` - Für Text-Komponenten
- `@/features/ocr` - Möglicherweise `computeMajorityString` für Voting

## Testing

Visuelles Testing notwendig:
- ✅ Raw-Wert (grau) anzeigen, wenn nur einmal erkannt
- ✅ Multiple-Wert (blau) mit Majority anzeigen, wenn mehrfach unterschiedlich
- ✅ Filtered-Wert (grün mit Hintergrund) anzeigen, wenn gefilterte Wert existiert
- ✅ Keine Labels oder Suffixe
- ✅ Position und Größe beibehalten

## Weitere Überlegungen

1. **Stats-Struktur:** Sind `stats.rawValues` als `Array<{ value: string }>` verfügbar oder müssen wir sie anders auslesen?
2. **Gleichstand bei Majority:** Wie verhalten bei val1=2x, val2=2x? → Erste nehmen oder zufällig?
3. **Scrollbar-Felder:** Werden diese auch in `ocrValueLabels` angezeigt oder separater Component?
4. **Performance:** Component wird bei jedem Render aufgerufen - useMemo sinnvoll?
