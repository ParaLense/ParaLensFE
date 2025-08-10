export const API_CONFIG = {
  BASE_URL: 'http://localhost:5200',
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

export const API_ENDPOINTS = {
  SCANS: '/api/scans',
  INJECTION: '/api/scans/{scanId}/injection',
  DOSING: '/api/scans/{scanId}/dosing',
  HOLDING_PRESSURE: '/api/scans/{scanId}/holdingpressure',
  CYLINDER_HEATING: '/api/scans/{scanId}/cylinderheating',
} as const; 