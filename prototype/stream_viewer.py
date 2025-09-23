import os
import json
import cv2
import numpy as np
from typing import List, Optional, Tuple


# =========================
# Constants (edit as needed)
# =========================

# RTSP/Video source
RTSP_URL = "rtsp://192.168.1.183:8080/h264.sdp"

# Rotate each frame (OpenCV constants): None or cv2.ROTATE_90_CLOCKWISE/COUNTERCLOCKWISE/180
FRAME_ROTATE = cv2.ROTATE_90_CLOCKWISE

# Screen region assumption inside the camera frame (percentage of width, 3:4 aspect)
SCREEN_WIDTH_RATIO = 0.80  # 80% of frame width
SCREEN_ASPECT_W = 3
SCREEN_ASPECT_H = 4

# Matching thresholds
CONTOUR_POLY_EPSILON_FACTOR = 0.02  # fraction of arc length for approxPolyDP
MIN_IOU_FOR_MATCH = 0.30
BOX_ACCURACY_THRESHOLD = 0.60  # fraction of boxes that must be matched

# Homography / virtual template size (in pixels) used for geometric mapping
TEMPLATE_TARGET_W = 1200
TEMPLATE_TARGET_H = 1600  # keep 3:4


# JSON-Template laden (Datei mit Liste von Box-Objekten)
def load_template_from_json(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("Template JSON muss eine Liste sein.")

        normalized_boxes = []
        for item in data:
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
    "0.2 Bildschirmaufbau_Screendetection.json",
)

TEMPLATE_BOXES = load_template_from_json(JSON_TEMPLATE_PATH)


# =========================
# Utility functions
# =========================

def iou(rect_a: Tuple[int, int, int, int], rect_b: Tuple[int, int, int, int]) -> float:
    xA = max(rect_a[0], rect_b[0])
    yA = max(rect_a[1], rect_b[1])
    xB = min(rect_a[0] + rect_a[2], rect_b[0] + rect_b[2])
    yB = min(rect_a[1] + rect_a[3], rect_b[1] + rect_b[3])
    inter_w = max(0, xB - xA)
    inter_h = max(0, yB - yA)
    inter_area = inter_w * inter_h
    area_a = rect_a[2] * rect_a[3]
    area_b = rect_b[2] * rect_b[3]
    union = area_a + area_b - inter_area
    return inter_area / union if union > 0 else 0.0


def percent_box_to_pts(box: dict, template_w: int, template_h: int) -> np.ndarray:
    x, y, w, h = box["x"], box["y"], box["width"], box["height"]
    tl = [x / 100.0 * template_w, y / 100.0 * template_h]
    tr = [(x + w) / 100.0 * template_w, y / 100.0 * template_h]
    br = [(x + w) / 100.0 * template_w, (y + h) / 100.0 * template_h]
    bl = [x / 100.0 * template_w, (y + h) / 100.0 * template_h]
    return np.float32([tl, tr, br, bl])


def rect_to_pts_xywh(rect: Tuple[int, int, int, int]) -> np.ndarray:
    x, y, w, h = rect
    tl = [x, y]
    tr = [x + w, y]
    br = [x + w, y + h]
    bl = [x, y + h]
    return np.float32([tl, tr, br, bl])


def build_correspondences(template_boxes: List[dict], matches: List[Optional[Tuple[int, int, int, int]]],
                          template_w: int, template_h: int) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    src_pts = []
    dst_pts = []
    for tb, m in zip(template_boxes, matches):
        if m is None:
            continue
        src_pts.append(percent_box_to_pts(tb, template_w, template_h))
        dst_pts.append(rect_to_pts_xywh(m))
    if not src_pts:
        return None, None
    return np.vstack(src_pts), np.vstack(dst_pts)


def compute_homography_from_partial(template_boxes: List[dict], matches: List[Optional[Tuple[int, int, int, int]]],
                                    template_w: int, template_h: int) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    src_pts, dst_pts = build_correspondences(template_boxes, matches, template_w, template_h)
    if src_pts is None or len(src_pts) < 4:
        return None, None
    H, mask = cv2.findHomography(src_pts, dst_pts, method=cv2.RANSAC, ransacReprojThreshold=3.0)
    return H, mask


