export interface InjectionDto {
  id: number;
  scanId: number;
  mainMenu?: InjectionMainMenuDto;
  subMenuValues?: InjectionSubMenuScrollDto;
  switchType?: InjectionSubMenuSwitchTypeDto;
}

export interface CreateInjectionRequest {
  mainMenu?: CreateInjectionMainMenuRequest;
  subMenuValues?: CreateInjectionSubMenuScrollRequest;
  switchType?: CreateInjectionSubMenuSwitchTypeRequest;
}

export interface InjectionMainMenuDto {
  id: number;
  injectionId: number;
  sprayPressureLimit: number;
  increasedSpecificPointPrinter: number;
}

export interface CreateInjectionMainMenuRequest {
  sprayPressureLimit: number;
  increasedSpecificPointPrinter: number;
}

export interface InjectionSubMenuScrollDto {
  id: number;
  injectionId: number;
  values: InjectionSubMenuValueDto[];
}

export interface CreateInjectionSubMenuScrollRequest {
  values: CreateInjectionSubMenuValueRequest[];
}

export interface InjectionSubMenuValueDto {
  id: number;
  injection_SubMenu_ScrollId: number;
  index: number;
  v: number;
  v2: number;
}

export interface CreateInjectionSubMenuValueRequest {
  index: number;
  v: number;
  v2: number;
}

export interface InjectionSubMenuSwitchTypeDto {
  id: number;
  injectionId: number;
  transshipmentPosition: number;
  switchOverTime: number;
  switchingPressure: number;
}

export interface CreateInjectionSubMenuSwitchTypeRequest {
  transshipmentPosition: number;
  switchOverTime: number;
  switchingPressure: number;
} 