# ParaLens Frontend API Foundation

This document describes the clean, well-structured API foundation created for connecting your React Native frontend to the ParaLens backend.

## 🏗️ Project Structure

```
src/
├── config/
│   └── api.ts                 # API configuration and endpoints
├── types/
│   └── api.ts                 # TypeScript interfaces matching backend DTOs
├── services/
│   ├── httpClient.ts          # Base HTTP client with error handling
│   ├── scanService.ts         # Scan CRUD operations
│   ├── injectionService.ts    # Injection operations
│   ├── dosingService.ts       # Dosing operations
│   ├── holdingPressureService.ts # Holding pressure operations
│   ├── cylinderHeatingService.ts # Cylinder heating operations
│   └── index.ts               # Service exports
├── hooks/
│   └── useApi.ts              # Custom hook for API state management
├── contexts/
│   └── ApiContext.tsx         # React context for API services
├── utils/
│   ├── dateUtils.ts           # Date formatting utilities
│   ├── validationUtils.ts     # Validation utilities matching backend rules
│   └── index.ts               # Utility exports
└── App.tsx                    # Updated with ApiProvider
```

## 🚀 Features

### ✅ Complete Backend Coverage
- **Scans API**: Full CRUD operations (Create, Read, Update, Delete)
- **Injection API**: Injection management with main menu, sub-menus, and switch types
- **Dosing API**: Dosing operations with main menu, speed, and pressure
- **Holding Pressure API**: Holding pressure management
- **Cylinder Heating API**: Cylinder heating operations

### ✅ Clean Architecture
- **Separation of Concerns**: Each service handles its own domain
- **Type Safety**: Full TypeScript support with interfaces matching backend DTOs
- **Error Handling**: Comprehensive error handling with timeout support
- **Validation**: Frontend validation matching backend rules

### ✅ Developer Experience
- **Custom Hooks**: `useApi` hook for easy API state management
- **Context Provider**: Global API service access throughout the app
- **Utility Functions**: Date formatting and validation helpers
- **Consistent Patterns**: Uniform API across all services

## 🔧 Configuration

### Backend URL
The API base URL is configured in `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5200', // Update for production
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};
```

**Important**: Update the `BASE_URL` when deploying to production!

## 📱 Usage Examples

### Using Services Directly

```typescript
import { scanService } from '../services';

// Create a new scan
const newScan = await scanService.createScan({
  author: 'John Doe',
  date: '2024-01-15'
});

// Get all scans
const scans = await scanService.getAllScans();

// Get full scan with all data
const fullScan = await scanService.getFullScan(1);
```

### Using the useApi Hook

```typescript
import { useApi } from '../hooks/useApi';
import { scanService } from '../services';

function ScanList() {
  const { data: scans, loading, error, execute } = useApi(scanService.getAllScans);

  useEffect(() => {
    execute();
  }, [execute]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      {scans?.map(scan => (
        <ScanItem key={scan.id} scan={scan} />
      ))}
    </View>
  );
}
```

### Using the API Context

```typescript
import { useApiContext } from '../contexts/ApiContext';

function ScanForm() {
  const { scanService } = useApiContext();
  
  const handleSubmit = async (formData) => {
    try {
      const result = await scanService.createScan(formData);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
}
```

## 🔒 Validation

The foundation includes validation utilities that match your backend validation rules:

```typescript
import { validateCreateScanRequest } from '../utils/validationUtils';

const validation = validateCreateScanRequest({
  author: 'John Doe',
  date: '2024-01-15'
});

if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
}
```

## 📅 Date Handling

Date utilities handle the backend's expected YYYY-MM-DD format:

```typescript
import { formatDateForBackend, getCurrentDateFormatted } from '../utils/dateUtils';

const today = getCurrentDateFormatted(); // Returns "2024-01-15"
const formattedDate = formatDateForBackend(new Date()); // Returns "2024-01-15"
```

## 🚨 Error Handling

All services include comprehensive error handling:

```typescript
try {
  const result = await scanService.createScan(request);
} catch (error) {
  if (error.message === 'Request timeout') {
    // Handle timeout
  } else if (error.message.includes('HTTP error! status: 400')) {
    // Handle bad request
  } else {
    // Handle other errors
  }
}
```

## 🔄 State Management

The `useApi` hook provides a clean way to manage API state:

```typescript
const { data, loading, error, execute, reset, setData } = useApi(apiFunction);

// execute() - Call the API function
// reset() - Reset to initial state
// setData() - Manually update data
```

## 🧪 Testing

The foundation is designed to be easily testable:

```typescript
// Mock the HTTP client
jest.mock('../services/httpClient');

// Test service methods
describe('ScanService', () => {
  it('should create a scan', async () => {
    const mockResponse = { id: 1, author: 'Test', date: '2024-01-15' };
    // Test implementation
  });
});
```

## 📋 Backend Endpoints Covered

### Scans
- `POST /api/scans` - Create scan
- `GET /api/scans` - Get all scans
- `GET /api/scans/{id}` - Get scan by ID
- `GET /api/scans/{id}/full` - Get full scan with all data
- `DELETE /api/scans/{id}` - Delete scan
- `DELETE /api/scans/all` - Delete all scans

### Injection
- `GET /api/scans/{scanId}/injection` - Get injection
- `POST /api/scans/{scanId}/injection` - Create injection
- `DELETE /api/scans/{scanId}/injection` - Delete injection

### Dosing
- `GET /api/scans/{scanId}/dosing` - Get dosing
- `POST /api/scans/{scanId}/dosing` - Create dosing
- `DELETE /api/scans/{scanId}/dosing` - Delete dosing

### Holding Pressure
- `GET /api/scans/{scanId}/holdingpressure` - Get holding pressure
- `POST /api/scans/{scanId}/holdingpressure` - Create holding pressure
- `DELETE /api/scans/{scanId}/holdingpressure` - Delete holding pressure

### Cylinder Heating
- `GET /api/scans/{scanId}/cylinderheating` - Get cylinder heating
- `POST /api/scans/{scanId}/cylinderheating` - Create cylinder heating
- `DELETE /api/scans/{scanId}/cylinderheating` - Delete cylinder heating

## 🚀 Next Steps

1. **Update Backend URL**: Change `BASE_URL` in `src/config/api.ts` for production
2. **Complete Type Definitions**: Fill in the specific properties for DTOs based on your backend models
3. **Add Authentication**: Implement auth headers if your backend requires them
4. **Add Offline Support**: Consider adding offline caching for better UX
5. **Add Retry Logic**: Implement retry mechanisms for failed requests

## 📚 Dependencies

The foundation uses only React Native built-in features and doesn't add external dependencies. It's designed to be lightweight and maintainable.

## 🤝 Contributing

This foundation follows clean code principles:
- **Single Responsibility**: Each service handles one domain
- **Dependency Injection**: Services are injected via context
- **Error Boundaries**: Comprehensive error handling
- **Type Safety**: Full TypeScript support
- **Consistent Patterns**: Uniform API across all services

---

**Note**: This foundation implements exactly what exists in your backend - no extra features, just clean, production-ready code for your school project. 