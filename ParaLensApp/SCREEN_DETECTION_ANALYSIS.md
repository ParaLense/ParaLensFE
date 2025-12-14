# Screen Detection & Box Matching Analyse

## Übersicht
Die Screen Detection Pipeline erkennt Displays in Kamerabildern und matched Template-Boxen mit erkannten Konturen über Homographie-Transformation.

---

## 1. Pipeline Flow

### Phase 1: Bildvorverarbeitung (`ScreenFrameProcessorPlugin.kt`)

```
Kamera Frame (Image)
  ↓
1. Y-Plane zu Graustufen-Mat konvertieren
  ↓
2. Optional: 90° Rotation (rotate90CW)
  ↓
3. CLAHE Normalisierung (Kontrast-Anpassung)
  ↓
4. ROI-Bereiche definieren (outer/inner)
```

**Key Code:**
```kotlin
val gray = ImageProcessing.yPlaneToGrayMat(mediaImage)
val normalized = ImageProcessing.preprocessImage(img)  // CLAHE
val roiOuterPx = Utils.normRectToPx(roiOuterArg, frameW, frameH)
val roiInnerPx = Utils.normRectToPx(roiInnerArg, frameW, frameH)
```

---

## 2. Edge Detection (`ImageProcessing.createEdgeMaps`)

Es werden **zwei separate Edge-Maps** erstellt:

### Screen Edges (für Display-Umriss)
- **Blur:** GaussianBlur 5x5, sigma=1.5
- **Threshold:** Adaptiv basierend auf Bild-Mittelwert
  - `lower = (1 - 0.33) * mean`
  - `upper = (1 + 0.33) * mean`
- **Canny:** Dynamische Thresholds
- **Morphology:** Closing Operation (3x3) zum Verbinden von Lücken

### Detail Edges (für Template-Boxen)
- **Blur:** GaussianBlur 3x3, sigma=1.0
- **Threshold:** 
  - `lower = max(20, mean * 0.3)`
  - `upper = min(200, mean * 0.9)`
- **Canny:** Für feinere Details

**Code:**
```kotlin
val (screenEdges, detailEdges) = ImageProcessing.createEdgeMaps(normalized)
```

---

## 3. Contour Detection

### Screen Contours (`findBestScreenCandidate`)
- **Ziel:** Finde den Display-Umriss (4-Eck)
- **Filter:**
  - Nur 4-Ecke (approxPolyDP mit 2% Perimeter-Toleranz)
  - Muss innerhalb ROI sein (`rectWithinRoi`)
  - Bestes Quad wird gespeichert

**Code:**
```kotlin
val screenContours = ArrayList<MatOfPoint>()
Imgproc.findContours(screenEdges, screenContours, ...)
val (bestRect, bestQuad, bestScore) = ScreenDetection.findBestScreenCandidate(...)
```

### Detail Contours (`findContourRects`)
- **Ziel:** Finde alle rechteckigen Konturen für Template-Matching
- **Konvertierung:** Konturen → Rechtecke (x, y, w, h)
- Nur 4-Ecke werden akzeptiert

**Code:**
```kotlin
val contourRects = ImageProcessing.findContourRects(detailEdges)
```

---

## 4. Homographie (`buildScreenHomography`)

Transformiert Template-Koordinaten in Bild-Koordinaten:

**Source Points (Template):**
```
(0, 0)                    (templateW, 0)
     ┌─────────────────┐
     │                 │
     │   Template      │
     │                 │
     └─────────────────┘
(0, templateH)        (templateW, templateH)
```

**Destination Points (Bild):**
- Die 4 Ecken des erkannten Displays (`bestQuad`)

**Methode:**
```kotlin
val H = Calib3d.findHomography(src, dst, Calib3d.RANSAC, 3.0)
```

---

## 5. Template Box Matching (`matchTemplateBoxes`)

### Schritt 1: Template-Boxen projizieren
Jede Template-Box (in Prozent) wird via Homographie in Bild-Koordinaten projiziert:

```kotlin
val pts = MatOfPoint2f(*ImageProcessing.percentBoxToPts(b, templateW, templateH))
Core.perspectiveTransform(pts, proj, H)  // Projiziere auf Bild
val projectedRect = boundingBox(proj)    // Rechteck aus Projektion
```

### Schritt 2: IoU Matching
Für jede projizierte Box wird das beste Match aus `contourRects` gesucht:

```kotlin
var best = 0.0
for (cr in contourRects) {
    val iou = Utils.iou(projectedRect, cr)
    if (iou > best) {
        best = iou
        bestRectForThis = cr
    }
}
```

### Schritt 3: Match akzeptieren
Wenn `iou >= minIouForMatch` (Default: 0.30):
- Match gezählt
- Rechteck in `matchedArr` gespeichert

**Accuracy Berechnung:**
```kotlin
accuracy = matches / totalTemplateBoxes
detected = (accuracy >= accuracyThreshold)  // Default: 0.40
```

---

## 6. OCR Processing (wenn `runOcr = true`)

