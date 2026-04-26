import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { PermissionsAndroid } from "react-native";
import type {
  Workbook as ExcelWorkbook,
  Worksheet as ExcelWorksheet,
  Fill as ExcelFill,
  Font as ExcelFont,
} from "exceljs";
import type {
  FullScanDto,
  ScanMenu,
  ValueUnit,
  InjectionDto,
  InjectionMainMenuDto,
  InjectionSubMenuScrollDto,
  InjectionSubMenuValueDto,
  InjectionSubMenuSwitchTypeDto,
  HoldingPressureDto,
  HoldingPressureMainMenuDto,
  HoldingPressureSubMenuScrollDto,
  HoldingPressureSubMenuValueDto,
  DosingDto,
  DosingMainMenuDto,
  DosingSubMenuDosingSpeedScrollDto,
  DosingSubMenuDosingSpeedValueDto,
  DosingSubMenuDosingPressureScrollDto,
  DosingSubMenuDosingPressureValueDto,
  CylinderHeatingDto,
  CylinderHeatingMainMenuDto,
} from "@/features/fullscan/types";

// ---------------------------------------------------------------------------
// Lazy-loaded ExcelJS – only imported when actually needed via init()
// ---------------------------------------------------------------------------
let _ExcelJS: typeof import("exceljs") | null = null;
let NodeBuffer: typeof import("buffer").Buffer;

async function init() {
  if (!_ExcelJS) {
    _ExcelJS = await import("exceljs");
  }
  if (!NodeBuffer) {
    const bufMod = await import("buffer");
    NodeBuffer = bufMod.Buffer;
  }
}

/** Helper – returns the lazily loaded ExcelJS module (must call init() first) */
function getExcelJS() {
  if (!_ExcelJS) throw new Error("ExcelJS not initialised – call init() first");
  return _ExcelJS;
}

// ---------------------------------------------------------------------------
// Shared styling helpers
// ---------------------------------------------------------------------------
const HEADER_FILL: ExcelFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
const HEADER_FONT: Partial<ExcelFont> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const SUB_HEADER_FILL: ExcelFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E2F3" } };
const COL_WIDTHS_DEFAULT = [
  { width: 20 }, { width: 30 }, { width: 18 }, { width: 14 },
  { width: 14 }, { width: 16 },
];

const NUMBER_FORMAT = "0.00";

function labelWithUnit(label: string, unit?: string | null) {
  return unit ? `${label} [${unit}]` : label;
}

function numericCell(value: number | string | undefined | null): number | string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") return Number(value.toFixed(2));
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : value;
}

/** Extract value + unit from a ValueUnit field into two cell entries */
function vu(field: ValueUnit | undefined): [value: number | string, unit: string] {
  if (!field) return ["", ""];
  return [numericCell(field.value), field.unit ?? ""];
}

function addHeaderRow(ws: ExcelWorksheet, label: string) {
  const r = ws.addRow([label, "", "", "", "", ""]);
  r.font = HEADER_FONT;
  r.fill = HEADER_FILL;
}

function addSubHeaderRow(ws: ExcelWorksheet, col1: string, col2: string) {
  const r = ws.addRow(["", col1, col2]);
  r.fill = SUB_HEADER_FILL;
  r.font = { bold: true };
}

function addScrollValueRow(ws: ExcelWorksheet, key: number | string, value: number | string) {
  const row = ws.addRow(["", numericCell(key), numericCell(value)]);
  row.getCell(2).numFmt = NUMBER_FORMAT;
  row.getCell(3).numFmt = NUMBER_FORMAT;
}

