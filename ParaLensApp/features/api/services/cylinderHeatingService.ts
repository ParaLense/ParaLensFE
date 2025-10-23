import httpClient from './httpClient';
import {API_ENDPOINTS} from "@/features/config/api";
import { 
  CylinderHeatingDto, 
  CreateCylinderHeatingRequest,
  CylinderHeatingMainMenuDto,
  CreateCylinderHeatingMainMenuRequest
} from '../types/api';

export class CylinderHeatingService {
  async getCylinderHeating(scanId: number): Promise<CylinderHeatingDto> {
    return httpClient.get<CylinderHeatingDto>(`${API_ENDPOINTS.CYLINDER_HEATING.replace('{scanId}', scanId.toString())}`);
  }

  async createCylinderHeating(scanId: number, request: CreateCylinderHeatingRequest): Promise<CylinderHeatingDto> {
    return httpClient.post<CylinderHeatingDto>(`${API_ENDPOINTS.CYLINDER_HEATING.replace('{scanId}', scanId.toString())}`, request);
  }

  async deleteCylinderHeating(scanId: number): Promise<void> {
    return httpClient.delete(`${API_ENDPOINTS.CYLINDER_HEATING.replace('{scanId}', scanId.toString())}`);
  }

  // Main menu operations
  async getMainMenu(scanId: number): Promise<CylinderHeatingMainMenuDto> {
    return httpClient.get<CylinderHeatingMainMenuDto>(`${API_ENDPOINTS.CYLINDER_HEATING.replace('{scanId}', scanId.toString())}/mainmenu`);
  }

  async createMainMenu(scanId: number, request: CreateCylinderHeatingMainMenuRequest): Promise<CylinderHeatingMainMenuDto> {
    return httpClient.post<CylinderHeatingMainMenuDto>(`${API_ENDPOINTS.CYLINDER_HEATING.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }

  async updateMainMenu(scanId: number, request: CreateCylinderHeatingMainMenuRequest): Promise<CylinderHeatingMainMenuDto> {
    return httpClient.put<CylinderHeatingMainMenuDto>(`${API_ENDPOINTS.CYLINDER_HEATING.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }
}

export const cylinderHeatingService = new CylinderHeatingService();
export default cylinderHeatingService; 