### Warping
Das Bild wird in Template-Koordinaten transformiert:

```kotlin
val warped = Mat(outputH, outputW, CvType.CV_8UC1)
Imgproc.warpPerspective(img, warped, H.inv(), Size(outputW, outputH))
```

### OCR Box Processing
Jede OCR-Box wird im gewarpten Bild verarbeitet:

**Für Checkboxes:**
- Mean-Pixel-Wert
- Vergleich mit `checkboxThreshold`
- `checked = meanValue <= threshold`

**Für Scrollbars:**
- ML Kit OCR auf gesamten ROI
- Rückgabe als Array von Text-Blöcken

**Für Values:**
- ML Kit OCR
- Text + Number parsing

---

## 7. Debug & Visualization

### Debug Streams (via `DebugHttpStreamer`):
- `gray` - Graustufenbild
- `rotated` - Rotiertes Bild
- `normalized` - CLAHE-normalisiert
- `screenEdges` - Screen Edge Map
- `detailEdges` - Detail Edge Map
- `screenContourRects` - Erkannte Screen-Konturen (grün)
- `detailContourRects` - Detail-Konturen (rot)
- `templateBoxes` - Projizierte Template-Boxen (blau)
- `ocrTemplateBoxes` - OCR-Boxen auf warped image
- `warped` - Finales gewarptes Bild
- `overlay` - Kombinierte Visualisierung
- `combinedDebug` - Alle Elemente zusammen

### Farbcodierung:
- **Grün:** Screen-Konturen & Matched Boxes
- **Rot:** Detail-Konturen & Outer ROI
- **Blau:** Template-Boxen (projiziert)
- **Gelb:** Value OCR Boxes
- **Magenta:** Scrollbar OCR Boxes
- **Cyan:** Checkbox OCR Boxes

---

## 8. Probleme & Potenzielle Verbesserungen

### Aktuelle Probleme:

1. **Checkbox Detection gibt immer `false` zurück:**
   - **Ursache:** Threshold zu niedrig oder Logik invertiert
   - **Lösung:** Debug-Logs prüfen (`meanValue`, `threshold`)
   - Mögliche Anpassung: `checked = meanValue >= threshold` testen

2. **Box Matching:**
   - `minIouForMatch = 0.30` könnte zu streng sein
   - Bei schlechter Beleuchtung können Details fehlen

3. **Edge Detection:**
   - Dynamische Thresholds können bei extremen Lichtverhältnissen fehlschlagen
   - Screen Edges sollten robuster sein

### Verbesserungsvorschläge:

1. **Checkbox Threshold Tuning:**
   - Histogramm-Analyse für besseren Threshold
   - Otsu's Method für automatischen Threshold
   - Invert-Option in Template-Konfiguration

2. **Template Matching:**
   - Multi-Scale Template Matching
   - Corner Feature Detection zusätzlich zu IoU
   - Confidence-Score statt nur IoU

3. **Robustheit:**
   - Temporal Smoothing (mehrere Frames kombinieren)
   - Adaptive ROI basierend auf erkanntem Screen
   - Fallback auf Template-basierte Suche wenn Homographie fehlschlägt

---

## 9. Datenfluss Diagramm

```
Frame
  ↓
Preprocessing (CLAHE, Rotation)
  ↓
Edge Detection (Screen + Detail)
  ↓
┌─────────────────┬──────────────────┐
│                 │                  │
Screen Contours   Detail Contours    │
  ↓                  ↓               │
Best Quad         Contour Rects      │
  ↓                  ↓               │
Homography (H)   Template Matching   │
  ↓                  ↓               │
Warped Image     Matched Boxes       │
  ↓                  ↓               │
OCR Processing   Accuracy            │
  ↓                  ↓               │
OCR Results      Detection Status    │
```

---

## 10. Wichtige Parameter

| Parameter | Default | Beschreibung |
|-----------|---------|--------------|
| `accuracyThreshold` | 0.40 | Mindest-Accuracy für Detection |
| `minIouForMatch` | 0.30 | Mindest-IoU für Box-Match |
| `templateTargetW` | 1200 | Template-Breite |
| `templateTargetH` | 1600 | Template-Höhe |
| `roiOuter` | 0.10, 0.05, 0.80, 0.90 | Äußerer ROI (x, y, w, h) |
| `roiInner` | 0.30, 0.20, 0.45, 0.60 | Innerer ROI (x, y, w, h) |
| `checkboxThreshold` | 214.0 | Checkbox Mean-Value Threshold |
| `rotate90CW` | false | 90° Rotation aktivieren |

---

## Fazit

Die Screen Detection verwendet eine robuste Pipeline mit:
- ✅ Zwei-Stufen Edge Detection (Screen + Detail)
- ✅ Homographie-basierte Template-Matching
- ✅ IoU-basierte Box-Verifikation
- ✅ Debug-Visualisierung
- ⚠️ Checkbox Detection benötigt Threshold-Tuning
- ⚠️ Box Matching könnte robuster sein bei schlechter Beleuchtung









