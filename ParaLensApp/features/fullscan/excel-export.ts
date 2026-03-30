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

/** Extract value + unit from a ValueUnit field into two cell entries */
function vu(field: ValueUnit | undefined): [value: number | string, unit: string] {
  if (!field) return ["", ""];
  return [field.value ?? "", field.unit ?? ""];
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

// ---------------------------------------------------------------------------
// Build worksheets – fully typed, no `as any`
// ---------------------------------------------------------------------------

function buildInjectionSheet(wb: ExcelWorkbook, inj: InjectionDto): ExcelWorksheet {
  const ws = wb.addWorksheet("Injection");
  ws.columns = COL_WIDTHS_DEFAULT;

  // --- Main Menu ---
  const mm: InjectionMainMenuDto | undefined = inj.mainMenu;
  addHeaderRow(ws, "Main Menu");
  ws.addRow(["", "Parameter", "Value", "Unit"]);
  {
    const [val, unit] = vu(mm?.sprayPressureLimit);
    ws.addRow(["", "Spray Pressure Limit", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.increasedSpecificPointPrinter);
    ws.addRow(["", "Increased Specific Point Printer", val, unit]);
  }
  ws.addRow([]);

  // --- Sub Menu (Injection Speed Scroll) ---
  const sub: InjectionSubMenuScrollDto | undefined = inj.subMenuValues;
  addHeaderRow(ws, "Sub Menu – Injection Speed");
  addSubHeaderRow(ws, sub?.keyUnit ?? "v", sub?.valueUnit ?? "v2");

  const subValues: InjectionSubMenuValueDto[] = sub?.values ?? [];
  [...subValues]
    .sort((a, b) => a.index - b.index)
    .forEach((val) => {
      ws.addRow(["", val.v, val.v2]);
    });
  ws.addRow([]);

  // --- Switch Type ---
  const sw: InjectionSubMenuSwitchTypeDto | undefined = inj.switchType;
  addHeaderRow(ws, "Switch Over");
  ws.addRow(["", "Parameter", "Value", "Unit"]);
  {
    const [val, unit] = vu(sw?.transshipmentPosition);
    ws.addRow(["", "Way (Transshipment Position)", val, unit]);
  }
  {
    const [val, unit] = vu(sw?.switchOverTime);
    ws.addRow(["", "Time", val, unit]);
  }
  {
    const [val, unit] = vu(sw?.switchingPressure);
    ws.addRow(["", "Hydraulic Pressure", val, unit]);
  }

  let activeMode = "";
  if (sw?.switchOverWay) activeMode = "Way";
  else if (sw?.switchOverTimeActive) activeMode = "Time";
  else if (sw?.switchOverHydraulic) activeMode = "Hydraulic Pressure";
  ws.addRow(["", "Active Switch Over Mode", activeMode]);

  return ws;
}

function buildHoldingPressureSheet(wb: ExcelWorkbook, hp: HoldingPressureDto): ExcelWorksheet {
  const ws = wb.addWorksheet("Holding Pressure");
  ws.columns = COL_WIDTHS_DEFAULT;

  // --- Main Menu ---
  const mm: HoldingPressureMainMenuDto | undefined = hp.mainMenu;
  addHeaderRow(ws, "Main Menu");
  ws.addRow(["", "Parameter", "Value", "Unit"]);
  {
    const [val, unit] = vu(mm?.holdingTime);
    ws.addRow(["", "Holding Time", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.coolTime);
    ws.addRow(["", "Cool Time", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.screwDiameter);
    ws.addRow(["", "Screw Diameter", val, unit]);
  }
  ws.addRow([]);

  // --- Sub Menu (Holding Pressure Scroll) ---
  const sub: HoldingPressureSubMenuScrollDto | undefined = hp.subMenusValues;
  addHeaderRow(ws, "Sub Menu – Holding Pressure");
  addSubHeaderRow(ws, sub?.keyUnit ?? "t", sub?.valueUnit ?? "p");

  const subValues: HoldingPressureSubMenuValueDto[] = sub?.values ?? [];
  [...subValues]
    .sort((a, b) => a.index - b.index)
    .forEach((val) => {
      ws.addRow(["", val.t, val.p]);
    });

  return ws;
}

function buildDosingSheet(wb: ExcelWorkbook, dos: DosingDto): ExcelWorksheet {
  const ws = wb.addWorksheet("Dosing");
  ws.columns = COL_WIDTHS_DEFAULT;

  // --- Main Menu ---
  const mm: DosingMainMenuDto | undefined = dos.mainMenu;
  addHeaderRow(ws, "Main Menu");
  ws.addRow(["", "Parameter", "Value", "Unit"]);
  {
    const [val, unit] = vu(mm?.dosingStroke);
    ws.addRow(["", "Dosing Stroke", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.dosingDelayTime);
    ws.addRow(["", "Dosing Delay Time", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.relieveDosing);
    ws.addRow(["", "Relieve Dosing", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.relieveAfterDosing);
    ws.addRow(["", "Relieve After Dosing", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.dischargeSpeedBeforeDosing);
    ws.addRow(["", "Discharge Speed Before Dosing", val, unit]);
  }
  {
    const [val, unit] = vu(mm?.dischargeSpeedAfterDosing);
    ws.addRow(["", "Discharge Speed After Dosing", val, unit]);
  }
  ws.addRow([]);

  // --- Dosing Speed ---
  const speed: DosingSubMenuDosingSpeedScrollDto | undefined = dos.dosingSpeedsValues;
  addHeaderRow(ws, "Sub Menu – Dosing Speed");
  addSubHeaderRow(ws, speed?.keyUnit ?? "v", speed?.valueUnit ?? "v2");

  const speedValues: DosingSubMenuDosingSpeedValueDto[] = speed?.values ?? [];
  [...speedValues]
    .sort((a, b) => a.index - b.index)
    .forEach((val) => {
      ws.addRow(["", val.v, val.v2]);
    });
  ws.addRow([]);

  // --- Dosing Pressure ---
  const pressure: DosingSubMenuDosingPressureScrollDto | undefined = dos.dosingPressuresValues;
  addHeaderRow(ws, "Sub Menu – Dosing Pressure");
  addSubHeaderRow(ws, pressure?.keyUnit ?? "v", pressure?.valueUnit ?? "p");

  const pressureValues: DosingSubMenuDosingPressureValueDto[] = pressure?.values ?? [];
  [...pressureValues]
    .sort((a, b) => a.index - b.index)
    .forEach((val) => {
      ws.addRow(["", val.v, val.v2]);
    });

  return ws;
}

function buildCylinderHeatingSheet(wb: ExcelWorkbook, cyl: CylinderHeatingDto): ExcelWorksheet {
  const ws = wb.addWorksheet("Cylinder Heating");
  ws.columns = COL_WIDTHS_DEFAULT;

  const mm: CylinderHeatingMainMenuDto | undefined = cyl.mainMenu;
  if (!mm) {
    ws.addRow(["No cylinder heating data"]);
    return ws;
  }

  addHeaderRow(ws, "Main Menu");
  ws.addRow(["", "Parameter", "Value"]);
  ws.addRow(["", "Setpoint 1", mm.setpoint1]);
  ws.addRow(["", "Setpoint 2", mm.setpoint2]);
  ws.addRow(["", "Setpoint 3", mm.setpoint3]);
  ws.addRow(["", "Setpoint 4", mm.setpoint4]);
  ws.addRow(["", "Setpoint 5", mm.setpoint5]);

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
