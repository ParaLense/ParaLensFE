import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { PermissionsAndroid } from "react-native";
import ExcelJS from "exceljs";
import type { FullScanDto, SectionScreenshot } from "@/features/fullscan/types";
import { buildFullScanExcelData } from "@/features/fullscan/excel/fullscan-to-excel";

/**
 * Group screenshots by main category (injection, holdingPressure, dosing, cylinderHeating)
 */
const groupScreenshotsByCategory = (
  screenshots: Record<string, SectionScreenshot> | undefined
): Record<string, Array<{ key: string; screenshot: SectionScreenshot; label: string }>> => {
  if (!screenshots) return {};

  const subModeLabels: Record<string, string> = {
    'mainMenu': 'Main Menu',
    'subMenuGraphic': 'Scrollbar / Graphic',
    'switchType': 'Switch Type',
  };

  const groups: Record<string, Array<{ key: string; screenshot: SectionScreenshot; label: string }>> = {
    injection: [],
    holdingPressure: [],
    dosing: [],
    cylinderHeating: [],
  };

  for (const [key, screenshot] of Object.entries(screenshots)) {
    if (!screenshot?.imageBase64) continue;

    // Determine main category from key
    let category: string;
    let label: string;

    if (key.startsWith('injection')) {
      category = 'injection';
      label = screenshot.subMode ? subModeLabels[screenshot.subMode] || screenshot.subMode : 'Main';
    } else if (key.startsWith('holdingPressure')) {
      category = 'holdingPressure';
      label = screenshot.subMode ? subModeLabels[screenshot.subMode] || screenshot.subMode : 'Main';
    } else if (key.startsWith('dosing')) {
      category = 'dosing';
      label = screenshot.subMode ? subModeLabels[screenshot.subMode] || screenshot.subMode : 'Main';
    } else if (key.startsWith('cylinderHeating')) {
      category = 'cylinderHeating';
      label = screenshot.subMode ? subModeLabels[screenshot.subMode] || screenshot.subMode : 'Main';
    } else {
      continue; // Unknown category
    }

    groups[category].push({ key, screenshot, label });
  }

  return groups;
};

/**
 * Add screenshot images to a worksheet using exceljs
 */
const addScreenshotsToWorksheet = (
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  screenshots: Array<{ key: string; screenshot: SectionScreenshot; label: string }>,
  startRow: number
): number => {
  if (screenshots.length === 0) return startRow;

  let currentRow = startRow;

  // Header for screenshots section
  worksheet.getCell(currentRow, 1).value = 'Screenshots zur Verifizierung';
  worksheet.getCell(currentRow, 1).font = { bold: true, size: 14 };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  currentRow += 2;

  for (const { screenshot, label } of screenshots) {
    // Add label
    worksheet.getCell(currentRow, 1).value = label;
    worksheet.getCell(currentRow, 1).font = { bold: true };
    worksheet.getCell(currentRow, 2).value = `Aufgenommen: ${new Date(screenshot.timestamp).toLocaleString()}`;
    currentRow += 1;

    try {
      // Add image to workbook
      const imageId = workbook.addImage({
        base64: screenshot.imageBase64,
        extension: 'jpeg',
      });

      // Add image to worksheet
      // Image dimensions: roughly 400x533 pixels (3:4 aspect ratio)
      const imageWidth = 400;
      const imageHeight = 533;

      // Convert pixels to row units for spacing (approximate)
      const rowHeight = imageHeight / 20; // ~26.65 rows

      worksheet.addImage(imageId, {
        tl: { col: 0, row: currentRow - 1 },
        ext: { width: imageWidth, height: imageHeight },
      });

      // Reserve space for the image
      currentRow += Math.ceil(rowHeight) + 2;
    } catch (imgError) {
      console.warn('Failed to add image:', imgError);
      worksheet.getCell(currentRow, 1).value = '[Bild konnte nicht eingefügt werden]';
      currentRow += 2;
    }
  }

  return currentRow;
};

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

    // Create workbook with exceljs
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ParaLens';
    workbook.created = new Date();

    // Get XLSX for building the data rows (reuse existing logic)
    const XLSX = require("xlsx");
    const { rows } = buildFullScanExcelData(scan, XLSX);

    // Create Parameters worksheet
    const parametersSheet = workbook.addWorksheet('Parameters');

    // Add data rows to parameters sheet
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell !== null && cell !== undefined) {
          parametersSheet.getCell(rowIndex + 1, colIndex + 1).value = cell;
        }
      });
    });

    // Set column widths for parameters sheet
    parametersSheet.columns = [
      { width: 20 },
      { width: 20 },
      { width: 35 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
    ];

    // Group screenshots by main category
    const screenshotGroups = groupScreenshotsByCategory(scan.sectionScreenshots);

    // Create worksheet for each main category that has screenshots
    const categoryNames: Record<string, string> = {
      injection: 'Injection',
      holdingPressure: 'Holding Pressure',
      dosing: 'Dosing',
      cylinderHeating: 'Cylinder Heating',
    };

    for (const [category, screenshots] of Object.entries(screenshotGroups)) {
      if (screenshots.length === 0) continue;

      const sheetName = categoryNames[category] || category;
      const worksheet = workbook.addWorksheet(sheetName);

      // Set column widths
      worksheet.columns = [
        { width: 30 },
        { width: 40 },
        { width: 20 },
        { width: 20 },
      ];

      // Add header
      worksheet.getCell(1, 1).value = `${sheetName} - Scan Screenshots`;
      worksheet.getCell(1, 1).font = { bold: true, size: 16 };
      worksheet.mergeCells(1, 1, 1, 4);

      worksheet.getCell(2, 1).value = `Scan ID: ${scan.id}`;
      worksheet.getCell(2, 2).value = `Author: ${scan.author}`;
      worksheet.getCell(2, 3).value = `Date: ${new Date(scan.date).toLocaleString()}`;

      // Add screenshots starting from row 4
      addScreenshotsToWorksheet(workbook, worksheet, screenshots, 4);
    }

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert ArrayBuffer to base64 (React Native compatible)
    const uint8Array = new Uint8Array(buffer as ArrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binaryString);

    const fileName = `ParaLens_Export_${scanId}.xlsx`;

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      Alert.alert("Export failed", "Cache directory is not available");
      return;
    }

    const fileUri = cacheDir + fileName;
    const file = new File(fileUri);

    await file.write(base64, { encoding: "base64" });

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
                  await documentFile.write(base64, { encoding: 'base64' });

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
