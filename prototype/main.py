import cv2
import os
import json
import numpy as np

# --- Default-Template (prozentual) ---
DEFAULT_TEMPLATE_BOXES = [
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


BOX_ACCURACY_THRESHOLD = 0.6  # Mindestens 70% der Boxen müssen erkannt werden

# JSON-Template laden (Datei mit Liste von Box-Objekten)
def load_template_from_json(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("Template JSON muss eine Liste sein.")

        normalized_boxes = []
        for item in data:
            # Nur Elemente mit den benötigten Schlüsseln übernehmen
            if not all(k in item for k in ("id", "x", "y", "width", "height")):
                continue
            normalized_boxes.append({
                "id": str(item["id"]),
                "x": float(item["x"]),
                "y": float(item["y"]),
                "width": float(item["width"]),
                "height": float(item["height"]),
            })

        if not normalized_boxes:
            raise ValueError("Keine gültigen Boxen in JSON gefunden.")
        return normalized_boxes
    except Exception as e:
        print(f"Fehler beim Laden der Template-Datei '{file_path}': {e}")
        return None

# Fester JSON-Pfad fürs schnelle Testen (ohne CLI-Argumente)
JSON_TEMPLATE_PATH = os.path.join(
    os.path.dirname(__file__),
    "templates",
    "0.1 Bildschirmaufbau_Screendetection.json",
)

# Template-Boxen festlegen (JSON, mit Fallback auf Default)
template_boxes = load_template_from_json(JSON_TEMPLATE_PATH) or DEFAULT_TEMPLATE_BOXES

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

# RTSP-Stream von IP-Kamera/Smartphone mittels "IP Webcam" App
cap = cv2.VideoCapture("rtsp://192.168.1.183:8080/h264.sdp")
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

ui_screen_capture = None
ui_screen_boxes = None

while ui_screen_capture is None:
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
    matched_template_boxes = [None] * len(template_px)

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
                matched_template_boxes[best_idx] = (x,y, x+bw,y+bh)

    # Template-Screen zeichnen (grün)
    cv2.rectangle(img, (screen_x, screen_y), (screen_x+screen_w, screen_y+screen_h), (0,255,0), 2)

    # Template-Boxen blau einzeichnen
    for x,y,bw,bh in template_px:
        cv2.rectangle(img, (x,y), (x+bw,y+bh), (255,0,0), 1)


    # Wenn alle Template-Boxen gematcht wurden, zeige Frame in neuem Fenster
    accuracy = 1 - matched_template_boxes.count(None) / len(matched_template_boxes)
    if len(matched_template_boxes) > 0 and accuracy > BOX_ACCURACY_THRESHOLD:
        cv2.imshow("All Boxes Matched", cv2.resize(img, (0,0), fx=0.5, fy=0.5))
        ui_screen_capture = img
        ui_screen_boxes = matched_template_boxes
        cv2.waitKey(0
                    )
        break
    

    cv2.imshow("Template Matching Rectangles", cv2.resize(img, (0,0), fx=0.5, fy=0.5))

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()

def percent_box_to_pts(box, tw, th):
    """4 Ecken der Template-Box (in Template-Pixeln) im Uhrzeigersinn: TL, TR, BR, BL"""
    x, y, w, h = box["x"], box["y"], box["width"], box["height"]
    tl = [x/100.0*tw,           y/100.0*th]
    tr = [(x+w)/100.0*tw,       y/100.0*th]
    br = [(x+w)/100.0*tw, (y+h)/100.0*th]
    bl = [x/100.0*tw,     (y+h)/100.0*th]
    return np.float32([tl, tr, br, bl])

def rect_to_pts_xyxy(rect):
    """(x,y,w,h) -> 4 Ecken im Uhrzeigersinn: TL, TR, BR, BL"""
    x, y, w, h = rect
    tl = [x,     y]
    tr = [x+w,   y]
    br = [x+w, y+h]
    bl = [x,   y+h]
    return np.float32([tl, tr, br, bl])

def build_correspondences(template_boxes, matches, tw, th):
    """Sammelt Corner-Paare aus allen vorhandenen Matches."""
    src_pts = []
    dst_pts = []
    for b, m in zip(template_boxes, matches):
        if m is None:
            continue
        tb = percent_box_to_pts(b, tw, th)   # 4 Punkte in Template
        ib = rect_to_pts_xyxy(m)             # 4 Punkte im Bild
        src_pts.append(tb)
        dst_pts.append(ib)
    if len(src_pts) == 0:
        return None, None
    src_pts = np.vstack(src_pts)  # (N*4, 2)
    dst_pts = np.vstack(dst_pts)  # (N*4, 2)
    return src_pts, dst_pts

def compute_homography_from_partial(template_boxes, matches, tw, th):
    src_pts, dst_pts = build_correspondences(template_boxes, matches, tw, th)
    if src_pts is None or len(src_pts) < 4:
        return None, None
    H, mask = cv2.findHomography(src_pts, dst_pts, method=cv2.RANSAC, ransacReprojThreshold=3.0)
    return H, mask

def project_box(H, box, tw, th):
    """Projiziert Template-Box in Kamerabild (liefert 4 Punkte)."""
    pts = percent_box_to_pts(box, tw, th).reshape(-1,1,2)
    proj = cv2.perspectiveTransform(pts, H).reshape(-1,2)
    return proj

def draw_poly(img, pts, color, thickness=2, label=None):
    p = pts.astype(int)
    cv2.polylines(img, [p], isClosed=True, color=color, thickness=thickness)
    if label is not None:
        cv2.putText(img, label, tuple(p[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)

def overlay_from_partial_matches(frame, template_boxes, matches,
                                 target_w=1200, target_h=1600,  # 3:4
                                 draw_warp=True):
    """
    frame: BGR-Image
    template_boxes: list of dicts (x,y,w,h in %), Box12 = ganzer Screen (0..100)
    matches: list same len; each is (x,y,w,h) or None
    """
    vis = frame.copy()

    # 1) Homographie aus vorhandenen Paaren
    H, mask = compute_homography_from_partial(template_boxes, matches, target_w, target_h)
    if H is None:
        cv2.putText(vis, "Nicht genug Punkte fuer Homographie", (10,30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 2)
        return vis, None, None  # vis, warped, H

    # 2) Screen-Eckpunkte (Box12 = 0..100) projektieren und zeichnen
    screen_corners_t = np.float32([[0,0],[target_w-1,0],[target_w-1,target_h-1],[0,target_h-1]]).reshape(-1,1,2)
    screen_corners_i = cv2.perspectiveTransform(screen_corners_t, H).reshape(-1,2)
    draw_poly(vis, screen_corners_i, (0,255,0), 2, label="Screen")

    # 3) Alle Boxen projizieren
    for b, m in zip(template_boxes, matches):
        proj = project_box(H, b, target_w, target_h)
        color = (0,255,255) if m is None else (0,128,255)  # fehlend=gelb, gematcht=orange
        draw_poly(vis, proj, color, 2, label=b["id"])

    # 4) Optional: entzerren (wie Doc-Scanner) und Template drueberlegen
    warped = None
    if draw_warp:
        warped = cv2.warpPerspective(frame, np.linalg.inv(H), (target_w, target_h))
        # Template-Boxen im entzerrten Bild als Kontrolle
        for b in template_boxes:
            bx = int(b["x"]/100*target_w)
            by = int(b["y"]/100*target_h)
            bw = int(b["width"]/100*target_w)
            bh = int(b["height"]/100*target_h)
            cv2.rectangle(warped, (bx,by), (bx+bw,by+bh), (255,0,0), 1)
        cv2.putText(warped, "Warped (3:4) + Template", (10,30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
    return vis, warped, H


vis, warped, H = overlay_from_partial_matches(ui_screen_capture, template_boxes, ui_screen_boxes,
                                              target_w=1200, target_h=1600, draw_warp=True)

# Kontrolle: im Originalbild (mit projizierten/interpolierten Boxen + Screen-Ecken)
cv2.imshow("Overlay check (interpoliert)", cv2.resize(vis, (0,0), fx=0.5, fy=0.5))

# Optional: entzerrtes Display (3:4) + Template-Grid
if warped is not None:
    cv2.imshow("Warped 3:4", cv2.resize(warped, (0,0), fx=0.5, fy=0.5))

cv2.waitKey(0)
cv2.destroyAllWindows()
