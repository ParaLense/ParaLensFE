import httpClient from './httpClient';
import { API_ENDPOINTS } from '../config/api';
import { 
  DosingDto, 
  CreateDosingRequest,
  DosingMainMenuDto,
  CreateDosingMainMenuRequest,
  DosingSubMenuDosingSpeedScrollDto,
  CreateDosingSubMenuDosingSpeedScrollRequest,
  DosingSubMenuDosingPressureScrollDto,
  CreateDosingSubMenuDosingPressureScrollRequest
} from '../types/api';
import { offlineMergeDetails } from './offlineStore';

export class DosingService {
  async getDosing(scanId: number): Promise<DosingDto> {
    return httpClient.get<DosingDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}`);
  }

  async createDosing(scanId: number, request: CreateDosingRequest): Promise<DosingDto> {
    return httpClient.post<DosingDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}`, request);
  }

  async deleteDosing(scanId: number): Promise<void> {
    return httpClient.delete(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}`);
  }

  async getMainMenu(scanId: number): Promise<DosingMainMenuDto> {
    return httpClient.get<DosingMainMenuDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/mainmenu`);
  }

  async createMainMenu(scanId: number, request: CreateDosingMainMenuRequest): Promise<DosingMainMenuDto> {
    try {
      return await httpClient.post<DosingMainMenuDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/mainmenu`, request);
    } catch {
      const dto: DosingMainMenuDto = {
        id: Date.now(),
        dosingId: scanId,
        dosingStroke: request.dosingStroke,
        dosingDelayTime: request.dosingDelayTime,
        relieveDosing: request.relieveDosing,
        relieveAfterDosing: request.relieveAfterDosing,
        dischargeSpeedBeforeDosing: request.dischargeSpeedBeforeDosing,
        dischargeSpeedAfterDosing: request.dischargeSpeedAfterDosing,
      };
      offlineMergeDetails(scanId, { dosing: { mainMenu: dto } });
      return dto;
    }
  }

  async updateMainMenu(scanId: number, request: CreateDosingMainMenuRequest): Promise<DosingMainMenuDto> {
    return httpClient.put<DosingMainMenuDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }

  async getDosingSpeed(scanId: number): Promise<DosingSubMenuDosingSpeedScrollDto> {
    return httpClient.get<DosingSubMenuDosingSpeedScrollDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/dosingSpeed`);
  }

  async createDosingSpeed(scanId: number, request: CreateDosingSubMenuDosingSpeedScrollRequest): Promise<DosingSubMenuDosingSpeedScrollDto> {
    try {
      return await httpClient.post<DosingSubMenuDosingSpeedScrollDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/dosingSpeed`, request);
    } catch {
      const dto: DosingSubMenuDosingSpeedScrollDto = {
        id: Date.now(),
        dosingId: scanId,
        values: request.values.map((v, idx) => ({ id: Date.now() + idx, dosing_SubMenu_DosingSpeed_ScrollId: Date.now(), index: v.index, v: v.v, v2: v.v2 }))
      };
      offlineMergeDetails(scanId, { dosing: { dosingSpeedsValues: dto } });
      return dto;
    }
  }

  async updateDosingSpeed(scanId: number, request: CreateDosingSubMenuDosingSpeedScrollRequest): Promise<DosingSubMenuDosingSpeedScrollDto> {
    return httpClient.put<DosingSubMenuDosingSpeedScrollDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/dosingSpeed`, request);
  }

  async getDosingPressure(scanId: number): Promise<DosingSubMenuDosingPressureScrollDto> {
    return httpClient.get<DosingSubMenuDosingPressureScrollDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/dosingPressure`);
  }

  async createDosingPressure(scanId: number, request: CreateDosingSubMenuDosingPressureScrollRequest): Promise<DosingSubMenuDosingPressureScrollDto> {
    try {
      return await httpClient.post<DosingSubMenuDosingPressureScrollDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/dosingPressure`, request);
    } catch {
      const dto: DosingSubMenuDosingPressureScrollDto = {
        id: Date.now(),
        dosingId: scanId,
        values: request.values.map((v, idx) => ({ id: Date.now() + idx, dosing_SubMenu_DosingPressure_ScrollId: Date.now(), index: v.index, v: v.v, v2: v.v2 }))
      };
      offlineMergeDetails(scanId, { dosing: { dosingPressuresValues: dto } });
      return dto;
    }
  }

  async updateDosingPressure(scanId: number, request: CreateDosingSubMenuDosingPressureScrollRequest): Promise<DosingSubMenuDosingPressureScrollDto> {
    return httpClient.put<DosingSubMenuDosingPressureScrollDto>(`${API_ENDPOINTS.DOSING.replace('{scanId}', scanId.toString())}/dosingPressure`, request);
  }
}

export const dosingService = new DosingService();
export default dosingService; 