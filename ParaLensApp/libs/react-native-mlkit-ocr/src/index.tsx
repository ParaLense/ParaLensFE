import { NitroModules } from 'react-native-nitro-modules';
import type { MlkitOcr, OcrResult, TextBlock, Frame } from './MlkitOcr.nitro';

const MlkitOcrHybridObject =
  NitroModules.createHybridObject<MlkitOcr>('MlkitOcr');

// Legacy method (keeping for compatibility)
export function multiply(a: number, b: number): number {
  return MlkitOcrHybridObject.multiply(a, b);
}

// OCR methods for static images (synchronous)
export function recognizeText(imagePath: string): OcrResult {
  return MlkitOcrHybridObject.recognizeText(imagePath);
}

export function recognizeTextFromBase64(base64Image: string): OcrResult {
  return MlkitOcrHybridObject.recognizeTextFromBase64(base64Image);
}

// Vision Camera frame processor methods (synchronous)
export function processFrame(frame: Frame): OcrResult {
  return MlkitOcrHybridObject.processFrame(frame);
}

export function processFrameSync(frame: Frame): OcrResult {
  return MlkitOcrHybridObject.processFrameSync(frame);
}

// Utility methods
export function isAvailable(): boolean {
  return MlkitOcrHybridObject.isAvailable();
}

// Export types
export type { OcrResult, TextBlock, Frame };
