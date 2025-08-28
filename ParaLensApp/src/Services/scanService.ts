import httpClient from './httpClient';
import { API_ENDPOINTS } from '../config/api';
import {
  ScanDto,
  CreateScanRequest,
  FullScanDto,
} from '../types/api';
import { offlineCreateScan, offlineListScans, offlineGetScan, offlineDeleteScan, offlineDeleteAll, offlineGetFullScan } from './offlineStore';

// In-memory offline fallback storage for scans
let offlineScans: ScanDto[] = [];
let offlineIdCounter = 1;

export class ScanService {
  /**
   * Create a new scan
   */
  async createScan(request: CreateScanRequest): Promise<ScanDto> {
    try {
      return await httpClient.post<ScanDto>(API_ENDPOINTS.SCANS, request);
    } catch {
      return offlineCreateScan({ author: request.author, date: request.date } as ScanDto);
    }
  }

  /**
   * Get all scans
   */
  async getAllScans(): Promise<ScanDto[]> {
    try {
      return await httpClient.get<ScanDto[]>(API_ENDPOINTS.SCANS);
    } catch {
      return offlineListScans();
    }
  }

  /**
   * Get scan by ID
   */
  async getScanById(id: number): Promise<ScanDto> {
    try {
      return await httpClient.get<ScanDto>(`${API_ENDPOINTS.SCANS}/${id}`);
    } catch {
      const found = offlineGetScan(id);
      if (found) return found;
      throw new Error('Scan not found');
    }
  }

  /**
   * Get full scan with all related data
   */
  async getFullScan(id: number): Promise<FullScanDto> {
    try {
      return await httpClient.get<FullScanDto>(`${API_ENDPOINTS.SCANS}/${id}/full`);
    } catch {
      const full = offlineGetFullScan(id);
      if (!full) throw new Error('Scan not found');
      return full;
    }
  }

  /**
   * Delete scan by ID
   */
  async deleteScan(id: number): Promise<void> {
    try {
      return await httpClient.delete<void>(`${API_ENDPOINTS.SCANS}/${id}`);
    } catch {
      offlineDeleteScan(id);
    }
  }

  /**
   * Delete all scans
   */
  async deleteAllScans(): Promise<void> {
    try {
      return await httpClient.delete<void>(`${API_ENDPOINTS.SCANS}/all`);
    } catch {
      offlineDeleteAll();
    }
  }
}

export const scanService = new ScanService();
export default scanService; 