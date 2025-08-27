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
export function performOcr(frame: Frame): { text: string } | null {
  'worklet';
  if (plugin == null)
    throw new Error('Failed to load Frame Processor Plugin "detectText"!');
  return plugin.call(frame) as { text: string } | null;
}
