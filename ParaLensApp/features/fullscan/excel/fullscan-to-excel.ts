import type { FullScanDto } from "@/features/fullscan/types";

type CellValue = string | number | null;

export type ExcelRows = CellValue[][];

export type FullScanExcelData = {
  rows: ExcelRows;
  maxRow: number;
};

const toExcelNumber = (value: any): number | string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number(value.toFixed(2));
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : value;
};

const labelWithUnit = (label: string, unit?: string | null): string =>
  unit ? `${label} [${unit}]` : label;

export function buildFullScanExcelData(
  scan: FullScanDto,
  XLSX: any,
): FullScanExcelData {
  const injection = (scan as any)?.injection || (scan as any)?.Injection;
  const holdingPressure =
    (scan as any)?.holdingPressure || (scan as any)?.HoldingPressure;
  const dosing = (scan as any)?.dosing || (scan as any)?.Dosing;
  const cylinderHeating =
    (scan as any)?.cylinderHeating || (scan as any)?.CylinderHeating;

  const getScrollUnits = (scroll: any): {
    keyUnit?: string | null;
    valueUnit?: string | null;
  } => {
    if (!scroll) return {};
    return {
      keyUnit: scroll.keyUnit ?? scroll.KeyUnit ?? null,
      valueUnit: scroll.valueUnit ?? scroll.ValueUnit ?? null,
    };
  };

  const injCount =
    injection?.subMenuValues?.values?.length ||
    injection?.SubMenuValues?.Values?.length ||
    0;
  const hpCount =
    holdingPressure?.subMenusValues?.values?.length ||
    holdingPressure?.SubMenusValues?.Values?.length ||
    0;
  const dosingSpeedCount =
    dosing?.dosingSpeedsValues?.values?.length ||
    dosing?.DosingSpeedsValues?.Values?.length ||
    0;
  const dosingPressureCount =
    dosing?.dosingPressuresValues?.values?.length ||
    dosing?.DosingPressuresValues?.Values?.length ||
    0;

  const rows: ExcelRows = [];
  const maxRowCount = 30 + injCount + hpCount + dosingSpeedCount + dosingPressureCount + 5;
  for (let i = 0; i <= maxRowCount; i++) {
    rows[i] = [];
  }

  const setCell = (row: number, col: number, value: CellValue) => {
    rows[row - 1][col - 1] = value;
  };

  const setCellValueAndUnit = (
    row: number,
    col: number,
    data: { value: any; unit?: string } | any,
  ) => {
    if (typeof data === "object" && data !== null && "value" in data) {
      setCell(row, col, toExcelNumber(data.value));
      if (data.unit) {
        setCell(row, col - 2, data.unit);
      }
    } else {
      setCell(row, col, toExcelNumber(data));
    }
  };

  const valuesStartCol = 6;

  const injHeaderRow = 5;
  const hpHeaderRow = 14;
  const dosingSpeedHeaderRow = 23;
  const dosingPressureHeaderRow = 24;

  const injListStartRow = injHeaderRow + 1;
  const injWayRow = 6 + injCount;
  const injTimeRow = 7 + injCount;
  const injHydRow = 8 + injCount;
  const injActiveModeRow = 9 + injCount;

  const hpListStartRow = hpHeaderRow + 1 + injCount;
  const hpMainStartRow = 10 + injCount;
  const hpUndermenuStartRow = 13 + injCount;
  const hpHeaderRowAfter = hpHeaderRow + injCount;

  const dosingMainStartRow = 16 + injCount + hpCount;
  const dosingUndermenuStartRow = 22 + injCount + hpCount;
  const dosingSpeedListStartRow =
    dosingSpeedHeaderRow + 1 + injCount + hpCount;
  const dosingPressureHeaderRowAdjusted =
    dosingPressureHeaderRow + injCount + hpCount + dosingSpeedCount;
  const dosingPressureListStartRow = dosingPressureHeaderRowAdjusted + 1;

  const cylStartRow =
    29 + injCount + hpCount + dosingSpeedCount + dosingPressureCount;
  const cylEndRow = cylStartRow + 4;

  const injEndRow = 9 + injCount;
  setCell(2, 1, "Einspritzen");
  setCell(2, 2, "Hauptmenü");
  setCell(2, 3, "Einspritzdruck");
  setCell(3, 2, null);
  setCell(3, 3, "IsIncreasedSpecificPressure");

  setCell(4, 2, "Untermenü");
  setCell(4, 3, "Einspritzgeschwindigkeit");
  const injUnits = getScrollUnits(
    injection?.subMenuValues || injection?.SubMenuValues,
  );
  setCell(4, 4, labelWithUnit("s", injUnits.keyUnit));
  setCell(4, 5, labelWithUnit("v", injUnits.valueUnit));
  setCell(5, 3, "Istwert (Liste)");

  setCell(6, 2, "Umschalten");
  setCell(injWayRow, 3, "Weg");
  setCell(injTimeRow, 3, "Zeit");
  setCell(injHydRow, 3, "Hydraulikdruck");
  setCell(injActiveModeRow, 3, "Aktive Umschaltart");

  const hpEndRow = 14 + injCount + hpCount;
  setCell(hpMainStartRow, 1, "Nachdruck");
  setCell(hpMainStartRow, 2, "Hauptmenü");
  setCell(hpMainStartRow, 3, "Nachdruckzeit");
  setCell(hpMainStartRow + 1, 2, null);
  setCell(hpMainStartRow + 1, 3, "Kühlzeit");
  setCell(hpMainStartRow + 2, 2, null);
  setCell(hpMainStartRow + 2, 3, "Schneckendurchmesser");

  setCell(hpUndermenuStartRow, 2, "Untermenü");
  setCell(hpUndermenuStartRow, 3, "Nachdruck");
  const hpUnits = getScrollUnits(
    holdingPressure?.subMenusValues || holdingPressure?.SubMenusValues,
  );
  setCell(hpUndermenuStartRow, 4, labelWithUnit("t", hpUnits.keyUnit));
  setCell(hpUndermenuStartRow, 5, labelWithUnit("p", hpUnits.valueUnit));
  setCell(hpHeaderRowAfter, 3, "Istwert (Liste)");

  const dosingPressureEndRow =
    dosingPressureHeaderRowAdjusted + dosingPressureCount;
  const dosingEndRow = dosingPressureEndRow;

  setCell(dosingMainStartRow, 1, "Dosieren");
  setCell(dosingMainStartRow, 2, "Hauptmenü");
  setCell(dosingMainStartRow, 3, "Dosierweg");
  setCell(dosingMainStartRow + 1, 2, null);
  setCell(dosingMainStartRow + 1, 3, "Dosierverzögerungszeit");
  setCell(dosingMainStartRow + 2, 2, null);
  setCell(dosingMainStartRow + 2, 3, "Entlasten Dosieren");
  setCell(dosingMainStartRow + 3, 2, null);
  setCell(dosingMainStartRow + 3, 3, "Entlasten nach Dosieren");
  setCell(dosingMainStartRow + 4, 2, null);
  setCell(dosingMainStartRow + 4, 3, "Dekompressionsgeschwindigkeit vor Dosieren");
  setCell(dosingMainStartRow + 5, 2, null);
  setCell(dosingMainStartRow + 5, 3, "Dekompressionsgeschwindigkeit nach Dosieren");

  setCell(dosingUndermenuStartRow, 2, "Untermenü");
  setCell(dosingUndermenuStartRow, 3, "Dosiergeschwindigkeit");
  const dosingSpeedUnits = getScrollUnits(
    dosing?.dosingSpeedsValues || dosing?.DosingSpeedsValues,
  );
  setCell(dosingUndermenuStartRow, 4, labelWithUnit("s", dosingSpeedUnits.keyUnit));
  setCell(dosingUndermenuStartRow, 5, labelWithUnit("v", dosingSpeedUnits.valueUnit));
  setCell(
    dosingSpeedHeaderRow + injCount + hpCount,
    3,
    "Istwert (Liste)",
  );

  setCell(dosingPressureHeaderRowAdjusted, 3, "Staudruck");
  const dosingPressureUnits = getScrollUnits(
    dosing?.dosingPressuresValues || dosing?.DosingPressuresValues,
  );
  setCell(dosingPressureHeaderRowAdjusted, 4, labelWithUnit("s", dosingPressureUnits.keyUnit));
  setCell(
    dosingPressureHeaderRowAdjusted,
    5,
    labelWithUnit("p", dosingPressureUnits.valueUnit),
  );

  setCell(cylStartRow, 1, "Zylinderheizung");
  setCell(cylStartRow, 2, "Hauptmenü");
  setCell(cylStartRow, 3, "Sollwert 1");
  setCell(cylStartRow + 1, 2, null);
  setCell(cylStartRow + 1, 3, "Sollwert 2");
  setCell(cylStartRow + 2, 2, null);
  setCell(cylStartRow + 2, 3, "Sollwert 3");
  setCell(cylStartRow + 3, 2, null);
  setCell(cylStartRow + 3, 3, "Sollwert 4");
  setCell(cylStartRow + 4, 2, null);
  setCell(cylStartRow + 4, 3, "Sollwert 5");

  const injMainMenu = injection?.mainMenu || injection?.MainMenu;
  const injSwitchType = injection?.switchType || injection?.SwitchType;
  const hpMainMenu = holdingPressure?.mainMenu || holdingPressure?.MainMenu;
  const dosingMainMenu = dosing?.mainMenu || dosing?.MainMenu;
  const cylMainMenu =
    cylinderHeating?.mainMenu ||
    cylinderHeating?.MainMenu ||
    (cylinderHeating &&
    (cylinderHeating.setpoint1 !== undefined ||
      cylinderHeating.Setpoint1 !== undefined)
      ? cylinderHeating
      : null);

  if (injMainMenu) {
    setCellValueAndUnit(
      2,
      valuesStartCol,
      injMainMenu.sprayPressureLimit ??
        injMainMenu.SprayPressureLimit ??
        null,
    );
    setCellValueAndUnit(
      3,
      valuesStartCol,
      injMainMenu.increasedSpecificPointPrinter ??
        injMainMenu.IncreasedSpecificPointPrinter ??
        null,
    );
  }

  if (injSwitchType) {
    setCellValueAndUnit(
      injWayRow,
      valuesStartCol,
      injSwitchType.transshipmentPosition ??
        injSwitchType.TransshipmentPosition ??
        null,
    );
    setCellValueAndUnit(
      injTimeRow,
      valuesStartCol,
      injSwitchType.switchOverTime ?? injSwitchType.SwitchOverTime ?? null,
    );
    setCellValueAndUnit(
      injHydRow,
      valuesStartCol,
      injSwitchType.switchingPressure ??
        injSwitchType.SwitchingPressure ??
        null,
    );

    let activeMode = "";
    if (
      injSwitchType.switchOverWay ||
      injSwitchType.switch_over_way?.value === "1" ||
      injSwitchType.switch_over_way?.value === true
    ) {
      activeMode = "Weg";
    } else if (
      injSwitchType.switchOverTimeActive ||
      injSwitchType.switch_over_time?.value === "1" ||
      injSwitchType.switch_over_time?.value === true
    ) {
      activeMode = "Zeit";
    } else if (
      injSwitchType.switchOverHydraulic ||
      injSwitchType.switch_over_hydraulic?.value === "1" ||
      injSwitchType.switch_over_hydraulic?.value === true
    ) {
      activeMode = "Hydraulikdruck";
    }
    setCell(injActiveModeRow, valuesStartCol, activeMode);
  }

  if (hpMainMenu) {
    setCellValueAndUnit(
      hpMainStartRow + 0,
      valuesStartCol,
      hpMainMenu.holdingTime ?? hpMainMenu.HoldingTime ?? null,
    );
    setCellValueAndUnit(
      hpMainStartRow + 1,
      valuesStartCol,
      hpMainMenu.coolTime ?? hpMainMenu.CoolTime ?? null,
    );
    setCellValueAndUnit(
      hpMainStartRow + 2,
      valuesStartCol,
      hpMainMenu.screwDiameter ?? hpMainMenu.ScrewDiameter ?? null,
    );
  }

  if (dosingMainMenu) {
    setCellValueAndUnit(
      dosingMainStartRow + 0,
      valuesStartCol,
      dosingMainMenu.dosingStroke ?? dosingMainMenu.DosingStroke ?? null,
    );
    setCellValueAndUnit(
      dosingMainStartRow + 1,
      valuesStartCol,
      dosingMainMenu.dosingDelayTime ??
        dosingMainMenu.DosingDelayTime ??
        null,
    );
    setCellValueAndUnit(
      dosingMainStartRow + 2,
      valuesStartCol,
      dosingMainMenu.relieveDosing ??
        dosingMainMenu.RelieveDosing ??
        null,
    );
    setCellValueAndUnit(
      dosingMainStartRow + 3,
      valuesStartCol,
      dosingMainMenu.relieveAfterDosing ??
        dosingMainMenu.RelieveAfterDosing ??
        null,
    );
    setCellValueAndUnit(
      dosingMainStartRow + 4,
      valuesStartCol,
      dosingMainMenu.dischargeSpeedBeforeDosing ??
        dosingMainMenu.DischargeSpeedBeforeDosing ??
        null,
    );
    setCellValueAndUnit(
      dosingMainStartRow + 5,
      valuesStartCol,
      dosingMainMenu.dischargeSpeedAfterDosing ??
        dosingMainMenu.DischargeSpeedAfterDosing ??
        null,
    );
  }

  if (cylMainMenu) {
    const getSetpoint = (obj: any, num: number) => {
      const camelKey = `setpoint${num}`;
      const pascalKey = `Setpoint${num}`;
      return obj[camelKey] !== undefined
        ? obj[camelKey]
        : obj[pascalKey] !== undefined
          ? obj[pascalKey]
          : null;
    };

    setCellValueAndUnit(
      cylStartRow + 0,
      valuesStartCol,
      getSetpoint(cylMainMenu, 1),
    );
    setCellValueAndUnit(
      cylStartRow + 1,
      valuesStartCol,
      getSetpoint(cylMainMenu, 2),
    );
    setCellValueAndUnit(
      cylStartRow + 2,
      valuesStartCol,
      getSetpoint(cylMainMenu, 3),
    );
    setCellValueAndUnit(
      cylStartRow + 3,
      valuesStartCol,
      getSetpoint(cylMainMenu, 4),
    );
    setCellValueAndUnit(
      cylStartRow + 4,
      valuesStartCol,
      getSetpoint(cylMainMenu, 5),
    );
  }

  if (injCount > 0) {
    const injValues =
      injection?.subMenuValues?.values || injection?.SubMenuValues?.Values || [];
    let r = injListStartRow;
    [...injValues]
      .sort(
        (a: any, b: any) =>
          (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0),
      )
      .forEach((v: any) => {
        setCell(r, 4, toExcelNumber(v.v ?? v.V ?? null));
        setCell(r, 5, toExcelNumber(v.v2 ?? v.V2 ?? null));
        r++;
      });
  }

  if (hpCount > 0) {
    const hpValues =
      holdingPressure?.subMenusValues?.values ||
      holdingPressure?.SubMenusValues?.Values ||
      [];
    let r = hpListStartRow;
    [...hpValues]
      .sort(
        (a: any, b: any) =>
          (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0),
      )
      .forEach((v: any) => {
        setCell(r, 4, toExcelNumber(v.t ?? v.T ?? null));
        setCell(r, 5, toExcelNumber(v.p ?? v.P ?? null));
        r++;
      });
  }

  if (dosingSpeedCount > 0) {
    const dosingSpeedValues =
      dosing?.dosingSpeedsValues?.values ||
      dosing?.DosingSpeedsValues?.Values ||
      [];
    let r = dosingSpeedListStartRow;
    [...dosingSpeedValues]
      .sort(
        (a: any, b: any) =>
          (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0),
      )
      .forEach((v: any) => {
        setCell(r, 4, toExcelNumber(v.v ?? v.V ?? null));
        setCell(r, 5, toExcelNumber(v.v2 ?? v.V2 ?? null));
        r++;
      });
  }

  if (dosingPressureCount > 0) {
    const dosingPressureValues =
      dosing?.dosingPressuresValues?.values ||
      dosing?.DosingPressuresValues?.Values ||
      [];
    let r = dosingPressureListStartRow;
    [...dosingPressureValues]
      .sort(
        (a: any, b: any) =>
          (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0),
      )
      .forEach((v: any) => {
        setCell(r, 4, toExcelNumber(v.v ?? v.V ?? null));
        setCell(r, 5, toExcelNumber(v.p ?? v.P ?? v.v2 ?? v.V2 ?? null));
        r++;
      });
  }

  const maxRow = Math.max(cylEndRow, dosingEndRow, hpEndRow, injEndRow);

  return { rows, maxRow };
}

