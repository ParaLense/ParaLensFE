import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { PermissionsAndroid } from "react-native";

export const handleLocalExcelDownload = async (scanId: number, fullScans: any[]) => {
    try {
        // Lazy load xlsx to avoid Metro parsing issues
        // Wrap require in a function to defer evaluation
        const getXLSX = () => {
            try {
                // @ts-ignore - xlsx may not have perfect TypeScript support in RN
                return require("xlsx");
            } catch (e) {
                throw new Error("Failed to load xlsx library. Please restart Metro bundler.");
            }
        };
        const XLSX = getXLSX();
        
        const scan = fullScans?.find((fs: any) => fs.id === scanId);
        if (!scan) {
            Alert.alert("Excel (local)", "Scan not found!");
            return;
        }

        // Handle both camelCase (local) and PascalCase (server) property names
        const injection = scan?.injection || scan?.Injection;
        const holdingPressure = scan?.holdingPressure || scan?.HoldingPressure;
        const dosing = scan?.dosing || scan?.Dosing;
        const cylinderHeating = scan?.cylinderHeating || scan?.CylinderHeating;

        const injCount = injection?.subMenuValues?.values?.length || injection?.SubMenuValues?.Values?.length || 0;
        const hpCount = holdingPressure?.subMenusValues?.values?.length || holdingPressure?.SubMenusValues?.Values?.length || 0;
        const dosingSpeedCount = dosing?.dosingSpeedsValues?.values?.length || dosing?.DosingSpeedsValues?.Values?.length || 0;
        const dosingPressureCount = dosing?.dosingPressuresValues?.values?.length || dosing?.DosingPressuresValues?.Values?.length || 0;

        // Create a 2D array to represent the worksheet
        // We'll build rows manually - xlsx uses 0-based indexing for arrays
        const rows: (string | number | null)[][] = [];
        
        // Initialize all rows with empty arrays
        const maxRowCount = 29 + injCount + hpCount + dosingSpeedCount + dosingPressureCount + 5;
        for (let i = 0; i <= maxRowCount; i++) {
            rows[i] = [];
        }

        // Helper to set cell value (1-based row/col to 0-based array)
        const setCell = (row: number, col: number, value: string | number | null) => {
            rows[row - 1][col - 1] = value;
        };

        // Row indices (1-based Excel rows)
        const valuesStartCol = 6; // F column

        const injHeaderRow = 5;             // C5: Actual Value (List)
        const hpHeaderRow = 14;             // C14: Actual Value (List)
        const dosingSpeedHeaderRow = 23;    // C23
        const dosingPressureHeaderRow = 24; // C24

        // Calculate row positions after insertions
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
        const cylEndRow = cylStartRow + 4;

        // ========================
        // Set all labels
        // ========================
        
        // Injection section
        const injEndRow = 8 + injCount;
        setCell(2, 1, "Injection"); // A2
        setCell(2, 2, "Mainpage"); // B2
        setCell(2, 3, "Injection Pressure"); setCell(2, 4, "bar");
        setCell(3, 2, null); // B3 (merged)
        setCell(3, 3, "IsIncreasedSpecificPressure"); setCell(3, 4, "bool");

        setCell(4, 2, "Undermenu"); // B4
        setCell(4, 3, "Injection Speed"); setCell(4, 4, "cm^3/s"); setCell(4, 5, "cm^3");
        setCell(5, 3, "Actual Value (List)"); // C5

        setCell(6, 2, "Switch Over"); // B6
        setCell(injWayRow, 3, "Way"); setCell(injWayRow, 4, "mm");
        setCell(injTimeRow, 3, "Time"); setCell(injTimeRow, 4, "s");
        setCell(injHydRow, 3, "Hydraulic Pressure"); setCell(injHydRow, 4, "bar");

        // Holding Pressure section
        const hpEndRow = 14 + injCount + hpCount;
        setCell(hpMainStartRow, 1, "Holding Pressure"); // A10
        setCell(hpMainStartRow, 2, "Mainpage"); // B10
        setCell(hpMainStartRow, 3, "ReprintTime"); setCell(hpMainStartRow, 4, "s");
        setCell(hpMainStartRow + 1, 2, null); // B11 (merged)
        setCell(hpMainStartRow + 1, 3, "CoolTime"); setCell(hpMainStartRow + 1, 4, "s");
        setCell(hpMainStartRow + 2, 2, null); // B12 (merged)
        setCell(hpMainStartRow + 2, 3, "ScrewDiameter"); setCell(hpMainStartRow + 2, 4, "mm");

        setCell(hpUndermenuStartRow, 2, "Undermenu"); // B13
        setCell(hpUndermenuStartRow, 3, "Holding Pressure"); setCell(hpUndermenuStartRow, 4, "t"); setCell(hpUndermenuStartRow, 5, "p");
        setCell(hpHeaderRowAfter, 3, "Actual Value (List)"); // C14

        // Dosing section
        const dosingPressureEndRow = dosingPressureHeaderRowAdjusted + dosingPressureCount;
        const dosingEndRow = dosingPressureEndRow;
        
        setCell(dosingMainStartRow, 1, "Dosing"); // A16
        setCell(dosingMainStartRow, 2, "Mainpage"); // B16
        setCell(dosingMainStartRow, 3, "DosingStroke"); setCell(dosingMainStartRow, 4, "mm");
        setCell(dosingMainStartRow + 1, 2, null); // B17 (merged)
        setCell(dosingMainStartRow + 1, 3, "DosingDelayTime"); setCell(dosingMainStartRow + 1, 4, "s");
        setCell(dosingMainStartRow + 2, 2, null); // B18 (merged)
        setCell(dosingMainStartRow + 2, 3, "RelieveDosing"); setCell(dosingMainStartRow + 2, 4, "bar");
        setCell(dosingMainStartRow + 3, 2, null); // B19 (merged)
        setCell(dosingMainStartRow + 3, 3, "RelieveAfterDosing"); setCell(dosingMainStartRow + 3, 4, "bar");
        setCell(dosingMainStartRow + 4, 2, null); // B20 (merged)
        setCell(dosingMainStartRow + 4, 3, "DischargeSpeedBeforeDosing"); setCell(dosingMainStartRow + 4, 4, "cm^3/s");
        setCell(dosingMainStartRow + 5, 2, null); // B21 (merged)
        setCell(dosingMainStartRow + 5, 3, "DischargeSpeedAfterDosing"); setCell(dosingMainStartRow + 5, 4, "cm^3/s");

        // Dosing Speed section
        setCell(dosingUndermenuStartRow, 2, "Undermenu"); // B22
        setCell(dosingUndermenuStartRow, 3, "DosingSpeed"); setCell(dosingUndermenuStartRow, 4, "V"); setCell(dosingUndermenuStartRow, 5, "v");
        setCell(dosingSpeedHeaderRow + injCount + hpCount, 3, "Actual Value (List)"); // C23
        
        // Dosing Pressure section
        setCell(dosingPressureHeaderRowAdjusted, 3, "DosingPressure"); setCell(dosingPressureHeaderRowAdjusted, 4, "V"); setCell(dosingPressureHeaderRowAdjusted, 5, "p");

        // Cylinder Heating section
        setCell(cylStartRow, 1, "Cylinder Heating"); // A29
        setCell(cylStartRow, 2, "Mainpage"); // B29
        setCell(cylStartRow, 3, "Sollwert1"); setCell(cylStartRow, 4, "°C");
        setCell(cylStartRow + 1, 2, null); // B30 (merged)
        setCell(cylStartRow + 1, 3, "Sollwert2"); setCell(cylStartRow + 1, 4, "°C");
        setCell(cylStartRow + 2, 2, null); // B31 (merged)
        setCell(cylStartRow + 2, 3, "Sollwert3"); setCell(cylStartRow + 2, 4, "°C");
        setCell(cylStartRow + 3, 2, null); // B32 (merged)
        setCell(cylStartRow + 3, 3, "Sollwert4"); setCell(cylStartRow + 3, 4, "°C");
        setCell(cylStartRow + 4, 2, null); // B33 (merged)
        setCell(cylStartRow + 4, 3, "Sollwert5"); setCell(cylStartRow + 4, 4, "°C");

        // ========================
        // Populate scalar values (column F)
        // ========================
        const injMainMenu = injection?.mainMenu || injection?.MainMenu;
        const injSwitchType = injection?.switchType || injection?.SwitchType;
        const hpMainMenu = holdingPressure?.mainMenu || holdingPressure?.MainMenu;
        const dosingMainMenu = dosing?.mainMenu || dosing?.MainMenu;
        const cylMainMenu = cylinderHeating?.mainMenu || cylinderHeating?.MainMenu || 
            (cylinderHeating && (cylinderHeating.setpoint1 !== undefined || cylinderHeating.Setpoint1 !== undefined) ? cylinderHeating : null);

        if (injMainMenu) {
            setCell(2, valuesStartCol, injMainMenu.sprayPressureLimit ?? injMainMenu.SprayPressureLimit ?? null); // F2
            setCell(3, valuesStartCol, injMainMenu.increasedSpecificPointPrinter ?? injMainMenu.IncreasedSpecificPointPrinter ?? null); // F3
        }

        if (injSwitchType) {
            setCell(injWayRow, valuesStartCol, injSwitchType.transshipmentPosition ?? injSwitchType.TransshipmentPosition ?? null);
            setCell(injTimeRow, valuesStartCol, injSwitchType.switchOverTime ?? injSwitchType.SwitchOverTime ?? null);
            setCell(injHydRow, valuesStartCol, injSwitchType.switchingPressure ?? injSwitchType.SwitchingPressure ?? null);
        }

        if (hpMainMenu) {
            setCell(hpMainStartRow + 0, valuesStartCol, hpMainMenu.holdingTime ?? hpMainMenu.HoldingTime ?? null);
            setCell(hpMainStartRow + 1, valuesStartCol, hpMainMenu.coolTime ?? hpMainMenu.CoolTime ?? null);
            setCell(hpMainStartRow + 2, valuesStartCol, hpMainMenu.screwDiameter ?? hpMainMenu.ScrewDiameter ?? null);
        }

        if (dosingMainMenu) {
            setCell(dosingMainStartRow + 0, valuesStartCol, dosingMainMenu.dosingStroke ?? dosingMainMenu.DosingStroke ?? null);
            setCell(dosingMainStartRow + 1, valuesStartCol, dosingMainMenu.dosingDelayTime ?? dosingMainMenu.DosingDelayTime ?? null);
            setCell(dosingMainStartRow + 2, valuesStartCol, dosingMainMenu.relieveDosing ?? dosingMainMenu.RelieveDosing ?? null);
            setCell(dosingMainStartRow + 3, valuesStartCol, dosingMainMenu.relieveAfterDosing ?? dosingMainMenu.RelieveAfterDosing ?? null);
            setCell(dosingMainStartRow + 4, valuesStartCol, dosingMainMenu.dischargeSpeedBeforeDosing ?? dosingMainMenu.DischargeSpeedBeforeDosing ?? null);
            setCell(dosingMainStartRow + 5, valuesStartCol, dosingMainMenu.dischargeSpeedAfterDosing ?? dosingMainMenu.DischargeSpeedAfterDosing ?? null);
        }

        if (cylMainMenu) {
            const getSetpoint = (obj: any, num: number) => {
                const camelKey = `setpoint${num}`;
                const pascalKey = `Setpoint${num}`;
                return obj[camelKey] !== undefined ? obj[camelKey] : (obj[pascalKey] !== undefined ? obj[pascalKey] : null);
            };
            
            setCell(cylStartRow + 0, valuesStartCol, getSetpoint(cylMainMenu, 1));
            setCell(cylStartRow + 1, valuesStartCol, getSetpoint(cylMainMenu, 2));
            setCell(cylStartRow + 2, valuesStartCol, getSetpoint(cylMainMenu, 3));
            setCell(cylStartRow + 3, valuesStartCol, getSetpoint(cylMainMenu, 4));
            setCell(cylStartRow + 4, valuesStartCol, getSetpoint(cylMainMenu, 5));
        }

        // ========================
        // Populate lists (columns D/E) with ordering by Index
        // ========================
        if (injCount > 0) {
            const injValues = injection?.subMenuValues?.values || injection?.SubMenuValues?.Values || [];
            let r = injListStartRow;
            [...injValues].sort((a: any, b: any) => (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0))
                .forEach((v: any) => {
                    setCell(r, 4, v.v ?? v.V ?? null);   // D
                    setCell(r, 5, v.v2 ?? v.V2 ?? null);  // E
                    r++;
                });
        }

        if (hpCount > 0) {
            const hpValues = holdingPressure?.subMenusValues?.values || holdingPressure?.SubMenusValues?.Values || [];
            let r = hpListStartRow;
            [...hpValues].sort((a: any, b: any) => (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0))
                .forEach((v: any) => {
                    setCell(r, 4, v.t ?? v.T ?? null);   // D
                    setCell(r, 5, v.p ?? v.P ?? null);   // E
                    r++;
                });
        }

        if (dosingSpeedCount > 0) {
            const dosingSpeedValues = dosing?.dosingSpeedsValues?.values || dosing?.DosingSpeedsValues?.Values || [];
            let r = dosingSpeedListStartRow;
            [...dosingSpeedValues].sort((a: any, b: any) => (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0))
                .forEach((v: any) => {
                    setCell(r, 4, v.v ?? v.V ?? null);   // D
                    setCell(r, 5, v.v2 ?? v.V2 ?? null);  // E
                    r++;
                });
        }

        if (dosingPressureCount > 0) {
            const dosingPressureValues = dosing?.dosingPressuresValues?.values || dosing?.DosingPressuresValues?.Values || [];
            let r = dosingPressureListStartRow;
            [...dosingPressureValues].sort((a: any, b: any) => (a.index ?? a.Index ?? 0) - (b.index ?? b.Index ?? 0))
                .forEach((v: any) => {
                    setCell(r, 4, v.v ?? v.V ?? null);   // D
                    setCell(r, 5, v.p ?? v.P ?? null);   // E
                    r++;
                });
        }

        // Convert rows array to worksheet
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // A: Category
            { wch: 20 }, // B: Menu
            { wch: 35 }, // C: Parameter
            { wch: 12 }, // D: Unit 1
            { wch: 12 }, // E: Unit 2
            { wch: 15 }, // F: Value
        ];

        // Helper function to convert Excel address to cell reference (e.g., "A2" -> {r:1, c:0})
        const addressToCell = (addr: string) => {
            const match = addr.match(/([A-Z]+)(\d+)/);
            if (!match) return null;
            const col = match[1];
            const row = parseInt(match[2]) - 1;
            let colNum = 0;
            for (let i = 0; i < col.length; i++) {
                colNum = colNum * 26 + (col.charCodeAt(i) - 64);
            }
            return { r: row, c: colNum - 1 };
        };

        // Helper to get cell reference string
        const cellRef = (row: number, col: number) => {
            const colLetter = String.fromCharCode(65 + col);
            return `${colLetter}${row + 1}`;
        };

        // Helper to set cell style
        const setCellStyle = (row: number, col: number, style: any) => {
            const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[cellAddr]) ws[cellAddr] = { v: null, t: 's' };
            ws[cellAddr].s = style;
        };

        // Define border style
        const thinBorder = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
        };

        // Define center alignment style
        const centerAlign = {
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: thinBorder,
        };

        const leftAlign = {
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
            border: thinBorder,
        };

        // Initialize merges array
        const merges: any[] = [];

        // ========================
        // Apply merges and styles
        // ========================
        
        // Injection section merges
        merges.push({ s: addressToCell("A2")!, e: addressToCell(`A${injEndRow}`)! }); // A2:A{injEndRow}
        merges.push({ s: addressToCell("B2")!, e: addressToCell("B3")! }); // B2:B3
        merges.push({ s: addressToCell("B4")!, e: addressToCell(`B${injHeaderRow}`)! }); // B4:B{injHeaderRow}
        merges.push({ s: addressToCell("B6")!, e: addressToCell(`B${injEndRow}`)! }); // B6:B{injEndRow}

        // Holding Pressure section merges
        merges.push({ s: addressToCell(`A${hpMainStartRow}`)!, e: addressToCell(`A${hpEndRow}`)! }); // A{hpMainStartRow}:A{hpEndRow}
        merges.push({ s: addressToCell(`B${hpMainStartRow}`)!, e: addressToCell(`B${hpMainStartRow + 2}`)! }); // B{hpMainStartRow}:B{hpMainStartRow+2}
        merges.push({ s: addressToCell(`B${hpUndermenuStartRow}`)!, e: addressToCell(`B${hpHeaderRowAfter}`)! }); // B{hpUndermenuStartRow}:B{hpHeaderRowAfter}

        // Dosing section merges
        merges.push({ s: addressToCell(`A${dosingMainStartRow}`)!, e: addressToCell(`A${dosingEndRow}`)! }); // A{dosingMainStartRow}:A{dosingEndRow}
        merges.push({ s: addressToCell(`B${dosingMainStartRow}`)!, e: addressToCell(`B${dosingMainStartRow + 5}`)! }); // B{dosingMainStartRow}:B{dosingMainStartRow+5}
        merges.push({ s: addressToCell(`B${dosingUndermenuStartRow}`)!, e: addressToCell(`B${dosingPressureEndRow}`)! }); // B{dosingUndermenuStartRow}:B{dosingPressureEndRow}

        // Cylinder Heating section merges
        merges.push({ s: addressToCell(`A${cylStartRow}`)!, e: addressToCell(`A${cylEndRow}`)! }); // A{cylStartRow}:A{cylEndRow}
        merges.push({ s: addressToCell(`B${cylStartRow}`)!, e: addressToCell(`B${cylEndRow}`)! }); // B{cylStartRow}:B{cylEndRow}

        // Apply merges to worksheet
        ws['!merges'] = merges;

        // Apply styles to all cells with data
        const maxRow = Math.max(cylEndRow, dosingEndRow, hpEndRow, injEndRow);
        for (let r = 1; r <= maxRow; r++) {
            for (let c = 0; c < 6; c++) {
                const cellAddr = XLSX.utils.encode_cell({ r: r - 1, c: c });
                if (ws[cellAddr] && ws[cellAddr].v !== null && ws[cellAddr].v !== undefined) {
                    // Check if this is a merged cell that should be centered
                    const isMergedCenter = merges.some(m => {
                        const cellRow = r - 1;
                        const cellCol = c;
                        return (
                            (m.s.r <= cellRow && cellRow <= m.e.r) &&
                            (m.s.c <= cellCol && cellCol <= m.e.c) &&
                            (m.s.r === cellRow && m.s.c === cellCol) // Only apply to top-left cell of merge
                        );
                    });
                    
                    if (isMergedCenter || c === 0 || c === 1) {
                        // Category and Menu columns, and merged cells should be centered
                        setCellStyle(r - 1, c, centerAlign);
                    } else {
                        // Other cells left-aligned
                        setCellStyle(r - 1, c, leftAlign);
                    }
                } else if (ws[cellAddr]) {
                    // Empty cells still get borders
                    setCellStyle(r - 1, c, { border: thinBorder });
                }
            }
        }

        // Create workbook and add worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Parameters");

        const fileName = `ParaLens_Export_${scanId}.xlsx`;

        // Generate Excel file as base64
        const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

        // Use cache directory for temporary file storage
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
            Alert.alert("Export failed", "Cache directory is not available");
            return;
        }

        const fileUri = cacheDir + fileName;
        const file = new File(fileUri);

        // Write the file as base64-encoded string
        await file.write(excelBuffer, { encoding: 'base64' });

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
                                const androidVersion = Platform.Version as number;
                                let hasPermission = true;

                                if (androidVersion < 33) {
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

                                const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
                                
                                try {
                                    const sourceExists = await RNFS.exists(fileUri);
                                    if (!sourceExists) {
                                        Alert.alert("Error", "Source file not found. Please try again.");
                                        return;
                                    }
                                    
                                    const fileContent = await RNFS.readFile(fileUri, 'base64');
                                    await RNFS.writeFile(downloadPath, fileContent, 'base64');
                                    
                                    const fileExists = await RNFS.exists(downloadPath);
                                    if (!fileExists) {
                                        Alert.alert("Error", "Failed to save file. Please check storage permissions.");
                                        return;
                                    }
                                } catch (writeError: any) {
                                    console.warn('Direct write failed, trying copy:', writeError);
                                    const sourceExists = await RNFS.exists(fileUri);
                                    if (!sourceExists) {
                                        Alert.alert("Error", "Source file not found. Please try again.");
                                        return;
                                    }
                                    await RNFS.copyFile(fileUri, downloadPath);
                                }
                                
                                try {
                                    await RNFS.scanFile(downloadPath);
                                } catch (scanError) {
                                    console.warn('Failed to scan file:', scanError);
                                }
                                
                                Alert.alert("File Saved", `Excel file saved to Downloads:\n${downloadPath}`);
                            } else {
                                const documentDir = FileSystem.documentDirectory;
                                if (documentDir) {
                                    const documentPath = documentDir + fileName;
                                    const documentFile = new File(documentPath);
                                    await documentFile.write(excelBuffer, { encoding: 'base64' });
                                    
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
