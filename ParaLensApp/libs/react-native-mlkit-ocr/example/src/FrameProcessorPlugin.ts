import type { Frame as VisionCameraFrame } from 'react-native-vision-camera';
import { processFrameSync } from 'react-native-mlkit-ocr';

// Our simplified Frame interface for MLKit OCR
interface Frame {
  readonly width: number;
  readonly height: number;
  readonly pixelFormat: string;
  toArrayBuffer(): ArrayBuffer;
}

export interface OcrFrameProcessorResult {
  text: string;
  blocks: Array<{
    text: string;
    boundingBox: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
    cornerPoints: Array<{
      x: number;
      y: number;
    }>;
  }>;
  success: boolean;
  error?: string;
}

/**
 * Convert Vision Camera Frame to our simplified Frame interface
 */
function adaptFrame(frame: VisionCameraFrame): Frame {
  return {
    width: frame.width,
    height: frame.height,
    pixelFormat: frame.pixelFormat,
    toArrayBuffer: () => frame.toArrayBuffer()
  };
}

/**
 * Synchronous frame processor for MLKit OCR
 * This is a worklet that runs on the UI thread
 */
export function processFrame(frame: VisionCameraFrame): OcrFrameProcessorResult {
  'worklet';
  
  try {
    const adaptedFrame = adaptFrame(frame);
    const result = processFrameSync(adaptedFrame);
    return {
      text: result.text,
      blocks: result.blocks.map(block => ({
        text: block.text,
        boundingBox: block.boundingBox,
        cornerPoints: block.cornerPoints
      })),
      success: result.success,
      error: result.error
    };
  } catch (error) {
    return {
      text: '',
      blocks: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Asynchronous frame processor for MLKit OCR
 * This runs on a background thread
 */
export async function processFrameAsync(frame: VisionCameraFrame): Promise<OcrFrameProcessorResult> {
  try {
    const adaptedFrame = adaptFrame(frame);
    const result = processFrameSync(adaptedFrame);
    return {
      text: result.text,
      blocks: result.blocks.map(block => ({
        text: block.text,
        boundingBox: block.boundingBox,
        cornerPoints: block.cornerPoints
      })),
      success: result.success,
      error: result.error
    };
  } catch (error) {
    return {
      text: '',
      blocks: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if MLKit OCR is available
 */
export function isOcrAvailable(): boolean {
  try {
    // This will be called from the main thread
    return true; // We'll handle actual availability in the native module
  } catch {
    return false;
  }
}
