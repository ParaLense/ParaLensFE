import cv2
import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# Konfiguration & Konstanten
# ---------------------------------------------------------------------------
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

BOX_ACCURACY_THRESHOLD = 0.8
ROI_TOLERANCE_PX = 12
TEMPLATE_MATCH_MIN_IOU = 0.3
TARGET_SCREEN_WIDTH = 1200
TARGET_SCREEN_HEIGHT = 1600
STREAM_URL = "rtsp://127.0.0.1:8080/h264.sdp"
FFMPEG_CAPTURE_OPTIONS = "rtsp_transport;udp|max_delay;0"
WINDOW_SCALE = 0.5

ROI_OUTER = {
    "x": {"mode": "percent", "value": 10.0},
    "y": {"mode": "percent", "value": 5.0},
    "width": {"mode": "percent", "value": 80.0},
    "height": {"mode": "percent", "value": 90.0},
}

ROI_INNER = {
    "x": {"mode": "percent", "value": 30.0},
    "y": {"mode": "percent", "value": 20.0},
    "width": {"mode": "percent", "value": 45.0},
    "height": {"mode": "percent", "value": 60.0},
}

Rect = Tuple[int, int, int, int]
TemplateBox = Dict[str, float]

JSON_TEMPLATE_PATH = os.path.join(
    os.path.dirname(__file__),
    "templates",
    "0.1 Bildschirmaufbau_Screendetection.json",
)


@dataclass
class FrameEvaluation:
    """Zwischenergebnis der Frame-Auswertung."""

    annotated_frame: np.ndarray
    capture_frame: Optional[np.ndarray]
    homography: Optional[np.ndarray]
    accuracy: float


# ---------------------------------------------------------------------------
# ROI- und Geometrie-Helfer
# ---------------------------------------------------------------------------
def _resolve_roi_value(entry: Dict[str, float], total_length: int) -> float:
    mode = entry.get("mode", "percent")
    value = entry.get("value", 0)
    if mode == "px":
        return float(value)
    return float(value) / 100.0 * total_length


def adjust_rect_to_ratio(
    rect: Rect,
    frame_width: int,
    frame_height: int,
    target_w: int = TARGET_SCREEN_WIDTH,
    target_h: int = TARGET_SCREEN_HEIGHT,
) -> Rect:
    x, y, w, h = rect
    if w <= 0 or h <= 0:
        return rect

    target_ratio = float(target_w) / float(target_h)
    current_ratio = w / h

    new_w = w
    new_h = h

    if abs(current_ratio - target_ratio) > 1e-6:
        if current_ratio > target_ratio:
            new_w = max(1, int(round(h * target_ratio)))
        else:
            new_h = max(1, int(round(w / target_ratio)))

    cx = x + w / 2.0
    cy = y + h / 2.0
    new_x = int(round(cx - new_w / 2.0))
    new_y = int(round(cy - new_h / 2.0))

    new_x = max(0, min(new_x, frame_width - new_w))
    new_y = max(0, min(new_y, frame_height - new_h))

    return new_x, new_y, new_w, new_h


def compute_roi_rect(roi_cfg: Dict[str, Dict[str, float]], frame_width: int, frame_height: int) -> Rect:
    x = _resolve_roi_value(roi_cfg["x"], frame_width)
    y = _resolve_roi_value(roi_cfg["y"], frame_height)
    width = _resolve_roi_value(roi_cfg["width"], frame_width)
    height = _resolve_roi_value(roi_cfg["height"], frame_height)

    rect = (
        int(round(x)),
        int(round(y)),
        max(1, int(round(width))),
        max(1, int(round(height))),
    )
    return adjust_rect_to_ratio(rect, frame_width, frame_height)


def rect_to_xyxy(rect: Rect) -> Tuple[int, int, int, int]:
    x, y, w, h = rect
    return x, y, x + w, y + h


def polygon_to_bbox(poly: np.ndarray) -> Tuple[float, float, float, float]:
    xs = poly[:, 0]
    ys = poly[:, 1]
    min_x = float(np.min(xs))
    min_y = float(np.min(ys))
    max_x = float(np.max(xs))
    max_y = float(np.max(ys))
    return min_x, min_y, max(1.0, max_x - min_x), max(1.0, max_y - min_y)


