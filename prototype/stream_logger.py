import os
import json
import cv2
import numpy as np
from typing import List, Optional, Tuple


"""
Stream-only console logger for template-based UI box detection.

- No GUI windows, no imshow, no waits.
- Fixed constants at top for production-like behavior; change by editing constants.
- Outputs a single JSON object on success (suitable for integration/porting to Kotlin).
"""


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


def to_serializable_matrix(matrix: Optional[np.ndarray]) -> Optional[List[List[float]]]:
    if matrix is None:
        return None
    return [[float(matrix[r, c]) for c in range(matrix.shape[1])] for r in range(matrix.shape[0])]


# =========================
# Core stream logic
# =========================

def run_stream_detection() -> int:
    # Low-latency RTSP options if using FFMPEG backend
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = os.environ.get(
        "OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;udp|max_delay;0"
    )

    cap = cv2.VideoCapture(RTSP_URL)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print(json.dumps({
            "event": "error",
            "message": "Unable to open video source",
            "rtsp_url": RTSP_URL,
        }))
        return 1

    print(json.dumps({"event": "start", "rtsp_url": RTSP_URL}))

    ui_screen_boxes: Optional[List[Optional[Tuple[int, int, int, int]]]] = None
    frame_count = 0

    try:
        while True:
            # Drain buffer to keep latency low
            for _ in range(3):
                cap.grab()

            ret, frame = cap.retrieve()
            if not ret:
                ret, frame = cap.read()
            if not ret:
                print(json.dumps({"event": "warning", "message": "Failed to read frame"}))
                continue

            if FRAME_ROTATE is not None:
                frame = cv2.rotate(frame, FRAME_ROTATE)

            h, w = frame.shape[:2]

            # Compute assumed screen area within the frame
            screen_w = int(w * SCREEN_WIDTH_RATIO)
            screen_h = int(screen_w * SCREEN_ASPECT_H / SCREEN_ASPECT_W)
            screen_x = (w - screen_w) // 2
            screen_y = (h - screen_h) // 2

            # Transform template boxes into pixel coordinates of the assumed screen rectangle
            template_px: List[Tuple[int, int, int, int]] = []
            for b in TEMPLATE_BOXES:
                x = screen_x + int(b["x"] / 100 * screen_w)
                y = screen_y + int(b["y"] / 100 * screen_h)
                bw = int(b["width"] / 100 * screen_w)
                bh = int(b["height"] / 100 * screen_h)
                template_px.append((x, y, bw, bh))

            # Edge detection and contour extraction
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            matched_template_boxes: List[Optional[Tuple[int, int, int, int]]] = [None] * len(template_px)

            for cnt in contours:
                perim = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, CONTOUR_POLY_EPSILON_FACTOR * perim, True)
                if len(approx) == 4:
                    x, y, bw, bh = cv2.boundingRect(approx)

                    # Compare to all template boxes and keep best IoU match
                    best_iou = 0.0
                    best_idx = -1
                    for idx, tb in enumerate(template_px):
                        current_iou = iou((x, y, bw, bh), tb)
                        if current_iou > best_iou:
                            best_iou = current_iou
                            best_idx = idx

                    if best_iou > MIN_IOU_FOR_MATCH and best_idx != -1:
                        matched_template_boxes[best_idx] = (x, y, bw, bh)

            # Compute accuracy and optionally emit periodic progress logs
            accuracy = 1.0 - matched_template_boxes.count(None) / max(1, len(matched_template_boxes))

            frame_count += 1
            if frame_count % 15 == 0:  # throttle progress logs
                print(json.dumps({
                    "event": "progress",
                    "frame": frame_count,
                    "matched": len(matched_template_boxes) - matched_template_boxes.count(None),
                    "total": len(matched_template_boxes),
                    "accuracy": round(accuracy, 4),
                }))

            if len(matched_template_boxes) > 0 and accuracy >= BOX_ACCURACY_THRESHOLD:
                ui_screen_boxes = matched_template_boxes
                break

        if ui_screen_boxes is None:
            print(json.dumps({
                "event": "error",
                "message": "No sufficient matches obtained",
            }))
            return 2

        # Compute homography from partial matches with virtual template size
        H, mask = compute_homography_from_partial(
            TEMPLATE_BOXES, ui_screen_boxes, TEMPLATE_TARGET_W, TEMPLATE_TARGET_H
        )

        if H is None:
            print(json.dumps({
                "event": "error",
                "message": "Insufficient correspondences for homography",
            }))
            return 3

        # Emit final result as a single JSON payload
        output = {
            "event": "result",
            "accuracy_threshold": BOX_ACCURACY_THRESHOLD,
            "accuracy": round(1.0 - ui_screen_boxes.count(None) / max(1, len(ui_screen_boxes)), 6),
            "template_target_size": {"w": TEMPLATE_TARGET_W, "h": TEMPLATE_TARGET_H},
            "homography": to_serializable_matrix(H),
            "homography_inliers_mask": None if mask is None else [int(v[0]) for v in mask.tolist()],
            "matched_boxes": [
                None if m is None else {"x": int(m[0]), "y": int(m[1]), "w": int(m[2]), "h": int(m[3])}
                for m in ui_screen_boxes
            ],
            "template_boxes": TEMPLATE_BOXES,
        }
        print(json.dumps(output))
        return 0

    finally:
        cap.release()


if __name__ == "__main__":
    exit_code = run_stream_detection()
    # Avoid using sys.exit to keep it simple in some embedded callers
    # but still provide a clear numeric exit code when executed as a script.
    if exit_code != 0:
        print(json.dumps({"event": "end", "status": "failure", "code": exit_code}))
    else:
        print(json.dumps({"event": "end", "status": "success", "code": exit_code}))


