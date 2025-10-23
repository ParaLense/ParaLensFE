import httpClient from './httpClient';
import {API_ENDPOINTS} from "@/features/config/api";
import { 
  HoldingPressureDto, 
  CreateHoldingPressureRequest,
  HoldingPressureMainMenuDto,
  CreateHoldingPressureMainMenuRequest,
  HoldingPressureSubMenuScrollDto,
  CreateHoldingPressureSubMenuScrollRequest
} from '../types/api';

export class HoldingPressureService {
  async getHoldingPressure(scanId: number): Promise<HoldingPressureDto> {
    return httpClient.get<HoldingPressureDto>(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}`);
  }

  async createHoldingPressure(scanId: number, request: CreateHoldingPressureRequest): Promise<HoldingPressureDto> {
    return httpClient.post<HoldingPressureDto>(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}`, request);
  }

  async deleteHoldingPressure(scanId: number): Promise<void> {
    return httpClient.delete(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}`);
  }

  async getMainMenu(scanId: number): Promise<HoldingPressureMainMenuDto> {
    return httpClient.get<HoldingPressureMainMenuDto>(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}/mainmenu`);
  }

  async createMainMenu(scanId: number, request: CreateHoldingPressureMainMenuRequest): Promise<HoldingPressureMainMenuDto> {
    return httpClient.post<HoldingPressureMainMenuDto>(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }

  async updateMainMenu(scanId: number, request: CreateHoldingPressureMainMenuRequest): Promise<HoldingPressureMainMenuDto> {
    return httpClient.put<HoldingPressureMainMenuDto>(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }

  async getSubMenu(scanId: number): Promise<HoldingPressureSubMenuScrollDto> {
    return httpClient.get<HoldingPressureSubMenuScrollDto>(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}/submenu`);
  }

  async createSubMenu(scanId: number, request: CreateHoldingPressureSubMenuScrollRequest): Promise<HoldingPressureSubMenuScrollDto> {
    return httpClient.post<HoldingPressureSubMenuScrollDto>(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}/submenu`, request);
  }

  async updateSubMenu(scanId: number, request: CreateHoldingPressureSubMenuScrollRequest): Promise<HoldingPressureSubMenuScrollDto> {
    return httpClient.put<HoldingPressureSubMenuScrollDto>(`${API_ENDPOINTS.HOLDING_PRESSURE.replace('{scanId}', scanId.toString())}/submenu`, request);
  }
}

export const holdingPressureService = new HoldingPressureService();
export default holdingPressureService; 