def order_polygon(pts: np.ndarray) -> np.ndarray:
    pts = np.asarray(pts, dtype=np.float32)
    if pts.shape[0] != 4:
        raise ValueError("Polygon braucht genau 4 Punkte.")

    ordered = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).reshape(-1)
    ordered[0] = pts[np.argmin(s)]
    ordered[2] = pts[np.argmax(s)]
    ordered[1] = pts[np.argmin(diff)]
    ordered[3] = pts[np.argmax(diff)]
    return ordered


def rect_within_roi(
    test_rect: Rect,
    roi_inner_rect: Rect,
    roi_outer_rect: Rect,
    tolerance: int = 0,
) -> bool:
    tx1, ty1, tx2, ty2 = rect_to_xyxy(test_rect)
    ox1, oy1, ox2, oy2 = rect_to_xyxy(roi_outer_rect)
    ix1, iy1, ix2, iy2 = rect_to_xyxy(roi_inner_rect)

    if tx1 < ox1 - tolerance or ty1 < oy1 - tolerance or tx2 > ox2 + tolerance or ty2 > oy2 + tolerance:
        return False

    if tx1 > ix1 + tolerance:
        return False
    if ty1 > iy1 + tolerance:
        return False
    if tx2 < ix2 - tolerance:
        return False
    if ty2 < iy2 - tolerance:
        return False
    return True


# ---------------------------------------------------------------------------
# Template- und Homographie-Helfer
# ---------------------------------------------------------------------------
def percent_box_to_pts(box: TemplateBox, tw: int, th: int) -> np.ndarray:
    x, y, w, h = box["x"], box["y"], box["width"], box["height"]
    tl = [x / 100.0 * tw, y / 100.0 * th]
    tr = [(x + w) / 100.0 * tw, y / 100.0 * th]
    br = [(x + w) / 100.0 * tw, (y + h) / 100.0 * th]
    bl = [x / 100.0 * tw, (y + h) / 100.0 * th]
    return np.float32([tl, tr, br, bl])


