import React, { useMemo, useRef, useState } from "react";
import {
    FlatList,
    Modal as RNModal,
    Pressable,
    ScrollView,
    View,
    Alert,
    Platform,
    StyleSheet,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";

// Your Expo UI aliases
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Divider } from "@/components/ui/divider";

// Contexts (Expo aliases)
import { useFullScan } from "@/features/fullscan/fullscan-context";
import { useI18n } from "@/features/settings/i18n";
import { useSettings } from "@/features/settings/settings-context";

// Optionally available API context (adjust path if needed)
import { useApiContext } from "@/features/api/api-context";
import { handleLocalExcelDownload } from "@/features/fullscan/excel-export";

// --- Optional native modules (guarded) ---
let FileViewer: any = null;
let ShareRN: any = null;
try {
    // require guarded so it doesn’t crash in Expo if not installed yet
    // If you prefer Expo modules, swap for expo-file-system/expo-sharing here.
    // @ts-ignore
    FileViewer = require("react-native-file-viewer").default;
    // @ts-ignore
    ShareRN = require("react-native-share").default;
} catch {}

// --- Optional connectivity test (adjust to your service path if different) ---
let ConnectivityTest: any = null;
try {
    // Example fallback location; change if your file lives elsewhere
    // @ts-ignore
    ConnectivityTest = require("@/services/connectivity-test").default;
} catch {}

const chipColors: Record<string, string> = {
    injection: "bg-success-600",
    holdingPressure: "bg-warning-500",
    dosing: "bg-info-500",
    cylinderHeating: "bg-primary-500",
};

type UploadStatus =
    | "not_uploaded"
    | "uploaded"
    | "needs_update"
    | "uploading"
    | "error"
    | "unknown";

/**
 * History Screen (fixed):
 * - Fixes modal scrolling by removing inner Pressable and separating backdrop tap target.
 * - Keeps your original features (statuses, upload/update, connectivity, Excel download).
 */
