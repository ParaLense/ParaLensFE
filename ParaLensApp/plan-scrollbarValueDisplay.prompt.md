# Plan: ScrollbarValueDisplay Component für strukturierte Scrollbar-Anzeige

## Übersicht

Erstelle einen neuen `ScrollbarValueDisplay` Component, der Scrollbar-Werte benutzerfreundlich anzeigt: HStack mit VStack Key/Value-Paare links + VStack Units rechts.

### Steps

1. Erstelle `[components/camera/ScrollbarValueDisplay.tsx](file)` mit Props: `scrollbarValue?: ParsedScrollbarValue`, `fieldId: string`, `box: OcrBox`.

2. Implementiere Komponenten-Struktur:
   - **Äußer HStack**: Horizontal-Container mit Padding
   - **Linke VStack**: Array von Key/Value-Rows (z.B. "0.00" oben, "8.00" unten)
   - **Rechte VStack**: keyUnit und valueUnit labels (wenn vorhanden)

3. Nutze Hilfsfunktionen aus `scrollbar-utils.ts`:
   - `buildRowsFromScrollbar()` → gibt Array mit Key/Value Pairs
   - `extractScrollbarUnits()` → gibt `{ keyUnit, valueUnit }`
   - `formatScrollbarNumber()` → formatiert zu 2 Dezimalstellen

4. Modifiziere `OcrFieldDisplay.tsx`:
   - Detect ob Field ein Scrollbar ist (aus `stats.typeBreakdown.scrollbar > 0`)
   - Falls ja: Zeige `<ScrollbarValueDisplay />` statt normalen Text

5. Hole `ParsedScrollbarValue` Daten aus `ocrHistory`:
   - Nutze `ocrHistory.getFieldStats(fieldId)` → hat `.scrollbar` Property
   - Oder verwende neue Methode in History um Scrollbar-Struktur zu bekommen

6. Teste visuell: Scrollbar-Werte als strukturierte Key/Value pairs mit Units.

### ScrollbarValueDisplay Struktur

**Layout-Beispiel:**
```
┌─────────────────────────────┐
│ ┌──────────┐   ┌─────────┐  │
│ │ 0.00 (k) │   │ mm      │  │
│ │  8.00 (v)│   │ bar     │  │
│ └──────────┘   └─────────┘  │
└─────────────────────────────┘
```

- **Links VStack**: Mehrere Rows à 2 Zeilen (Key oben, Value unten)
- **Rechts VStack**: keyUnit über valueUnit (Spalte 3, optional)
- **Spacing**: Kleines Gap zwischen Keys/Values und Units

### Steps für ScrollbarValueDisplay

1. **Props:** `scrollbarValue?: ParsedScrollbarValue`, `fieldId: string`, `box: OcrBox`

2. **Daten extrahieren:**
   - `buildRowsFromScrollbar(scrollbarValue)` → Array aller Key/Value Rows
   - `extractScrollbarUnits(scrollbarValue)` → { keyUnit?, valueUnit? }

3. **Jedes Pair einzeln rendern:**
   ```typescript
   const rows = buildRowsFromScrollbar(scrollbarValue);
   rows.forEach(row => {
     // row.v = key value (formatiert)
     // row.v2 = value value (formatiert)
   });
   ```

4. **Layout aufbauen:**
   - VStack für alle Key-Werte (nebeneinander mit Gap)
   - VStack für alle Value-Werte (nebeneinander mit Gap)
   - VStack für Units (rechts, optional)

5. **Styling:**
   - Schwarzer 0.7 Hintergrund wie andere Display-Types
   - Text-Farbe abhängig von State (grün/blau/grau)
   - Kompaktes Spacing

### Integration in OcrFieldDisplay

In `OcrFieldDisplay.tsx`:
- Detect Scrollbar-Feld: `stats.typeBreakdown.scrollbar > 0`
- Falls Scrollbar: Zeige `<ScrollbarValueDisplay />` statt normalen Text
- Scrollbar-Data: Hole aus `stats.scrollbar` (ParsedScrollbarValue)

## Weitere Überlegungen

1. **Stats-Struktur:** Sind `stats.rawValues` als `Array<{ value: string }>` verfügbar oder müssen wir sie anders auslesen?
2. **Gleichstand bei Majority:** Wie verhalten bei val1=2x, val2=2x? → Erste nehmen oder zufällig?
3. **Scrollbar-Felder:** Werden diese auch in `ocrValueLabels` angezeigt oder separater Component?
4. **Performance:** Component wird bei jedem Render aufgerufen - useMemo sinnvoll?
5. **Max-Paare:** Bei 10+ Key/Value Pairs - Alle anzeigen oder begrenzen auf max 5?
6. **Spacing zwischen Pairs:** Gap zwischen Key-Spalten justierbar?