def draw_poly(img, pts, color, thickness=2, label: Optional[str] = None):
    p = pts.astype(int)
    cv2.polylines(img, [p], isClosed=True, color=color, thickness=thickness)
    if label is not None:
        cv2.putText(img, label, tuple(p[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)


def overlay_from_partial_matches(frame, template_boxes, matches,
                                 target_w=TEMPLATE_TARGET_W, target_h=TEMPLATE_TARGET_H,
                                 draw_warp=True):
    vis = frame.copy()

    H, mask = compute_homography_from_partial(template_boxes, matches, target_w, target_h)
    if H is None:
        cv2.putText(vis, "Nicht genug Punkte fuer Homographie", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        return vis, None, None

    screen_corners_t = np.float32([[0, 0], [target_w - 1, 0], [target_w - 1, target_h - 1], [0, target_h - 1]]).reshape(-1, 1, 2)
    screen_corners_i = cv2.perspectiveTransform(screen_corners_t, H).reshape(-1, 2)
    draw_poly(vis, screen_corners_i, (0, 255, 0), 2, label="Screen")

    for b, m in zip(template_boxes, matches):
        pts = percent_box_to_pts(b, target_w, target_h).reshape(-1, 1, 2)
        proj = cv2.perspectiveTransform(pts, H).reshape(-1, 2)
        color = (0, 255, 255) if m is None else (0, 128, 255)
        draw_poly(vis, proj, color, 2, label=b["id"])

    warped = None
    if draw_warp:
        warped = cv2.warpPerspective(frame, np.linalg.inv(H), (target_w, target_h))
        for b in template_boxes:
            bx = int(b["x"] / 100 * target_w)
            by = int(b["y"] / 100 * target_h)
            bw = int(b["width"] / 100 * target_w)
            bh = int(b["height"] / 100 * target_h)
            cv2.rectangle(warped, (bx, by), (bx + bw, by + bh), (255, 0, 0), 1)
        cv2.putText(warped, "Warped (3:4) + Template", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

    return vis, warped, H


def run_stream_viewer():
    if TEMPLATE_BOXES is None:
        print("Template konnte nicht geladen werden. Beende.")
        return

    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = os.environ.get(
        "OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;udp|max_delay;0"
    )

    cap = cv2.VideoCapture(RTSP_URL)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print("Konnte Videoquelle nicht öffnen:", RTSP_URL)
        return

    ui_screen_capture = None
    ui_screen_boxes: Optional[List[Optional[Tuple[int, int, int, int]]]] = None

    while ui_screen_capture is None:
        for _ in range(3):
            cap.grab()
        ret, img = cap.retrieve()
        if not ret:
            ret, img = cap.read()
        if not ret:
            break

        if FRAME_ROTATE is not None:
            img = cv2.rotate(img, FRAME_ROTATE)

        h, w = img.shape[:2]

        screen_w = int(w * SCREEN_WIDTH_RATIO)
        screen_h = int(screen_w * SCREEN_ASPECT_H / SCREEN_ASPECT_W)
        screen_x = (w - screen_w) // 2
        screen_y = (h - screen_h) // 2

        template_px: List[Tuple[int, int, int, int]] = []
        for b in TEMPLATE_BOXES:
            x = screen_x + int(b["x"] / 100 * screen_w)
            y = screen_y + int(b["y"] / 100 * screen_h)
            bw = int(b["width"] / 100 * screen_w)
            bh = int(b["height"] / 100 * screen_h)
            template_px.append((x, y, bw, bh))

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        matched_template_boxes: List[Optional[Tuple[int, int, int, int]]] = [None] * len(template_px)

        # Draw detected quads and match
        for cnt in contours:
            perim = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, CONTOUR_POLY_EPSILON_FACTOR * perim, True)
            if len(approx) == 4:
                x, y, bw, bh = cv2.boundingRect(approx)
                # draw detected rectangle
                cv2.rectangle(img, (x, y), (x + bw, y + bh), (0, 0, 255), 2)

                best_iou = 0.0
                best_idx = -1
                for idx, tb in enumerate(template_px):
                    current_iou = iou((x, y, bw, bh), tb)
                    if current_iou > best_iou:
                        best_iou = current_iou
                        best_idx = idx
                if best_iou > MIN_IOU_FOR_MATCH and best_idx != -1:
                    matched_template_boxes[best_idx] = (x, y, bw, bh)

        # Draw screen and template boxes
        cv2.rectangle(img, (screen_x, screen_y), (screen_x + screen_w, screen_y + screen_h), (0, 255, 0), 2)
        for (tx, ty, tw, th) in template_px:
            cv2.rectangle(img, (tx, ty), (tx + tw, ty + th), (255, 0, 0), 1)

        accuracy = 1 - matched_template_boxes.count(None) / max(1, len(matched_template_boxes))
        cv2.putText(img, f"Accuracy: {accuracy:.2f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

        cv2.imshow("Template Matching Rectangles", cv2.resize(img, (0, 0), fx=0.5, fy=0.5))

        if len(matched_template_boxes) > 0 and accuracy >= BOX_ACCURACY_THRESHOLD:
            ui_screen_capture = img
            ui_screen_boxes = matched_template_boxes
            # Also show a quick freeze window indicating success
            cv2.imshow("All Boxes Matched", cv2.resize(img, (0, 0), fx=0.5, fy=0.5))
            cv2.waitKey(500)
            break

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break

    if ui_screen_capture is not None and ui_screen_boxes is not None:
        vis, warped, _ = overlay_from_partial_matches(
            ui_screen_capture, TEMPLATE_BOXES, ui_screen_boxes,
            target_w=TEMPLATE_TARGET_W, target_h=TEMPLATE_TARGET_H, draw_warp=True
        )
        cv2.imshow("Overlay check (interpoliert)", cv2.resize(vis, (0, 0), fx=0.5, fy=0.5))
        if warped is not None:
            cv2.imshow("Warped 3:4", cv2.resize(warped, (0, 0), fx=0.5, fy=0.5))

    # Keep windows open until user quits
    while True:
        key = cv2.waitKey(20) & 0xFF
        if key == ord('q') or key == 27:  # q or ESC
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_stream_viewer()


