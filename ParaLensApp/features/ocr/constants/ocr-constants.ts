/**
 * OCR Constants
 * Central place for all constants used in OCR processing
 */

// Start box should contain: V, v, P, t (we lower-case when matching)
export const START_KEYWORDS = ['v', 'p', 't'] as const;

// End box should contain: cm, bar, m/s, s
export const END_KEYWORDS = ['cm^3','cm', 'bar', 'm/s', 's'] as const;

// Numeric token validation regex
export const NUMERIC_TOKEN_REGEX = /^[+-]?\d+(?:[.,]\d+)?$/;

// Default minimum occurrences required for majority voting
export const DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY = 15;

// Number of decimal places for scrollbar formatting
export const SCROLLBAR_DECIMALS = 4;

// Default maximum history entries per field
export const DEFAULT_MAX_HISTORY_PER_FIELD = 30;

