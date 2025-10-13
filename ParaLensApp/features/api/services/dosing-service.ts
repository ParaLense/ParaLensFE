import httpClient from "./http-client";
import { API_ENDPOINTS } from "@/features/config/api";
import {
  CreateDosingMainMenuRequest,
  CreateDosingRequest,
  CreateDosingSubMenuDosingPressureScrollRequest,
  CreateDosingSubMenuDosingSpeedScrollRequest,
  DosingDto,
  DosingMainMenuDto,
  DosingSubMenuDosingPressureScrollDto,
  DosingSubMenuDosingSpeedScrollDto,
} from "@/features/api/types";

export class DosingService {
  async getDosing(scanId: number): Promise<DosingDto> {
    return httpClient.get<DosingDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}`,
    );
  }

  async createDosing(
    scanId: number,
    request: CreateDosingRequest,
  ): Promise<DosingDto> {
    return httpClient.post<DosingDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}`,
      request,
    );
  }

  async deleteDosing(scanId: number): Promise<void> {
    return httpClient.delete(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}`,
    );
  }

  async getMainMenu(scanId: number): Promise<DosingMainMenuDto> {
    return httpClient.get<DosingMainMenuDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/mainmenu`,
    );
  }

  async createMainMenu(
    scanId: number,
    request: CreateDosingMainMenuRequest,
  ): Promise<DosingMainMenuDto> {
    return httpClient.post<DosingMainMenuDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/mainmenu`,
      request,
    );
  }

  async updateMainMenu(
    scanId: number,
    request: CreateDosingMainMenuRequest,
  ): Promise<DosingMainMenuDto> {
    return httpClient.put<DosingMainMenuDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/mainmenu`,
      request,
    );
  }

  async getDosingSpeed(
    scanId: number,
  ): Promise<DosingSubMenuDosingSpeedScrollDto> {
    return httpClient.get<DosingSubMenuDosingSpeedScrollDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/dosingSpeed`,
    );
  }

  async createDosingSpeed(
    scanId: number,
    request: CreateDosingSubMenuDosingSpeedScrollRequest,
  ): Promise<DosingSubMenuDosingSpeedScrollDto> {
    return httpClient.post<DosingSubMenuDosingSpeedScrollDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/dosingSpeed`,
      request,
    );
  }

  async updateDosingSpeed(
    scanId: number,
    request: CreateDosingSubMenuDosingSpeedScrollRequest,
  ): Promise<DosingSubMenuDosingSpeedScrollDto> {
    return httpClient.put<DosingSubMenuDosingSpeedScrollDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/dosingSpeed`,
      request,
    );
  }

  async getDosingPressure(
    scanId: number,
  ): Promise<DosingSubMenuDosingPressureScrollDto> {
    return httpClient.get<DosingSubMenuDosingPressureScrollDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/dosingPressure`,
    );
  }

  async createDosingPressure(
    scanId: number,
    request: CreateDosingSubMenuDosingPressureScrollRequest,
  ): Promise<DosingSubMenuDosingPressureScrollDto> {
    return httpClient.post<DosingSubMenuDosingPressureScrollDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/dosingPressure`,
      request,
    );
  }

  async updateDosingPressure(
    scanId: number,
    request: CreateDosingSubMenuDosingPressureScrollRequest,
  ): Promise<DosingSubMenuDosingPressureScrollDto> {
    return httpClient.put<DosingSubMenuDosingPressureScrollDto>(
      `${API_ENDPOINTS.DOSING.replace("{scanId}", scanId.toString())}/dosingPressure`,
      request,
    );
  }
}

export const dosingService = new DosingService();
export default dosingService;

