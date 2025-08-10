# ParaLens Frontend Foundation

A clean, well-structured React Native frontend foundation for consuming endpoints from a .NET backend. This project provides a robust API integration layer with TypeScript support, comprehensive validation, and a maintainable architecture.

## 🏗️ Project Structure

```
src/
├── config/           # API configuration and endpoints
├── types/            # TypeScript interfaces matching backend DTOs
├── services/         # API service classes for each domain
├── hooks/            # Custom React hooks for API state management
├── contexts/         # React Context for dependency injection
├── utils/            # Utility functions for validation and date handling
└── Components/       # Example React Native components
```

## ✨ Features

### 🎯 Complete API Coverage
- **Scans**: Full CRUD operations with nested data support
- **Injection**: Complete injection management with main menu, sub menu scroll, and switch type operations
- **Dosing**: Comprehensive dosing control with main menu, speed, and pressure management
- **Holding Pressure**: Full holding pressure control with main menu and sub menu operations
- **Cylinder Heating**: Complete cylinder heating management with main menu operations

### 🔧 Technical Features
- **TypeScript**: Fully typed interfaces matching backend C# models exactly
- **HTTP Client**: Generic HTTP client with timeout handling and error management
- **State Management**: Custom `useApi` hook for simplified API state management
- **Validation**: Comprehensive frontend validation matching backend rules
- **Date Handling**: Consistent date formatting utilities (YYYY-MM-DD)
- **Error Handling**: Robust error handling with detailed error information
- **Dependency Injection**: React Context for global service access

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- React Native development environment
- .NET backend running on `http://localhost:5200`

### Installation
```bash
npm install
```

### Configuration
The API configuration is centralized in `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5200',
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};
```

## 📖 Usage Examples

### Basic API Call
```typescript
import { useApi } from '../hooks/useApi';
import { scanService } from '../services';

function ScanList() {
  const { data: scans, loading, error, execute: fetchScans } = useApi(scanService.getScans);

  useEffect(() => {
    fetchScans();
  }, []);

  // ... render logic
}
```

### Creating a Scan
```typescript
import { scanService } from '../services';
import { validateCreateScanRequest } from '../utils/validationUtils';

const createScan = async () => {
  const request = { author: 'John Doe', date: '2025-01-15' };
  
  // Validate before sending
  const validation = validateCreateScanRequest(request);
  if (!validation.isValid) {
    console.error('Validation errors:', validation.errors);
    return;
  }

  try {
    const newScan = await scanService.createScan(request);
    console.log('Scan created:', newScan);
  } catch (error) {
    console.error('Failed to create scan:', error);
  }
};
```

### Working with Nested Data
```typescript
import { injectionService } from '../services';

// Create injection with main menu
const createInjectionWithMainMenu = async (scanId: number) => {
  const request = {
    mainMenu: {
      sprayPressureLimit: 150.0,
      increasedSpecificPointPrinter: 1
    }
  };

  const injection = await injectionService.createInjection(scanId, request);
  console.log('Injection created:', injection);
};

// Create injection with sub menu values
const createInjectionWithSubMenu = async (scanId: number) => {
  const request = {
    subMenuValues: {
      values: [
        { index: 0, v: 10.5, v2: 20.0 },
        { index: 1, v: 15.0, v2: 25.5 }
      ]
    }
  };

  const injection = await injectionService.createInjection(scanId, request);
  console.log('Injection with sub menu created:', injection);
};
```

## 🔍 API Endpoints Covered

### Scans
- `GET /api/scans` - Get all scans
- `GET /api/scans/{id}` - Get scan by ID
- `GET /api/scans/{id}/full` - Get full scan with all nested data
- `POST /api/scans` - Create new scan
- `DELETE /api/scans/{id}` - Delete scan
- `DELETE /api/scans` - Delete all scans

### Injection
- `GET /api/scans/{scanId}/injection` - Get injection data
- `POST /api/scans/{scanId}/injection` - Create injection
- `DELETE /api/scans/{scanId}/injection` - Delete injection
- `GET /api/scans/{scanId}/injection/mainmenu` - Get main menu
- `POST /api/scans/{scanId}/injection/mainmenu` - Create main menu
- `PUT /api/scans/{scanId}/injection/mainmenu` - Update main menu
- `GET /api/scans/{scanId}/injection/submenuscroll` - Get sub menu scroll
- `POST /api/scans/{scanId}/injection/submenuscroll` - Create sub menu scroll
- `PUT /api/scans/{scanId}/injection/submenuscroll` - Update sub menu scroll
- `GET /api/scans/{scanId}/injection/switchtype` - Get switch type
- `POST /api/scans/{scanId}/injection/switchtype` - Create switch type
- `PUT /api/scans/{scanId}/injection/switchtype` - Update switch type

