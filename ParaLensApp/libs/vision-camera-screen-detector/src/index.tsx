import { type Frame, VisionCameraProxy } from 'react-native-vision-camera';

/**
 * Initialize the screen detector frame processor plugin
 * @param options - Configuration options for the screen detector plugin
 */
const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectScreen', {
  // Configuration options can be added here in the future
});

/**
 * Performs screen detection on camera frames.
 * Detects screens and returns screen information.
 *
 * @param frame - The camera frame to process
 * @returns Object containing screen detection results or null if no screen found
 */
export type ScreenCrop = { x: number; y: number; width: number; height: number };
export type ScreenSize = { width: number; height: number };

export function performScan(frame: Frame, crop?: ScreenCrop, screen?: ScreenSize): { screen: any } | null {
  'worklet';
  if (plugin == null)
    throw new Error('Failed to load Frame Processor Plugin "detectScreen"!');
  // Always pass an object as the 2nd arg to avoid "Value is undefined, expected an Object"
  const args = crop ? (screen ? { crop, screen } : { crop }) : {};
  return plugin.call(frame, args) as { screen: any } | null;
}
