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

// OCR template box (percent of warped image)
export type OcrTemplateBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // value, checkbox, scrollbar
  type?: 'value' | 'checkbox' | 'scrollbar';
  options?: {
    orientation?: 'horizontal' | 'vertical';
    cells?: number;
    valuesRegion?: { x: number; y: number; width: number; height: number };
    blackRatioMin?: number;
    readValue?: boolean;
    valueBoxId?: string;
  };
};

// JSON-artiger Param-Typ für Frame-Processor-Argumente (ersetzt fehlenden ParameterType)

export type PerformScanOptions = {
  // Backward-compatible: screen detection template
  template?: TemplateBox[];
  // New names: allow passing screen and OCR templates separately
  screenTemplate?: TemplateBox[];
  ocrTemplate?: OcrTemplateBox[];
  runOcr?: boolean;
  screenWidthRatio?: number; // 0..1, default 0.80
  screenAspectW?: number; // default 3
  screenAspectH?: number; // default 4
  minIouForMatch?: number; // default 0.30
  accuracyThreshold?: number; // default 0.80 (plan)
  templateTargetW?: number; // default 1200
  templateTargetH?: number; // default 1600
  // Optional: Bild zurückgeben
  returnWarpedImage?: boolean;
  outputW?: number;
  outputH?: number;
  imageQuality?: number; // 0..100
  // ROI options (normalized 0..1). If provided, native side will use ROI-driven detection
  roiOuter?: { x: number; y: number; width: number; height: number };
  roiInner?: { x: number; y: number; width: number; height: number };
  // Minimum aspect ratio to enforce for ROI (width/height >= minAspectW/minAspectH)
  minAspectW?: number; // default 3
  minAspectH?: number; // default 4
  // Optional: rotate native frame 90° CW before processing (testing/orientation)
  rotate90CW?: boolean;
};

/**
 * Performs screen detection on camera frames using OpenCV native plugin.
 * Nur Options-API: (frame, { template, ...options })
 */
export function performScan(
  frame: Frame,
  opts: PerformScanOptions
): {
  screen: {
    template_pixel_boxes?: { x: number; y: number; w: number; h: number }[];
    matched_boxes?: any;
    image_base64?: string;
  };
  ocr?: {
    boxes: Array<
      | { id: string; type: 'value'; text?: string; number?: number; confidence?: number }
      | {
          id: string;
          type: 'checkbox';
          checked: boolean;
          confidence?: number;
          valueText?: string;
          valueNumber?: number;
          valueBoxId?: string;
        }
      | {
          id: string;
          type: 'scrollbar';
          positionPercent: number;
          values?: Array<{ index: number; text?: string; number?: number; confidence?: number }>;
          selectedIndex?: number;
          selectedValue?: number | string;
          confidence?: number;
        }
    >;
  };
} | null {
  'worklet';
  if (plugin == null)
    throw new Error('Failed to load Frame Processor Plugin "detectScreen"!');

  // Nur primitive/plain Werte erlauben (JSI-sicher)
  const screenTemplate = (opts.screenTemplate ?? opts.template) ?? [];
  const boxes = screenTemplate.map((b) => ({
    id: b.id ?? undefined,
    x: +b.x,
    y: +b.y,
    width: +b.width,
    height: +b.height,
  }));

  const args = {
    // Detection template (percent-coordinates in canonical space)
    template: boxes,
    // OCR template (percent of warped image)
    ...(opts.ocrTemplate && opts.ocrTemplate.length > 0
      ? {
          ocrTemplate: opts.ocrTemplate.map((b) => ({
            id: b.id,
            x: +b.x,
            y: +b.y,
            width: +b.width,
            height: +b.height,
            ...(b.type ? { type: b.type } : {}),
            ...(b.options
              ? {
                  options: {
                    ...(b.options.orientation
                      ? { orientation: b.options.orientation }
                      : {}),
                    ...(b.options.cells != null
                      ? { cells: +b.options.cells }
                      : {}),
                    ...(b.options.valuesRegion
                      ? {
                          valuesRegion: {
                            x: +b.options.valuesRegion.x,
                            y: +b.options.valuesRegion.y,
                            width: +b.options.valuesRegion.width,
                            height: +b.options.valuesRegion.height,
                          },
                        }
                      : {}),
                  },
                }
              : {}),
          })),
        }
      : {}),
    ...(opts.runOcr != null ? { runOcr: !!opts.runOcr } : {}),
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
    ...(opts.roiOuter
      ? {
          roiOuter: {
            x: +opts.roiOuter.x,
            y: +opts.roiOuter.y,
            width: +opts.roiOuter.width,
            height: +opts.roiOuter.height,
          },
        }
      : {}),
    ...(opts.roiInner
      ? {
          roiInner: {
            x: +opts.roiInner.x,
            y: +opts.roiInner.y,
            width: +opts.roiInner.width,
            height: +opts.roiInner.height,
          },
        }
      : {}),
    ...(opts.minAspectW != null ? { minAspectW: +opts.minAspectW } : {}),
    ...(opts.minAspectH != null ? { minAspectH: +opts.minAspectH } : {}),
    ...(opts.rotate90CW != null ? { rotate90CW: opts.rotate90CW } : {}),
  } as const;

  // Typcast auf any, da template ein Array von Objekten ist und die nativen Plugins dies erwarten.
  // Die Typen der nativen Seite sind korrekt, TS meckert nur wegen der Record-Signatur.
  return plugin.call(frame, args as any) as { screen: any; ocr?: any } | null;
}
