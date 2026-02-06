/**
 * OCR Feature Public API
 * Centralized exports for the OCR feature
 */

// Main hook
export { useOcrHistory } from './hooks/useOcrHistory';

// Types
export type {
  OcrFieldType,
  ParsedScrollbarValue,
  OcrFieldResult,
  OcrBox,
  OcrScanResult,
  OcrValue,
  OcrHistoryEntry,
  FieldTypeBreakdown,
  FieldAggregation,
  UseOcrHistoryConfig,
  ScrollbarUnits,
  UnitSystem,
  ValueMode,
  ExpectedUnitConfig,
} from './types/ocr-types';

// Utilities (exported for advanced use cases)
export {
  isValidNumericToken,
  normalizeNumber,
  pickMajorityValue,
  detectMatchingUnit,
} from './utils/numeric-utils';

// Constants
export {
  START_KEYWORDS,
  END_KEYWORDS,
  NUMERIC_TOKEN_REGEX,
  DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY,
  SCROLLBAR_DECIMALS,
  DEFAULT_MAX_HISTORY_PER_FIELD,
} from './constants/ocr-constants';

// Parsers (exported for testing and advanced use cases)
export { parseScrollbarFromScan, normalizeScrollbarTokensAndUnits } from './parsers/scrollbar-parser';
export { parseValueFromScan } from './parsers/value-parser';
export { parseCheckboxFromScan } from './parsers/checkbox-parser';

// Aggregators (exported for testing and advanced use cases)
export {
  mergeParsedScrollbar,
  computeMajorityString,
  computeBestScrollbar,
} from './aggregation/field-aggregator';

