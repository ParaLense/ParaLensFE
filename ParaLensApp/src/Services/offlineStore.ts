import type { FullScanDto, ScanDto } from '../types/common';
import type { 
  InjectionDto, InjectionMainMenuDto, InjectionSubMenuScrollDto, InjectionSubMenuSwitchTypeDto,
  DosingDto, DosingMainMenuDto, DosingSubMenuDosingSpeedScrollDto, DosingSubMenuDosingPressureScrollDto,
  HoldingPressureDto, HoldingPressureMainMenuDto, HoldingPressureSubMenuScrollDto,
  CylinderHeatingDto, CylinderHeatingMainMenuDto
} from '../types/api';

type PartialFull = Partial<FullScanDto> & {
  injection?: Partial<InjectionDto> & {
    mainMenu?: InjectionMainMenuDto;
    subMenuValues?: InjectionSubMenuScrollDto;
    switchType?: InjectionSubMenuSwitchTypeDto;
  };
  dosing?: Partial<DosingDto> & {
    mainMenu?: DosingMainMenuDto;
    dosingSpeedsValues?: DosingSubMenuDosingSpeedScrollDto;
    dosingPressuresValues?: DosingSubMenuDosingPressureScrollDto;
  };
  holdingPressure?: Partial<HoldingPressureDto> & {
    mainMenu?: HoldingPressureMainMenuDto;
    subMenusValues?: HoldingPressureSubMenuScrollDto;
  };
  cylinderHeating?: Partial<CylinderHeatingDto> & {
    mainMenu?: CylinderHeatingMainMenuDto;
  };
};

interface OfflineDB {
  scans: ScanDto[];
  detailsById: Record<number, PartialFull>;
  idCounter: number;
}

const db: OfflineDB = {
  scans: [],
  detailsById: {},
  idCounter: 1,
};

export function offlineCreateScan(scan: Omit<ScanDto, 'id'>): ScanDto {
  const created: ScanDto = { id: db.idCounter++, ...scan } as ScanDto;
  db.scans = [created, ...db.scans];
  if (!db.detailsById[created.id]) db.detailsById[created.id] = { ...created };
  return created;
}

export function offlineListScans(): ScanDto[] {
  return db.scans.slice();
}

export function offlineGetScan(id: number): ScanDto | undefined {
  return db.scans.find(s => s.id === id);
}

export function offlineDeleteScan(id: number): void {
  db.scans = db.scans.filter(s => s.id !== id);
  delete db.detailsById[id];
}

export function offlineDeleteAll(): void {
  db.scans = [];
  db.detailsById = {};
  db.idCounter = 1;
}

export function offlineMergeDetails(id: number, partial: PartialFull): void {
  const existing = db.detailsById[id] || {};
  db.detailsById[id] = deepMerge(existing, partial);
}

export function offlineGetFullScan(id: number): FullScanDto | undefined {
  const base = db.detailsById[id];
  if (!base) return undefined;
  return {
    id,
    author: offlineGetScan(id)?.author ?? base.author ?? '',
    date: offlineGetScan(id)?.date ?? base.date ?? '',
    injection: base.injection as any,
    dosing: base.dosing as any,
    holdingPressure: base.holdingPressure as any,
    cylinderHeating: base.cylinderHeating as any,
  } as FullScanDto;
}

function isObject(item: any) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const output: any = { ...target };
  if (isObject(target) && isObject(source)) {
    for (const key of Object.keys(source as any)) {
      const srcVal: any = (source as any)[key];
      if (isObject(srcVal)) {
        output[key] = deepMerge((target as any)[key] || {}, srcVal);
      } else {
        output[key] = srcVal;
      }
    }
  }
  return output;
}


