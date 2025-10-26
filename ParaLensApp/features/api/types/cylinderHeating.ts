export interface CylinderHeatingDto {
  id: number;
  scanId: number;
  mainMenu?: CylinderHeatingMainMenuDto;
}

export interface CreateCylinderHeatingRequest {
  mainMenu?: CreateCylinderHeatingMainMenuRequest;
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

export interface CreateCylinderHeatingMainMenuRequest {
  setpoint1: number;
  setpoint2: number;
  setpoint3: number;
  setpoint4: number;
  setpoint5: number;
} 