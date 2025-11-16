import { useCallback, useState } from 'react';

// Valid unit tokens for scrollbar start/end boxes (module-level constants)
const START_BOX_UNITS = ['v', 'p', 't'];
const END_BOX_UNITS = ['cm', 'bar', 'm/s', 's'];

// Module-level helper to validate scrollbar units
function isValidScrollbarUnit(value: string, fieldId: string): boolean {
  const normalized = value.toLowerCase().trim();
  const isStartBox = fieldId.includes('_start');
  const isEndBox = fieldId.includes('_end');

  if (!isStartBox && !isEndBox) {
    return true; // Not a scrollbar unit box, so it's valid
  }

  if (isStartBox) {
    // Start box should contain one of START_BOX_UNITS
    return START_BOX_UNITS.some(unit => normalized.includes(unit));
  } else {
    // End box should contain one of END_BOX_UNITS
    return END_BOX_UNITS.some(unit => normalized.includes(unit));
  }
}

// Helper: check if a token contains any letters (a–z)
const LETTER_REGEX = /[a-zA-Z]/;
function containsLetters(value: string): boolean {
  return LETTER_REGEX.test(value);
}

// Helper: check if a token looks numeric-ish (digits with optional comma/dot)
const NUMERIC_TOKEN_REGEX = /^[0-9.,]+$/;
function isValidNumericToken(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (containsLetters(trimmed)) return false;
  return NUMERIC_TOKEN_REGEX.test(trimmed);
}

export interface OcrBox {
  id: string;
  type: 'value' | 'checkbox' | 'scrollbar';
  value?: string;
  number?: number;
  text?: string;
  checked?: boolean;
  selectedValue?: any;
  positionPercent?: number;
  values?: number[] | string[] | Record<string, string>; // Array of scrollbar values (legacy), text blocks (new), or HashMap
  cells?: number; // Number of cells in scrollbar
  orientation?: 'horizontal' | 'vertical'; // Scrollbar orientation
  valueBoxId?: string;
  valueText?: string;
  valueNumber?: number;
  confidence?: number;
}

export interface OcrScanResult {
  timestamp: number;
  boxes: OcrBox[];
  screenDetected?: boolean;
  accuracy?: number;
}

// Internal helper type for scrollbar index pairs
interface ScrollbarPair {
  index: number;
  key: string;
  value: string;
}

// Convert a scrollbar box into index-based key/value pairs,
// while trimming start/end units and invalid (non-numeric) tokens.
function extractScrollbarPairsFromBox(box: OcrBox): ScrollbarPair[] {
  const pairs: ScrollbarPair[] = [];

  if (!Array.isArray(box.values)) {
    return pairs;
  }

  let values = box.values
    .map(v =>
      typeof v === 'number' ? v.toFixed(2) : String(v ?? '').trim(),
    )
    .filter(v => v !== '');

  if (!values.length) return pairs;

  // Remove leading start unit (e.g. v, p, t) if present
  if (values.length > 0) {
    const firstValue = values[0].toLowerCase();
    const isStartUnit = START_BOX_UNITS.some(unit => firstValue.includes(unit));
    if (isStartUnit) {
      values = values.slice(1);
    }
  }

  // Remove trailing end unit (e.g. cm, bar, m/s, s) if present
  if (values.length > 0) {
    const lastValue = values[values.length - 1].toLowerCase();
    const isEndUnit = END_BOX_UNITS.some(unit => lastValue.includes(unit));
    if (isEndUnit) {
      values = values.slice(0, -1);
    }
  }

  // Group into pairs: [0,1] -> index 0, [2,3] -> index 1, etc.
  for (let i = 0; i < values.length - 1; i += 2) {
    const index = Math.floor(i / 2);
    const key = values[i];
    const value = values[i + 1];

    // Only keep pairs where both key and value are numeric-ish
    if (!isValidNumericToken(key) || !isValidNumericToken(value)) {
      continue;
    }

    pairs.push({ index, key, value });
  }

  return pairs;
}

