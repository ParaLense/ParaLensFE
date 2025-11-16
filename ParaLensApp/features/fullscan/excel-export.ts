import ExcelJS from "exceljs";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { PermissionsAndroid } from "react-native";

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
        // Calculate counts and row positions FIRST
        // ========================
        const valuesStartCol = 6; // F

        const injHeaderRow = 5;             // C5: Actual Value (List)
        const hpHeaderRow = 14;             // C14: Actual Value (List)
        const dosingSpeedHeaderRow = 23;    // C23
        const dosingPressureHeaderRow = 24; // C24

        // Handle both camelCase (local) and PascalCase (server) property names
        const injection = scan?.injection || scan?.Injection;
        const holdingPressure = scan?.holdingPressure || scan?.HoldingPressure;
        const dosing = scan?.dosing || scan?.Dosing;
        const cylinderHeating = scan?.cylinderHeating || scan?.CylinderHeating;

        const injCount = injection?.subMenuValues?.values?.length || injection?.SubMenuValues?.Values?.length || 0;
        const hpCount = holdingPressure?.subMenusValues?.values?.length || holdingPressure?.SubMenusValues?.Values?.length || 0;
        const dosingSpeedCount = dosing?.dosingSpeedsValues?.values?.length || dosing?.DosingSpeedsValues?.Values?.length || 0;
        const dosingPressureCount = dosing?.dosingPressuresValues?.values?.length || dosing?.DosingPressuresValues?.Values?.length || 0;

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
        const hpUndermenuStartRow = 13 + injCount;
        const hpHeaderRowAfter = hpHeaderRow + injCount;

        const dosingMainStartRow = 16 + injCount + hpCount;
        const dosingUndermenuStartRow = 22 + injCount + hpCount;
        const dosingSpeedListStartRow = dosingSpeedHeaderRow + 1 + injCount + hpCount;
        const dosingPressureHeaderRowAdjusted = dosingPressureHeaderRow + injCount + hpCount + dosingSpeedCount;
        const dosingPressureListStartRow = dosingPressureHeaderRowAdjusted + 1;

        const cylStartRow = 29 + injCount + hpCount + dosingSpeedCount + dosingPressureCount;
        const cylEndRow = cylStartRow + 4; // 5 rows total (rows 0-4)

        // ========================
        // Now set all labels and merges with correct row numbers
        // ========================
        
        // Injection section
        const injEndRow = 8 + injCount;
        set(ws, "A2", "Injection"); merge(ws, `A2:A${injEndRow}`); center(ws.getCell("A2"));
        set(ws, "B2", "Mainpage"); merge(ws, "B2:B3"); center(ws.getCell("B2"));
        set(ws, "C2", "Injection Pressure"); set(ws, "D2", "bar");
        set(ws, "C3", "IsIncreasedSpecificPressure"); set(ws, "D3", "bool");

        set(ws, "C4", "Injection Speed"); set(ws, "D4", "cm^3/s"); set(ws, "E4", "cm^3");
        set(ws, "B4", "Undermenu"); merge(ws, `B4:B${injHeaderRow}`); center(ws.getCell("B4"));
        set(ws, "C5", "Actual Value (List)");

        set(ws, "B6", "Switch Over"); merge(ws, `B6:B${injEndRow}`); center(ws.getCell("B6"));
        set(ws, `C${injWayRow}`, "Way"); set(ws, `D${injWayRow}`, "mm");
        set(ws, `C${injTimeRow}`, "Time"); set(ws, `D${injTimeRow}`, "s");
        set(ws, `C${injHydRow}`, "Hydraulic Pressure"); set(ws, `D${injHydRow}`, "bar");

        // Holding Pressure section
        const hpEndRow = 14 + injCount + hpCount;
        set(ws, `A${hpMainStartRow}`, "Holding Pressure"); merge(ws, `A${hpMainStartRow}:A${hpEndRow}`); center(ws.getCell(`A${hpMainStartRow}`));
        set(ws, `B${hpMainStartRow}`, "Mainpage"); merge(ws, `B${hpMainStartRow}:B${hpMainStartRow + 2}`); center(ws.getCell(`B${hpMainStartRow}`));
        set(ws, `C${hpMainStartRow}`, "ReprintTime"); set(ws, `D${hpMainStartRow}`, "s");
        set(ws, `C${hpMainStartRow + 1}`, "CoolTime"); set(ws, `D${hpMainStartRow + 1}`, "s");
        set(ws, `C${hpMainStartRow + 2}`, "ScrewDiameter"); set(ws, `D${hpMainStartRow + 2}`, "mm");

        set(ws, `C${hpUndermenuStartRow}`, "Holding Pressure"); set(ws, `D${hpUndermenuStartRow}`, "t"); set(ws, `E${hpUndermenuStartRow}`, "p");
        set(ws, `B${hpUndermenuStartRow}`, "Undermenu"); merge(ws, `B${hpUndermenuStartRow}:B${hpHeaderRowAfter}`); center(ws.getCell(`B${hpUndermenuStartRow}`));
        set(ws, `C${hpHeaderRowAfter}`, "Actual Value (List)");

        // Dosing section
        // Calculate end row for dosing section (dosingPressureHeaderRowAdjusted is already calculated above)
        const dosingPressureEndRow = dosingPressureHeaderRowAdjusted + dosingPressureCount;
        const dosingEndRow = dosingPressureEndRow;
        
        set(ws, `A${dosingMainStartRow}`, "Dosing"); merge(ws, `A${dosingMainStartRow}:A${dosingEndRow}`); center(ws.getCell(`A${dosingMainStartRow}`));
        set(ws, `B${dosingMainStartRow}`, "Mainpage"); merge(ws, `B${dosingMainStartRow}:B${dosingMainStartRow + 5}`); center(ws.getCell(`B${dosingMainStartRow}`));

        set(ws, `C${dosingMainStartRow}`, "DosingStroke"); set(ws, `D${dosingMainStartRow}`, "mm");
        set(ws, `C${dosingMainStartRow + 1}`, "DosingDelayTime"); set(ws, `D${dosingMainStartRow + 1}`, "s");
        set(ws, `C${dosingMainStartRow + 2}`, "RelieveDosing"); set(ws, `D${dosingMainStartRow + 2}`, "bar");
        set(ws, `C${dosingMainStartRow + 3}`, "RelieveAfterDosing"); set(ws, `D${dosingMainStartRow + 3}`, "bar");
        set(ws, `C${dosingMainStartRow + 4}`, "DischargeSpeedBeforeDosing"); set(ws, `D${dosingMainStartRow + 4}`, "cm^3/s");
        set(ws, `C${dosingMainStartRow + 5}`, "DischargeSpeedAfterDosing"); set(ws, `D${dosingMainStartRow + 5}`, "cm^3/s");

        // Dosing Speed section
        set(ws, `B${dosingUndermenuStartRow}`, "Undermenu"); 
        set(ws, `C${dosingUndermenuStartRow}`, "DosingSpeed"); set(ws, `D${dosingUndermenuStartRow}`, "V"); set(ws, `E${dosingUndermenuStartRow}`, "v");
        set(ws, `C${dosingSpeedHeaderRow + injCount + hpCount}`, "Actual Value (List)");
        
        // Dosing Pressure section - positioned after dosing speeds
        set(ws, `C${dosingPressureHeaderRowAdjusted}`, "DosingPressure"); set(ws, `D${dosingPressureHeaderRowAdjusted}`, "V"); set(ws, `E${dosingPressureHeaderRowAdjusted}`, "p");
        
        // Merge Undermenu to include both dosing speed and dosing pressure sections
        merge(ws, `B${dosingUndermenuStartRow}:B${dosingPressureEndRow}`);
        center(ws.getCell(`B${dosingUndermenuStartRow}`));

        // Cylinder Heating section
        set(ws, `A${cylStartRow}`, "Cylinder Heating"); merge(ws, `A${cylStartRow}:A${cylEndRow}`); center(ws.getCell(`A${cylStartRow}`));
        set(ws, `B${cylStartRow}`, "Mainpage"); merge(ws, `B${cylStartRow}:B${cylEndRow}`); center(ws.getCell(`B${cylStartRow}`));
        set(ws, `C${cylStartRow}`, "Sollwert1"); set(ws, `D${cylStartRow}`, "°C");
        set(ws, `C${cylStartRow + 1}`, "Sollwert2"); set(ws, `D${cylStartRow + 1}`, "°C");
        set(ws, `C${cylStartRow + 2}`, "Sollwert3"); set(ws, `D${cylStartRow + 2}`, "°C");
        set(ws, `C${cylStartRow + 3}`, "Sollwert4"); set(ws, `D${cylStartRow + 3}`, "°C");
        set(ws, `C${cylStartRow + 4}`, "Sollwert5"); set(ws, `D${cylStartRow + 4}`, "°C");

        // ========================
        // Populate scalar values (column F)
        // ========================
        const injMainMenu = injection?.mainMenu || injection?.MainMenu;
        const injSwitchType = injection?.switchType || injection?.SwitchType;
        const hpMainMenu = holdingPressure?.mainMenu || holdingPressure?.MainMenu;
        const dosingMainMenu = dosing?.mainMenu || dosing?.MainMenu;
        // CylinderHeating might have mainMenu nested, or the setpoint values directly on the object
        const cylMainMenu = cylinderHeating?.mainMenu || cylinderHeating?.MainMenu || 
            (cylinderHeating && (cylinderHeating.setpoint1 !== undefined || cylinderHeating.Setpoint1 !== undefined) ? cylinderHeating : null);

        if (injMainMenu) {
            ws.getRow(2).getCell(valuesStartCol).value = injMainMenu.sprayPressureLimit ?? injMainMenu.SprayPressureLimit ?? null; // F2
            ws.getRow(3).getCell(valuesStartCol).value = injMainMenu.increasedSpecificPointPrinter ?? injMainMenu.IncreasedSpecificPointPrinter ?? null; // F3
        }

        if (injSwitchType) {
            ws.getRow(injWayRow).getCell(valuesStartCol).value = injSwitchType.transshipmentPosition ?? injSwitchType.TransshipmentPosition ?? null;
            ws.getRow(injTimeRow).getCell(valuesStartCol).value = injSwitchType.switchOverTime ?? injSwitchType.SwitchOverTime ?? null;
            ws.getRow(injHydRow).getCell(valuesStartCol).value = injSwitchType.switchingPressure ?? injSwitchType.SwitchingPressure ?? null;
        }

        if (hpMainMenu) {
            ws.getRow(hpMainStartRow + 0).getCell(valuesStartCol).value = hpMainMenu.holdingTime ?? hpMainMenu.HoldingTime ?? null;
            ws.getRow(hpMainStartRow + 1).getCell(valuesStartCol).value = hpMainMenu.coolTime ?? hpMainMenu.CoolTime ?? null;
            ws.getRow(hpMainStartRow + 2).getCell(valuesStartCol).value = hpMainMenu.screwDiameter ?? hpMainMenu.ScrewDiameter ?? null;
        }

        if (dosingMainMenu) {
            ws.getRow(dosingMainStartRow + 0).getCell(valuesStartCol).value = dosingMainMenu.dosingStroke ?? dosingMainMenu.DosingStroke ?? null;
            ws.getRow(dosingMainStartRow + 1).getCell(valuesStartCol).value = dosingMainMenu.dosingDelayTime ?? dosingMainMenu.DosingDelayTime ?? null;
            ws.getRow(dosingMainStartRow + 2).getCell(valuesStartCol).value = dosingMainMenu.relieveDosing ?? dosingMainMenu.RelieveDosing ?? null;
            ws.getRow(dosingMainStartRow + 3).getCell(valuesStartCol).value = dosingMainMenu.relieveAfterDosing ?? dosingMainMenu.RelieveAfterDosing ?? null;
            ws.getRow(dosingMainStartRow + 4).getCell(valuesStartCol).value = dosingMainMenu.dischargeSpeedBeforeDosing ?? dosingMainMenu.DischargeSpeedBeforeDosing ?? null;
            ws.getRow(dosingMainStartRow + 5).getCell(valuesStartCol).value = dosingMainMenu.dischargeSpeedAfterDosing ?? dosingMainMenu.DischargeSpeedAfterDosing ?? null;
        }

        if (cylMainMenu) {
            // Handle both camelCase and PascalCase, and also handle 0 as a valid value
            const getSetpoint = (obj: any, num: number) => {
                const camelKey = `setpoint${num}`;
                const pascalKey = `Setpoint${num}`;
                return obj[camelKey] !== undefined ? obj[camelKey] : (obj[pascalKey] !== undefined ? obj[pascalKey] : null);
            };
            
            ws.getRow(cylStartRow + 0).getCell(valuesStartCol).value = getSetpoint(cylMainMenu, 1);
            ws.getRow(cylStartRow + 1).getCell(valuesStartCol).value = getSetpoint(cylMainMenu, 2);
            ws.getRow(cylStartRow + 2).getCell(valuesStartCol).value = getSetpoint(cylMainMenu, 3);
            ws.getRow(cylStartRow + 3).getCell(valuesStartCol).value = getSetpoint(cylMainMenu, 4);
            ws.getRow(cylStartRow + 4).getCell(valuesStartCol).value = getSetpoint(cylMainMenu, 5);
        }

        // ========================
        // Populate lists (columns D/E) with ordering by Index
        // ========================
        if (injCount > 0) {
            const injValues = injection?.subMenuValues?.values || injection?.SubMenuValues?.Values || [];
            let r = injListStartRow;
            [...injValues].sort((a: any, b: any) => (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0))
                .forEach((v: any) => {
                    ws.getRow(r).getCell(4).value = v.v ?? v.V ?? null;   // D
                    ws.getRow(r).getCell(5).value = v.v2 ?? v.V2 ?? null;  // E
                    r++;
                });
        }

        if (hpCount > 0) {
            const hpValues = holdingPressure?.subMenusValues?.values || holdingPressure?.SubMenusValues?.Values || [];
            let r = hpListStartRow;
            [...hpValues].sort((a: any, b: any) => (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0))
                .forEach((v: any) => {
                    ws.getRow(r).getCell(4).value = v.t ?? v.T ?? null;   // D
                    ws.getRow(r).getCell(5).value = v.p ?? v.P ?? null;   // E
                    r++;
                });
        }

        if (dosingSpeedCount > 0) {
            const dosingSpeedValues = dosing?.dosingSpeedsValues?.values || dosing?.DosingSpeedsValues?.Values || [];
            let r = dosingSpeedListStartRow;
            [...dosingSpeedValues].sort((a: any, b: any) => (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0))
                .forEach((v: any) => {
                    ws.getRow(r).getCell(4).value = v.v ?? v.V ?? null;   // D
                    ws.getRow(r).getCell(5).value = v.v2 ?? v.V2 ?? null;  // E
                    r++;
                });
        }

        if (dosingPressureCount > 0) {
            const dosingPressureValues = dosing?.dosingPressuresValues?.values || dosing?.DosingPressuresValues?.Values || [];
            let r = dosingPressureListStartRow;
            [...dosingPressureValues].sort((a: any, b: any) => (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0))
                .forEach((v: any) => {
                    ws.getRow(r).getCell(4).value = v.v ?? v.V ?? null;   // D
                    ws.getRow(r).getCell(5).value = v.p ?? v.P ?? null;   // E
                    r++;
                });
        }

        // ========================
        // Thin borders & vertical align center (only for used rows)
        // ========================
        // Limit to actual used rows to avoid stack overflow
        const maxRow = Math.max(cylEndRow, dosingEndRow, hpEndRow, injEndRow);
        const usedColumns = [1, 2, 3, 4, 5, 6]; // A through F
        
        for (let r = 1; r <= maxRow; r++) {
            for (const c of usedColumns) {
                try {
                    const cell = ws.getRow(r).getCell(c);
                    if (cell) {
                        cell.alignment = { ...(cell.alignment ?? {}), vertical: "middle" };
                        cell.border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" },
                            bottom: { style: "thin" },
                        };
                    }
                } catch (e) {
                    // Skip cells that can't be accessed (e.g., merged cells)
                    continue;
                }
            }
        }

        const fileName = `ParaLens_Export_${scanId}.xlsx`;

        // Generate Excel buffer
        const buf = await wb.xlsx.writeBuffer();
        const uint8Array = new Uint8Array(buf);
        
        // Convert Uint8Array to base64 string (chunked for large files to avoid stack overflow)
        let binaryString = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        // Use btoa if available (browser/Expo), otherwise use a polyfill
        let base64String: string;
        if (typeof btoa !== 'undefined') {
            base64String = btoa(binaryString);
        } else {
            // Fallback: use Buffer if available (Node.js environment)
            const { Buffer } = require('buffer');
            base64String = Buffer.from(uint8Array).toString('base64');
        }

        // Use cache directory for temporary file storage (accessible for sharing)
        // Access cache directory from legacy API for compatibility
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
            Alert.alert("Export failed", "Cache directory is not available");
            return;
        }

        const fileUri = cacheDir + fileName;
        const file = new File(fileUri);

        // Write the file as base64-encoded string
        await file.write(base64String, { encoding: 'base64' });

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
                                    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                    UTI: "com.microsoft.excel.xlsx",
                                });
                            } else {
                                Alert.alert("Share Unavailable", "Sharing is not available on this device.");
                            }
                        } catch (shareError: any) {
                            Alert.alert(
                                "Share failed",
                                shareError?.message || "Could not share the file."
                            );
                        }
                    },
                },
                {
                    text: "Save to Downloads",
                    onPress: async () => {
                        try {
                            if (Platform.OS === 'android') {
                                // For Android 13+ (API 33+), we don't need storage permissions for Downloads folder
                                const androidVersion = Platform.Version as number;
                                let hasPermission = true;

                                if (androidVersion < 33) {
                                    // For older Android versions (API < 33), we need storage permissions
                                    const granted = await PermissionsAndroid.request(
                                        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                                        {
                                            title: 'Storage Permission',
                                            message: 'This app needs access to storage to save the file.',
                                            buttonNeutral: 'Ask Me Later',
                                            buttonNegative: 'Cancel',
                                            buttonPositive: 'OK',
                                        }
                                    );
                                    hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
                                }

                                if (!hasPermission) {
                                    Alert.alert("Permission Denied", "Storage permission is required to save the file.");
                                    return;
                                }

                                // Save to Downloads directory on Android
                                const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
                                
                                // Read file content using RNFS and write to Downloads
                                try {
                                    // Check if source file exists
                                    const sourceExists = await RNFS.exists(fileUri);
                                    if (!sourceExists) {
                                        Alert.alert("Error", "Source file not found. Please try again.");
                                        return;
                                    }
                                    
                                    // Read file as base64 from cache using RNFS
                                    const fileContent = await RNFS.readFile(fileUri, 'base64');
                                    
                                    // Write directly to Downloads folder
                                    await RNFS.writeFile(downloadPath, fileContent, 'base64');
                                    
                                    // Verify file was written
                                    const fileExists = await RNFS.exists(downloadPath);
                                    if (!fileExists) {
                                        Alert.alert("Error", "Failed to save file. Please check storage permissions.");
                                        return;
                                    }
                                } catch (writeError: any) {
                                    // Fallback: try copying if direct write fails
                                    console.warn('Direct write failed, trying copy:', writeError);
                                    const sourceExists = await RNFS.exists(fileUri);
                                    if (!sourceExists) {
                                        Alert.alert("Error", "Source file not found. Please try again.");
                                        return;
                                    }
                                    await RNFS.copyFile(fileUri, downloadPath);
                                }
                                
                                // Trigger media scan to make file visible in Downloads app
                                try {
                                    await RNFS.scanFile(downloadPath);
                                } catch (scanError) {
                                    // Don't fail if scan fails, file is still saved
                                    console.warn('Failed to scan file:', scanError);
                                }
                                
                                Alert.alert("File Saved", `Excel file saved to Downloads:\n${downloadPath}`);
                            } else {
                                // For iOS, use document directory and share to Files app
                                const documentDir = FileSystem.documentDirectory;
                                if (documentDir) {
                                    const documentPath = documentDir + fileName;
                                    const documentFile = new File(documentPath);
                                    await documentFile.write(base64String, { encoding: 'base64' });
                                    
                                    // Share to Files app
                                    if (await Sharing.isAvailableAsync()) {
                                        await Sharing.shareAsync(documentPath, {
                                            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                            UTI: "com.microsoft.excel.xlsx",
                                        });
                                    } else {
                                        Alert.alert("File Saved", `Excel file saved to:\n${documentPath}`);
                                    }
                                } else {
                                    Alert.alert("Error", "Could not access document directory.");
                                }
                            }
                        } catch (saveError: any) {
                            Alert.alert(
                                "Save failed",
                                saveError?.message || "Could not save the file to downloads."
                            );
                        }
                    },
                },
                {
                    text: "Cancel",
                    style: "cancel",
                },
            ],
            { cancelable: true }
        );
    } catch (e: any) {
        Alert.alert("Export failed", e?.message ?? String(e));
    }
};
