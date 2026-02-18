export { useCameraPermission } from './useCameraPermission';
export { CameraPermissionModal } from './CameraPermissionModal';
export { CameraPermissionProvider } from './CameraPermissionProvider';
export type { CameraPermissionStatus } from './useCameraPermission';

export {
  toNumber,
  computeTemplateRect,
  computeFrameToViewTransform,
  mapBoxToViewStyle,
  mapWarpedBoxToViewStyle,
  applyHomography,
  transformWarpedBoxToCameraFeed,
} from './camera-geometry';
export type { Rect, FrameToViewTransform, ViewStyle } from './camera-geometry';
