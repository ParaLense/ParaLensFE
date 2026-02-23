import type { OcrFieldResult, ParsedScrollbarValue, UnitSystem, ValueMode } from "@/features/ocr";
import type { IndexValuePair } from "@/components/DynamicValueList";

export type ScanMenu =
  | "injection"
  | "dosing"
  | "holdingPressure"
  | "cylinderHeating";

export type InjectionMode = "mainMenu" | "subMenuGraphic" | "switchType" | "";
export type HoldingPressureMode = "mainMenu" | "subMenuGraphic" | "";
export type DosingMode = "mainMenu" | "subMenuGraphic" | "";

export type OcrSnapshot = {
  bestFields: OcrFieldResult[];
  ocrMap: Record<string, string>;
  unitConfig?: {
    system?: UnitSystem;
    mode?: ValueMode;
  };
} | null;

export type ScrollbarUnits = { keyUnit?: string; valueUnit?: string };

export type ScrollbarRows = IndexValuePair[];

export type ScanFormValue = {
  value: string;
  unit?: string;
};

export type InjectionMainFormState = {
  sprayPressureLimit: ScanFormValue;
  increasedSpecificPointPrinter: ScanFormValue;
};

export type InjectionSwitchTypeFormState = {
  transshipmentPosition: ScanFormValue;
  switchOverTime: ScanFormValue;
  switchingPressure: ScanFormValue;
  switch_over_way: { value: string };
  switch_over_time: { value: string };
  switch_over_hydraulic: { value: string };
};

export type DosingMainFormState = {
  dosingStroke: ScanFormValue;
  dosingDelayTime: ScanFormValue;
  relieveDosing: ScanFormValue;
  relieveAfterDosing: ScanFormValue;
  dischargeSpeedBeforeDosing: ScanFormValue;
  dischargeSpeedAfterDosing: ScanFormValue;
};

export type HoldingMainFormState = {
  holdingTime: ScanFormValue;
  coolTime: ScanFormValue;
  screwDiameter: ScanFormValue;
};

export type CylinderHeatingFormState = {
  setpoint1: ScanFormValue;
  setpoint2: ScanFormValue;
  setpoint3: ScanFormValue;
  setpoint4: ScanFormValue;
  setpoint5: ScanFormValue;
};


