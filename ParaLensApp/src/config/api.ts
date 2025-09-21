export const API_CONFIG = {
  // For physical device, use your computer's IP address
  // For Android emulator, use 'http://10.0.2.2:5200'
  // For iOS simulator, 'http://localhost:5200' works fine
  BASE_URL: 'http://192.168.31.153:5200', // Replace with your computer's IP address
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

export const API_ENDPOINTS = {
  SCANS: '/api/scans',
  SCANS_FULL: '/api/scans/full',
  SCANS_BY_NAME: '/api/scans/by-name/{name}/full',
  INJECTION: '/api/scans/{scanId}/injection',
  DOSING: '/api/scans/{scanId}/dosing',
  HOLDING_PRESSURE: '/api/scans/{scanId}/holdingpressure',
  CYLINDER_HEATING: '/api/scans/{scanId}/cylinderheating',
  EXCEL_CREATE: '/excel/{name}',
  EXCEL_DOWNLOAD: '/excel/{name}',
} as const; 