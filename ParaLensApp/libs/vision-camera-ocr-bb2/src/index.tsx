import { type Frame, VisionCameraProxy } from 'react-native-vision-camera';

/**
 * Initialize the OCR frame processor plugin
 * @param options - Configuration options for the OCR plugin
 * @param options.model - Model type for text recognition (currently supports 'fast', but implementation is pending)
 */
const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectText', {
  model: 'fast', // ⚠️ Note: Model option is currently logged but not fully implemented
});

/**
 * Performs OCR (Optical Character Recognition) on camera frames.
 * Detects and extracts text from images in real-time.
 *
 * @param frame - The camera frame to process
 * @returns Object containing recognized text or null if no text found
 */
export type OcrCrop = { x: number; y: number; width: number; height: number };
export type ScreenSize = { width: number; height: number };

export function performOcr(frame: Frame, crop?: OcrCrop, screen?: ScreenSize): { text: string } | null {
  'worklet';
  if (plugin == null)
    throw new Error('Failed to load Frame Processor Plugin "detectText"!');
  // Always pass an object as the 2nd arg to avoid "Value is undefined, expected an Object"
  const args = crop ? (screen ? { crop, screen } : { crop }) : {};
  return plugin.call(frame, args) as { text: string } | null;
}