function formatNumericColumns(ws: ExcelWorksheet) {
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (typeof cell.value === "number") {
        cell.numFmt = NUMBER_FORMAT;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Build worksheets – fully typed, no `as any`
// ---------------------------------------------------------------------------

function buildInjectionSheet(wb: ExcelWorkbook, inj: InjectionDto): ExcelWorksheet {
  const ws = wb.addWorksheet("Einspritzen");
  ws.columns = COL_WIDTHS_DEFAULT;

  // --- Main Menu ---
  const mm: InjectionMainMenuDto | undefined = inj.mainMenu;
  addHeaderRow(ws, "Hauptseite");
  ws.addRow(["", "Parameter", "Wert", "Einheit"]);
  {
    const [val, unit] = vu(mm?.sprayPressureLimit);
    ws.addRow(["", "Spritzdruckgrenze", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.increasedSpecificPointPrinter);
    ws.addRow(["", "Erhöhter spezifischer Druck", val, unit]);
  }
  ws.addRow([]);

  // --- Sub Menu (Injection Speed Scroll) ---
  const sub: InjectionSubMenuScrollDto | undefined = inj.subMenuValues;
  addHeaderRow(ws, "Sollwertgrafik - Einspritzgeschwindigkeit");
  addSubHeaderRow(ws, labelWithUnit("s", sub?.keyUnit), labelWithUnit("v", sub?.valueUnit));

  const subValues: InjectionSubMenuValueDto[] = sub?.values ?? [];
  [...subValues]
    .sort((a, b) => a.index - b.index)
    .forEach((val) => {
      addScrollValueRow(ws, val.v, val.v2);
    });
  ws.addRow([]);

  // --- Switch Type ---
  const sw: InjectionSubMenuSwitchTypeDto | undefined = inj.switchType;
  addHeaderRow(ws, "Umschaltart");
  ws.addRow(["", "Parameter", "Wert", "Einheit"]);
  {
    const [val, unit] = vu(sw?.transshipmentPosition);
    ws.addRow(["", "Volumen", val, unit]);
  }
  {
    const [val, unit] = vu(sw?.switchOverTime);
    ws.addRow(["", "Zeit", val, unit]);
  }
  {
    const [val, unit] = vu(sw?.switchingPressure);
    ws.addRow(["", "Einspritzdruck", val, unit]);
  }

  let activeMode = "";
  if (sw?.switchOverWay) activeMode = "Volumen";
  else if (sw?.switchOverTimeActive) activeMode = "Zeit";
  else if (sw?.switchOverHydraulic) activeMode = "Einspritzdruck";
  ws.addRow(["", "Aktive Umschaltart", activeMode]);

  formatNumericColumns(ws);
  return ws;
}

function buildHoldingPressureSheet(wb: ExcelWorkbook, hp: HoldingPressureDto): ExcelWorksheet {
  const ws = wb.addWorksheet("Nachdruck");
  ws.columns = COL_WIDTHS_DEFAULT;

  // --- Main Menu ---
  const mm: HoldingPressureMainMenuDto | undefined = hp.mainMenu;
  addHeaderRow(ws, "Hauptseite");
  ws.addRow(["", "Parameter", "Wert", "Einheit"]);
  {
    const [val, unit] = vu(mm?.holdingTime);
    ws.addRow(["", "Nachdruckzeit", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.coolTime);
    ws.addRow(["", "Kühlzeit", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.screwDiameter);
    ws.addRow(["", "Schneckendurchmesser", val, unit]);
  }
  ws.addRow([]);

  // --- Sub Menu (Holding Pressure Scroll) ---
  const sub: HoldingPressureSubMenuScrollDto | undefined = hp.subMenusValues;
  addHeaderRow(ws, "Sollwertgrafik - Spezifischer Nachdruck");
  addSubHeaderRow(ws, labelWithUnit("t", sub?.keyUnit), labelWithUnit("p", sub?.valueUnit));

  const subValues: HoldingPressureSubMenuValueDto[] = sub?.values ?? [];
  [...subValues]
    .sort((a, b) => a.index - b.index)
    .forEach((val) => {
      addScrollValueRow(ws, val.t, val.p);
    });

  formatNumericColumns(ws);
  return ws;
}

function buildDosingSheet(wb: ExcelWorkbook, dos: DosingDto): ExcelWorksheet {
  const ws = wb.addWorksheet("Dosieren");
  ws.columns = COL_WIDTHS_DEFAULT;

  // --- Main Menu ---
  const mm: DosingMainMenuDto | undefined = dos.mainMenu;
  addHeaderRow(ws, "Hauptseite");
  ws.addRow(["", "Parameter", "Wert", "Einheit"]);
  {
    const [val, unit] = vu(mm?.dosingStroke);
    ws.addRow(["", "Dosiervolumen", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.dosingDelayTime);
    ws.addRow(["", "Dosierverzögerungszeit", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.relieveDosing);
    ws.addRow(["", "Entlastung vor Dosieren", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.relieveAfterDosing);
    ws.addRow(["", "Entlastung nach Dosieren", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.dischargeSpeedBeforeDosing);
    ws.addRow(["", "Entlastungsgeschwindigkeit vor Dosieren", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.dischargeSpeedAfterDosing);
    ws.addRow(["", "Entlastungsgeschwindigkeit nach Dosieren", val, unit]);
  }
  ws.addRow([]);

  // --- Dosing Speed ---
  const speed: DosingSubMenuDosingSpeedScrollDto | undefined = dos.dosingSpeedsValues;
  addHeaderRow(ws, "Sollwertgrafik - Dosiergeschwindigkeit");
  addSubHeaderRow(ws, labelWithUnit("s", speed?.keyUnit), labelWithUnit("v", speed?.valueUnit));

  const speedValues: DosingSubMenuDosingSpeedValueDto[] = speed?.values ?? [];
  [...speedValues]
    .sort((a, b) => a.index - b.index)
    .forEach((val) => {
      addScrollValueRow(ws, val.v, val.v2);
    });
  ws.addRow([]);

  // --- Dosing Pressure ---
  const pressure: DosingSubMenuDosingPressureScrollDto | undefined = dos.dosingPressuresValues;
  addHeaderRow(ws, "Sollwertgrafik - Spezifischer Staudruck");
  addSubHeaderRow(ws, labelWithUnit("s", pressure?.keyUnit), labelWithUnit("p", pressure?.valueUnit));

  const pressureValues: DosingSubMenuDosingPressureValueDto[] = pressure?.values ?? [];
  [...pressureValues]
    .sort((a, b) => a.index - b.index)
    .forEach((val) => {
      addScrollValueRow(ws, val.v, val.v2);
    });

  formatNumericColumns(ws);
  return ws;
}

function buildCylinderHeatingSheet(wb: ExcelWorkbook, cyl: CylinderHeatingDto): ExcelWorksheet {
  const ws = wb.addWorksheet("Zylinderheizung");
  ws.columns = COL_WIDTHS_DEFAULT;

  const mm: CylinderHeatingMainMenuDto | undefined = cyl.mainMenu;
  if (!mm) {
    ws.addRow(["Keine Daten zur Zylinderheizung vorhanden"]);
    return ws;
  }

  addHeaderRow(ws, "Hauptseite");
  ws.addRow(["", "Parameter", "Wert"]);
  ws.addRow(["", "Sollwert 1", mm.setpoint1]);
  ws.addRow(["", "Sollwert 2", mm.setpoint2]);
  ws.addRow(["", "Sollwert 3", mm.setpoint3]);
  ws.addRow(["", "Sollwert 4", mm.setpoint4]);
  ws.addRow(["", "Sollwert 5", mm.setpoint5]);

  formatNumericColumns(ws);
  return ws;
}

// ---------------------------------------------------------------------------
// Add section screenshot as an embedded image to the worksheet
// ---------------------------------------------------------------------------
function addScreenshotToSheet(
  wb: ExcelWorkbook,
  ws: ExcelWorksheet,
  base64Data: string,
  label: string = "Screenshot",
) {
  // Strip data URI prefix if present
  const raw = base64Data.replace(/^data:image\/\w+;base64,/, "");

  const imageId = wb.addImage({
    base64: raw,
    extension: "jpeg",
  });

  // Insert image starting after the data rows
  const startRow = (ws.rowCount || 0) + 2;

  ws.addRow([]);
  const labelRow = ws.addRow([label]);
  labelRow.font = { bold: true, size: 12 };

  ws.addImage(imageId, {
    tl: { col: 0, row: startRow },
    ext: { width: 400, height: 530 },
  });

  // Add empty rows so the next image doesn't overlap
  for (let i = 0; i < 28; i++) ws.addRow([]);
}

/**
 * Collect all screenshots whose key starts with `sectionPrefix`.
 * Keys are "section.subMode" (e.g. "injection.mainMenu") or legacy "section".
 */
function getScreenshotsForSection(
  screenshots: Record<string, string>,
  sectionKey: ScanMenu,
): { subMode: string; base64: string }[] {
  const result: { subMode: string; base64: string }[] = [];
  const prefix = `${sectionKey}.`;

  for (const [key, value] of Object.entries(screenshots)) {
    if (key === sectionKey) {
      // Legacy key without sub-mode
      result.push({ subMode: "", base64: value });
    } else if (key.startsWith(prefix)) {
      result.push({ subMode: key.slice(prefix.length), base64: value });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export const handleLocalExcelDownload = async (
  scanId: number,
  fullScans: FullScanDto[],
) => {
  try {
    const scan = fullScans?.find((fs) => fs.id === scanId);
    if (!scan) {
      Alert.alert("Excel (local)", "Scan not found!");
      return;
    }

    // Lazy-load ExcelJS & Buffer only when export is actually triggered
    await init();

    const wb = new (getExcelJS().Workbook)();
    wb.creator = "ParaLens";
    wb.created = new Date();
    wb.modified = new Date();

    const screenshots = scan.sectionScreenshots ?? {};

    // Build a worksheet per section using the typed DTO properties directly
    const sectionBuilders: { key: ScanMenu; data: unknown; build: () => ExcelWorksheet }[] = [
      { key: "injection", data: scan.injection, build: () => buildInjectionSheet(wb, scan.injection!) },
      { key: "holdingPressure", data: scan.holdingPressure, build: () => buildHoldingPressureSheet(wb, scan.holdingPressure!) },
      { key: "dosing", data: scan.dosing, build: () => buildDosingSheet(wb, scan.dosing!) },
      { key: "cylinderHeating", data: scan.cylinderHeating, build: () => buildCylinderHeatingSheet(wb, scan.cylinderHeating!) },
    ];

    for (const { key, data, build } of sectionBuilders) {
      if (!data) continue;

      const ws = build();

      // Embed all sub-mode screenshots for this section
      const sectionScreenshots = getScreenshotsForSection(screenshots, key);
      for (const { subMode, base64 } of sectionScreenshots) {
        const label = subMode ? `Screenshot – ${subMode}` : "Screenshot";
        addScreenshotToSheet(wb, ws, base64, label);
      }
    }

    // If no sheets were added (no data at all), add a placeholder
    if (wb.worksheets.length === 0) {
      const ws = wb.addWorksheet("Info");
      ws.addRow(["No scan data available for this scan."]);
    }

    const fileName = `ParaLens_Export_${scanId}.xlsx`;

    // Write workbook to buffer
    const buffer = await wb.xlsx.writeBuffer();
    const nodeBuffer = NodeBuffer.from(buffer);
    const bufferStr = nodeBuffer.toString("base64");

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      Alert.alert("Export failed", "Cache directory is not available");
      return;
    }

    const fileUri = cacheDir + fileName;

    await FileSystem.writeAsStringAsync(fileUri, bufferStr, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Ask user what they want to do with the file
    Alert.alert(
      "Excel File Ready",
      "What would you like to do with the file?",
      [
        {
          text: "Share",
          onPress: async () => {
            try {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                  mimeType:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                  UTI: "com.microsoft.excel.xlsx",
                });
              } else {
                Alert.alert(
                  "Share Unavailable",
                  "Sharing is not available on this device.",
                );
              }
            } catch (shareError: any) {
              Alert.alert(
                "Share failed",
                shareError?.message || "Could not share the file.",
              );
            }
          },
        },
        {
          text: "Save to Downloads",
          onPress: async () => {
            try {
              if (Platform.OS === "android") {
                const androidVersion = Platform.Version as number;
                let hasPermission = true;

                if (androidVersion < 33) {
                  const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                      title: "Storage Permission",
                      message:
                        "This app needs access to storage to save the file.",
                      buttonNeutral: "Ask Me Later",
                      buttonNegative: "Cancel",
                      buttonPositive: "OK",
                    },
                  );
                  hasPermission =
                    granted === PermissionsAndroid.RESULTS.GRANTED;
                }

                if (!hasPermission) {
                  Alert.alert(
                    "Permission Denied",
                    "Storage permission is required to save the file.",
                  );
                  return;
                }

                const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

                try {
                  const sourceExists = await RNFS.exists(fileUri);
                  if (!sourceExists) {
                    Alert.alert(
                      "Error",
                      "Source file not found. Please try again.",
                    );
                    return;
                  }

                  const fileContent = await RNFS.readFile(fileUri, "base64");
                  await RNFS.writeFile(downloadPath, fileContent, "base64");

                  const fileExists = await RNFS.exists(downloadPath);
                  if (!fileExists) {
                    Alert.alert(
                      "Error",
                      "Failed to save file. Please check storage permissions.",
                    );
                    return;
                  }
                } catch (writeError: any) {
                  console.warn("Direct write failed, trying copy:", writeError);
                  const sourceExists = await RNFS.exists(fileUri);
                  if (!sourceExists) {
                    Alert.alert(
                      "Error",
                      "Source file not found. Please try again.",
                    );
                    return;
                  }
                  await RNFS.copyFile(fileUri, downloadPath);
                }

                try {
                  await RNFS.scanFile(downloadPath);
                } catch (scanError) {
                  console.warn("Failed to scan file:", scanError);
                }

                Alert.alert(
                  "File Saved",
                  `Excel file saved to Downloads:\n${downloadPath}`,
                );
              } else {
                // iOS – just share (save to Files via share sheet)
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType:
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    UTI: "com.microsoft.excel.xlsx",
                  });
                } else {
                  Alert.alert("File Saved", `Excel file saved to:\n${fileUri}`);
                }
              }
            } catch (saveError: any) {
              Alert.alert(
                "Save failed",
                saveError?.message ||
                  "Could not save the file to downloads.",
              );
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  } catch (e: any) {
    Alert.alert("Export failed", e?.message ?? String(e));
  }
};
