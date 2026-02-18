import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { PermissionsAndroid } from "react-native";
// ExcelJS is imported dynamically to avoid stack overflow at app startup
import type { FullScanDto, SectionScreenshot, SectionScreenshots } from "@/features/fullscan/types";
import { buildFullScanExcelData } from "@/features/fullscan/excel/fullscan-to-excel";
import { loadScreenshots } from "@/features/fullscan/storage";

/**
 * Group screenshots by main category (injection, holdingPressure, dosing, cylinderHeating)
 */
const groupScreenshotsByCategory = (
  screenshots: SectionScreenshots | null | undefined
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
 * Compress/resize a base64 image to reduce memory usage
 * Returns a smaller base64 string or null if compression fails
 */
const compressBase64Image = (base64: string, maxWidth: number = 300): string | null => {
  try {
    // If the base64 is already small enough, return as-is
    // Base64 is ~33% larger than binary, so 100KB binary = ~133KB base64
    if (base64.length < 150000) {
      return base64;
    }
    // For larger images, we'll just truncate the quality by returning null
    // and letting the caller handle it (e.g., skip the image or use placeholder)
    // In a production app, you'd use a proper image compression library
    return null;
  } catch (e) {
    console.warn('Image compression failed:', e);
    return null;
  }
};

/**
 * Add screenshot images to a worksheet using exceljs
 * Note: workbook and worksheet are typed as 'any' because ExcelJS is dynamically imported
 * Images are added one at a time with error handling to prevent memory issues
 */
const addScreenshotsToWorksheet = (
  workbook: any,
  worksheet: any,
  screenshots: Array<{ key: string; screenshot: SectionScreenshot; label: string }>,
  startRow: number,
  includeImages: boolean = true
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

    if (!includeImages) {
      // Just add metadata without image
      worksheet.getCell(currentRow, 1).value = `[Bild verfügbar - ${Math.round(screenshot.imageBase64.length / 1024)}KB]`;
      currentRow += 2;
      continue;
    }

    try {
      // Try to compress the image first
      const compressedImage = compressBase64Image(screenshot.imageBase64);

      if (!compressedImage) {
        // Image too large, skip it
        worksheet.getCell(currentRow, 1).value = `[Bild zu groß für Export - ${Math.round(screenshot.imageBase64.length / 1024)}KB]`;
        currentRow += 2;
        continue;
      }

      // Add image to workbook
      const imageId = workbook.addImage({
        base64: compressedImage,
        extension: 'jpeg',
      });

      // Add image to worksheet
      // Image dimensions: roughly 300x400 pixels (3:4 aspect ratio) - smaller for memory
      const imageWidth = 300;
      const imageHeight = 400;

      // Convert pixels to row units for spacing (approximate)
      const rowHeight = imageHeight / 20; // ~20 rows

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
  includeImages: boolean = false, // Default to false for safety
) => {
  try {
    const scan = fullScans?.find((fs) => fs.id === scanId);
    if (!scan) {
      Alert.alert("Excel (local)", "Scan not found!");
      return;
    }

    // Dynamic import of ExcelJS to avoid stack overflow at app startup
    const ExcelJS = await import("exceljs");

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

    // Load screenshots from separate storage (on demand, not loaded at app start)
    const screenshots = await loadScreenshots(scanId);

    // Only process screenshots if we have any
    if (screenshots && Object.keys(screenshots).length > 0) {
      // Group screenshots by main category
      const screenshotGroups = groupScreenshotsByCategory(screenshots);

      // Create worksheet for each main category that has screenshots
      const categoryNames: Record<string, string> = {
        injection: 'Injection',
        holdingPressure: 'Holding Pressure',
        dosing: 'Dosing',
        cylinderHeating: 'Cylinder Heating',
      };

      for (const [category, categoryScreenshots] of Object.entries(screenshotGroups)) {
        if (categoryScreenshots.length === 0) continue;

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
        addScreenshotsToWorksheet(workbook, worksheet, categoryScreenshots, 4, includeImages);
      }
    }

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert ArrayBuffer to base64 (React Native compatible)
    const uint8Array = new Uint8Array(buffer as ArrayBuffer);

    // Convert Uint8Array to base64 without using Buffer (not available in RN)
    const chunkSize = 0x8000; // 32KB chunks to avoid call stack issues
    let base64 = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      base64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64 = btoa(base64);

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