export interface OcrValue {
  id: string;
  value: string;
  timestamp: number;
  confidence?: number;
}

export interface OcrHistoryEntry {
  fieldId: string;
  values: OcrValue[];
  scanResults: OcrScanResult[];
  lastSeen: number;
}

interface UseOcrHistoryOptions {
  maxHistoryPerField?: number;
  minOccurrencesForMajority?: number;
  commaRequired?: boolean;
}

interface UseOcrHistoryReturn {
  // Core functions
  addScanResult: (ocrMap: Record<string, string>) => void;
  addFullScanResult: (scanResult: OcrScanResult) => void;
  getFilteredValue: (fieldId: string) => string | null;
  getFieldHistory: (fieldId: string) => OcrValue[];
  getFieldScanResults: (fieldId: string) => OcrScanResult[];
  
  // Filtering functions
  hasComma: (value: string) => boolean;
  getMajorityValue: (fieldId: string) => string | null;
  getMajorityValueByType: (fieldId: string, type: 'value' | 'checkbox' | 'scrollbar') => string | null;
  getBestValue: (
    fieldId: string,
    type: 'value' | 'checkbox' | 'scrollbar'
  ) => {
    value: string | null;
    majorityRatio: number;
    totalScans: number;
  };
  
  // Statistics
  getFieldStats: (fieldId: string) => {
    totalScans: number;
    uniqueValues: number;
    mostCommonValue: string | null;
    hasCommaValues: number;
    lastSeen: number | null;
    typeBreakdown: {
      value: number;
      checkbox: number;
      scrollbar: number;
    };
  };
  
  // Management
  clearFieldHistory: (fieldId: string) => void;
  clearAllHistory: () => void;
}

