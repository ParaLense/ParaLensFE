import type { FullScanDto } from "@/features/api/types/common";
import type {
  CreateFullScanRequest,
  UpdateFullScanRequest,
} from "@/features/api/services/scanUploadService";

const toDateOnly = (isoDate: string): string =>
  new Date(isoDate).toISOString().split("T")[0];

export function mapFullScanToCreateRequest(
  scan: FullScanDto,
): CreateFullScanRequest {
  const dateOnly = toDateOnly(scan.date);

  const transformedInjection = scan.injection
    ? {
        mainMenu: scan.injection.mainMenu,
        subMenuValues: {
          values: scan.injection.subMenuValues?.values || [],
        },
        switchType: scan.injection.switchType,
      }
    : {
        subMenuValues: {
          values: [],
        },
      };

  const transformedDosing = scan.dosing
    ? {
        mainMenu: scan.dosing.mainMenu,
        dosingSpeedsValues: {
          values: scan.dosing.dosingSpeedsValues?.values || [],
        },
        dosingPressuresValues: {
          values: scan.dosing.dosingPressuresValues?.values || [],
        },
      }
    : {
        dosingSpeedsValues: {
          values: [],
        },
        dosingPressuresValues: {
          values: [],
        },
      };

  const transformedHoldingPressure = scan.holdingPressure
    ? {
        mainMenu: scan.holdingPressure.mainMenu,
        subMenusValues: {
          values: scan.holdingPressure.subMenusValues?.values || [],
        },
      }
    : {
        subMenusValues: {
          values: [],
        },
      };

  let transformedCylinderHeating;
  if (scan.cylinderHeating && scan.cylinderHeating.mainMenu) {
    transformedCylinderHeating = {
      mainMenu: scan.cylinderHeating.mainMenu,
    };
  } else if (scan.cylinderHeating) {
    transformedCylinderHeating = {
      mainMenu: scan.cylinderHeating,
    };
  } else {
    transformedCylinderHeating = {
      mainMenu: {
        setpoint1: 0,
        setpoint2: 0,
        setpoint3: 0,
        setpoint4: 0,
        setpoint5: 0,
      },
    };
  }

  return {
    name: `Scan_${scan.id}_${scan.author}`,
    author: scan.author,
    date: dateOnly,
    injection: transformedInjection,
    dosing: transformedDosing,
    holdingPressure: transformedHoldingPressure,
    cylinderHeating: transformedCylinderHeating,
  };
}

export function mapFullScanToUpdateRequest(
  scan: FullScanDto,
): UpdateFullScanRequest {
  const base = mapFullScanToCreateRequest(scan);

  const { name, author, date, injection, dosing, holdingPressure, cylinderHeating } =
    base;

  return {
    name,
    author,
    date,
    injection,
    dosing,
    holdingPressure,
    cylinderHeating,
  };
}

