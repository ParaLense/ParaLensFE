import httpClient from './httpClient';
import { API_ENDPOINTS, API_CONFIG } from '../config/api';
import RNFS from 'react-native-fs';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

export interface ExcelDownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export class ExcelService {
  /**
   * Create Excel file for a scan by name
   */
  async createExcel(scanName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = API_ENDPOINTS.EXCEL_CREATE.replace('{name}', encodeURIComponent(scanName));
      const response = await httpClient.post(endpoint, {});
      
      // The backend returns a 201 Created status for successful Excel creation
      return { success: true };
    } catch (error: any) {
      console.error('Failed to create Excel file:', error);
      
      // Handle specific error cases
      if (error.message?.includes('404')) {
        return { 
          success: false, 
          error: 'Scan not found on server. Please make sure the scan is uploaded first.' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to create Excel file' 
      };
    }
  }

  /**
   * Download Excel file for a scan
   */
  async downloadExcel(scanName: string, onProgress?: (progress: number) => void): Promise<ExcelDownloadResult> {
    try {
      // First create the Excel file
      const createResult = await this.createExcel(scanName);
      if (!createResult.success) {
        return createResult;
      }

      // Get the download URL
      const downloadUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.EXCEL_DOWNLOAD.replace('{name}', encodeURIComponent(scanName))}`;
      
      // Create download path
      const fileName = `${scanName}_${Date.now()}.xlsx`;
      
      if (Platform.OS === 'android') {
        // For Android, request permission and use proper download path
        const hasPermission = await this.requestAndroidPermissions();
        if (!hasPermission) {
          return {
            success: false,
            error: 'Storage permission is required to download files',
          };
        }
        
        // Use external storage downloads directory
        const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
        
        // Download the file
        const downloadResult = await RNFS.downloadFile({
          fromUrl: downloadUrl,
          toFile: downloadPath,
          progress: (res) => {
            const progress = res.bytesWritten / res.contentLength;
            if (onProgress) {
              onProgress(progress);
            }
          },
        }).promise;

        if (downloadResult.statusCode === 200) {
          // Trigger media scan to make file visible in Downloads app
          await this.scanFile(downloadPath);
          
          return {
            success: true,
            filePath: downloadPath,
          };
        } else {
          return {
            success: false,
            error: `Download failed with status code: ${downloadResult.statusCode}`,
          };
        }
      } else {
        // For iOS, use documents directory
        const downloadPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
        
        const downloadResult = await RNFS.downloadFile({
          fromUrl: downloadUrl,
          toFile: downloadPath,
          progress: (res) => {
            const progress = res.bytesWritten / res.contentLength;
            if (onProgress) {
              onProgress(progress);
            }
          },
        }).promise;

        if (downloadResult.statusCode === 200) {
          return {
            success: true,
            filePath: downloadPath,
          };
        } else {
          return {
            success: false,
            error: `Download failed with status code: ${downloadResult.statusCode}`,
          };
        }
      }
    } catch (error: any) {
      console.error('Failed to download Excel file:', error);
      return {
        success: false,
        error: error.message || 'Failed to download Excel file',
      };
    }
  }

  /**
   * Request Android storage permissions
   */
  private async requestAndroidPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      // For Android 13+ (API 33+), we don't need storage permissions for Downloads folder
      const androidVersion = Platform.Version;
      if (androidVersion >= 33) {
        // Android 13+ uses scoped storage - Downloads folder is accessible without permissions
        return true;
      } else {
        // For older Android versions (API < 33), we need storage permissions
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to storage to download Excel files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Scan file to make it visible in Downloads app (Android)
   */
  private async scanFile(filePath: string): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Use react-native-fs to trigger media scan
        await RNFS.scanFile(filePath);
      }
    } catch (error) {
      console.warn('Failed to scan file:', error);
      // Don't throw here as the file was still downloaded successfully
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await RNFS.exists(filePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (await this.fileExists(filePath)) {
        await RNFS.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }
}

export const excelService = new ExcelService();
