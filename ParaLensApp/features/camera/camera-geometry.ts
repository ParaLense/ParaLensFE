export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameToViewTransform {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const computeTemplateRect = (
  frameW: number,
  frameH: number,
  widthRatio: number,
  aspectW: number,
  aspectH: number,
): Rect => {
  let templW = Math.max(1, Math.round(frameW * widthRatio));
  let templH = Math.max(1, Math.round((templW * aspectH) / aspectW));

  if (templH > frameH) {
    const scale = frameH / templH;
    templH = frameH;
    templW = Math.max(1, Math.round(templW * scale));
  }

  const templX = Math.round((frameW - templW) / 2);
  const templY = Math.round((frameH - templH) / 2);

  return { x: templX, y: templY, w: templW, h: templH };
};

export const applyHomography = (
  h: number[][],
  point: { x: number; y: number },
): { x: number; y: number } => {
  if (!h || h.length !== 3 || !h[0] || h[0].length !== 3) {
    return point;
  }

  const x = point.x;
  const y = point.y;
  const w = h[2][0] * x + h[2][1] * y + h[2][2];

  if (Math.abs(w) < 1e-10) {
    return point;
  }

  return {
    x: (h[0][0] * x + h[0][1] * y + h[0][2]) / w,
    y: (h[1][0] * x + h[1][1] * y + h[1][2]) / w,
  };
};

export const transformWarpedBoxToCameraFeed = (
  box: { x: any; y: any; w: any; h: any },
  homography: number[][] | null | undefined,
  outputW: number,
  outputH: number,
): Rect | null => {
  if (!homography || !Array.isArray(homography)) {
    return null;
  }

  const warpedX = toNumber(box.x);
  const warpedY = toNumber(box.y);
  const warpedW = toNumber(box.w);
  const warpedH = toNumber(box.h);

  const corners = [
    { x: warpedX, y: warpedY },
    { x: warpedX + warpedW, y: warpedY },
    { x: warpedX + warpedW, y: warpedY + warpedH },
    { x: warpedX, y: warpedY + warpedH },
  ];

  const transformedCorners = corners.map((corner) =>
    applyHomography(homography, corner),
  );

  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const corner of transformedCorners) {
    if (corner.x < minX) minX = corner.x;
    if (corner.x > maxX) maxX = corner.x;
    if (corner.y < minY) minY = corner.y;
    if (corner.y > maxY) maxY = corner.y;
  }

  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    w: Math.max(0, maxX - minX),
    h: Math.max(0, maxY - minY),
  };
};

/** Compute transform from frame coordinates to view (layout) coordinates. */
export const computeFrameToViewTransform = (
  frameW: number,
  frameH: number,
  layoutW: number,
  layoutH: number,
): FrameToViewTransform | null => {
  if (frameW <= 0 || frameH <= 0 || layoutW <= 0 || layoutH <= 0) return null;
  const scale = Math.min(layoutW / frameW, layoutH / frameH);
  const scaledW = frameW * scale;
  const scaledH = frameH * scale;
  return {
    scaleX: scale,
    scaleY: scale,
    offsetX: (layoutW - scaledW) / 2,
    offsetY: (layoutH - scaledH) / 2,
  };
};

export type ViewStyle = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Map a box in frame space to view style (left, top, width, height). */
export const mapBoxToViewStyle = (
  box: { x: any; y: any; w: any; h: any },
  transform: FrameToViewTransform | null,
): ViewStyle | null => {
  if (!transform) return null;
  const { scaleX, scaleY, offsetX, offsetY } = transform;
  const x = toNumber(box.x);
  const y = toNumber(box.y);
  const w = toNumber(box.w);
  const h = toNumber(box.h);
  return {
    left: offsetX + x * scaleX,
    top: offsetY + y * scaleY,
    width: Math.max(0, w * scaleX),
    height: Math.max(0, h * scaleY),
  };
};

/** Map a box in warped space to view style (homography then frame-to-view). */
export const mapWarpedBoxToViewStyle = (
  box: { x: any; y: any; w: any; h: any },
  homography: number[][] | null | undefined,
  outputW: number,
  outputH: number,
  transform: FrameToViewTransform | null,
): ViewStyle | null => {
  const cameraFeedBox = transformWarpedBoxToCameraFeed(
    box,
    homography,
    outputW,
    outputH,
  );
  if (!cameraFeedBox) return null;
  return mapBoxToViewStyle(cameraFeedBox, transform);
};
