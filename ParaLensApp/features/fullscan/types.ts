export interface InjectionMainMenuDto {
  id: number;
  injectionId: number;
  sprayPressureLimit: number;
  increasedSpecificPointPrinter: number;
}

export interface InjectionSubMenuValueDto {
  id: number;
  injection_SubMenu_ScrollId: number;
  index: number;
  v: number;
  v2: number;
}

export interface InjectionSubMenuScrollDto {
  id: number;
  injectionId: number;
  values: InjectionSubMenuValueDto[];
}

export interface InjectionSubMenuSwitchTypeDto {
  id: number;
  injectionId: number;
  transshipmentPosition: number;
  switchOverTime: number;
  switchingPressure: number;
}

export interface InjectionDto {
  id: number;
  scanId: number;
  mainMenu?: InjectionMainMenuDto;
  subMenuValues?: InjectionSubMenuScrollDto;
  switchType?: InjectionSubMenuSwitchTypeDto;
}

export interface DosingMainMenuDto {
  id: number;
  dosingId: number;
  dosingStroke: number;
  dosingDelayTime: number;
  relieveDosing: number;
  relieveAfterDosing: number;
  dischargeSpeedBeforeDosing: number;
  dischargeSpeedAfterDosing: number;
}

export interface DosingSubMenuDosingSpeedValueDto {
  id: number;
  dosing_SubMenu_DosingSpeed_ScrollId: number;
  index: number;
  v: number;
  v2: number;
}

export interface DosingSubMenuDosingSpeedScrollDto {
  id: number;
  dosingId: number;
  values: DosingSubMenuDosingSpeedValueDto[];
}

export interface DosingSubMenuDosingPressureValueDto {
  id: number;
  dosing_SubMenu_DosingPressure_ScrollId: number;
  index: number;
  v: number;
  v2: number;
}

export interface DosingSubMenuDosingPressureScrollDto {
  id: number;
  dosingId: number;
  values: DosingSubMenuDosingPressureValueDto[];
}

export interface DosingDto {
  id: number;
  scanId: number;
  mainMenu?: DosingMainMenuDto;
  dosingSpeedsValues?: DosingSubMenuDosingSpeedScrollDto;
  dosingPressuresValues?: DosingSubMenuDosingPressureScrollDto;
}

export interface HoldingPressureMainMenuDto {
  id: number;
  holdingPressureId: number;
  holdingTime: number;
  coolTime: number;
  screwDiameter: number;
}

export interface HoldingPressureSubMenuValueDto {
  id: number;
  holdingPressure_Submenu_ScrollId: number;
  index: number;
  t: number;
  p: number;
}

export interface HoldingPressureSubMenuScrollDto {
  id: number;
  holdingPressureId: number;
  values: HoldingPressureSubMenuValueDto[];
}

export interface HoldingPressureDto {
  id: number;
  scanId: number;
  mainMenu?: HoldingPressureMainMenuDto;
  subMenusValues?: HoldingPressureSubMenuScrollDto;
}

export interface CylinderHeatingMainMenuDto {
  id: number;
  cylinderHeatingId: number;
  setpoint1: number;
  setpoint2: number;
  setpoint3: number;
  setpoint4: number;
  setpoint5: number;
}

export interface CylinderHeatingDto {
  id: number;
  scanId: number;
  mainMenu?: CylinderHeatingMainMenuDto;
}

export interface OverlayBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface FullScanDto {
    id: number;
    author: string;
    date: string;
    injection?: InjectionDto;
    holdingPressure?: HoldingPressureDto;
    dosing?: DosingDto;
    cylinderHeating?: CylinderHeatingDto;
    serverId?: number;
    uploadStatus?: 'not_uploaded' | 'uploading' | 'uploaded' | 'error' | 'needs_update';
    uploadError?: string;
    lastUploaded?: string; // ISO date string
    lastModified?: string; // ISO date string - tracks when scan data was last modified
}

export type ScanMenu =
  | 'injection'
  | 'dosing'
  | 'holdingPressure'
  | 'cylinderHeating';

