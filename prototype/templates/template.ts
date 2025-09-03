
interface TemplateBox{
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

enum TemplateLayout {
  ScreenDetection = 'ScreenDetection',
  Injection = 'Injection',
  InjectionSpeed_ScrollBar = 'InjectionSpeed_ScrollBar',
  Injection_SwitchType = 'Injection_SwitchType',
  HoldingPressure = 'HoldingPressure',
  HoldingPressure_ScrollBar = 'HoldingPressure_ScrollBar',
  Dosing = 'Dosing',
  Dosing_ScrollBar = 'Dosing_ScrollBar',
  CylinderHeating = 'CylinderHeating',
}

// Statically require all JSON files so Metro can bundle them
 
const screenDetection: TemplateBox[] = require('./0. Bildschirmaufbau_Screendetection.json');
 
const injection: TemplateBox[] = require('./1. Einspritzen.json');
 
const injectionSpeedScroll: TemplateBox[] = require('./1.1 Einspritzgeschwindigkeit_ScrollBar.json');
 
const injectionSwitchType: TemplateBox[] = require('./1.2 Umschaltart_Switch.json');
 
const holdingPressure: TemplateBox[] = require('./2. Nachdruck.json');
 
const holdingPressureScroll: TemplateBox[] = require('./2.1 Nachdruck_ScrollBar.json');
 
const dosing: TemplateBox[] = require('./3. Dosieren.json');
 
const dosingScroll: TemplateBox[] = require('./3.1 Dosieren_ScrollBar.json');
 
const cylinderHeating: TemplateBox[] = require('./4. ZylinerHeizung.json');

const TEMPLATE_DATA: Record<TemplateLayout, TemplateBox[]> = {
  [TemplateLayout.ScreenDetection]: screenDetection,
  [TemplateLayout.Injection]: injection,
  [TemplateLayout.InjectionSpeed_ScrollBar]: injectionSpeedScroll,
  [TemplateLayout.Injection_SwitchType]: injectionSwitchType,
  [TemplateLayout.HoldingPressure]: holdingPressure,
  [TemplateLayout.HoldingPressure_ScrollBar]: holdingPressureScroll,
  [TemplateLayout.Dosing]: dosing,
  [TemplateLayout.Dosing_ScrollBar]: dosingScroll,
  [TemplateLayout.CylinderHeating]: cylinderHeating,
};

function loadTemplateConfig(layout: TemplateLayout): TemplateBox[] {
  return TEMPLATE_DATA[layout] ?? [];
}

export type { TemplateBox }
export { TemplateLayout, loadTemplateConfig }