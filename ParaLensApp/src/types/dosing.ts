export interface DosingDto {
  id: number;
  scanId: number;
  mainMenu?: DosingMainMenuDto;
  dosingSpeedsValues?: DosingSubMenuDosingSpeedScrollDto;
  dosingPressuresValues?: DosingSubMenuDosingPressureScrollDto;
}

export interface CreateDosingRequest {
  mainMenu?: CreateDosingMainMenuRequest;
  dosingSpeedsValues?: CreateDosingSubMenuDosingSpeedScrollRequest;
  dosingPressuresValues?: CreateDosingSubMenuDosingPressureScrollRequest;
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

export interface CreateDosingMainMenuRequest {
  dosingStroke: number;
  dosingDelayTime: number;
  relieveDosing: number;
  relieveAfterDosing: number;
  dischargeSpeedBeforeDosing: number;
  dischargeSpeedAfterDosing: number;
}

export interface DosingSubMenuDosingSpeedScrollDto {
  id: number;
  dosingId: number;
  values: DosingSubMenuDosingSpeedValueDto[];
}

export interface CreateDosingSubMenuDosingSpeedScrollRequest {
  values: CreateDosingSubMenuDosingSpeedValueRequest[];
}

export interface DosingSubMenuDosingSpeedValueDto {
  id: number;
  dosing_SubMenu_DosingSpeed_ScrollId: number;
  index: number;
  v: number;
  v2: number;
}

export interface CreateDosingSubMenuDosingSpeedValueRequest {
  index: number;
  v: number;
  v2: number;
}

export interface DosingSubMenuDosingPressureScrollDto {
  id: number;
  dosingId: number;
  values: DosingSubMenuDosingPressureValueDto[];
}

export interface CreateDosingSubMenuDosingPressureScrollRequest {
  values: CreateDosingSubMenuDosingPressureValueRequest[];
}

export interface DosingSubMenuDosingPressureValueDto {
  id: number;
  dosing_SubMenu_DosingPressure_ScrollId: number;
  index: number;
  v: number;
  v2: number;
}

export interface CreateDosingSubMenuDosingPressureValueRequest {
  index: number;
  v: number;
  v2: number;
} 