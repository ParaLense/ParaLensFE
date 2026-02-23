---
name: ocr-unit-system-detection
overview: Automatisch anhand der erkannten Einheiten (Units) bestimmen, ob die Maschine im Fullscan im imperialen oder ISO-System sowie im relativen oder absoluten Modus läuft, und diese Information in der OCR-History verfügbar machen.
todos:
  - id: extend-templates-expected-units
    content: "In den JSON-Templates unter `features/templates` bei den relevanten Boxen `expectedUnits` und ggf. `expectedKeyUnits` mit Struktur `expectedUnits: { imperial: { relative: '', absolute: '' }, iso: { relative: '', absolute: '' } }` ergänzen und dort die konkret erwarteten Units (z.B. `bar`, `psi`, `m/s`, `in/s`) eintragen."
    status: completed
  - id: propagate-expected-units-to-ocr-boxes
    content: In `features/templates/ocr-template.ts` und dem Loader in `ParaLensApp` sicherstellen, dass die neuen Template-Felder (`expectedUnits`, `expectedKeyUnits`, `sameUnitAs`) in die OCR-Box-Struktur (`OcrBox` in `features/ocr/types/ocr-types.ts`) übernommen werden, sodass sie in den Parsern verfügbar sind.
    status: completed
  - id: wire-expected-units-into-parsers
    content: In `features/ocr/parsers/value-parser.ts` und `features/ocr/parsers/scrollbar-parser.ts` die bestehende Unit-Erkennung mit `detectMatchingUnit` so verwenden, dass sie gegen die in den Boxen hinterlegten `expectedUnits`/`expectedKeyUnits` prüft und erkannte Units inkl. `sameUnitAs`-Logik korrekt an `FieldAggregation` (`rawValues`, `scrollbar.keyUnit/valueUnit`) weitergibt.
    status: completed
  - id: implement-unit-system-and-mode-aggregation
    content: "In `features/ocr/hooks/useOcrHistory.ts` (oder einem dedizierten Aggregations-Modul) eine Mehrheitslogik implementieren, die pro Fullscan aus allen Boxen anhand der erkannten Units und der Template-Erwartungen zwei getrennte Entscheidungen ableitet (`detectedUnitSystem?: 'iso' | 'imperial'`, `detectedValueMode?: 'absolute' | 'relative'`) und bei fehlenden Units die bereits erkannte Einstellung verwendet."
    status: completed
  - id: expose-fullscan-unit-config
    content: "In `useOcrHistory` ein kompaktes Konfig-Objekt wie `unitConfig: { system?: 'iso' | 'imperial'; mode?: 'relative' | 'absolute' }` im Rückgabewert ergänzen und in den Fullscan-Flows (`features/fullscan/fullscan-context.tsx`, Screens wie `app/(tabs)/camera.tsx` und `app/scan-review.tsx`) so einhängen, dass UI und Speicherung die erkannte Maschinen-Einstellung nutzen können."
    status: completed
isProject: false
---

### Ziel

**Automatisch aus den im OCR erkannten Units (inkl. Scrollbar-Key-/Value-Units) ableiten, ob die Maschine im Fullscan im imperialen oder ISO-Einheitensystem sowie im relativen oder absoluten Modus betrieben wird**, basierend auf in `templates.json` definierten `expectedUnits`/`expectedKeyUnits`. Das Ergebnis soll als einfache Flags/Strings (z.B. `unitSystem: 'iso' | 'imperial'`, `valueMode: 'relative' | 'absolute'`) in der OCR-History verfügbar sein.

### Relevante Stellen im Code (vermutet)

- **OCR-Auswertung & History**: `ParaLensApp/features/ocr/useOcrHistory.ts` (dort existieren `detectMatchingUnit`, Scrollbar-Parsing, History-Aggregation).
- **Fullscan / Template-Konfiguration**: Templates-Datei wie `features/templates/[..].json` oder ähnliche, in der die OCR-Boxen (inkl. erwarteter Units) definiert sind.
- **Fullscan-Flow / Aufruf von `useOcrHistory**`: Komponenten oder Hooks, die Fullscan-Ergebnisse einspeisen und später im UI anzeigen.

### Geplanter Ansatz

- **1. Erweiterung der Templates um `expectedUnits` / `expectedKeyUnits**`
  - In jeder relevanten Box-Definition in `templates.json` werden neue Felder eingeführt:
    - Für normale Value-/Checkbox-Boxen:  
    `expectedUnits: { imperial: { relative: "", absolute: "" }, iso: { relative: "", absolute: "" } }`.
    - Für Scrollbar-Boxen zusätzlich:  
    `expectedKeyUnits: { imperial: { relative: "", absolute: "" }, iso: { relative: "", absolute: "" } }`.
  - Die vorhandene, bisherige Unit-Liste (falls vorhanden) wird durch diese Struktur ersetzt oder damit kombiniert.
  - In diese Felder werden die konkret erwarteten Unit-Strings eingetragen (z.B. `bar`, `psi`, `m/s`, `in/s`), so dass daraus eindeutig auf **imperial/iso** und **relativ/absolut** geschlossen werden kann.
- **2. Vermittlung der Template-Unit-Erwartungen in die OCR-Boxen des Laufzeit-Scans**
  - Dort, wo aus `templates.json` die Boxen für einen Fullscan erzeugt/konfiguriert werden, werden die neuen Felder in die OCR-Box-Struktur übernommen, z.B. als:
    - `box.expectedUnits` und ggf. `box.expectedKeyUnits`.
  - Die Typdefinition der OCR-Box (`OcrBox` in `useOcrHistory.ts` oder an anderer Stelle) wird bei Bedarf um diese optionalen Felder erweitert.
