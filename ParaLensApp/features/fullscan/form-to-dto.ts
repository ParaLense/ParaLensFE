/**
 * Mappers: ScanFormValue → DTO types
 *
 * The scan-review forms use `ScanFormValue { value: string; unit?: string }`.
 * The fullscan DTOs use `ValueUnit { value: number; unit: string }` (and plain numbers).
 * These helpers bridge the gap so the stored data always matches the DTO shape.
 */
import type { ValueUnit } from "@/features/fullscan/types";
import type {
  InjectionMainFormState,
  InjectionSwitchTypeFormState,
  DosingMainFormState,
  HoldingMainFormState,
  CylinderHeatingFormState,
  ScanFormValue,
} from "@/features/scan-session/types/scan-session-types";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** ScanFormValue → ValueUnit */
function toValueUnit(f: ScanFormValue): ValueUnit {
  return {
    value: parseFloat(f.value) || 0,
    unit: f.unit ?? "",
  };
}

/** ScanFormValue → plain number (for fields that don't carry a unit, e.g. setpoints) */
function toNumber(f: ScanFormValue): number {
  return parseFloat(f.value) || 0;
}

// ---------------------------------------------------------------------------
// Section mappers  (FormState → Partial<SectionDto> payload for upsertSection)
// ---------------------------------------------------------------------------

export function mapInjectionMainMenu(form: InjectionMainFormState) {
  return {
    mainMenu: {
      sprayPressureLimit: toValueUnit(form.sprayPressureLimit),
      increasedSpecificPointPrinter: toValueUnit(form.increasedSpecificPointPrinter),
    },
  };
}

export function mapInjectionSwitchType(form: InjectionSwitchTypeFormState) {
  return {
    switchType: {
      transshipmentPosition: toValueUnit(form.transshipmentPosition),
      switchOverTime: toValueUnit(form.switchOverTime),
      switchingPressure: toValueUnit(form.switchingPressure),
      switchOverWay: form.switch_over_way.value === "1",
      switchOverTimeActive: form.switch_over_time.value === "1",
      switchOverHydraulic: form.switch_over_hydraulic.value === "1",
    },
  };
}

export function mapHoldingMainMenu(form: HoldingMainFormState) {
  return {
    mainMenu: {
      holdingTime: toValueUnit(form.holdingTime),
      coolTime: toValueUnit(form.coolTime),
      screwDiameter: toValueUnit(form.screwDiameter),
    },
  };
}

export function mapDosingMainMenu(form: DosingMainFormState) {
  return {
    mainMenu: {
      dosingStroke: toValueUnit(form.dosingStroke),
      dosingDelayTime: toValueUnit(form.dosingDelayTime),
      relieveDosing: toValueUnit(form.relieveDosing),
      relieveAfterDosing: toValueUnit(form.relieveAfterDosing),
      dischargeSpeedBeforeDosing: toValueUnit(form.dischargeSpeedBeforeDosing),
      dischargeSpeedAfterDosing: toValueUnit(form.dischargeSpeedAfterDosing),
    },
  };
}

export function mapCylinderHeating(form: CylinderHeatingFormState) {
  return {
    mainMenu: {
      setpoint1: toNumber(form.setpoint1),
      setpoint2: toNumber(form.setpoint2),
      setpoint3: toNumber(form.setpoint3),
      setpoint4: toNumber(form.setpoint4),
      setpoint5: toNumber(form.setpoint5),
    },
  };
}


