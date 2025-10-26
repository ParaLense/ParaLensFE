import httpClient from './httpClient';
import {
  ScanDto,
  CreateScanRequest,
  FullScanDto,
} from '../types/api';
import {API_ENDPOINTS} from "@/features/config/api";

export class ScanService {
  /**
   * Create a new scan
   */
  async createScan(request: CreateScanRequest): Promise<ScanDto> {
    return httpClient.post<ScanDto>(API_ENDPOINTS.SCANS, request);
  }

  /**
   * Get all scans
   */
  async getAllScans(): Promise<ScanDto[]> {
    return httpClient.get<ScanDto[]>(API_ENDPOINTS.SCANS);
  }

  /**
   * Get scan by ID
   */
  async getScanById(id: number): Promise<ScanDto> {
    return httpClient.get<ScanDto>(`${API_ENDPOINTS.SCANS}/${id}`);
  }

  /**
   * Get full scan with all related data
   */
  async getFullScan(id: number): Promise<FullScanDto> {
    return httpClient.get<FullScanDto>(`${API_ENDPOINTS.SCANS}/${id}/full`);
  }

  /**
   * Delete scan by ID
   */
  async deleteScan(id: number): Promise<void> {
    return httpClient.delete<void>(`${API_ENDPOINTS.SCANS}/${id}`);
  }

  /**
   * Delete all scans
   */
  async deleteAllScans(): Promise<void> {
    return httpClient.delete<void>(`${API_ENDPOINTS.SCANS}/all`);
  }
}

export const scanService = new ScanService();
export default scanService; 