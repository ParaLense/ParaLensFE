import { useCallback, useMemo, useState } from 'react';

export interface OcrBox {
  id: string;
  type: 'value' | 'checkbox' | 'scrollbar';
  value?: string;
  number?: number;
  text?: string;
  checked?: boolean;
  selectedValue?: any;
  positionPercent?: number;
  values?: number[]; // Array of scrollbar values
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

  // Check if a value is a valid scrollbar unit
  const isValidScrollbarUnit = useCallback((value: string, fieldId: string): boolean => {
    const normalized = value.toLowerCase().trim();
    const isStartBox = fieldId.includes('_start');
    const isEndBox = fieldId.includes('_end');
    
    if (!isStartBox && !isEndBox) {
      return true; // Not a scrollbar unit box, so it's valid
    }
    
    if (isStartBox) {
      // Start box should contain: V, v, P, t
      return normalized.includes('v') || normalized.includes('p') || normalized.includes('t');
    } else {
      // End box should contain: cm, bar, m/s, s
      return normalized.includes('cm') || normalized.includes('bar') || 
             normalized.includes('m/s') || normalized.includes('s');
    }
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
  }, [maxHistoryPerField, commaRequired, hasComma, isCheckboxValue, isValidScrollbarUnit, normalizeValue]);

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
          // Handle scrollbar values as array
          const scrollbarValues = box.values || (box.positionPercent ? [box.positionPercent] : []);
          value = scrollbarValues.map(v => v.toFixed(2)).join(', ');
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
  }, [maxHistoryPerField, commaRequired, hasComma, isCheckboxValue, isValidScrollbarUnit, normalizeValue]);

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
    
    Object.entries(valueCounts).forEach(([normalized, data]) => {
      if (data.count > maxCount && data.count >= minOccurrencesForMajority) {
        maxCount = data.count;
        majorityValue = data.originalValue;
      }
    });
    
    return majorityValue;
  }, [history, minOccurrencesForMajority, normalizeValue]);

  // Get the majority value for a field filtered by type
  const getMajorityValueByType = useCallback((fieldId: string, type: 'value' | 'checkbox' | 'scrollbar'): string | null => {
    const entry = history[fieldId];
    if (!entry || entry.scanResults.length === 0) return null;
    
    // Get all boxes of the specified type for this field
    const typeBoxes: OcrBox[] = [];
    entry.scanResults.forEach(scanResult => {
      const box = scanResult.boxes.find(b => b.id === fieldId && b.type === type);
      if (box) {
        typeBoxes.push(box);
      }
    });
    
    if (typeBoxes.length === 0) return null;
    
    // Count occurrences of each normalized value for this type
    const valueCounts: Record<string, { count: number; originalValue: string }> = {};
    
    typeBoxes.forEach(box => {
      let value: string | null = null;
      if (box.type === 'value') {
        value = (box.number != null ? String(box.number) : (box.text ?? '')) ?? '';
      } else if (box.type === 'checkbox') {
        value = box.checked ? 'true' : 'false';
      } else if (box.type === 'scrollbar') {
        // Handle scrollbar values as array
        const scrollbarValues = box.values || (box.positionPercent ? [box.positionPercent] : []);
        value = scrollbarValues.map(v => v.toFixed(2)).join(', ');
      }
      
      if (!value || value.trim() === '') return;
      
      const normalized = normalizeValue(value);
      if (!valueCounts[normalized]) {
        valueCounts[normalized] = { count: 0, originalValue: value };
      }
      valueCounts[normalized].count++;
    });
    
    // Find the value with the highest count
    let maxCount = 0;
    let majorityValue: string | null = null;
    
    Object.entries(valueCounts).forEach(([normalized, data]) => {
      if (data.count > maxCount && data.count >= minOccurrencesForMajority) {
        maxCount = data.count;
        majorityValue = data.originalValue;
      }
    });
    
    return majorityValue;
  }, [history, minOccurrencesForMajority, normalizeValue]);

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
    getFieldStats,
    clearFieldHistory,
    clearAllHistory,
  };
};
