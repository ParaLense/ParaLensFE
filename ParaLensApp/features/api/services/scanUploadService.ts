import { httpClient } from "./httpClient";
import { FullScanDto } from "../types/common";
import { API_ENDPOINTS } from "@/config/api";
import {
  mapFullScanToCreateRequest,
  mapFullScanToUpdateRequest,
} from "@/features/api/mappers/domain-to-api-mapper";

export interface UploadStatus {
  status: 'not_uploaded' | 'uploading' | 'uploaded' | 'error' | 'needs_update';
  serverId?: number;
  error?: string;
  lastUploaded?: string; // ISO date string
}

export interface CreateFullScanRequest {
  name: string;
  author: string;
  date: string;
  injection?: any;
  dosing?: any;
  holdingPressure?: any;
  cylinderHeating?: any;
}

export interface UpdateFullScanRequest {
  name?: string;
  author?: string;
  date?: string;
  injection?: any;
  dosing?: any;
  holdingPressure?: any;
  cylinderHeating?: any;
}

class ScanUploadService {
  /**
   * Upload a new scan to the server
   */
  async createScan(scan: FullScanDto): Promise<{ success: boolean; serverId?: number; error?: string }> {
    try {
      // Validate required fields
      if (!scan.author || scan.author.trim() === '') {
        return { success: false, error: 'Author is required' };
      }
      
      if (!scan.date) {
        return { success: false, error: 'Date is required' };
      }
      
      console.log("Original scan data:", JSON.stringify(scan, null, 2));
      console.log(
        "CylinderHeating data:",
        JSON.stringify(scan.cylinderHeating, null, 2),
      );

      const request: CreateFullScanRequest = mapFullScanToCreateRequest(scan);

      console.log('Creating scan with request:', JSON.stringify(request, null, 2));
      console.log('Sending to endpoint:', API_ENDPOINTS.SCANS_FULL);

      const response = await httpClient.post<{ id: number }>(API_ENDPOINTS.SCANS_FULL, request);
      
      return {
        success: true,
        serverId: response.id,
      };
    } catch (error) {
      console.error('Failed to create scan:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running on http://localhost:5200';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Server may be slow to respond';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update an existing scan on the server
   */
  async updateScan(scan: FullScanDto, serverId: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("Original scan data (update):", JSON.stringify(scan, null, 2));
      console.log(
        "CylinderHeating data (update):",
        JSON.stringify(scan.cylinderHeating, null, 2),
      );

      const request: UpdateFullScanRequest = mapFullScanToUpdateRequest(scan);

      const endpoint = API_ENDPOINTS.SCANS_BY_NAME.replace('{name}', `Scan_${scan.id}_${scan.author}`);
      await httpClient.put(endpoint, request);
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('Failed to update scan:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running on http://localhost:5200';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Server may be slow to respond';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if a scan needs to be updated by comparing local and server data
   */
  needsUpdate(localScan: FullScanDto, lastUploaded?: string): boolean {
    if (!lastUploaded) return true;
    
    // If there's no lastUploaded timestamp, it needs update
    if (!localScan.lastUploaded) return true;
    
    // Compare the scan's modification time with last upload time
    const localDate = new Date(localScan.date);
    const uploadedDate = new Date(localScan.lastUploaded);
    
    // If local scan is newer than last upload, it needs update
    return localDate > uploadedDate;
  }
}

export const scanUploadService = new ScanUploadService();
export default scanUploadService;