### Dosing
- `GET /api/scans/{scanId}/dosing` - Get dosing data
- `POST /api/scans/{scanId}/dosing` - Create dosing
- `DELETE /api/scans/{scanId}/dosing` - Delete dosing
- `GET /api/scans/{scanId}/dosing/mainmenu` - Get main menu
- `POST /api/scans/{scanId}/dosing/mainmenu` - Create main menu
- `PUT /api/scans/{scanId}/dosing/mainmenu` - Update main menu
- `GET /api/scans/{scanId}/dosing/dosingSpeed` - Get dosing speed
- `POST /api/scans/{scanId}/dosing/dosingSpeed` - Create dosing speed
- `PUT /api/scans/{scanId}/dosing/dosingSpeed` - Update dosing speed
- `GET /api/scans/{scanId}/dosing/dosingPressure` - Get dosing pressure
- `POST /api/scans/{scanId}/dosing/dosingPressure` - Create dosing pressure
- `PUT /api/scans/{scanId}/dosing/dosingPressure` - Update dosing pressure

### Holding Pressure
- `GET /api/scans/{scanId}/holdingpressure` - Get holding pressure data
- `POST /api/scans/{scanId}/holdingpressure` - Create holding pressure
- `DELETE /api/scans/{scanId}/holdingpressure` - Delete holding pressure
- `GET /api/scans/{scanId}/holdingpressure/mainmenu` - Get main menu
- `POST /api/scans/{scanId}/holdingpressure/mainmenu` - Create main menu
- `PUT /api/scans/{scanId}/holdingpressure/mainmenu` - Update main menu
- `GET /api/scans/{scanId}/holdingpressure/submenu` - Get sub menu
- `POST /api/scans/{scanId}/holdingpressure/submenu` - Create sub menu
- `PUT /api/scans/{scanId}/holdingpressure/submenu` - Update sub menu

### Cylinder Heating
- `GET /api/scans/{scanId}/cylinderheating` - Get cylinder heating data
- `POST /api/scans/{scanId}/cylinderheating` - Create cylinder heating
- `DELETE /api/scans/{scanId}/cylinderheating` - Delete cylinder heating
- `GET /api/scans/{scanId}/cylinderheating/mainmenu` - Get main menu
- `POST /api/scans/{scanId}/cylinderheating/mainmenu` - Create main menu
- `PUT /api/scans/{scanId}/cylinderheating/mainmenu` - Update main menu

## 🧪 Validation

The frontend includes comprehensive validation that mirrors backend validation rules:

- **Scan Creation**: Author required, date in YYYY-MM-DD format
- **Injection**: Non-negative values, boolean flags (0/1)
- **Dosing**: Non-negative values for all parameters
- **Holding Pressure**: Non-negative values, positive screw diameter
- **Cylinder Heating**: Non-negative setpoint values

## 📅 Date Handling

All dates are handled in `YYYY-MM-DD` format to match backend expectations:

```typescript
import { formatDateForApi, parseDateFromApi } from '../utils/dateUtils';

// Format date for API
const apiDate = formatDateForApi(new Date()); // Returns "2025-01-15"

// Parse date from API
const jsDate = parseDateFromApi('2025-01-15'); // Returns Date object
```

## 🚨 Error Handling

The foundation includes robust error handling:

```typescript
import { useApi } from '../hooks/useApi';

function MyComponent() {
  const { data, loading, error, execute } = useApi(myApiCall);

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  if (loading) {
    return <ActivityIndicator />;
  }

  // ... render data
}
```

## 🔧 State Management

The `useApi` hook provides a clean interface for API state management:

```typescript
const { data, loading, error, execute, reset } = useApi(apiFunction);

// Execute API call
execute(params);

// Reset state
reset();

// Access current state
console.log('Data:', data);
console.log('Loading:', loading);
console.log('Error:', error);
```

## 🧪 Testing

The foundation is designed with testing in mind:

```typescript
// Test validation
import { validateCreateScanRequest } from '../utils/validationUtils';

test('should validate scan request', () => {
  const validRequest = { author: 'Test', date: '2025-01-15' };
  const result = validateCreateScanRequest(validRequest);
  expect(result.isValid).toBe(true);
});

// Test API calls
import { scanService } from '../services';

test('should create scan', async () => {
  const request = { author: 'Test', date: '2025-01-15' };
  const result = await scanService.createScan(request);
  expect(result.author).toBe('Test');
});
```

## 📚 Dependencies

- **React Native**: Mobile app framework
- **TypeScript**: Type safety and development experience
- **React Context**: State management and dependency injection
- **Custom Hooks**: Reusable API state management

## 🎯 Backend Integration

This foundation is designed to work seamlessly with the ParaLens .NET backend:

- **Base URL**: `http://localhost:5200`
- **API Version**: Follows backend routing conventions
- **Data Types**: Exact TypeScript mappings of C# DTOs
- **Validation**: Frontend validation matching backend rules
- **Error Handling**: Consistent error response handling

## 🚀 Next Steps

1. **Customize API Configuration**: Update `src/config/api.ts` for your environment
2. **Add Authentication**: Implement auth headers in the HTTP client
3. **Create UI Components**: Build React Native components using the provided services
4. **Add Offline Support**: Implement caching and offline-first features
5. **Performance Optimization**: Add request deduplication and caching strategies

## 📄 License

This project is part of a school final project and is designed for educational purposes.
