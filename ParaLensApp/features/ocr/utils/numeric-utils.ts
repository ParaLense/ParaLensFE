/**
 * Numeric Utilities
 * Functions for validating, normalizing, and processing numeric values
 */

import { NUMERIC_TOKEN_REGEX, DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY, SCROLLBAR_DECIMALS } from '../constants/ocr-constants';

/**
 * Validates if a token is a valid numeric value
 */
export const isValidNumericToken = (token: string, commaRequired = false): boolean => {
  if (!token) return false;
  const trimmed = String(token).trim();
  if (trimmed.length === 0) return false;
  if (commaRequired && !trimmed.includes(',') && !trimmed.includes('.')) return false;
  // Reject if there are any letters
  if (/[a-zA-Z]/.test(trimmed)) return false;
  return NUMERIC_TOKEN_REGEX.test(trimmed.replace(/\s+/g, ''));
};

/**
 * Normalizes a numeric token string to a number
 */
export const normalizeNumber = (token: string): number | null => {
  if (!token) return null;
  const normalized = token.replace(',', '.').trim();
  if (!NUMERIC_TOKEN_REGEX.test(normalized.replace(/\s+/g, ''))) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Picks the majority value from an array of numbers using voting
 */
export const pickMajorityValue = (
  values: number[],
  minOccurrences = DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY
): number | null => {
  if (!values || values.length === 0) return null;

  const counts = new Map<string, { value: number; count: number }>();
  for (const v of values) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    // Use fixed precision so 0.0000 and 0.0 are treated as same value
    const key = v.toFixed(SCROLLBAR_DECIMALS);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { value: v, count: 1 });
    }
  }

  let best: { value: number; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }

  if (!best || best.count < minOccurrences) return null;
  return best.value;
};

/**
 * Fuzzy detection of units. Handles common OCR mistakes.
 */
export const  detectMatchingUnit = (raw: string, keywords: readonly string[]): string | null => {
  if (!raw || !keywords || keywords.length === 0) return null;

  // Pre-process raw string to handle common OCR substitutions
  let cleaned = raw.toLowerCase().trim();
  keywords.includes("in");
  // Common OCR fixes
  cleaned = cleaned.replace('cn', 'cm'); // cn -> cm
  cleaned = cleaned.replace('°', '%');   // ° -> % (often confused in OCR if % is expected)

  // Aggressively fix common /s misinterpretations
  if (cleaned === 'ins' || cleaned === "in's") cleaned = 'in^3/s';
  else if (cleaned.endsWith("'s")) cleaned = cleaned.slice(0, -2) + '/s';
  else if (cleaned.endsWith('is')) cleaned = cleaned.slice(0, -2) + '/s';
  else if (cleaned.endsWith("is")) cleaned = cleaned.slice(0, -3) + '/s';
  else if (cleaned.endsWith('ls')) cleaned = cleaned.slice(0, -2) + '/s';
  else if (cleaned.endsWith('s') && !cleaned.endsWith('/s')) {
    if (cleaned.match(/[\d³²]s$/)) cleaned = cleaned.slice(0, -1) + '/s';
  }

  // Remove characters that are usually noise, but keep relevant ones
  const simplified = cleaned.replace(/[^a-z0-9%/^³²]/g, '');

  if (!simplified) return null;
  if(simplified == "cin"){
    console.log("cin -> cm or cm^3, but not in!") // testing down with startsWith instead of includes
  }
  for (const kw of keywords) {
    const kwClean = kw.toLowerCase();

    // 1. Exact match (after basic cleaning)
    if (cleaned === kwClean) return kw;

    // 2. Simplified match (ignoring special chars)
    const kwSimplified = kwClean.replace(/[^a-z0-9%/^³²]/g, '');
    if (simplified === kwSimplified) return kw;

    // 3. Partial/Base match logic
    if(kwClean.replace('^3','') === simplified.replace("'","")) return kw;

    // Check for "%" matching
    if (kwClean === '%' && (simplified === '%' || simplified === 'o' || simplified === '0')) return kw;

    // 4. Permutations for other common OCR errors
    const permutations = [
      kwSimplified.replace('/', ''),
      kwSimplified.replace('^', ''),
      kwSimplified.replace('³', '3'),
      kwSimplified.replace('²', '2'),
      kwSimplified.replace('/s', 's'),
    ];

    if (permutations.some(p => simplified.startsWith(p))) {  //testing instead of simplified.includes(p)

      return kw;
    }
  }

  return null;
};

