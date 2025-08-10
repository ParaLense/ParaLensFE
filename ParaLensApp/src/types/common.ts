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