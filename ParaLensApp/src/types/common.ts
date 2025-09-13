export interface ScanDto {
  id: number;
  author: string;
  date: string;
  injection?: import('./injection').InjectionDto;
  holdingPressure?: import('./holdingPressure').HoldingPressureDto;
  dosing?: import('./dosing').DosingDto;
  cylinderHeating?: import('./cylinderHeating').CylinderHeatingDto;
}

export interface CreateScanRequest {
  author: string;
  date: string;
}

export interface FullScanDto {
  id: number;
  author: string;
  date: string;
  injection?: import('./injection').InjectionDto;
  holdingPressure?: import('./holdingPressure').HoldingPressureDto;
  dosing?: import('./dosing').DosingDto;
  cylinderHeating?: import('./cylinderHeating').CylinderHeatingDto;
  // Upload status fields
  serverId?: number;
  uploadStatus?: 'not_uploaded' | 'uploading' | 'uploaded' | 'error' | 'needs_update';
  uploadError?: string;
  lastUploaded?: string; // ISO date string
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: any;
} 

// Scan selection types used by camera flow
export type ScanMenu = 'injection' | 'dosing' | 'holdingPressure' | 'cylinderHeating';

export interface OverlayBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}