export const useOcrHistory = (options: UseOcrHistoryOptions = {}): UseOcrHistoryReturn => {
  const {
    maxHistoryPerField = 50,
    minOccurrencesForMajority = 3,
    commaRequired = true,
  } = options;

  const [history, setHistory] = useState<Record<string, OcrHistoryEntry>>({});

  // Helper function to check if a value has a comma
  const hasComma = useCallback((value: string): boolean => {
    return value.includes(',') || value.includes('.');
  }, []);

  // Check if a value is a checkbox value (true/false)
  const isCheckboxValue = useCallback((value: string): boolean => {
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === 'false';
  }, []);

  // Helper function to normalize values for comparison
  const normalizeValue = useCallback((value: string): string => {
    return value.trim().toLowerCase();
  }, []);

  // Add new scan results to history (legacy method for backward compatibility)
  const addScanResult = useCallback((ocrMap: Record<string, string>) => {
    const timestamp = Date.now();
    
    setHistory(prevHistory => {
      const newHistory = { ...prevHistory };
      
      Object.entries(ocrMap).forEach(([fieldId, value]) => {
        if (!value || value.trim() === '') return;
        
        // Skip values without comma if commaRequired is true, but allow checkbox values and valid scrollbar units
        if (commaRequired && !hasComma(value) && !isCheckboxValue(value) && !isValidScrollbarUnit(value, fieldId)) {
          return;
        }
        
        const normalizedValue = normalizeValue(value);
        
        if (!newHistory[fieldId]) {
          newHistory[fieldId] = {
            fieldId,
            values: [],
            scanResults: [],
            lastSeen: timestamp,
          };
        }
        
        const entry = newHistory[fieldId];
        
        // Check if this exact value was already added recently (within 1 second)
        const recentValue = entry.values.find(
          v => normalizeValue(v.value) === normalizedValue && 
               (timestamp - v.timestamp) < 1000
        );
        
        if (!recentValue) {
          entry.values.push({
            id: `${fieldId}_${timestamp}_${Math.random()}`,
            value,
            timestamp,
          });
          
          // Keep only the most recent values
          if (entry.values.length > maxHistoryPerField) {
            entry.values = entry.values
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, maxHistoryPerField);
          }
          
          entry.lastSeen = timestamp;
        }
      });
      
      return newHistory;
    });
  }, [maxHistoryPerField, commaRequired, hasComma, isCheckboxValue, normalizeValue]);

  // Add full scan result with complete box information
  const addFullScanResult = useCallback((scanResult: OcrScanResult) => {
    setHistory(prevHistory => {
      const newHistory = { ...prevHistory };
      
      scanResult.boxes.forEach(box => {
        if (!box.id) return;
        
        // Extract value based on type
        let value: string | null = null;
        if (box.type === 'value') {
          value = (box.number != null ? String(box.number) : (box.text ?? '')) ?? '';
        } else if (box.type === 'checkbox') {
          value = box.checked ? 'true' : 'false';
        } else if (box.type === 'scrollbar') {
          // Store raw scrollbar values - getBestValue will handle pairing/filtering
          if (Array.isArray(box.values)) {
            value = box.values
              .map(v => typeof v === 'number' ? v.toFixed(2) : String(v || '').trim())
              .filter(v => v !== '')
              .join('; ');
          } else if (typeof box.values === 'object' && box.values !== null) {
            // HashMap of string -> string
            value = Object.entries(box.values)
              .map(([key, val]) => `${key}:${val}`)
              .join(', ');
          } else if (box.positionPercent !== undefined) {
            // Fallback to positionPercent
            value = box.positionPercent.toFixed(2);
          }
        }
        
        if (!value || value.trim() === '') return;
        
        const fieldId = box.id;
        
        // Skip values without comma if commaRequired is true, but allow checkbox values and valid scrollbar units
        if (commaRequired && !hasComma(value) && !isCheckboxValue(value) && !isValidScrollbarUnit(value, fieldId)) {
          return;
        }
        const normalizedValue = normalizeValue(value);
        
        if (!newHistory[fieldId]) {
          newHistory[fieldId] = {
            fieldId,
            values: [],
            scanResults: [],
            lastSeen: scanResult.timestamp,
          };
        }
        
        const entry = newHistory[fieldId];
        
        // Check if this exact value was already added recently (within 1 second)
        const recentValue = entry.values.find(
          v => normalizeValue(v.value) === normalizedValue && 
               (scanResult.timestamp - v.timestamp) < 1000
        );
        
        if (!recentValue) {
          entry.values.push({
            id: `${fieldId}_${scanResult.timestamp}_${Math.random()}`,
            value,
            timestamp: scanResult.timestamp,
            confidence: box.confidence,
          });
          
          // Keep only the most recent values
          if (entry.values.length > maxHistoryPerField) {
            entry.values = entry.values
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, maxHistoryPerField);
          }
          
          entry.lastSeen = scanResult.timestamp;
        }
        
        // Add full scan result
        entry.scanResults.push(scanResult);
        
        // Keep only the most recent scan results
        if (entry.scanResults.length > maxHistoryPerField) {
          entry.scanResults = entry.scanResults
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, maxHistoryPerField);
        }
      });
      
      return newHistory;
    });
  }, [maxHistoryPerField, commaRequired, hasComma, isCheckboxValue, normalizeValue]);

  // Get the majority value for a field
  const getMajorityValue = useCallback((fieldId: string): string | null => {
    const entry = history[fieldId];
    if (!entry || entry.values.length === 0) return null;
    
    // Count occurrences of each normalized value
    const valueCounts: Record<string, { count: number; originalValue: string }> = {};
    
    entry.values.forEach(ocrValue => {
      const normalized = normalizeValue(ocrValue.value);
      if (!valueCounts[normalized]) {
        valueCounts[normalized] = { count: 0, originalValue: ocrValue.value };
      }
      valueCounts[normalized].count++;
    });
    
    // Find the value with the highest count
    let maxCount = 0;
    let majorityValue: string | null = null;
    
    Object.entries(valueCounts).forEach(([, data]) => {
      if (data.count > maxCount && data.count >= minOccurrencesForMajority) {
        maxCount = data.count;
        majorityValue = data.originalValue;
      }
    });
    
    return majorityValue;
  }, [history, minOccurrencesForMajority, normalizeValue]);

  // Generic majority helper used by getBestValue
  const computeMajority = useCallback(
    (values: string[]): { bestValue: string | null; bestCount: number; total: number } => {
      const counts: Record<string, { count: number; original: string }> = {};

      values.forEach(v => {
        const norm = normalizeValue(v);
        if (!norm) return;
        if (!counts[norm]) {
          counts[norm] = { count: 0, original: v };
        }
        counts[norm].count += 1;
      });

      let bestCount = 0;
      let bestOriginal: string | null = null;
      Object.values(counts).forEach(c => {
        if (c.count > bestCount) {
          bestCount = c.count;
          bestOriginal = c.original;
        }
      });

      return { bestValue: bestOriginal, bestCount, total: values.length };
    },
    [normalizeValue],
  );

  // Get the best value and its majority ratio for a specific field and type
  const getBestValue = useCallback(
    (
      fieldId: string,
      type: 'value' | 'checkbox' | 'scrollbar',
    ): { value: string | null; majorityRatio: number; totalScans: number } => {
      const entry = history[fieldId];
      if (!entry || entry.scanResults.length === 0) {
        return { value: null, majorityRatio: 0, totalScans: 0 };
      }

      // Collect all boxes of the requested type
      const typeBoxes: OcrBox[] = [];
      entry.scanResults.forEach(scanResult => {
        const box = scanResult.boxes.find(b => b.id === fieldId && b.type === type);
        if (box) {
          typeBoxes.push(box);
        }
      });

      if (typeBoxes.length === 0) {
        return { value: null, majorityRatio: 0, totalScans: 0 };
      }

      // Scrollbar: compute majority per index using key:value pairs
      if (type === 'scrollbar') {
        const indexedValues: Record<number, string[]> = {};

        typeBoxes.forEach(box => {
          const pairs = extractScrollbarPairsFromBox(box);
          pairs.forEach(pair => {
            if (!indexedValues[pair.index]) {
              indexedValues[pair.index] = [];
            }
            indexedValues[pair.index].push(`${pair.key}:${pair.value}`);
          });
        });

        const indices = Object.keys(indexedValues);
        if (!indices.length) {
          return { value: null, majorityRatio: 0, totalScans: 0 };
        }

        const majorityValuesByIndex: Record<number, string> = {};
        const ratios: number[] = [];
        let totalPairs = 0;

        indices.forEach(indexStr => {
          const idx = parseInt(indexStr, 10);
          const valuesAtIndex = indexedValues[idx];
          const { bestValue, bestCount, total } = computeMajority(valuesAtIndex);
          if (bestValue && total > 0) {
            majorityValuesByIndex[idx] = bestValue;
            ratios.push(bestCount / total);
            totalPairs += total;
          }
        });

        if (!Object.keys(majorityValuesByIndex).length) {
          return { value: null, majorityRatio: 0, totalScans: 0 };
        }

        const sorted = Object.keys(majorityValuesByIndex)
          .map(Number)
          .sort((a, b) => a - b);
        const combinedValue = sorted.map(i => majorityValuesByIndex[i]).join('; ');
        const majorityRatio =
          ratios.length > 0
            ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length
            : 0;

        return {
          value: combinedValue,
          majorityRatio,
          totalScans: totalPairs,
        };
      }

      // Value / checkbox: simple majority over extracted values
      const rawValues: string[] = [];
      typeBoxes.forEach(box => {
        let v: string | null = null;
        if (type === 'value') {
          v =
            box.number != null
              ? String(box.number)
              : (box.text ?? '');
        } else if (type === 'checkbox') {
          v = box.checked ? 'true' : 'false';
        }

        if (!v || !v.trim()) return;
        if (type === 'value' && !isValidNumericToken(v)) return;
        rawValues.push(v);
      });

      if (!rawValues.length) {
        return { value: null, majorityRatio: 0, totalScans: 0 };
      }

      const { bestValue, bestCount, total } = computeMajority(rawValues);
      if (!bestValue) {
        return { value: null, majorityRatio: 0, totalScans: total };
      }

      const majorityRatio = total > 0 ? bestCount / total : 0;

      return {
        value: bestValue,
        majorityRatio,
        totalScans: total,
      };
    },
    [history, computeMajority],
  );

  // Get the majority value for a field filtered by type (backed by getBestValue)
  const getMajorityValueByType = useCallback(
    (fieldId: string, type: 'value' | 'checkbox' | 'scrollbar'): string | null => {
      const result = getBestValue(fieldId, type);
      return result.value;
    },
    [getBestValue],
  );

  // Get filtered value (majority value if available, otherwise most recent)
  const getFilteredValue = useCallback((fieldId: string): string | null => {
    const majorityValue = getMajorityValue(fieldId);
    if (majorityValue) return majorityValue;
    
    // Fallback to most recent value
    const entry = history[fieldId];
    if (!entry || entry.values.length === 0) return null;
    
    const mostRecent = entry.values
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return mostRecent?.value || null;
  }, [getMajorityValue, history]);

  // Get history for a specific field
  const getFieldHistory = useCallback((fieldId: string): OcrValue[] => {
    const entry = history[fieldId];
    return entry ? [...entry.values].sort((a, b) => b.timestamp - a.timestamp) : [];
  }, [history]);

  // Get scan results for a specific field
  const getFieldScanResults = useCallback((fieldId: string): OcrScanResult[] => {
    const entry = history[fieldId];
    return entry ? [...entry.scanResults].sort((a, b) => b.timestamp - a.timestamp) : [];
  }, [history]);

  // Get statistics for a field
  const getFieldStats = useCallback((fieldId: string) => {
    const entry = history[fieldId];
    if (!entry || entry.values.length === 0) {
      return {
        totalScans: 0,
        uniqueValues: 0,
        mostCommonValue: null,
        hasCommaValues: 0,
        lastSeen: null,
        typeBreakdown: {
          value: 0,
          checkbox: 0,
          scrollbar: 0,
        },
      };
    }
    
    const valueCounts: Record<string, number> = {};
    let hasCommaCount = 0;
    const typeBreakdown = {
      value: 0,
      checkbox: 0,
      scrollbar: 0,
    };
    
    entry.values.forEach(ocrValue => {
      const normalized = normalizeValue(ocrValue.value);
      valueCounts[normalized] = (valueCounts[normalized] || 0) + 1;
      
      if (hasComma(ocrValue.value)) {
        hasCommaCount++;
      }
    });
    
    // Count types from scan results
    entry.scanResults.forEach(scanResult => {
      const box = scanResult.boxes.find(b => b.id === fieldId);
      if (box) {
        if (box.type === 'value') typeBreakdown.value++;
        else if (box.type === 'checkbox') typeBreakdown.checkbox++;
        else if (box.type === 'scrollbar') typeBreakdown.scrollbar++;
      }
    });
    
    const uniqueValues = Object.keys(valueCounts).length;
    const mostCommonValue = Object.entries(valueCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
    
    return {
      totalScans: entry.values.length,
      uniqueValues,
      mostCommonValue,
      hasCommaValues: hasCommaCount,
      lastSeen: entry.lastSeen,
      typeBreakdown,
    };
  }, [history, hasComma, normalizeValue]);

  // Clear history for a specific field
  const clearFieldHistory = useCallback((fieldId: string) => {
    setHistory(prevHistory => {
      const newHistory = { ...prevHistory };
      delete newHistory[fieldId];
      return newHistory;
    });
  }, []);

  // Clear all history
  const clearAllHistory = useCallback(() => {
    setHistory({});
  }, []);

  return {
    addScanResult,
    addFullScanResult,
    getFilteredValue,
    getFieldHistory,
    getFieldScanResults,
    hasComma,
    getMajorityValue,
    getMajorityValueByType,
    getBestValue,
    getFieldStats,
    clearFieldHistory,
    clearAllHistory,
  };
};
