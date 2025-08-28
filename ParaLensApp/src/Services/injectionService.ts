import httpClient from './httpClient';
import { API_ENDPOINTS } from '../config/api';
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
import { offlineMergeDetails } from './offlineStore';

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
    try {
      return await httpClient.post<InjectionMainMenuDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/mainmenu`, request);
    } catch {
      const dto: InjectionMainMenuDto = {
        id: Date.now(),
        injectionId: scanId,
        sprayPressureLimit: request.sprayPressureLimit,
        increasedSpecificPointPrinter: request.increasedSpecificPointPrinter,
      };
      offlineMergeDetails(scanId, { injection: { mainMenu: dto } });
      return dto;
    }
  }

  async updateMainMenu(scanId: number, request: CreateInjectionMainMenuRequest): Promise<InjectionMainMenuDto> {
    return httpClient.put<InjectionMainMenuDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/mainmenu`, request);
  }

  async getSubMenuScroll(scanId: number): Promise<InjectionSubMenuScrollDto> {
    return httpClient.get<InjectionSubMenuScrollDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/submenuscroll`);
  }

  async createSubMenuScroll(scanId: number, request: CreateInjectionSubMenuScrollRequest): Promise<InjectionSubMenuScrollDto> {
    try {
      return await httpClient.post<InjectionSubMenuScrollDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/submenuscroll`, request);
    } catch {
      const dto: InjectionSubMenuScrollDto = {
        id: Date.now(),
        injectionId: scanId,
        values: request.values.map((v, idx) => ({ id: Date.now() + idx, injection_SubMenu_ScrollId: Date.now(), index: v.index, v: v.v, v2: v.v2 }))
      };
      offlineMergeDetails(scanId, { injection: { subMenuValues: dto } });
      return dto;
    }
  }

  async updateSubMenuScroll(scanId: number, request: CreateInjectionSubMenuScrollRequest): Promise<InjectionSubMenuScrollDto> {
    return httpClient.put<InjectionSubMenuScrollDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/submenuscroll`, request);
  }

  async getSwitchType(scanId: number): Promise<InjectionSubMenuSwitchTypeDto> {
    return httpClient.get<InjectionSubMenuSwitchTypeDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/switchtype`);
  }

  async createSwitchType(scanId: number, request: CreateInjectionSubMenuSwitchTypeRequest): Promise<InjectionSubMenuSwitchTypeDto> {
    try {
      return await httpClient.post<InjectionSubMenuSwitchTypeDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/switchtype`, request);
    } catch {
      const dto: InjectionSubMenuSwitchTypeDto = {
        id: Date.now(),
        injectionId: scanId,
        transshipmentPosition: request.transshipmentPosition,
        switchOverTime: request.switchOverTime,
        switchingPressure: request.switchingPressure,
      };
      offlineMergeDetails(scanId, { injection: { switchType: dto } });
      return dto;
    }
  }

  async updateSwitchType(scanId: number, request: CreateInjectionSubMenuSwitchTypeRequest): Promise<InjectionSubMenuSwitchTypeDto> {
    return httpClient.put<InjectionSubMenuSwitchTypeDto>(`${API_ENDPOINTS.INJECTION.replace('{scanId}', scanId.toString())}/switchtype`, request);
  }
}

export const injectionService = new InjectionService();
export default injectionService; 