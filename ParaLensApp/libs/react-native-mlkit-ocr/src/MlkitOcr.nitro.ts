import type { HybridObject } from 'react-native-nitro-modules';

export interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CornerPoint {
  x: number;
  y: number;
}

export interface TextBlock {
  text: string;
  boundingBox: BoundingBox;
  cornerPoints: CornerPoint[];
}

export interface OcrResult {
  text: string;
  blocks: TextBlock[];
  success: boolean;
  error?: string;
}

export interface Frame {
  readonly width: number;
  readonly height: number;
  readonly pixelFormat: string;
  toArrayBuffer(): ArrayBuffer;
}

export interface MlkitOcr
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Legacy method (keeping for compatibility)
  multiply(a: number, b: number): number;

  // OCR methods for static images (synchronous)
  recognizeText(imagePath: string): OcrResult;
  recognizeTextFromBase64(base64Image: string): OcrResult;

  // Vision Camera frame processor methods (synchronous)
  processFrame(frame: Frame): OcrResult;
  processFrameSync(frame: Frame): OcrResult;

  // Utility methods
  isAvailable(): boolean;
}
