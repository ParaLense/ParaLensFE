import httpClient from './httpClient';
import { API_ENDPOINTS } from '../config/api';
import { 
  CylinderHeatingDto, 
  CreateCylinderHeatingRequest,
  CylinderHeatingMainMenuDto,
  CreateCylinderHeatingMainMenuRequest
} from '../types/api';
import { offlineMergeDetails } from './offlineStore';

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
    try {
      return await httpClient.post<CylinderHeatingMainMenuDto>(`${API_ENDPOINTS.CYLINDER_HEATING.replace('{scanId}', scanId.toString())}/mainmenu`, request);
    } catch {
      const dto: CylinderHeatingMainMenuDto = {
        id: Date.now(),
        cylinderHeatingId: scanId,
        setpoint1: request.setpoint1,
        setpoint2: request.setpoint2,
        setpoint3: request.setpoint3,
        setpoint4: request.setpoint4,
        setpoint5: request.setpoint5,
      };
      offlineMergeDetails(scanId, { cylinderHeating: { mainMenu: dto } });
      return dto;
    }
  }

  async updateMainMenu(scanId: number, request: CreateCylinderHeatingMainMenuRequest): Promise<CylinderHeatingMainMenuDto> {
    return httpClient.put<CylinderHeatingMainMenuDto>(`${API_ENDPOINTS.CYLINDER_HEATING.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }
}

export const cylinderHeatingService = new CylinderHeatingService();
export default cylinderHeatingService; 