- **3. Unit-Erkennung pro Box mit `detectMatchingUnit` und Vergleich mit `expectedUnits**`
  - Für jede Box, für die Units erkannt werden (Value-Boxen, Scrollbar-Key-/Value-Units), wird bereits mit `detectMatchingUnit` der tatsächliche Unit-String ermittelt.
  - Neue Hilfsfunktion bauen, z.B. `classifyUnitSystem(expectedUnits, detectedUnit): { system?: 'iso' | 'imperial'; mode?: 'relative' | 'absolute' }`:
    - Vergleicht den erkannten Unit-String mit den vier möglichen Einträgen in `expectedUnits.imperial.relative`, `expectedUnits.imperial.absolute`, `expectedUnits.iso.relative`, `expectedUnits.iso.absolute`.
    - Gibt zurück, zu welchem System (`iso`/`imperial`) und welchem Modus (`relative`/`absolute`) diese Unit gehört.
    - Falls nicht eindeutig (keine Übereinstimmung), liefert sie ein leeres oder `undefined`-Ergebnis.
  - Analog für Scrollbar-Key-Units mit `expectedKeyUnits`.
- **4. Aggregation über alle Boxen zu zwei getrennten, stabilen Entscheidungen (pro Fullscan)**
  - Kontext: Die Erkennung läuft **pro Fullscan**, nicht nur pro Screen. Für jeden Fullscan gibt es eine globale Unit-Erkennungs-Session (State), die über alle Screens/Boxen hinweg geführt wird.
  - In `useOcrHistory` (oder einem verwandten Aggregations-Hook) werden **zwei** unabhängige States gepflegt:
    - `detectedUnitSystem?: 'iso' | 'imperial'` (nur ISO vs. imperial).
    - `detectedValueMode?: 'absolute' | 'relative'` (nur absolut vs. relativ).
  - Für jede Box im Fullscan:
    - `detectMatchingUnit` erkennt eine Unit.
    - Über `expectedUnits: { imperial: { relative, absolute }, iso: { relative, absolute } }` (bzw. `expectedKeyUnits` für Scrollbar-Keys) wird diese erkannte Unit klassifiziert in:
      - `system: 'iso' | 'imperial'`
      - `mode: 'relative' | 'absolute'`
  - Alle diese Einzelergebnisse werden in einer Statistik pro Fullscan gesammelt, z.B. Zähler für:
    - `iso+absolute`, `iso+relative`, `imperial+absolute`, `imperial+relative`.
  - Daraus wird eine Unit-Majority berechnet:
    - Es gibt z.B. eine Konstante `UNIT_MAJORITY_THRESHOLD = 0.5`.
    - Wenn z.B. `iso+absolute` mindestens 50 % der gültigen Treffer ausmacht und keine andere Kombination stärker ist, gilt:
      - `unitSystem = 'iso'`
      - `valueMode = 'absolute'`
      - und zwar für den **gesamten Fullscan**.
  - Solange der Threshold noch nicht erreicht ist:
    - Wird wie bisher pro Box „geraten“, also anhand der jeweils erkannten Units.
    - Die globale Config (`detectedUnitSystem`, `detectedValueMode`) bleibt `undefined` bzw. neutral.
  - Sobald der Threshold erfüllt ist:
    - Für alle weiteren Boxen im gleichen Fullscan wird diese erkannte Einstellung **fest** verwendet.
    - Wenn `detectMatchingUnit` wieder eine Unit findet, kann optional ein Plausibilitätscheck gegen die gesetzte Einstellung laufen.
    - Wenn bei einer Box **keine** Unit erkannt wird, aber `detectedUnitSystem` oder `detectedValueMode` bereits sicher sind:
      - Dann werden diese vorhandenen Werte für diese Box als Einstellung benutzt, statt erneut zu raten („wenn ich keine richtige Unit gefunden habe, nimmt es die, die eingestellt ist“).
- **5. Umgang mit nicht-erkannten Units / Fallback**
  - Wenn `detectMatchingUnit` für eine Box eine Unit findet, die in `expectedUnits` nicht vorkommt:
    - Die Box trägt zu keiner System/Mode-Entscheidung bei.
    - Optional: Logging oder ein internes Feld, in dem unbekannte Units gesammelt werden (könnte später zum Nachpflegen von Templates genutzt werden).
  - Wenn über längere Zeit / viele Scans keine stabile Entscheidung möglich ist, bleiben `detectedUnitSystem` und `detectedValueMode` `undefined` oder auf einem neutralen Wert.
- **6. Bereitstellung der erkannten Maschinen-Einstellung für Aufrufer**
  - `useOcrHistory` gibt zusätzlich zu bisherigen Werten ein kompaktes Config-Objekt zurück, z.B.:
    - `unitConfig: { system?: 'iso' | 'imperial'; mode?: 'relative' | 'absolute' }`.
  - Dieses Objekt wird im Fullscan-Flow verwendet, um z.B. die UI, Berechnungen oder weitere Plausibilitätschecks abhängig vom erkannten Modus zu steuern.
- **7. (Optional) Einfacher Test-/Debug-Mechanismus**
  - Kurze Testfälle (Unit-Tests oder Story mit simulierten Scans), bei denen:
    - Nur ISO-absolute Units vorkommen → Erwartung: `system: 'iso'`, `mode: 'absolute'`.
    - Gemischte, aber überwiegend imperial-relative Units → Erwartung: `system: 'imperial'`, `mode: 'relative'`.
  - Diese Tests stellen sicher, dass die Mehrheitslogik korrekt funktioniert und mit den in `templates.json` hinterlegten `expectedUnits`/`expectedKeyUnits` zusammenspielt.

