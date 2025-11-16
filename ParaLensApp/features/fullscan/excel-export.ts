import ExcelJS from "exceljs";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Buffer } from "buffer";
import { Alert, Platform } from "react-native";
import {writeAsStringAsync} from "expo-file-system";

const merge = (ws: ExcelJS.Worksheet, range: string) => ws.mergeCells(range);
const center = (c: ExcelJS.Cell) => {
    c.alignment = { vertical: "middle", horizontal: "center" };
    return c;
};
const set = (ws: ExcelJS.Worksheet, addr: string, v: any) => {
    ws.getCell(addr).value = v ?? null;
    return ws.getCell(addr);
};
const insertEmptyRows = (ws: ExcelJS.Worksheet, startRow: number, count: number) => {
    if (count > 0) {
        // spliceRows(index, deleteCount, ...rows)
        ws.spliceRows(startRow, 0, ...Array(count).fill([]));
    }
};

export const handleLocalExcelDownload = async (scanId: number, fullScans: any[]) => {
    try {
        const scan = fullScans?.find((fs: any) => fs.id === scanId);
        if (!scan) {
            Alert.alert("Excel (local)", "Scan not found!");
            return;
        }

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Parameters");

        // --- Column widths (match backend) ---
        ws.getColumn(1).width = 20; // Category
        ws.getColumn(2).width = 20; // Menu
        ws.getColumn(3).width = 35; // Parameter
        ws.getColumn(4).width = 12; // Unit 1
        ws.getColumn(5).width = 12; // Unit 2

        // ========================
        // Injection (static labels)
        // ========================
        set(ws, "A2", "Injection"); merge(ws, "A2:A8"); center(ws.getCell("A2"));
        set(ws, "B2", "Mainpage"); merge(ws, "B2:B3"); center(ws.getCell("B2"));
        set(ws, "C2", "Injection Pressure"); set(ws, "D2", "bar");
        set(ws, "C3", "IsIncreasedSpecificPressure"); set(ws, "D3", "bool");

        set(ws, "C4", "Injection Speed"); set(ws, "D4", "cm^3/s"); set(ws, "E4", "cm^3");
        set(ws, "B4", "Undermenu"); merge(ws, "B4:B5"); center(ws.getCell("B4"));
        set(ws, "C5", "Actual Value (List)");

        set(ws, "C6", "Way"); set(ws, "D6", "mm");
        set(ws, "B6", "Switch Over"); merge(ws, "B6:B8"); center(ws.getCell("B6"));
        set(ws, "C7", "Time"); set(ws, "D7", "s");
        set(ws, "C8", "Hydraulic Pressure"); set(ws, "D8", "bar");

        // ========================
        // Holding Pressure (static)
        // ========================
        set(ws, "A10", "Holding Pressure"); merge(ws, "A10:A14"); center(ws.getCell("A10"));
        set(ws, "B10", "Mainpage"); merge(ws, "B10:B12"); center(ws.getCell("B10"));
        set(ws, "C10", "ReprintTime"); set(ws, "D10", "s");
        set(ws, "C11", "CoolTime"); set(ws, "D11", "s");
        set(ws, "C12", "ScrewDiameter"); set(ws, "D12", "mm");

        set(ws, "C13", "Holding Pressure"); set(ws, "D13", "t"); set(ws, "E13", "p");
        set(ws, "B13", "Undermenu"); merge(ws, "B13:B14"); center(ws.getCell("B13"));
        set(ws, "C14", "Actual Value (List)");

        // ========================
        // Dosing (static)
        // ========================
        set(ws, "A16", "Dosing"); merge(ws, "A16:A25"); center(ws.getCell("A16"));
        set(ws, "B16", "Mainpage"); merge(ws, "B16:B21"); center(ws.getCell("B16"));

        set(ws, "C16", "DosingStroke"); set(ws, "D16", "mm");
        set(ws, "C17", "DosingDelayTime"); set(ws, "D17", "s");
        set(ws, "C18", "RelieveDosing"); set(ws, "D18", "bar");
        set(ws, "C19", "RelieveAfterDosing"); set(ws, "D19", "bar");
        set(ws, "C20", "DischargeSpeedBeforeDosing"); set(ws, "D20", "cm^3/s");
        set(ws, "C21", "DischargeSpeedAfterDosing"); set(ws, "D21", "cm^3/s");

        set(ws, "B22", "Undermenu"); merge(ws, "B22:B24"); center(ws.getCell("B22"));
        set(ws, "C22", "DosingSpeed"); set(ws, "D22", "V"); set(ws, "E22", "v");
        set(ws, "C23", "Actual Value (List)");
        set(ws, "C24", "DosingPressure"); set(ws, "D24", "V"); set(ws, "E24", "p");

        // ========================
        // Cylinder Heating (static)
        // ========================
        set(ws, "A29", "Cylinder Heating"); merge(ws, "A29:A33"); center(ws.getCell("A29"));
        set(ws, "B29", "Mainpage"); merge(ws, "B29:B33"); center(ws.getCell("B29"));
        set(ws, "C29", "Sollwert1"); set(ws, "D29", "°C");
        set(ws, "C30", "Sollwert2"); set(ws, "D30", "°C");
        set(ws, "C31", "Sollwert3"); set(ws, "D31", "°C");
        set(ws, "C32", "Sollwert4"); set(ws, "D32", "°C");
        set(ws, "C33", "Sollwert5"); set(ws, "D33", "°C");

        // ========================
        // Dynamic inserts (match backend logic)
        // ========================
        const valuesStartCol = 6; // F

        const injHeaderRow = 5;             // C5: Actual Value (List)
        const hpHeaderRow = 14;             // C14: Actual Value (List)
        const dosingSpeedHeaderRow = 23;    // C23
        const dosingPressureHeaderRow = 24; // C24

        const injCount = scan?.Injection?.SubMenuValues?.Values?.length ?? 0;
        const hpCount = scan?.HoldingPressure?.SubMenusValues?.Values?.length ?? 0;
        const dosingSpeedCount = scan?.Dosing?.DosingSpeedsValues?.Values?.length ?? 0;
        const dosingPressureCount = scan?.Dosing?.DosingPressuresValues?.Values?.length ?? 0;

        // Insert rows under headers to push the sections down like the backend
        insertEmptyRows(ws, injHeaderRow + 1, injCount);
        insertEmptyRows(ws, hpHeaderRow + 1 + injCount, hpCount);
        insertEmptyRows(ws, dosingSpeedHeaderRow + 1 + injCount + hpCount, dosingSpeedCount);
        insertEmptyRows(ws, dosingPressureHeaderRow + 1 + injCount + hpCount + dosingSpeedCount, dosingPressureCount);

        // Compute dynamic row positions after insertions
        const injListStartRow = injHeaderRow + 1;
        const injWayRow = 6 + injCount;
        const injTimeRow = 7 + injCount;
        const injHydRow = 8 + injCount;

        const hpListStartRow = hpHeaderRow + 1 + injCount;
        const hpMainStartRow = 10 + injCount;

        const dosingMainStartRow = 16 + injCount + hpCount;
        const dosingSpeedListStartRow = dosingSpeedHeaderRow + 1 + injCount + hpCount;
        const dosingPressureListStartRow = dosingPressureHeaderRow + 1 + injCount + hpCount + dosingSpeedCount;

        const cylStartRow = 29 + injCount + hpCount + dosingSpeedCount + dosingPressureCount;

        // ========================
        // Populate scalar values (column F)
        // ========================
        if (scan?.Injection?.MainMenu) {
            ws.getRow(2).getCell(valuesStartCol).value = scan.Injection.MainMenu.SprayPressureLimit ?? null; // F2
            ws.getRow(3).getCell(valuesStartCol).value = scan.Injection.MainMenu.IncreasedSpecificPointPrinter ?? null; // F3
        }

        if (scan?.Injection?.SwitchType) {
            ws.getRow(injWayRow).getCell(valuesStartCol).value = scan.Injection.SwitchType.TransshipmentPosition ?? null;
            ws.getRow(injTimeRow).getCell(valuesStartCol).value = scan.Injection.SwitchType.SwitchOverTime ?? null;
            ws.getRow(injHydRow).getCell(valuesStartCol).value = scan.Injection.SwitchType.SwitchingPressure ?? null;
        }

        if (scan?.HoldingPressure?.MainMenu) {
            ws.getRow(hpMainStartRow + 0).getCell(valuesStartCol).value = scan.HoldingPressure.MainMenu.HoldingTime ?? null;
            ws.getRow(hpMainStartRow + 1).getCell(valuesStartCol).value = scan.HoldingPressure.MainMenu.CoolTime ?? null;
            ws.getRow(hpMainStartRow + 2).getCell(valuesStartCol).value = scan.HoldingPressure.MainMenu.ScrewDiameter ?? null;
        }

        if (scan?.Dosing?.MainMenu) {
            ws.getRow(dosingMainStartRow + 0).getCell(valuesStartCol).value = scan.Dosing.MainMenu.DosingStroke ?? null;
            ws.getRow(dosingMainStartRow + 1).getCell(valuesStartCol).value = scan.Dosing.MainMenu.DosingDelayTime ?? null;
            ws.getRow(dosingMainStartRow + 2).getCell(valuesStartCol).value = scan.Dosing.MainMenu.RelieveDosing ?? null;
            ws.getRow(dosingMainStartRow + 3).getCell(valuesStartCol).value = scan.Dosing.MainMenu.RelieveAfterDosing ?? null;
            ws.getRow(dosingMainStartRow + 4).getCell(valuesStartCol).value = scan.Dosing.MainMenu.DischargeSpeedBeforeDosing ?? null;
            ws.getRow(dosingMainStartRow + 5).getCell(valuesStartCol).value = scan.Dosing.MainMenu.DischargeSpeedAfterDosing ?? null;
        }

        if (scan?.CylinderHeating?.MainMenu) {
            ws.getRow(cylStartRow + 0).getCell(valuesStartCol).value = scan.CylinderHeating.MainMenu.Setpoint1 ?? null;
            ws.getRow(cylStartRow + 1).getCell(valuesStartCol).value = scan.CylinderHeating.MainMenu.Setpoint2 ?? null;
            ws.getRow(cylStartRow + 2).getCell(valuesStartCol).value = scan.CylinderHeating.MainMenu.Setpoint3 ?? null;
            ws.getRow(cylStartRow + 3).getCell(valuesStartCol).value = scan.CylinderHeating.MainMenu.Setpoint4 ?? null;
            ws.getRow(cylStartRow + 4).getCell(valuesStartCol).value = scan.CylinderHeating.MainMenu.Setpoint5 ?? null;
        }

        // ========================
        // Populate lists (columns D/E) with ordering by Index
        // ========================
        if (injCount > 0) {
            let r = injListStartRow;
            [...scan.Injection.SubMenuValues.Values].sort((a: any, b: any) => a.Index - b.Index)
                .forEach((v: any) => {
                    ws.getRow(r).getCell(4).value = v.V ?? null;   // D
                    ws.getRow(r).getCell(5).value = v.V2 ?? null;  // E
                    r++;
                });
        }

        if (hpCount > 0) {
            let r = hpListStartRow;
            [...scan.HoldingPressure.SubMenusValues.Values].sort((a: any, b: any) => a.Index - b.Index)
                .forEach((v: any) => {
                    ws.getRow(r).getCell(4).value = v.T ?? null;   // D
                    ws.getRow(r).getCell(5).value = v.P ?? null;   // E
                    r++;
                });
        }

        if (dosingSpeedCount > 0) {
            let r = dosingSpeedListStartRow;
            [...scan.Dosing.DosingSpeedsValues.Values].sort((a: any, b: any) => a.Index - b.Index)
                .forEach((v: any) => {
                    ws.getRow(r).getCell(4).value = v.V ?? null;   // D
                    ws.getRow(r).getCell(5).value = v.V2 ?? null;  // E
                    r++;
                });
        }

        if (dosingPressureCount > 0) {
            let r = dosingPressureListStartRow;
            [...scan.Dosing.DosingPressuresValues.Values].sort((a: any, b: any) => a.Index - b.Index)
                .forEach((v: any) => {
                    ws.getRow(r).getCell(4).value = v.V ?? null;   // D
                    ws.getRow(r).getCell(5).value = v.P ?? null;   // E
                    r++;
                });
        }

        // ========================
        // Thin borders & vertical align center (sheet-wide)
        // ========================
        const dim = ws.dimensions; // { top, left, bottom, right }
        for (let r = dim.top; r <= dim.bottom; r++) {
            for (let c = dim.left; c <= dim.right; c++) {
                const cell = ws.getRow(r).getCell(c);
                cell.alignment = { ...(cell.alignment ?? {}), vertical: "middle" };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                    bottom: { style: "thin" },
                };
            }
        }

        const fileName = `ParaLens_Export_${scanId}.xlsx`;

        const FS = FileSystem as unknown as {
            documentDirectory?: string | null;
            cacheDirectory?: string | null;
            writeAsStringAsync: typeof FileSystem.writeAsStringAsync;
        };

        const baseDir = FS.documentDirectory ?? FS.cacheDirectory!;
        const fileUri = baseDir + fileName;

        const buf = await wb.xlsx.writeBuffer();
        const base64 = Buffer.from(buf).toString("base64");

        await writeAsStringAsync(fileUri, base64, { encoding: "base64" as any });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        } else {
            Alert.alert("Excel exported!", `Saved to:\n${fileUri}`);
        }
    } catch (e: any) {
        Alert.alert("Export failed", e?.message ?? String(e));
    }
};
