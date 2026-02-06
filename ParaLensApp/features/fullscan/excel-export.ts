import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { PermissionsAndroid } from "react-native";
import type { FullScanDto } from "@/features/fullscan/types";
import { buildFullScanExcelData } from "@/features/fullscan/excel/fullscan-to-excel";
import { buildWorksheetFromRows } from "@/features/fullscan/excel/excel-builder";

const getXLSX = () => {
  try {
    // @ts-ignore - xlsx may not have perfect TypeScript support in RN
    return require("xlsx");
  } catch (e) {
    throw new Error(
      "Failed to load xlsx library. Please restart Metro bundler.",
    );
  }
};

export const handleLocalExcelDownload = async (
  scanId: number,
  fullScans: FullScanDto[],
) => {
  try {
    const XLSX = getXLSX();

    const scan = fullScans?.find((fs) => fs.id === scanId);
    if (!scan) {
      Alert.alert("Excel (local)", "Scan not found!");
      return;
    }

    const { rows } = buildFullScanExcelData(scan, XLSX);
    const ws = buildWorksheetFromRows(XLSX, rows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parameters");

    const fileName = `ParaLens_Export_${scanId}.xlsx`;

    const excelBuffer = XLSX.write(wb, {
      type: "base64",
      bookType: "xlsx",
    });

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      Alert.alert("Export failed", "Cache directory is not available");
      return;
    }

    const fileUri = cacheDir + fileName;
    const file = new File(fileUri);

    await file.write(excelBuffer, { encoding: "base64" });

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
