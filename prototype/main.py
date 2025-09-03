import cv2
import os

# --- Beispiel Template (prozentual) ---
template_boxes = [
    {"id": "box_1", "x": 1.54, "y": 4.62, "width": 4.39, "height": 3.48},
    {"id": "box_2", "x": 1.6, "y": 11.09, "width": 4.22, "height": 3.44},
    {"id": "box_3", "x": 1.51, "y": 17.56, "width": 4.45, "height": 3.3},
    {"id": "box_4", "x": 1.62, "y": 23.98, "width": 4.27, "height": 3.35},
    {"id": "box_5", "x": 1.46, "y": 36.95, "width": 4.45, "height": 3.26},
    {"id": "box_6", "x": 1.56, "y": 43.37, "width": 4.33, "height": 3.39},
    {"id": "box_7", "x": 1.45, "y": 49.83, "width": 4.39, "height": 3.44},
    {"id": "box_8", "x": 1.56, "y": 56.23, "width": 4.27, "height": 3.26},
    {"id": "box_9", "x": 1.59, "y": 62.56, "width": 4.27, "height": 3.26},
    {"id": "box_10", "x": 1.54, "y": 68.76, "width": 4.33, "height": 3.3},
    {"id": "box_11", "x": 9.79, "y": 0.04, "width": 4.36, "height": 3.37},
]

# Hilfsfunktion: IoU (Intersection over Union) zwischen 2 Boxen
def iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0]+boxA[2], boxB[0]+boxB[2])
    yB = min(boxA[1]+boxA[3], boxB[1]+boxB[3])

    interW = max(0, xB-xA)
    interH = max(0, yB-yA)
    interArea = interW * interH

    boxAArea = boxA[2]*boxA[3]
    boxBArea = boxB[2]*boxB[3]

    union = boxAArea + boxBArea - interArea
    return interArea / union if union > 0 else 0

# --- Video-Stream öffnen ---
# Niedrige Latenz für RTSP (falls FFmpeg-Backend verfügbar)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = os.environ.get(
    "OPENCV_FFMPEG_CAPTURE_OPTIONS",
    "rtsp_transport;udp|max_delay;0"
)
cap = cv2.VideoCapture("rtsp://192.168.1.183:8080/h264.sdp")
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

while True:
    # Puffer abbauen, damit immer das aktuellste Frame verarbeitet wird
    for _ in range(3):
        cap.grab()
    ret, img = cap.retrieve()
    if not ret:
        ret, img = cap.read()
    if not ret:
        break

    # Bild ggf. drehen
    img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    h, w = img.shape[:2]

    # --- Bildschirm-Template berechnen (80% Breite, 3:4, mittig) ---
    screen_w = int(w * 0.8)
    screen_h = int(screen_w * 4 / 3)
    screen_x = (w - screen_w) // 2
    screen_y = (h - screen_h) // 2

    # Template-Boxen in Pixelkoordinaten transformieren
    template_px = []
    for b in template_boxes:
        x = screen_x + int(b["x"] / 100 * screen_w)
        y = screen_y + int(b["y"] / 100 * screen_h)
        bw = int(b["width"] / 100 * screen_w)
        bh = int(b["height"] / 100 * screen_h)
        template_px.append((x, y, bw, bh))

    # Kanten finden
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Tracken, ob jede Template-Box mindestens ein passendes Contour-Rechteck hat
    matched_template_boxes = [False] * len(template_px)

    for cnt in contours:
        approx = cv2.approxPolyDP(cnt, 0.02*cv2.arcLength(cnt, True), True)
        if len(approx) == 4:
            x, y, bw, bh = cv2.boundingRect(approx)

            # Mit allen Template-Boxen vergleichen und bestes Match merken
            best_iou = 0
            best_idx = -1
            for idx, tb in enumerate(template_px):
                current_iou = iou((x,y,bw,bh), tb)
                if current_iou > best_iou:
                    best_iou = current_iou
                    best_idx = idx

            # Match gefunden?
            if best_iou > 0.3 and best_idx != -1:
                cv2.rectangle(img, (x,y), (x+bw,y+bh), (0,0,255) , 2)
                matched_template_boxes[best_idx] = True

    # Template-Screen zeichnen (grün)
    cv2.rectangle(img, (screen_x, screen_y), (screen_x+screen_w, screen_y+screen_h), (0,255,0), 2)

    # Template-Boxen blau einzeichnen
    for x,y,bw,bh in template_px:
        cv2.rectangle(img, (x,y), (x+bw,y+bh), (255,0,0), 1)

    # Wenn alle Template-Boxen gematcht wurden, zeige Frame in neuem Fenster
    if len(matched_template_boxes) > 0 and matched_template_boxes.count(True) >= len(matched_template_boxes)*0.8:
        cv2.imshow("All Boxes Matched", cv2.resize(img, (0,0), fx=0.5, fy=0.5))
    

    cv2.imshow("Template Matching Rectangles", cv2.resize(img, (0,0), fx=0.5, fy=0.5))

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
