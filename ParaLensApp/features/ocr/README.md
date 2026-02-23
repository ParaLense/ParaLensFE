# OCR Feature - Refactored Structure

## Overview

The OCR feature has been refactored following Bulletproof React architecture principles. The previous monolithic 799-line `useOcrHistory.ts` file has been split into a modular, maintainable structure.

## Directory Structure

```
features/ocr/
├── index.ts                    # Public API barrel export
├── useOcrHistory.ts           # Legacy file (to be removed after migration)
├── constants/                  # Constants and configuration
│   ├── index.ts
│   └── ocr-constants.ts       # START_KEYWORDS, END_KEYWORDS, regex patterns
├── types/                      # TypeScript type definitions
│   ├── index.ts
│   └── ocr-types.ts           # All OCR-related types
├── utils/                      # Utility functions
│   ├── index.ts
│   └── numeric-utils.ts       # Numeric validation & unit detection
├── parsers/                    # OCR data parsers
│   ├── index.ts
│   ├── scrollbar-parser.ts    # Parse scrollbar OCR data
│   ├── value-parser.ts        # Parse numeric value fields
│   └── checkbox-parser.ts     # Parse checkbox states
├── aggregation/                # Data aggregation logic
│   ├── index.ts
│   └── field-aggregator.ts    # Majority voting & field merging
└── hooks/                      # React hooks
    ├── index.ts
    └── useOcrHistory.ts       # Refactored main hook
```

## Usage

### Basic Usage

```typescript
import { useOcrHistory } from '@/features/ocr';

function MyComponent() {
  const {
    addScanResult,
    getBestFields,
    getFilteredValue,
    scanHistory,
  } = useOcrHistory({
    maxHistoryPerField: 30,
    minOccurrencesForMajority: 15,
    commaRequired: false,
  });

  // Add scan results
  const handleScan = (scanResult: OcrScanResult) => {
    addScanResult(scanResult);
  };

  // Get aggregated best values
  const bestFields = getBestFields();
  
  return (/* ... */);
}
```

### Advanced Usage - Direct Utility Access

```typescript
import { 
  isValidNumericToken, 
  normalizeNumber,
  detectMatchingUnit,
  parseScrollbarFromScan,
} from '@/features/ocr';

// Validate numeric tokens
if (isValidNumericToken("123.45", false)) {
  const num = normalizeNumber("123.45"); // Returns 123.45
}

// Detect units with OCR error correction
const unit = detectMatchingUnit("cn", ["cm", "m"]); // Returns "cm"

// Parse scrollbar data manually
const scrollbarData = parseScrollbarFromScan(ocrBox, false);
```

## Key Features

### 1. **Modular Architecture**
- Each module has a single responsibility
- Easy to test individual components
- Clear separation of concerns

### 2. **Type Safety**
- Comprehensive TypeScript types
- Explicit type exports
- No circular dependencies

### 3. **Reusability**
- Utils can be used independently
- Parsers are composable
- Aggregation logic is decoupled from React

### 4. **Testability**
- Pure functions without side effects
- Easy to mock dependencies
- Small, focused modules

## Migration Guide

### For Existing Code

Replace old imports:

```typescript
// ❌ Old
import { useOcrHistory, isValidNumericToken } from '@/features/ocr/useOcrHistory';

// ✅ New
import { useOcrHistory, isValidNumericToken } from '@/features/ocr';
```

The API remains the same, so no code changes needed beyond import paths.

## Testing

Each module can be tested independently:

```typescript
// Example: Testing numeric utils
import { isValidNumericToken, normalizeNumber } from '@/features/ocr/utils';

describe('numeric-utils', () => {
  it('validates numeric tokens', () => {
    expect(isValidNumericToken("123.45")).toBe(true);
    expect(isValidNumericToken("abc")).toBe(false);
  });

  it('normalizes numbers', () => {
    expect(normalizeNumber("123,45")).toBe(123.45);
    expect(normalizeNumber("123.45")).toBe(123.45);
  });
});
```

## Performance Considerations

- **Majority Voting**: Default requires 15 occurrences (configurable)
- **History Limit**: Default 30 entries per field (configurable)
- **Memoization**: Use React.useMemo for expensive computations

## Future Improvements

- [ ] Add unit tests for all modules
- [ ] Implement Result/Either pattern for better error handling
- [ ] Consider useReducer for complex state management
- [ ] Add JSDoc comments for better IDE support
- [ ] Performance profiling for large scan datasets

