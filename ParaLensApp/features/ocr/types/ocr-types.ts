/**
 * OCR Type Definitions
 * All TypeScript types and interfaces for OCR processing
 */

export type OcrFieldType = 'scrollbar' | 'value' | 'checkbox';
export type ScrollbarRowState = 'filtered' | 'multiple' | 'raw';

export type UnitSystem = 'iso' | 'imperial';
export type ValueMode = 'absolute' | 'relative';

export type ExpectedUnitConfig = {
  imperial?: {
    relative?: string;
    absolute?: string;
  };
  iso?: {
    relative?: string;
    absolute?: string;
  };
};

// Parsed representation of a scrollbar field across multiple scans.
// Each index (0, 1, 2, ...) represents one key/value-pair of the scrollbar.
// We keep *all* numeric candidates that passed the filter in arrays so that
// we can later apply majority voting.
type ParsedScrollbarSegments = Record<
  number,
  {
    key: number[];   // all filtered "key"/start values (e.g. 0.0000, 0.0000, ...)
    value: number[]; // all filtered "value"/end values  (e.g. 8.0001, 8.0001, ...)
    pairs?: Array<{ key: number; value: number }>;
    state?: ScrollbarRowState;
  }
>;

export type ParsedScrollbarValue = ParsedScrollbarSegments & {
  keyUnit?: string | null;
  valueUnit?: string | null;
};

export type OcrFieldResult = {
  box_id: string;
  type: OcrFieldType;
  // For scrollbars we return the structured ParsedScrollbarValue,
  // for value/checkbox a simple string representation.
  value: string | ParsedScrollbarValue;
  unit?: string;
};

// Shape of a single OCR box as emitted by the screen detector.
export type OcrBox = {
  id: string;
  type: OcrFieldType;
  text?: string;
  number?: number;
  expectedUnits?: string[] | ExpectedUnitConfig;
  expectedKeyUnits?: string[] | ExpectedUnitConfig;
  sameUnitAs?: string;
  // checkbox specific
  checked?: boolean;
  valueText?: string;
  valueNumber?: number;
  valueBoxId?: string;
  // scrollbar specific
  positionPercent?: number;
  // Raw values array as delivered by the native module.
  values?: any[];
};

export type OcrScanResult = {
  timestamp: number;
  boxes: OcrBox[];
  screenDetected: boolean;
  accuracy: number;
};

export type OcrValue = OcrFieldResult;

export type OcrHistoryEntry = {
  scan: OcrScanResult;
  fields: OcrValue[];
};

export type FieldTypeBreakdown = {
  value: number;
  checkbox: number;
  scrollbar: number;
};

export type FieldAggregation = {
  id: string;
  totalScans: number;
  uniqueValues: number;
  rawValues: { value: string; unit?: string }[];
  typeBreakdown: FieldTypeBreakdown;
  scrollbar?: ParsedScrollbarValue;
  sameUnitAs?: string;
};

export type UseOcrHistoryConfig = {
  maxHistoryPerField?: number;
  minOccurrencesForMajority?: number;
  commaRequired?: boolean;
  template?: any[]; // OcrTemplateBox[] - we avoid circular dependency
};

export type ScrollbarUnits = {
  keyUnit?: string | null;
  valueUnit?: string | null;
};