export default function HistoryScreen() {
    const { fullScans, uploadScan, updateScan, getUploadStatus } = useFullScan() as any;
    const { theme } = useSettings();
    const { t } = useI18n();
    const { excelService } = (useApiContext?.() as any) ?? {};

    const isDark = theme === "dark";

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Download state
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [lastDownloadedPath, setLastDownloadedPath] = useState<string | null>(null);
    const lastProgressUpdateRef = useRef<number>(0);

    const selected = useMemo(
        () => fullScans?.find?.((fs: any) => fs.id === selectedId) ?? null,
        [fullScans, selectedId],
    );

    const getStatusConfig = (status: UploadStatus) => {
        switch (status) {
            case "uploaded":
                return {
                    icon: "check-circle" as const,
                    color: isDark ? "#10b981" : "#059669",
                    bgColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(5, 150, 105, 0.1)",
                    text: "Uploaded",
                    badgeAction: "success" as const,
                };
            case "needs_update":
                return {
                    icon: "alert-circle" as const,
                    color: isDark ? "#f59e0b" : "#d97706",
                    bgColor: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(217, 119, 6, 0.1)",
                    text: "Needs Update",
                    badgeAction: "warning" as const,
                };
            case "uploading":
                return {
                    icon: "loader" as const,
                    color: isDark ? "#3b82f6" : "#2563eb",
                    bgColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.1)",
                    text: "Uploading...",
                    badgeAction: "info" as const,
                };
            case "error":
                return {
                    icon: "x-circle" as const,
                    color: isDark ? "#ef4444" : "#dc2626",
                    bgColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(220, 38, 38, 0.1)",
                    text: "Upload Failed",
                    badgeAction: "error" as const,
                };
            case "not_uploaded":
                return {
                    icon: "circle" as const,
                    color: isDark ? "#6b7280" : "#9ca3af",
                    bgColor: isDark ? "rgba(107, 114, 128, 0.15)" : "rgba(156, 163, 175, 0.1)",
                    text: "Not Uploaded",
                    badgeAction: "muted" as const,
                };
            default:
                return {
                    icon: "help-circle" as const,
                    color: isDark ? "#6b7280" : "#9ca3af",
                    bgColor: isDark ? "rgba(107, 114, 128, 0.15)" : "rgba(156, 163, 175, 0.1)",
                    text: "Unknown",
                    badgeAction: "muted" as const,
                };
        }
    };

    const getSectionStatus = (
        section: any,
        type: "injection" | "dosing" | "holdingPressure" | "cylinderHeating",
    ) => {
        if (!section) return "not_scanned" as const;

        if (type === "injection") {
            const a = !!section.mainMenu;
            const b = !!section.subMenuValues?.values?.length;
            const c = !!section.switchType;
            if (a && b && c) return "complete" as const;
            if (a || b || c) return "partial" as const;
            return "not_scanned" as const;
        }
        if (type === "dosing") {
            const a = !!section.mainMenu;
            const b = !!section.dosingSpeedsValues?.values?.length;
            const c = !!section.dosingPressuresValues?.values?.length;
            if (a && b && c) return "complete" as const;
            if (a || b || c) return "partial" as const;
            return "not_scanned" as const;
        }
        if (type === "holdingPressure") {
            const a = !!section.mainMenu;
            const b = !!section.subMenusValues?.values?.length;
            if (a && b) return "complete" as const;
            if (a || b) return "partial" as const;
            return "not_scanned" as const;
        }
        // cylinderHeating
        const hasMain = !!section.mainMenu;
        const hasAnySetpoint = !!(
            section.setpoint1 ||
            section.setpoint2 ||
            section.setpoint3 ||
            section.setpoint4 ||
            section.setpoint5
        );
        if (hasMain || hasAnySetpoint) return "complete" as const;
        return "not_scanned" as const;
    };

    const doConnectivityTest = async () => {
        try {
            if (ConnectivityTest?.testConnection) {
                const r = await ConnectivityTest.testConnection();
                if (r?.success) Alert.alert("Connection Test", "✅ Backend connection successful!");
                else Alert.alert("Connection Test Failed", r?.error || "Unknown error");
                return;
            }
            // Fallback: try excelService.ping() if exposed
            if (excelService?.ping) {
                await excelService.ping();
                Alert.alert("Connection Test", "✅ Backend connection successful!");
                return;
            }
            Alert.alert("Connection Test", "No connectivity test available in this build.");
        } catch {
            Alert.alert("Connection Test Failed", "An unexpected error occurred");
        }
    };

    const handleUpload = async (scanId: number) => {
        if (!uploadScan) return;
        try {
            const r = await uploadScan(scanId);
            if (!r?.success) Alert.alert("Upload Failed", r?.error || "Unknown error occurred");
        } catch {
            Alert.alert("Upload Failed", "An unexpected error occurred");
        }
    };

    const handleUpdate = async (scanId: number) => {
        if (!updateScan) return;
        try {
            const r = await updateScan(scanId);
            if (!r?.success) Alert.alert("Update Failed", r?.error || "Unknown error occurred");
        } catch {
            Alert.alert("Update Failed", "An unexpected error occurred");
        }
    };

    const handleDownloadExcelFromServer = async (scanId: number) => {
        if (!selected) return;

        const status: UploadStatus = getUploadStatus?.(scanId) ?? "unknown";
        if (status !== "uploaded") {
            Alert.alert(
                "Scan Not Uploaded",
                "Upload the scan to the server before downloading the Excel file.",
            );
            return;
        }

        if (!excelService?.downloadExcel) {
            Alert.alert("Download Unavailable", "excelService.downloadExcel is not wired in this build.");
            return;
        }

        setIsDownloading(true);
        setDownloadProgress(0);
        lastProgressUpdateRef.current = 0;

        try {
            const scanName = `Scan_${scanId}_${selected.author}`;
            const result = await excelService.downloadExcel(
                scanName,
                (progress: number) => {
                    const now = Date.now();
                    const last = lastProgressUpdateRef.current || 0;
                    if (progress >= 1 || now - last >= 250) {
                        lastProgressUpdateRef.current = now;
                        if (!Number.isNaN(progress) && progress >= 0 && progress <= 1) {
                            setDownloadProgress(progress);
                        }
                    }
                },
            );

            if (result?.success) {
                const filePath = result.filePath as string | undefined;
                setLastDownloadedPath(filePath ?? null);

                const actions: Array<{ text: string; onPress?: () => void }> = [];

                if (FileViewer && filePath) {
                    actions.push({
                        text: "Open",
                        onPress: async () => {
                            try {
                                await FileViewer.open(filePath, { showOpenWithDialog: true });
                            } catch {
                                Alert.alert("Open Failed", "Could not open the file on this device.");
                            }
                        },
                    });
                }

                if (ShareRN && filePath) {
                    actions.push({
                        text: "Share",
                        onPress: async () => {
                            try {
                                await ShareRN.open({
                                    url: `file://${filePath}`,
                                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                    failOnCancel: false,
                                });
                            } catch {
                                /* ignore */
                            }
                        },
                    });
                }

                actions.push({ text: "OK" });

                Alert.alert("Download Complete", "Excel file downloaded. Open it or share it now.", actions);
            } else {
                Alert.alert("Download Failed", result?.error || "Failed to download Excel file");
            }
        } catch {
            Alert.alert("Download Failed", "An unexpected error occurred while downloading the file");
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
            lastProgressUpdateRef.current = 0;
        }
    };

    const handleDownloadExcelFromLocal = async (scanId: number) => {
        if (!selected) return;
        await handleLocalExcelDownload(scanId, fullScans ?? []);
    };

    const handleDownloadExcel = async (scanId: number) => {
        if (!selected) return;

        Alert.alert(
            "Download Excel",
            "Choose download source:",
            [
                {
                    text: "Server",
                    onPress: () => handleDownloadExcelFromServer(scanId),
                },
                {
                    text: "Local",
                    onPress: () => handleDownloadExcelFromLocal(scanId),
                },
                {
                    text: "Cancel",
                    style: "cancel",
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <Box
            style={{
                flex: 1,
                backgroundColor: isDark ? '#0f172a' : '#f8fafc'
            }}
        >
            {/* Header */}
            <Box
                style={{
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    paddingBottom: 16,
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#334155' : '#e2e8f0',
                }}
            >
                <HStack style={{ alignItems: "center", justifyContent: "space-between" }}>
                    <VStack>
                        <Heading size="xl" className={isDark ? "text-typography-50" : "text-typography-900"}>
                            Full Scans
                        </Heading>
                        <Text className={`mt-1 ${isDark ? "text-typography-400" : "text-typography-600"}`} style={{ fontSize: 12 }}>
                            {fullScans?.length || 0} {fullScans?.length === 1 ? "scan" : "scans"}
                        </Text>
                    </VStack>

                    {(ConnectivityTest?.testConnection || excelService?.ping) && (
                        <Button
                            variant="outline"
                            action="secondary"
                            onPress={doConnectivityTest}
                            style={{
                                borderColor: isDark ? '#475569' : '#cbd5e1',
                                backgroundColor: 'transparent',
                            }}
                        >
                            <HStack style={{ alignItems: "center", gap: 6 }}>
                                <Feather
                                    name="wifi"
                                    size={16}
                                    color={isDark ? '#cbd5e1' : '#64748b'}
                                />
                                <Text className={isDark ? "text-typography-200" : "text-typography-700"}>
                                    Test
                                </Text>
                            </HStack>
                        </Button>
                    )}
                </HStack>
            </Box>

            <FlatList
                data={fullScans}
                keyExtractor={(item: any) => String(item.id)}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <VStack
                        style={{
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 60,
                            paddingHorizontal: 20
                        }}
                    >
                        <Box
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: 20,
                            }}
                        >
                            <Feather
                                name="inbox"
                                size={40}
                                color={isDark ? '#475569' : '#94a3b8'}
                            />
                        </Box>
                        <Text className={`text-lg font-semibold mb-2 ${isDark ? "text-typography-200" : "text-typography-700"}`}>
                            {t("noFullScans") ?? "Keine Full Scans vorhanden"}
                        </Text>
                        <Text className={`text-sm text-center ${isDark ? "text-typography-400" : "text-typography-500"}`}>
                            Start a new scan to see it here
                        </Text>
                    </VStack>
                )}
                renderItem={({ item }: { item: any }) => {
                    const sectionStatuses = {
                        injection: getSectionStatus(item.injection, "injection"),
                        holdingPressure: getSectionStatus(item.holdingPressure, "holdingPressure"),
                        dosing: getSectionStatus(item.dosing, "dosing"),
                        cylinderHeating: getSectionStatus(item.cylinderHeating, "cylinderHeating"),
                    };

                    const uploadStatus: UploadStatus = getUploadStatus?.(item.id) ?? "unknown";
                    const isUploading = uploadStatus === "uploading";
                    const statusConfig = getStatusConfig(uploadStatus);

                    return (
                        <Box
                            style={{
                                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                                borderRadius: 12,
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: isDark ? '#334155' : '#e2e8f0',
                                ...(Platform.OS !== 'web' && {
                                    shadowColor: isDark ? '#000000' : '#000000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isDark ? 0.3 : 0.1,
                                    shadowRadius: 4,
                                    elevation: 3,
                                }),
                            }}
                        >
                            <VStack style={{ padding: 16 }} className="gap-4">
                                {/* Header Row */}
                                <HStack style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                                    <VStack style={{ flex: 1 }} className="gap-1">
                                        <HStack style={{ alignItems: "center", gap: 8 }}>
                                            <Feather
                                                name="user"
                                                size={16}
                                                color={isDark ? '#cbd5e1' : '#64748b'}
                                            />
                                            <Text className={`font-semibold ${isDark ? "text-typography-50" : "text-typography-900"}`}>
                                                {item.author || t("unknown") || "Unbekannt"}
                                            </Text>
                                        </HStack>

                                        <HStack style={{ alignItems: "center", gap: 6 }}>
                                            <Feather
                                                name="clock"
                                                size={14}
                                                color={isDark ? '#94a3b8' : '#94a3b8'}
                                            />
                                            <Text className={`text-sm ${isDark ? "text-typography-400" : "text-typography-600"}`}>
                                                {new Date(item.date).toLocaleString()}
                                            </Text>
                                        </HStack>

                                        {!!item.serverId && (
                                            <HStack style={{ alignItems: "center", gap: 6 }}>
                                                <Feather
                                                    name="server"
                                                    size={14}
                                                    color={isDark ? '#94a3b8' : '#94a3b8'}
                                                />
                                                <Text className={`text-xs ${isDark ? "text-typography-500" : "text-typography-500"}`}>
                                                    ID: {item.serverId}
                                                </Text>
                                            </HStack>
                                        )}
                                    </VStack>

                                    <Badge
                                        action={statusConfig.badgeAction}
                                        variant="solid"
                                        style={{
                                            backgroundColor: statusConfig.bgColor,
                                            borderWidth: 0,
                                        }}
                                    >
                                        <HStack style={{ alignItems: "center", gap: 4 }}>
                                            <Feather
                                                name={statusConfig.icon}
                                                size={12}
                                                color={statusConfig.color}
                                            />
                                            <BadgeText
                                                style={{
                                                    color: statusConfig.color,
                                                    fontSize: 11,
                                                }}
                                            >
                                                {statusConfig.text}
                                            </BadgeText>
                                        </HStack>
                                    </Badge>
                                </HStack>

                                <Divider orientation="horizontal" style={{
                                    backgroundColor: isDark ? '#334155' : '#e2e8f0',
                                    height: 1,
                                }} />

                                {/* Section chips */}
                                <HStack className="flex-wrap" style={{ gap: 8 }}>
                                    {Object.entries(sectionStatuses).map(([key, status]) => {
                                        let bgColor, textColor, icon;
                                        if (status === "complete") {
                                            bgColor = isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.1)';
                                            textColor = isDark ? '#10b981' : '#059669';
                                            icon = "check-circle";
                                        } else if (status === "partial") {
                                            bgColor = isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.1)';
                                            textColor = isDark ? '#f59e0b' : '#d97706';
                                            icon = "alert-circle";
                                        } else {
                                            bgColor = isDark ? '#334155' : '#f1f5f9';
                                            textColor = isDark ? '#94a3b8' : '#64748b';
                                            icon = "circle";
                                        }
                                        return (
                                            <HStack
                                                key={key}
                                                style={{
                                                    backgroundColor: bgColor,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 6,
                                                    borderRadius: 6,
                                                    alignItems: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                <Feather
                                                    name={icon as any}
                                                    size={12}
                                                    color={textColor}
                                                />
                                                <Text style={{
                                                    color: textColor,
                                                    fontSize: 11,
                                                    fontWeight: '500',
                                                    textTransform: 'capitalize',
                                                }}>
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </Text>
                                            </HStack>
                                        );
                                    })}
                                </HStack>

                                {/* Action buttons */}
                                <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                                    <Button
                                        variant="outline"
                                        action="secondary"
                                        onPress={() => {
                                            setSelectedId(item.id);
                                            setIsDetailsOpen(true);
                                        }}
                                        style={{
                                            borderColor: isDark ? '#475569' : '#cbd5e1',
                                            backgroundColor: 'transparent',
                                            flex: 1,
                                            marginRight: 8,
                                        }}
                                    >
                                        <HStack style={{ alignItems: "center", gap: 6 }}>
                                            <Feather
                                                name="eye"
                                                size={14}
                                                color={isDark ? '#cbd5e1' : '#64748b'}
                                            />
                                            <Text className={isDark ? "text-typography-200" : "text-typography-700"}>
                                                {t("details") ?? "Details"}
                                            </Text>
                                        </HStack>
                                    </Button>

                                    {(uploadScan || updateScan) && (
                                        <>
                                            {(uploadStatus === "not_uploaded" || uploadStatus === "error") && uploadScan && (
                                                <Button
                                                    variant="solid"
                                                    action="primary"
                                                    onPress={() => handleUpload(item.id)}
                                                    disabled={isUploading}
                                                    style={{
                                                        backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                                                        flex: 1,
                                                    }}
                                                >
                                                    <HStack style={{ alignItems: "center", gap: 6 }}>
                                                        {isUploading ? (
                                                            <Feather name="loader" size={14} color="#ffffff" />
                                                        ) : (
                                                            <Feather name="upload" size={14} color="#ffffff" />
                                                        )}
                                                        <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                                                            {isUploading ? "Uploading..." : "Upload"}
                                                        </Text>
                                                    </HStack>
                                                </Button>
                                            )}
                                            {uploadStatus === "needs_update" && updateScan && (
                                                <Button
                                                    variant="solid"
                                                    action="secondary"
                                                    onPress={() => handleUpdate(item.id)}
                                                    disabled={isUploading}
                                                    style={{
                                                        backgroundColor: isDark ? '#f59e0b' : '#d97706',
                                                        flex: 1,
                                                    }}
                                                >
                                                    <HStack style={{ alignItems: "center", gap: 6 }}>
                                                        {isUploading ? (
                                                            <Feather name="loader" size={14} color="#ffffff" />
                                                        ) : (
                                                            <Feather name="refresh-cw" size={14} color="#ffffff" />
                                                        )}
                                                        <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                                                            {isUploading ? "Updating..." : "Update"}
                                                        </Text>
                                                    </HStack>
                                                </Button>
                                            )}
                                            {uploadStatus === "uploaded" && updateScan && (
                                                <Button
                                                    variant="outline"
                                                    action="secondary"
                                                    onPress={() => handleUpdate(item.id)}
                                                    disabled={isUploading}
                                                    style={{
                                                        borderColor: isDark ? '#475569' : '#cbd5e1',
                                                        backgroundColor: 'transparent',
                                                        flex: 1,
                                                    }}
                                                >
                                                    <HStack style={{ alignItems: "center", gap: 6 }}>
                                                        {isUploading ? (
                                                            <Feather name="loader" size={14} color={isDark ? '#cbd5e1' : '#64748b'} />
                                                        ) : (
                                                            <Feather name="refresh-cw" size={14} color={isDark ? '#cbd5e1' : '#64748b'} />
                                                        )}
                                                        <Text className={isDark ? "text-typography-200" : "text-typography-700"}>
                                                            {isUploading ? "Updating..." : "Re-upload"}
                                                        </Text>
                                                    </HStack>
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </HStack>
                            </VStack>
                        </Box>
                    );
                }}
            />

            {/* Details Modal (fixed for scrolling) */}
            <RNModal
                transparent
                animationType="fade"
                visible={isDetailsOpen}
                onRequestClose={() => setIsDetailsOpen(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 20,
                    }}
                >
                    {/* Backdrop tap target behind the card */}
                    <Pressable onPress={() => setIsDetailsOpen(false)} style={StyleSheet.absoluteFillObject as any} />

                    {/* Card (non-pressable so scroll gestures work) */}
                    <View
                        style={{
                            backgroundColor: isDark ? "#1e293b" : "#ffffff",
                            borderRadius: 20,
                            maxHeight: "85%",
                            width: "90%",
                            borderWidth: 1,
                            borderColor: isDark ? "#334155" : "#e2e8f0",
                            overflow: "hidden",
                            ...(Platform.OS !== 'web' && {
                                shadowColor: '#000000',
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.3,
                                shadowRadius: 12,
                                elevation: 8,
                            }),
                        }}
                    >
                        {/* Modal Header */}
                        <Box
                            style={{
                                padding: 20,
                                borderBottomWidth: 1,
                                borderBottomColor: isDark ? "#334155" : "#e2e8f0",
                                backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                            }}
                        >
                            <HStack style={{ alignItems: "center", justifyContent: "space-between" }}>
                                <Heading size="lg" className={isDark ? "text-typography-50" : "text-typography-900"}>
                                    {t("fullScanDetails") ?? "Full Scan Details"}
                                </Heading>
                                <Pressable
                                    onPress={() => setIsDetailsOpen(false)}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: isDark ? "#334155" : "#e2e8f0",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Feather
                                        name="x"
                                        size={18}
                                        color={isDark ? "#cbd5e1" : "#64748b"}
                                    />
                                </Pressable>
                            </HStack>
                        </Box>

                        <ScrollView
                            style={{ maxHeight: 500 }}
                            contentContainerStyle={{ padding: 20 }}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={true}
                        >
                            {selected ? (
                                <VStack className="gap-4">
                                    {/* Header info */}
                                    <VStack
                                        style={{
                                            padding: 16,
                                            borderRadius: 12,
                                            backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                                            borderWidth: 1,
                                            borderColor: isDark ? "#334155" : "#e2e8f0",
                                        }}
                                        className="gap-3"
                                    >
                                        <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                                            <VStack style={{ flex: 1 }} className="gap-1">
                                                <HStack style={{ alignItems: "center", gap: 6 }}>
                                                    <Feather
                                                        name="user"
                                                        size={14}
                                                        color={isDark ? "#94a3b8" : "#64748b"}
                                                    />
                                                    <Text className={`text-xs ${isDark ? "text-typography-400" : "text-typography-600"}`}>
                                                        {t("author") ?? "Autor"}
                                                    </Text>
                                                </HStack>
                                                <Text className={`font-semibold ${isDark ? "text-typography-50" : "text-typography-900"}`}>
                                                    {selected.author || "Unbekannt"}
                                                </Text>
                                            </VStack>
                                            <VStack style={{ alignItems: "flex-end" }} className="gap-1">
                                                <HStack style={{ alignItems: "center", gap: 6 }}>
                                                    <Feather
                                                        name="clock"
                                                        size={14}
                                                        color={isDark ? "#94a3b8" : "#64748b"}
                                                    />
                                                    <Text className={`text-xs ${isDark ? "text-typography-400" : "text-typography-600"}`}>
                                                        {t("date") ?? "Datum"}
                                                    </Text>
                                                </HStack>
                                                <Text className={`font-semibold ${isDark ? "text-typography-200" : "text-typography-700"}`}>
                                                    {new Date(selected.date).toLocaleString()}
                                                </Text>
                                            </VStack>
                                        </HStack>
                                        {!!selected.serverId && (
                                            <HStack style={{ alignItems: "center", gap: 6 }}>
                                                <Feather
                                                    name="server"
                                                    size={14}
                                                    color={isDark ? "#94a3b8" : "#64748b"}
                                                />
                                                <Text className={`text-xs ${isDark ? "text-typography-400" : "text-typography-600"}`}>
                                                    Server ID: {selected.serverId}
                                                </Text>
                                            </HStack>
                                        )}
                                    </VStack>

                                    {/* Sections */}
                                    <Heading size="md" className={isDark ? "text-typography-50" : "text-typography-900"}>
                                        {t("savedSections") ?? "Gespeicherte Bereiche"}
                                    </Heading>

                                    {(["injection", "dosing", "holdingPressure", "cylinderHeating"] as const).map((key) => (
                                        <VStack
                                            key={key}
                                            style={{
                                                padding: 16,
                                                borderRadius: 12,
                                                backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                                                borderWidth: 1,
                                                borderColor: isDark ? "#334155" : "#e2e8f0",
                                            }}
                                            className="gap-3"
                                        >
                                            <HStack style={{ alignItems: "center", gap: 8 }}>
                                                <View
                                                    style={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: 6,
                                                        backgroundColor: selected[key]
                                                            ? (isDark ? "#10b981" : "#059669")
                                                            : isDark
                                                                ? "#475569"
                                                                : "#cbd5e1",
                                                    }}
                                                />
                                                <Text className={`font-semibold capitalize ${isDark ? "text-typography-50" : "text-typography-900"}`}>
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </Text>
                                            </HStack>

                                            {!selected[key] ? (
                                                <Text className={isDark ? "text-typography-400" : "text-typography-500"}>
                                                    {t("notAvailable") ?? "Nicht vorhanden"}
                                                </Text>
                                            ) : (
                                                <SectionDetails sectionKey={key} data={(selected as any)[key]} isDark={isDark} />
                                            )}
                                        </VStack>
                                    ))}
                                </VStack>
                            ) : (
                                <Text className={isDark ? "text-typography-400" : "text-typography-600"}>
                                    {t("noSelection") ?? "Keine Auswahl"}
                                </Text>
                            )}
                        </ScrollView>

                        {/* Footer with Download */}
                        <Box
                            style={{
                                padding: 20,
                                borderTopWidth: 1,
                                borderTopColor: isDark ? "#334155" : "#e2e8f0",
                                backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                            }}
                        >
                            {isDownloading && (
                                <VStack className="mb-4 gap-2">
                                    <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                                        <Text className={`text-sm ${isDark ? "text-typography-300" : "text-typography-600"}`}>
                                            Download Progress
                                        </Text>
                                        <Text className={`text-sm font-semibold ${isDark ? "text-typography-200" : "text-typography-700"}`}>
                                            {Math.round(downloadProgress * 100)}%
                                        </Text>
                                    </HStack>
                                    <View
                                        style={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: isDark ? "#334155" : "#e2e8f0",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <View
                                            style={{
                                                height: 6,
                                                width: `${Math.round(downloadProgress * 100)}%`,
                                                backgroundColor: isDark ? "#3b82f6" : "#2563eb",
                                                borderRadius: 3,
                                            }}
                                        />
                                    </View>
                                </VStack>
                            )}

                            <HStack style={{ gap: 12 }}>
                                <Button
                                    variant="solid"
                                    action="primary"
                                    onPress={() => selected && handleDownloadExcel(selected.id)}
                                    disabled={
                                        isDownloading ||
                                        !selected
                                    }
                                    style={{
                                        backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                                        flex: 1,
                                        opacity: (
                                            isDownloading ||
                                            !selected
                                        ) ? 0.5 : 1,
                                    }}
                                >
                                    <HStack style={{ alignItems: "center", gap: 6 }}>
                                        <Feather name="download" size={16} color="#ffffff" />
                                        <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                                            Download Excel
                                        </Text>
                                    </HStack>
                                </Button>
                                <Button
                                    variant="outline"
                                    action="secondary"
                                    onPress={() => setIsDetailsOpen(false)}
                                    style={{
                                        borderColor: isDark ? '#475569' : '#cbd5e1',
                                        backgroundColor: 'transparent',
                                    }}
                                >
                                    <Text className={isDark ? "text-typography-200" : "text-typography-700"}>
                                        {t("close") ?? "Schließen"}
                                    </Text>
                                </Button>
                            </HStack>
                        </Box>
                    </View>
                </View>
            </RNModal>
        </Box>
    );
}

function SectionDetails({
                            sectionKey,
                            data,
                            isDark,
                        }: {
    sectionKey: "injection" | "holdingPressure" | "dosing" | "cylinderHeating";
    data: any;
    isDark: boolean;
}) {
    if (!data) {
        return (
            <Text className={isDark ? "text-typography-400" : "text-typography-500"}>
                No data available
            </Text>
        );
    }

    const hasContent = () => {
        if (sectionKey === "injection") {
            return !!(data?.mainMenu || data?.subMenuValues?.values || data?.switchType);
        }
        if (sectionKey === "holdingPressure") {
            return !!(data?.mainMenu || data?.subMenusValues?.values);
        }
        if (sectionKey === "dosing") {
            return !!(data?.mainMenu || data?.dosingSpeedsValues?.values || data?.dosingPressuresValues?.values);
        }
        if (sectionKey === "cylinderHeating") {
            return !!data && Object.keys(data).length > 0;
        }
        return false;
    };

    if (!hasContent()) {
        return (
            <VStack className="gap-2">
                <Text className={isDark ? "text-typography-400" : "text-typography-500"}>
                    Data structure not recognized
                </Text>
                {data && typeof data === 'object' && (
                    <DataBlock
                        title="Raw Data"
                        entries={Object.entries(data)}
                        isDark={isDark}
                    />
                )}
            </VStack>
        );
    }

    if (sectionKey === "injection") {
        return (
            <VStack className="gap-3">
                {data?.mainMenu && Object.keys(data.mainMenu).length > 0 && (
                    <DataBlock title="Main Menu" entries={Object.entries(data.mainMenu)} isDark={isDark} />
                )}
                {Array.isArray(data?.subMenuValues?.values) && data.subMenuValues.values.length > 0 && (
                    <ArrayBlock
                        title="Sub Menu · Werte"
                        entries={data.subMenuValues.values}
                        columns={["index", "v", "v2"]}
                        isDark={isDark}
                    />
                )}
                {data?.switchType && Object.keys(data.switchType).length > 0 && (
                    <DataBlock title="Switch Type" entries={Object.entries(data.switchType)} isDark={isDark} />
                )}
            </VStack>
        );
    }

    if (sectionKey === "holdingPressure") {
        return (
            <VStack className="gap-3">
                {data?.mainMenu && Object.keys(data.mainMenu).length > 0 && (
                    <DataBlock title="Main Menu" entries={Object.entries(data.mainMenu)} isDark={isDark} />
                )}
                {Array.isArray(data?.subMenusValues?.values) && data.subMenusValues.values.length > 0 && (
                    <ArrayBlock
                        title="Sub Menu · Werte"
                        entries={data.subMenusValues.values}
                        columns={["index", "t", "p"]}
                        isDark={isDark}
                    />
                )}
            </VStack>
        );
    }

    if (sectionKey === "dosing") {
        return (
            <VStack className="gap-3">
                {data?.mainMenu && Object.keys(data.mainMenu).length > 0 && (
                    <DataBlock title="Main Menu" entries={Object.entries(data.mainMenu)} isDark={isDark} />
                )}
                {Array.isArray(data?.dosingSpeedsValues?.values) && data.dosingSpeedsValues.values.length > 0 && (
                    <ArrayBlock title="Speeds" entries={data.dosingSpeedsValues.values} columns={["index", "v", "v2"]} isDark={isDark} />
                )}
                {Array.isArray(data?.dosingPressuresValues?.values) && data.dosingPressuresValues.values.length > 0 && (
                    <ArrayBlock
                        title="Pressures"
                        entries={data.dosingPressuresValues.values}
                        columns={["index", "v", "v2"]}
                        isDark={isDark}
                    />
                )}
            </VStack>
        );
    }

    if (sectionKey === "cylinderHeating") {
        if (!data || typeof data !== 'object') {
            return (
                <Text className={isDark ? "text-typography-400" : "text-typography-500"}>
                    Invalid data format
                </Text>
            );
        }

        const entries = Object.entries(data).filter(([_, value]) => value != null);

        if (entries.length === 0) {
            return (
                <Text className={isDark ? "text-typography-400" : "text-typography-500"}>
                    No data available
                </Text>
            );
        }

        return (
            <VStack
                style={{
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    borderRadius: 8,
                    padding: 12,
                }}
                className="gap-2"
            >
                {entries.map(([label, value]) => (
                    <HStack key={label} style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Text className={`text-sm ${isDark ? "text-typography-400" : "text-typography-600"}`}>
                            {label}
                        </Text>
                        <Text className={`text-sm font-medium ${isDark ? "text-typography-100" : "text-typography-900"}`}>
                            {typeof value === 'object' && value !== null && 'value' in value ? `${value.value} ${value.unit || ''}`.trim() : String(value)}
                        </Text>
                    </HStack>
                ))}
            </VStack>
        );
    }

    return null;
}

function DataBlock({
                       title,
                       entries,
                       isDark,
                   }: {
    title: string;
    entries: [string, unknown][];
    isDark: boolean;
}) {
    return (
        <VStack className="gap-2">
            <Text className={`text-sm font-semibold mb-1 ${isDark ? "text-typography-200" : "text-typography-700"}`}>
                {title}
            </Text>
            <VStack
                style={{
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    borderRadius: 8,
                    padding: 12,
                }}
                className="gap-2"
            >
                {entries.map(([label, value]) => (
                    <HStack key={label} style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Text className={`text-sm ${isDark ? "text-typography-400" : "text-typography-600"}`}>
                            {label}
                        </Text>
                        <Text className={`text-sm font-medium ${isDark ? "text-typography-100" : "text-typography-900"}`}>
                            {typeof value === 'object' && value !== null && 'value' in value ? `${value.value} ${value.unit || ''}`.trim() : String(value)}
                        </Text>
                    </HStack>
                ))}
            </VStack>
        </VStack>
    );
}

function ArrayBlock({
                        title,
                        entries,
                        columns,
                        isDark,
                    }: {
    title: string;
    entries: any[];
    columns: string[];
    isDark: boolean;
}) {
    return (
        <VStack className="gap-2">
            <Text className={`text-sm font-semibold mb-1 ${isDark ? "text-typography-200" : "text-typography-700"}`}>
                {title}
            </Text>
            <VStack
                style={{
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    borderRadius: 8,
                    padding: 12,
                }}
                className="gap-2"
            >
                {/* Header Row */}
                <HStack
                    style={{
                        justifyContent: "space-between",
                        paddingBottom: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? "#334155" : "#e2e8f0",
                    }}
                >
                    {columns.map((col) => (
                        <Text
                            key={col}
                            className={`text-xs font-semibold uppercase ${isDark ? "text-typography-400" : "text-typography-500"}`}
                            style={{ flex: 1 }}
                        >
                            {col}
                        </Text>
                    ))}
                </HStack>
                {/* Data Rows */}
                {entries.map((row, idx) => (
                    <HStack
                        key={idx}
                        style={{
                            justifyContent: "space-between",
                            paddingVertical: 4,
                        }}
                    >
                        {columns.map((col) => (
                            <Text
                                key={col}
                                className={`text-sm ${isDark ? "text-typography-200" : "text-typography-700"}`}
                                style={{ flex: 1 }}
                            >
                                {String(row[col] ?? (col === "index" ? idx + 1 : "-"))}
                            </Text>
                        ))}
                    </HStack>
                ))}
            </VStack>
        </VStack>
    );
}
