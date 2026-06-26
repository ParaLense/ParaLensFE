import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

/**
 * Native screen-detection plugin (VisionCamera v5 / Nitro).
 *
 * The rich, evolving option/result shapes (`PerformScanOptions`, `ScanResult`
 * with its OCR union types) don't map cleanly onto Nitro's struct system, so we
 * transport them as JSON strings. This keeps the native ABI tiny and stable
 * while the TypeScript types in `index.tsx` stay the single source of truth.
 *
 * `detectScreen` runs synchronously on the camera worklet thread — it receives
 * the live {@link Frame} (Nitro passes the HybridObject through to Kotlin, where
 * we read its luma plane) plus the serialized scan options, and returns the
 * serialized scan result (or `null` when nothing was detected / on error).
 */
export interface ScreenDetector
  extends HybridObject<{ android: 'kotlin'; ios: 'swift' }> {
  detectScreen(frame: Frame, argsJson: string): string | null;
}
