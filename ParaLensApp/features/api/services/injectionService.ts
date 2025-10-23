import httpClient from './httpClient';
import { 
  InjectionDto, 
  CreateInjectionRequest,
  InjectionMainMenuDto,
  CreateInjectionMainMenuRequest,
  InjectionSubMenuScrollDto,
  CreateInjectionSubMenuScrollRequest,
  InjectionSubMenuSwitchTypeDto,
  CreateInjectionSubMenuSwitchTypeRequest
} from '../types/api';
import {API_ENDPOINTS} from "@/features/config/api";

export class InjectionService {
  async getInjection(scanId: number): Promise<InjectionDto> {
    return httpClient.get<InjectionDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}`);
  }

  async createInjection(scanId: number, request: CreateInjectionRequest): Promise<InjectionDto> {
    return httpClient.post<InjectionDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}`, request);
  }

  async deleteInjection(scanId: number): Promise<void> {
    return httpClient.delete(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}`);
  }

  async getMainMenu(scanId: number): Promise<InjectionMainMenuDto> {
    return httpClient.get<InjectionMainMenuDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/mainmenu`);
  }

  async createMainMenu(scanId: number, request: CreateInjectionMainMenuRequest): Promise<InjectionMainMenuDto> {
    return httpClient.post<InjectionMainMenuDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }

  async updateMainMenu(scanId: number, request: CreateInjectionMainMenuRequest): Promise<InjectionMainMenuDto> {
    return httpClient.put<InjectionMainMenuDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }

  async getSubMenuScroll(scanId: number): Promise<InjectionSubMenuScrollDto> {
    return httpClient.get<InjectionSubMenuScrollDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/submenuscroll`);
  }

  async createSubMenuScroll(scanId: number, request: CreateInjectionSubMenuScrollRequest): Promise<InjectionSubMenuScrollDto> {
    return httpClient.post<InjectionSubMenuScrollDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/submenuscroll`, request);
  }

  async updateSubMenuScroll(scanId: number, request: CreateInjectionSubMenuScrollRequest): Promise<InjectionSubMenuScrollDto> {
    return httpClient.put<InjectionSubMenuScrollDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/submenuscroll`, request);
  }

  async getSwitchType(scanId: number): Promise<InjectionSubMenuSwitchTypeDto> {
    return httpClient.get<InjectionSubMenuSwitchTypeDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/switchtype`);
  }

  async createSwitchType(scanId: number, request: CreateInjectionSubMenuSwitchTypeRequest): Promise<InjectionSubMenuSwitchTypeDto> {
    return httpClient.post<InjectionSubMenuSwitchTypeDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/switchtype`, request);
  }

  async updateSwitchType(scanId: number, request: CreateInjectionSubMenuSwitchTypeRequest): Promise<InjectionSubMenuSwitchTypeDto> {
    return httpClient.put<InjectionSubMenuSwitchTypeDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/switchtype`, request);
  }
}

export const injectionService = new InjectionService();
export default injectionService; 