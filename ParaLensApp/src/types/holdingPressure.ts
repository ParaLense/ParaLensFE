export interface HoldingPressureDto {
  id: number;
  scanId: number;
  mainMenu?: HoldingPressureMainMenuDto;
  subMenusValues?: HoldingPressureSubMenuScrollDto;
}

export interface CreateHoldingPressureRequest {
  mainMenu?: CreateHoldingPressureMainMenuRequest;
  subMenusValues?: CreateHoldingPressureSubMenuScrollRequest;
}

export interface HoldingPressureMainMenuDto {
  id: number;
  holdingPressureId: number;
  holdingTime: number;
  coolTime: number;
  screwDiameter: number;
}

export interface CreateHoldingPressureMainMenuRequest {
  holdingTime: number;
  coolTime: number;
  screwDiameter: number;
}

export interface HoldingPressureSubMenuScrollDto {
  id: number;
  holdingPressureId: number;
  values: HoldingPressureSubMenuValueDto[];
}

export interface CreateHoldingPressureSubMenuScrollRequest {
  values: CreateHoldingPressureSubMenuValueRequest[];
}

export interface HoldingPressureSubMenuValueDto {
  id: number;
  holdingPressure_Submenu_ScrollId: number;
  index: number;
  t: number;
  p: number;
}

export interface CreateHoldingPressureSubMenuValueRequest {
  index: number;
  t: number;
  p: number;
} 