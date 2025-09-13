import { httpClient } from './httpClient';
import { FullScanDto } from '../types/common';
import { API_ENDPOINTS } from '../config/api';

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
      
      // Convert ISO date to YYYY-MM-DD format as expected by backend
      const dateOnly = new Date(scan.date).toISOString().split('T')[0];
      
      // Transform injection data to match backend structure
      const transformedInjection = scan.injection ? {
        mainMenu: scan.injection.mainMenu,
        subMenuValues: {
          values: scan.injection.subMenuValues?.values || []
        },
        switchType: scan.injection.switchType
      } : {
        subMenuValues: {
          values: []
        }
      };

      // Transform dosing data to match backend structure
      const transformedDosing = scan.dosing ? {
        mainMenu: scan.dosing.mainMenu,
        dosingSpeedsValues: {
          values: scan.dosing.dosingSpeedsValues?.values || []
        },
        dosingPressuresValues: {
          values: scan.dosing.dosingPressuresValues?.values || []
        }
      } : {
        subMenuValues: {
          values: []
        }
      };

      // Transform holding pressure data to match backend structure
      const transformedHoldingPressure = scan.holdingPressure ? {
        mainMenu: scan.holdingPressure.mainMenu,
        subMenusValues: {
          values: scan.holdingPressure.subMenusValues?.values || []
        }
      } : {
        subMenuValues: {
          values: []
        }
      };

      const request: CreateFullScanRequest = {
        name: `Scan_${scan.id}_${scan.author}`,
        author: scan.author,
        date: dateOnly,
        injection: transformedInjection,
        dosing: transformedDosing,
        holdingPressure: transformedHoldingPressure,
        cylinderHeating: scan.cylinderHeating,
      };

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
      // Convert ISO date to YYYY-MM-DD format as expected by backend
      const dateOnly = new Date(scan.date).toISOString().split('T')[0];
      
      // Transform injection data to match backend structure
      const transformedInjection = scan.injection ? {
        mainMenu: scan.injection.mainMenu,
        subMenuValues: {
          values: scan.injection.subMenuValues?.values || []
        },
        switchType: scan.injection.switchType
      } : {
        subMenuValues: {
          values: []
        }
      };

      // Transform dosing data to match backend structure
      const transformedDosing = scan.dosing ? {
        mainMenu: scan.dosing.mainMenu,
        dosingSpeedsValues: {
          values: scan.dosing.dosingSpeedsValues?.values || []
        },
        dosingPressuresValues: {
          values: scan.dosing.dosingPressuresValues?.values || []
        }
      } : {
        subMenuValues: {
          values: []
        }
      };

      // Transform holding pressure data to match backend structure
      const transformedHoldingPressure = scan.holdingPressure ? {
        mainMenu: scan.holdingPressure.mainMenu,
        subMenusValues: {
          values: scan.holdingPressure.subMenusValues?.values || []
        }
      } : {
        subMenuValues: {
          values: []
        }
      };

      const request: UpdateFullScanRequest = {
        name: `Scan_${scan.id}_${scan.author}`,
        author: scan.author,
        date: dateOnly,
        injection: transformedInjection,
        dosing: transformedDosing,
        holdingPressure: transformedHoldingPressure,
        cylinderHeating: scan.cylinderHeating,
      };

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
    
    const localDate = new Date(localScan.date);
    const uploadedDate = new Date(lastUploaded);
    
    return localDate > uploadedDate;
  }
}

export const scanUploadService = new ScanUploadService();
export default scanUploadService;