def build_correspondences(
    template_boxes: List[TemplateBox],
    matches: List[Optional[Rect]],
    tw: int,
    th: int,
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    src_pts: List[np.ndarray] = []
    dst_pts: List[np.ndarray] = []

    for template_box, match in zip(template_boxes, matches):
        if match is None:
            continue
        src_pts.append(percent_box_to_pts(template_box, tw, th))
        dst_pts.append(rect_to_pts_xyxy(match))

    if not src_pts:
        return None, None

    return np.vstack(src_pts), np.vstack(dst_pts)


def compute_homography_from_partial(
    template_boxes: List[TemplateBox],
    matches: List[Optional[Rect]],
    tw: int,
    th: int,
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    src_pts, dst_pts = build_correspondences(template_boxes, matches, tw, th)
    if src_pts is None or len(src_pts) < 4:
        return None, None
    return cv2.findHomography(src_pts, dst_pts, method=cv2.RANSAC, ransacReprojThreshold=3.0)


def rect_to_pts_xyxy(rect: Rect) -> np.ndarray:
    x, y, w, h = rect
    return np.float32([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])


def project_box(H: np.ndarray, box: TemplateBox, tw: int, th: int) -> np.ndarray:
    pts = percent_box_to_pts(box, tw, th).reshape(-1, 1, 2)
    proj = cv2.perspectiveTransform(pts, H).reshape(-1, 2)
    return proj


def draw_poly(
    img: np.ndarray,
    pts: np.ndarray,
    color: Tuple[int, int, int],
    thickness: int = 2,
    label: Optional[str] = None,
) -> None:
    p = pts.astype(int)
    cv2.polylines(img, [p], isClosed=True, color=color, thickness=thickness)
    if label is not None:
        cv2.putText(img, label, tuple(p[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)


def iou(box_a: Tuple[float, float, float, float], box_b: Tuple[float, float, float, float]) -> float:
    x_a = max(box_a[0], box_b[0])
    y_a = max(box_a[1], box_b[1])
    x_b = min(box_a[0] + box_a[2], box_b[0] + box_b[2])
    y_b = min(box_a[1] + box_a[3], box_b[1] + box_b[3])

    inter_w = max(0.0, x_b - x_a)
    inter_h = max(0.0, y_b - y_a)
    inter_area = inter_w * inter_h

    box_a_area = box_a[2] * box_a[3]
    box_b_area = box_b[2] * box_b[3]
    union_area = box_a_area + box_b_area - inter_area

    return inter_area / union_area if union_area > 0 else 0.0


# ---------------------------------------------------------------------------
# Template-Verwaltung & Video-Capture
# ---------------------------------------------------------------------------
def load_template_boxes(template_path: str, fallback: List[TemplateBox]) -> List[TemplateBox]:
    try:
        with open(template_path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, list):
            raise ValueError("Template JSON muss eine Liste sein.")

        normalized: List[TemplateBox] = []
        for item in data:
            if not all(key in item for key in ("id", "x", "y", "width", "height")):
                continue
            normalized.append(
                {
                    "id": str(item["id"]),
                    "x": float(item["x"]),
                    "y": float(item["y"]),
                    "width": float(item["width"]),
                    "height": float(item["height"]),
                }
            )

        if not normalized:
            raise ValueError("Keine gültigen Boxen in JSON gefunden.")
        return normalized
    except Exception as exc:  # pylint: disable=broad-except
        print(f"Fehler beim Laden der Template-Datei '{template_path}': {exc}")
        return fallback


def configure_capture(stream_url: str) -> cv2.VideoCapture:
    os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", FFMPEG_CAPTURE_OPTIONS)
    cap = cv2.VideoCapture(stream_url)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return cap


def grab_latest_frame(cap: cv2.VideoCapture) -> Optional[np.ndarray]:
    for _ in range(3):
        cap.grab()
    ret, frame = cap.retrieve()
    if not ret:
        ret, frame = cap.read()
    if not ret:
        return None
    return frame


# ---------------------------------------------------------------------------
# Screen-Erkennung im Frame
# ---------------------------------------------------------------------------
def contour_to_quadrilateral(contour: np.ndarray) -> Optional[np.ndarray]:
    arc_length = cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, 0.02 * arc_length, True)
    if len(approx) < 4:
        return None

    hull = cv2.convexHull(approx)
    if len(hull) < 4:
        return None

    quad = hull
    if len(quad) > 4:
        quad = cv2.approxPolyDP(quad, 0.02 * cv2.arcLength(quad, True), True)
        if len(quad) > 4:
            quad = cv2.approxPolyDP(quad, 0.05 * cv2.arcLength(quad, True), True)

    if len(quad) != 4:
        return None

    return quad.reshape(-1, 2).astype(np.float32)


def find_best_screen_candidate(
    contours: List[np.ndarray],
    roi_inner_rect: Rect,
    roi_outer_rect: Rect,
) -> Optional[Tuple[Rect, np.ndarray]]:
    best_rect: Optional[Rect] = None
    best_polygon: Optional[np.ndarray] = None
    best_score = 0.0

    for contour in contours:
        quad = contour_to_quadrilateral(contour)
        if quad is None:
            continue

        x, y, w, h = cv2.boundingRect(quad.reshape(-1, 1, 2).astype(np.int32))
        screen_rect: Rect = (x, y, w, h)
        if not rect_within_roi(screen_rect, roi_inner_rect, roi_outer_rect, tolerance=ROI_TOLERANCE_PX):
            continue

        score = iou(screen_rect, polygon_to_bbox(quad))
        if score > best_score:
            best_score = score
            best_rect = screen_rect
            best_polygon = quad

    if best_rect is None or best_polygon is None:
        return None
    return best_rect, best_polygon


def build_projected_rectangles(
    template_boxes: List[TemplateBox],
    homography: np.ndarray,
) -> List[Tuple[float, float, float, float]]:
    rectangles: List[Tuple[float, float, float, float]] = []
    for template_box in template_boxes:
        projected_poly = project_box(homography, template_box, TARGET_SCREEN_WIDTH, TARGET_SCREEN_HEIGHT)
        ordered_poly = order_polygon(projected_poly)
        rectangles.append(polygon_to_bbox(ordered_poly))
    return rectangles


def compute_template_accuracy(
    contours: List[np.ndarray],
    projected_rectangles: List[Tuple[float, float, float, float]],
) -> float:
    if not projected_rectangles:
        return 0.0

    matches = 0
    for rect_candidate in projected_rectangles:
        best_iou_value = 0.0
        for contour in contours:
            quad = contour_to_quadrilateral(contour)
            if quad is None:
                continue
            cx, cy, cw, ch = cv2.boundingRect(quad.reshape(-1, 1, 2).astype(np.int32))
            best_iou_value = max(best_iou_value, iou(rect_candidate, (cx, cy, cw, ch)))
        if best_iou_value >= TEMPLATE_MATCH_MIN_IOU:
            matches += 1

    return matches / max(1, len(projected_rectangles))


def evaluate_frame(frame: np.ndarray, template_boxes: List[TemplateBox]) -> FrameEvaluation:
    base_capture = frame.copy()
    annotated = frame.copy()

    height, width = frame.shape[:2]
    roi_outer_rect = compute_roi_rect(ROI_OUTER, width, height)
    roi_inner_rect = compute_roi_rect(ROI_INNER, width, height)

    cv2.rectangle(
        annotated,
        (roi_outer_rect[0], roi_outer_rect[1]),
        (roi_outer_rect[0] + roi_outer_rect[2], roi_outer_rect[1] + roi_outer_rect[3]),
        (0, 255, 0),
        1,
    )
    cv2.rectangle(
        annotated,
        (roi_inner_rect[0], roi_inner_rect[1]),
        (roi_inner_rect[0] + roi_inner_rect[2], roi_inner_rect[1] + roi_inner_rect[3]),
        (0, 0, 255),
        1,
    )

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidate = find_best_screen_candidate(contours, roi_inner_rect, roi_outer_rect)
    if candidate is None:
        return FrameEvaluation(annotated, None, None, 0.0)

    screen_rect, screen_polygon = candidate
    sx, sy, sw, sh = screen_rect
    cv2.rectangle(annotated, (sx, sy), (sx + sw, sy + sh), (255, 255, 0), 2)

    src_pts = np.float32(
        [
            [0, 0],
            [TARGET_SCREEN_WIDTH, 0],
            [TARGET_SCREEN_WIDTH, TARGET_SCREEN_HEIGHT],
            [0, TARGET_SCREEN_HEIGHT],
        ]
    )
    dst_pts = order_polygon(screen_polygon)
    homography = cv2.getPerspectiveTransform(src_pts, dst_pts)

    projected_rectangles = build_projected_rectangles(template_boxes, homography)
    accuracy = compute_template_accuracy(contours, projected_rectangles)

    cv2.putText(
        annotated,
        f"Accuracy: {accuracy:.2f}",
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (0, 255, 0) if accuracy >= BOX_ACCURACY_THRESHOLD else (0, 0, 255),
        2,
    )

    capture = base_capture if accuracy >= BOX_ACCURACY_THRESHOLD else None
    return FrameEvaluation(annotated, capture, homography, accuracy)


def run_detection_loop(cap: cv2.VideoCapture, template_boxes: List[TemplateBox]) -> Optional[FrameEvaluation]:
    while True:
        frame = grab_latest_frame(cap)
        if frame is None:
            break

        frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        evaluation = evaluate_frame(frame, template_boxes)

        cv2.imshow(
            "ROI Template Search",
            cv2.resize(evaluation.annotated_frame, (0, 0), fx=WINDOW_SCALE, fy=WINDOW_SCALE),
        )

        if evaluation.capture_frame is not None and evaluation.homography is not None:
            print(f"Screen akzeptiert mit Accuracy {evaluation.accuracy:.2f}")
            cv2.imshow(
                "Screen Matched",
                cv2.resize(evaluation.annotated_frame, (0, 0), fx=WINDOW_SCALE, fy=WINDOW_SCALE),
            )
            cv2.waitKey(0)
            return evaluation

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    return None


# ---------------------------------------------------------------------------
# Debugging-Helfer
# ---------------------------------------------------------------------------
def overlay_from_partial_matches(
    frame: np.ndarray,
    template_boxes: List[TemplateBox],
    matches: List[Optional[Rect]],
    target_w: int = TARGET_SCREEN_WIDTH,
    target_h: int = TARGET_SCREEN_HEIGHT,
    draw_warp: bool = True,
) -> Tuple[np.ndarray, Optional[np.ndarray], Optional[np.ndarray]]:
    visualization = frame.copy()
    homography, mask = compute_homography_from_partial(template_boxes, matches, target_w, target_h)
    if homography is None:
        cv2.putText(
            visualization,
            "Nicht genug Punkte fuer Homographie",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 0, 255),
            2,
        )
        return visualization, None, None

    screen_corners_template = np.float32(
        [[0, 0], [target_w - 1, 0], [target_w - 1, target_h - 1], [0, target_h - 1]]
    ).reshape(-1, 1, 2)
    screen_corners_image = cv2.perspectiveTransform(screen_corners_template, homography).reshape(-1, 2)
    draw_poly(visualization, screen_corners_image, (0, 255, 0), 2, label="Screen")

    for template_box, match in zip(template_boxes, matches):
        projected_poly = project_box(homography, template_box, target_w, target_h)
        color = (0, 128, 255) if match is not None else (0, 255, 255)
        draw_poly(visualization, projected_poly, color, 2, label=template_box["id"])

    warped = None
    if draw_warp:
        warped = cv2.warpPerspective(frame, np.linalg.inv(homography), (target_w, target_h))
        for template_box in template_boxes:
            bx = int(template_box["x"] / 100 * target_w)
            by = int(template_box["y"] / 100 * target_h)
            bw = int(template_box["width"] / 100 * target_w)
            bh = int(template_box["height"] / 100 * target_h)
            cv2.rectangle(warped, (bx, by), (bx + bw, by + bh), (255, 0, 0), 1)
        cv2.putText(
            warped,
            "Warped (3:4) + Template",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2,
        )

    return visualization, warped, homography


# ---------------------------------------------------------------------------
# Ausgabe der finalen Ergebnisse
# ---------------------------------------------------------------------------
def show_warped_screen(
    capture_frame: np.ndarray,
    homography: np.ndarray,
    template_boxes: List[TemplateBox],
) -> None:
    warped = cv2.warpPerspective(
        capture_frame,
        np.linalg.inv(homography),
        (TARGET_SCREEN_WIDTH, TARGET_SCREEN_HEIGHT),
    )

    for template_box in template_boxes:
        bx = int(template_box["x"] / 100 * TARGET_SCREEN_WIDTH)
        by = int(template_box["y"] / 100 * TARGET_SCREEN_HEIGHT)
        bw = int(template_box["width"] / 100 * TARGET_SCREEN_WIDTH)
        bh = int(template_box["height"] / 100 * TARGET_SCREEN_HEIGHT)
        cv2.rectangle(warped, (bx, by), (bx + bw, by + bh), (255, 0, 0), 1)

    cv2.putText(
        warped,
        "Warped (3:4) + Template",
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2,
    )

    cv2.imshow(
        "Warped 3:4",
        cv2.resize(warped, (0, 0), fx=WINDOW_SCALE, fy=WINDOW_SCALE),
    )
    cv2.waitKey(0)


# ---------------------------------------------------------------------------
# Programm-Einstiegspunkt
# ---------------------------------------------------------------------------
def main() -> None:
    template_boxes = load_template_boxes(JSON_TEMPLATE_PATH, DEFAULT_TEMPLATE_BOXES)

    cap = configure_capture(STREAM_URL)
    if not cap.isOpened():
        print(f"Fehler: Konnte Stream '{STREAM_URL}' nicht öffnen.")
        return

    try:
        evaluation = run_detection_loop(cap, template_boxes)
    finally:
        cap.release()

    if evaluation is None or evaluation.capture_frame is None or evaluation.homography is None:
        print("Kein valider Screen gefunden oder Homographie fehlgeschlagen.")
        cv2.destroyAllWindows()
        return

    show_warped_screen(evaluation.capture_frame, evaluation.homography, template_boxes)
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
