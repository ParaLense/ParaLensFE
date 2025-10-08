import { type Frame, VisionCameraProxy } from 'react-native-vision-camera';

/**
 * Initialize the screen detector frame processor plugin
 */
const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectScreen', {});

export type TemplateBox = {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

// JSON-artiger Param-Typ für Frame-Processor-Argumente (ersetzt fehlenden ParameterType)

export type PerformScanOptions = {
  template: TemplateBox[];
  screenWidthRatio?: number; // 0..1, default 0.80
  screenAspectW?: number; // default 3
  screenAspectH?: number; // default 4
  minIouForMatch?: number; // default 0.30
  accuracyThreshold?: number; // default 0.60
  templateTargetW?: number; // default 1200
  templateTargetH?: number; // default 1600
  // Optional: Bild zurückgeben
  returnWarpedImage?: boolean;
  outputW?: number;
  outputH?: number;
  imageQuality?: number; // 0..100
};

/**
 * Performs screen detection on camera frames using OpenCV native plugin.
 * Nur Options-API: (frame, { template, ...options })
 */
export function performScan(
  frame: Frame,
  opts: PerformScanOptions
): { screen: {
    template_pixel_boxes?: { x:number; y:number; w:number; h:number }[];
    matched_boxes?: any;
    image_base64?: string;
  }} | null {
  'worklet';
  if (plugin == null)
    throw new Error('Failed to load Frame Processor Plugin "detectScreen"!');

  // Nur primitive/plain Werte erlauben (JSI-sicher)
  const boxes = opts.template.map((b) => ({
    id: b.id ?? undefined,
    x: +b.x,
    y: +b.y,
    width: +b.width,
    height: +b.height,
  }));

  const args = {
    template: boxes,
    ...(opts.screenWidthRatio != null
      ? { screenWidthRatio: +opts.screenWidthRatio }
      : {}),
    ...(opts.screenAspectW != null
      ? { screenAspectW: +opts.screenAspectW }
      : {}),
    ...(opts.screenAspectH != null
      ? { screenAspectH: +opts.screenAspectH }
      : {}),
    ...(opts.minIouForMatch != null
      ? { minIouForMatch: +opts.minIouForMatch }
      : {}),
    ...(opts.accuracyThreshold != null
      ? { accuracyThreshold: +opts.accuracyThreshold }
      : {}),
    ...(opts.templateTargetW != null
      ? { templateTargetW: +opts.templateTargetW }
      : {}),
    ...(opts.templateTargetH != null
      ? { templateTargetH: +opts.templateTargetH }
      : {}),
    ...(opts.returnWarpedImage != null
      ? { returnWarpedImage: opts.returnWarpedImage }
      : {}),
    ...(opts.outputW != null ? { outputW: +opts.outputW } : {}),
    ...(opts.outputH != null ? { outputH: +opts.outputH } : {}),
    ...(opts.imageQuality != null ? { imageQuality: +opts.imageQuality } : {}),
  } as const;

  console.log("frame size: " + frame.width + "x" + frame.height);
  console.log("performScan args: " + JSON.stringify(args));
  // Typcast auf any, da template ein Array von Objekten ist und die nativen Plugins dies erwarten.
  // Die Typen der nativen Seite sind korrekt, TS meckert nur wegen der Record-Signatur.
  return plugin.call(frame, args as any) as { screen: any } | null;
}
