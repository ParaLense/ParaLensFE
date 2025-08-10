import { 
  CreateScanRequest,
  CreateInjectionRequest,
  CreateInjectionMainMenuRequest,
  CreateInjectionSubMenuScrollRequest,
  CreateInjectionSubMenuValueRequest,
  CreateInjectionSubMenuSwitchTypeRequest,
  CreateDosingRequest,
  CreateDosingMainMenuRequest,
  CreateDosingSubMenuDosingSpeedScrollRequest,
  CreateDosingSubMenuDosingSpeedValueRequest,
  CreateDosingSubMenuDosingPressureScrollRequest,
  CreateDosingSubMenuDosingPressureValueRequest,
  CreateHoldingPressureRequest,
  CreateHoldingPressureMainMenuRequest,
  CreateHoldingPressureSubMenuScrollRequest,
  CreateHoldingPressureSubMenuValueRequest,
  CreateCylinderHeatingRequest,
  CreateCylinderHeatingMainMenuRequest
} from '../types/api';

export function validateCreateScanRequest(request: CreateScanRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.author || request.author.trim().length === 0) {
    errors.push('Author is required');
  }

  if (!request.date || !isValidDateFormat(request.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateInjectionRequest(request: CreateInjectionRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.mainMenu) {
    const mainMenuErrors = validateCreateInjectionMainMenuRequest(request.mainMenu);
    errors.push(...mainMenuErrors.errors);
  }

  if (request.subMenuValues) {
    const subMenuErrors = validateCreateInjectionSubMenuScrollRequest(request.subMenuValues);
    errors.push(...subMenuErrors.errors);
  }

  if (request.switchType) {
    const switchTypeErrors = validateCreateInjectionSubMenuSwitchTypeRequest(request.switchType);
    errors.push(...switchTypeErrors.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateInjectionMainMenuRequest(request: CreateInjectionMainMenuRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.sprayPressureLimit < 0) {
    errors.push('Spray pressure limit must be non-negative');
  }

  if (request.increasedSpecificPointPrinter !== 0 && request.increasedSpecificPointPrinter !== 1) {
    errors.push('Increased specific point printer must be 0 or 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateInjectionSubMenuScrollRequest(request: CreateInjectionSubMenuScrollRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.values || request.values.length === 0) {
    errors.push('At least one value is required');
  } else {
    request.values.forEach((value, index) => {
      const valueErrors = validateCreateInjectionSubMenuValueRequest(value);
      errors.push(...valueErrors.errors.map(err => `Value ${index}: ${err}`));
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateInjectionSubMenuValueRequest(request: CreateInjectionSubMenuValueRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.index < 0) {
    errors.push('Index must be non-negative');
  }

  if (request.v < 0) {
    errors.push('V must be non-negative');
  }

  if (request.v2 < 0) {
    errors.push('V2 must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateInjectionSubMenuSwitchTypeRequest(request: CreateInjectionSubMenuSwitchTypeRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.transshipmentPosition < 0) {
    errors.push('Transshipment position must be non-negative');
  }

  if (request.switchOverTime < 0) {
    errors.push('Switch over time must be non-negative');
  }

  if (request.switchingPressure < 0) {
    errors.push('Switching pressure must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateDosingRequest(request: CreateDosingRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.mainMenu) {
    const mainMenuErrors = validateCreateDosingMainMenuRequest(request.mainMenu);
    errors.push(...mainMenuErrors.errors);
  }

  if (request.dosingSpeedsValues) {
    const speedErrors = validateCreateDosingSubMenuDosingSpeedScrollRequest(request.dosingSpeedsValues);
    errors.push(...speedErrors.errors);
  }

  if (request.dosingPressuresValues) {
    const pressureErrors = validateCreateDosingSubMenuDosingPressureScrollRequest(request.dosingPressuresValues);
    errors.push(...pressureErrors.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateDosingMainMenuRequest(request: CreateDosingMainMenuRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.dosingStroke < 0) {
    errors.push('Dosing stroke must be non-negative');
  }

  if (request.dosingDelayTime < 0) {
    errors.push('Dosing delay time must be non-negative');
  }

  if (request.relieveDosing < 0) {
    errors.push('Relieve dosing must be non-negative');
  }

  if (request.relieveAfterDosing < 0) {
    errors.push('Relieve after dosing must be non-negative');
  }

  if (request.dischargeSpeedBeforeDosing < 0) {
    errors.push('Discharge speed before dosing must be non-negative');
  }

  if (request.dischargeSpeedAfterDosing < 0) {
    errors.push('Discharge speed after dosing must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateDosingSubMenuDosingSpeedScrollRequest(request: CreateDosingSubMenuDosingSpeedScrollRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.values || request.values.length === 0) {
    errors.push('At least one dosing speed value is required');
  } else {
    request.values.forEach((value, index) => {
      const valueErrors = validateCreateDosingSubMenuDosingSpeedValueRequest(value);
      errors.push(...valueErrors.errors.map(err => `Speed value ${index}: ${err}`));
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateDosingSubMenuDosingSpeedValueRequest(request: CreateDosingSubMenuDosingSpeedValueRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.index < 0) {
    errors.push('Index must be non-negative');
  }

  if (request.v < 0) {
    errors.push('V must be non-negative');
  }

  if (request.v2 < 0) {
    errors.push('V2 must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateDosingSubMenuDosingPressureScrollRequest(request: CreateDosingSubMenuDosingPressureScrollRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.values || request.values.length === 0) {
    errors.push('At least one dosing pressure value is required');
  } else {
    request.values.forEach((value, index) => {
      const valueErrors = validateCreateDosingSubMenuDosingPressureValueRequest(value);
      errors.push(...valueErrors.errors.map(err => `Pressure value ${index}: ${err}`));
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateDosingSubMenuDosingPressureValueRequest(request: CreateDosingSubMenuDosingPressureValueRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.index < 0) {
    errors.push('Index must be non-negative');
  }

  if (request.v < 0) {
    errors.push('V must be non-negative');
  }

  if (request.v2 < 0) {
    errors.push('V2 must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateHoldingPressureRequest(request: CreateHoldingPressureRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.mainMenu) {
    const mainMenuErrors = validateCreateHoldingPressureMainMenuRequest(request.mainMenu);
    errors.push(...mainMenuErrors.errors);
  }

  if (request.subMenusValues) {
    const subMenuErrors = validateCreateHoldingPressureSubMenuScrollRequest(request.subMenusValues);
    errors.push(...subMenuErrors.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateHoldingPressureMainMenuRequest(request: CreateHoldingPressureMainMenuRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.holdingTime < 0) {
    errors.push('Holding time must be non-negative');
  }

  if (request.coolTime < 0) {
    errors.push('Cool time must be non-negative');
  }

  if (request.screwDiameter <= 0) {
    errors.push('Screw diameter must be positive');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateHoldingPressureSubMenuScrollRequest(request: CreateHoldingPressureSubMenuScrollRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.values || request.values.length === 0) {
    errors.push('At least one holding pressure value is required');
  } else {
    request.values.forEach((value, index) => {
      const valueErrors = validateCreateHoldingPressureSubMenuValueRequest(value);
      errors.push(...valueErrors.errors.map(err => `Holding pressure value ${index}: ${err}`));
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateHoldingPressureSubMenuValueRequest(request: CreateHoldingPressureSubMenuValueRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.index < 0) {
    errors.push('Index must be non-negative');
  }

  if (request.t < 0) {
    errors.push('T must be non-negative');
  }

  if (request.p < 0) {
    errors.push('P must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateCylinderHeatingRequest(request: CreateCylinderHeatingRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.mainMenu) {
    const mainMenuErrors = validateCreateCylinderHeatingMainMenuRequest(request.mainMenu);
    errors.push(...mainMenuErrors.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCreateCylinderHeatingMainMenuRequest(request: CreateCylinderHeatingMainMenuRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.setpoint1 < 0) {
    errors.push('Setpoint 1 must be non-negative');
  }

  if (request.setpoint2 < 0) {
    errors.push('Setpoint 2 must be non-negative');
  }

  if (request.setpoint3 < 0) {
    errors.push('Setpoint 3 must be non-negative');
  }

  if (request.setpoint4 < 0) {
    errors.push('Setpoint 4 must be non-negative');
  }

  if (request.setpoint5 < 0) {
    errors.push('Setpoint 5 must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateString;
}

export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isValidPositiveNumber(value: any): boolean {
  return isValidNumber(value) && value > 0;
}

export function isValidNonNegativeNumber(value: any): boolean {
  return isValidNumber(value) && value >= 0;
}

export function isValidString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidArray(value: any): boolean {
  return Array.isArray(value) && value.length > 0;
} 