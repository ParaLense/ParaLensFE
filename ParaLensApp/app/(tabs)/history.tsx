import React, { useMemo, useRef, useState } from "react";
import { FlatList, Modal as RNModal, Pressable, ScrollView, View, Alert, Platform } from "react-native";

// Your Expo UI aliases
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

// Contexts (Expo aliases)
import { useFullScan } from "@/features/fullscan/fullscan-context";
import { useI18n } from "@/features/settings/i18n";
import { useSettings } from "@/features/settings/settings-context";

// Optionally available API context (adjust path if needed)
import { useApiContext } from "@/features/api/api-context";

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

type UploadStatus = "not_uploaded" | "uploaded" | "needs_update" | "uploading" | "error" | "unknown";

/**
 * Merged History Screen: keeps your Expo theming and adds:
 * - section completeness chips (complete/partial/not_scanned)
 * - upload/update/re-upload flows + status emoji/text
 * - serverId display
 * - connectivity test
 * - Excel download with progress bar
 *
 * Pulls UI structure from your Expo file, and logic/features from your newer file. :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3}
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

    const getStatusEmoji = (status: UploadStatus) => {
        switch (status) {
            case "uploaded":
                return "🟢";
            case "needs_update":
                return "🟠";
            case "uploading":
                return "🔄";
            case "error":
                return "🔴";
            default:
                return "⚪";
        }
    };

    const getStatusText = (status: UploadStatus) => {
        switch (status) {
            case "uploaded":
                return "Uploaded";
            case "needs_update":
                return "Needs Update";
            case "uploading":
                return "Uploading...";
            case "error":
                return "Upload Failed";
            case "not_uploaded":
                return "Not Uploaded";
            default:
                return "Unknown";
        }
    };

    const getSectionStatus = (section: any, type: "injection" | "dosing" | "holdingPressure" | "cylinderHeating") => {
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
        const hasAnySetpoint = !!(section.setpoint1 || section.setpoint2 || section.setpoint3 || section.setpoint4 || section.setpoint5);
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

    const handleDownloadExcel = async (scanId: number) => {
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
            const result = await excelService.downloadExcel(scanName, (progress: number) => {
                const now = Date.now();
                const last = lastProgressUpdateRef.current || 0;
                if (progress >= 1 || now - last >= 250) {
                    lastProgressUpdateRef.current = now;
                    if (!Number.isNaN(progress) && progress >= 0 && progress <= 1) {
                        setDownloadProgress(progress);
                    }
                }
            });

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

    return (
        <Box
            style={{ flex: 1, padding: 16 }}
            className={isDark ? "bg-backgroundDark950" : "bg-backgroundLight0"}
        >
            <HStack style={{ alignItems: "center", justifyContent: "space-between" }} className="mb-3">
                <Heading
                    size="lg"
                    className={isDark ? "text-typography-50" : "text-typography-900"}
                >
                    Full Scans
                </Heading>

                {/* Connectivity Test (hidden if no service available) */}
                {(ConnectivityTest?.testConnection || excelService?.ping) && (
                    <Button variant="outline" action="secondary" onPress={doConnectivityTest}>
                        <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                            Test Connection
                        </Text>
                    </Button>
                )}
            </HStack>

            <FlatList
                data={fullScans}
                ListEmptyComponent={() => (
                    <Text
                        className={`mt-6 ${isDark ? "text-typography-200" : "text-typography-600"}`}
                    >
                        {t("noFullScans") ?? "Keine Full Scans vorhanden"}
                    </Text>
                )}
                keyExtractor={(item: any) => String(item.id)}
                renderItem={({ item }: { item: any }) => {
                    const sectionStatuses = {
                        injection: getSectionStatus(item.injection, "injection"),
                        holdingPressure: getSectionStatus(item.holdingPressure, "holdingPressure"),
                        dosing: getSectionStatus(item.dosing, "dosing"),
                        cylinderHeating: getSectionStatus(item.cylinderHeating, "cylinderHeating"),
                    };

                    const uploadStatus: UploadStatus = getUploadStatus?.(item.id) ?? "unknown";
                    const isUploading = uploadStatus === "uploading";

                    return (
                        <Box
                            className={`${
                                isDark
                                    ? "bg-backgroundDark900 border border-backgroundDark800"
                                    : "bg-backgroundLight100 border border-backgroundLight200"
                            } p-3 rounded mb-2.5`}
                        >
                            <HStack style={{ alignItems: "center", justifyContent: "space-between" }}>
                                <VStack style={{ flex: 1 }}>
                                    <HStack style={{ alignItems: "center" }}>
                                        <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                                            {item.author || t("unknown") || "Unbekannt"}
                                        </Text>
                                        <Text className={isDark ? "text-typography-300" : "text-typography-600"}>{"  "}
                                            {getStatusEmoji(uploadStatus)} {getStatusText(uploadStatus)}
                                        </Text>
                                    </HStack>

                                    <Text
                                        className={isDark ? "text-typography-300" : "text-typography-600"}
                                    >
                                        {new Date(item.date).toLocaleString()}
                                    </Text>

                                    {!!item.serverId && (
                                        <Text className={isDark ? "text-typography-400" : "text-typography-600"}>
                                            Server ID: {item.serverId}
                                        </Text>
                                    )}
                                </VStack>

                                <HStack className="gap-2">
                                    <Button
                                        variant="outline"
                                        action="secondary"
                                        onPress={() => {
                                            setSelectedId(item.id);
                                            setIsDetailsOpen(true);
                                        }}
                                    >
                                        <Text>{t("details") ?? "Details"}</Text>
                                    </Button>
                                </HStack>
                            </HStack>

                            {/* Section chips */}
                            <HStack className="mt-3 flex-wrap gap-2">
                                {Object.entries(sectionStatuses).map(([key, status]) => {
                                    let bg, text;
                                    if (status === "complete") {
                                        bg = "bg-success-600";
                                        text = "text-typography-0";
                                    } else if (status === "partial") {
                                        bg = "bg-warning-500";
                                        text = "text-typography-0";
                                    } else {
                                        bg = isDark ? "bg-backgroundDark800" : "bg-backgroundLight200";
                                        text = isDark ? "text-typography-400" : "text-typography-600";
                                    }
                                    return (
                                        <Box key={key} className={`px-2 py-1 rounded ${bg}`}>
                                            <Text className={text}>{key}</Text>
                                        </Box>
                                    );
                                })}
                            </HStack>

                            {/* Upload / Update buttons (only show if handlers exist) */}
                            {(uploadScan || updateScan) && (
                                <HStack className="mt-3" style={{ justifyContent: "flex-end" }}>
                                    {(uploadStatus === "not_uploaded" || uploadStatus === "error") && uploadScan && (
                                        <Button
                                            variant="solid"
                                            action="primary"
                                            onPress={() => handleUpload(item.id)}
                                            disabled={isUploading}
                                        >
                                            <Text className="text-typography-0">
                                                {isUploading ? "Uploading..." : "Upload"}
                                            </Text>
                                        </Button>
                                    )}
                                    {uploadStatus === "needs_update" && updateScan && (
                                        <Button
                                            className="ml-2"
                                            variant="solid"
                                            action="secondary"
                                            onPress={() => handleUpdate(item.id)}
                                            disabled={isUploading}
                                        >
                                            <Text className="text-typography-0">
                                                {isUploading ? "Updating..." : "Update"}
                                            </Text>
                                        </Button>
                                    )}
                                    {uploadStatus === "uploaded" && updateScan && (
                                        <Button
                                            className="ml-2"
                                            variant="outline"
                                            action="secondary"
                                            onPress={() => handleUpdate(item.id)}
                                            disabled={isUploading}
                                        >
                                            <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                                                {isUploading ? "Updating..." : "Re-upload"}
                                            </Text>
                                        </Button>
                                    )}
                                </HStack>
                            )}
                        </Box>
                    );
                }}
            />

            {/* Details Modal (kept RN modal for zero extra deps) */}
            <RNModal
                transparent
                animationType="fade"
                visible={isDetailsOpen}
                onRequestClose={() => setIsDetailsOpen(false)}
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        justifyContent: "center",
                        paddingHorizontal: 20,
                    }}
                    onPress={() => setIsDetailsOpen(false)}
                >
                    <Pressable
                        style={{
                            backgroundColor: isDark ? "#0f172a" : "#ffffff",
                            padding: 20,
                            borderRadius: 20,
                            maxHeight: "85%",
                            width: "90%",
                            alignSelf: "center",
                        }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Heading
                            size="md"
                            className={isDark ? "text-typography-50" : "text-typography-900"}
                        >
                            {t("fullScanDetails") ?? "Full Scan Details"}
                        </Heading>

                        {/* Header info */}
                        {selected && (
                            <VStack
                                className="mt-3 p-3 rounded"
                                style={{
                                    backgroundColor: isDark ? "#111827" : "#f8fafc",
                                    borderWidth: 1,
                                    borderColor: isDark ? "#1f2937" : "#e5e7eb",
                                }}
                            >
                                <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                                    <VStack style={{ flex: 1 }}>
                                        <Text className={isDark ? "text-typography-300" : "text-typography-600"}>
                                            {t("author") ?? "Autor"}
                                        </Text>
                                        <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                                            {selected.author || "Unbekannt"}
                                        </Text>
                                    </VStack>
                                    <VStack style={{ alignItems: "flex-end" }}>
                                        <Text className={isDark ? "text-typography-300" : "text-typography-600"}>
                                            {t("date") ?? "Datum"}
                                        </Text>
                                        <Text className={isDark ? "text-typography-200" : "text-typography-700"}>
                                            {new Date(selected.date).toLocaleString()}
                                        </Text>
                                    </VStack>
                                </HStack>
                                {!!selected.serverId && (
                                    <Text className={isDark ? "text-typography-400" : "text-typography-600"}>Server ID: {selected.serverId}</Text>
                                )}
                            </VStack>
                        )}

                        <ScrollView style={{ marginTop: 16 }}>
                            {!selected ? (
                                <Text className="text-typography-500">
                                    {t("noSelection") ?? "Keine Auswahl"}
                                </Text>
                            ) : (
                                <VStack className="gap-4">
                                    <Heading size="sm" className={isDark ? "text-typography-50" : "text-typography-900"}>
                                        {t("savedSections") ?? "Gespeicherte Bereiche"}
                                    </Heading>

                                    {(["injection", "dosing", "holdingPressure", "cylinderHeating"] as const).map(
                                        (key) => (
                                            <VStack
                                                key={key}
                                                className="p-3 rounded gap-2"
                                                style={{
                                                    backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                                                    borderWidth: 1,
                                                    borderColor: isDark ? "#334155" : "#e2e8f0",
                                                }}
                                            >
                                                <HStack style={{ alignItems: "center" }}>
                                                    <View
                                                        style={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: 9999,
                                                            backgroundColor: selected[key] ? "#16a34a" : isDark ? "#374151" : "#cbd5e1",
                                                            marginRight: 8,
                                                        }}
                                                    />
                                                    <Text className={isDark ? "text-typography-0" : "text-typography-900"}>
                                                        {key}
                                                    </Text>
                                                </HStack>

                                                {!selected[key] ? (
                                                    <Text className="text-typography-400">
                                                        {t("notAvailable") ?? "Nicht vorhanden"}
                                                    </Text>
                                                ) : (
                                                    <SectionDetails sectionKey={key} data={(selected as any)[key]} isDark={isDark} />
                                                )}
                                            </VStack>
                                        ),
                                    )}
                                </VStack>
                            )}
                        </ScrollView>

                        {/* Footer with Download (only if service + selected + uploaded) */}
                        <HStack className="mt-4" style={{ justifyContent: "space-between", alignItems: "center" }}>
                            <VStack style={{ flex: 1, paddingRight: 8 }}>
                                {isDownloading && (
                                    <>
                                        <HStack style={{ justifyContent: "space-between" }}>
                                            <Text className={isDark ? "text-typography-300" : "text-typography-600"}>
                                                Download Progress
                                            </Text>
                                            <Text className={isDark ? "text-typography-200" : "text-typography-700"}>
                                                {Math.round(downloadProgress * 100)}%
                                            </Text>
                                        </HStack>
                                        {/* Simple progress bar without extra libs */}
                                        <View
                                            style={{
                                                height: 8,
                                                borderRadius: 8,
                                                backgroundColor: isDark ? "#374151" : "#e5e7eb",
                                                overflow: "hidden",
                                                marginTop: 4,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    height: 8,
                                                    width: `${Math.round(downloadProgress * 100)}%`,
                                                    backgroundColor: isDark ? "#60a5fa" : "#2563eb",
                                                }}
                                            />
                                        </View>
                                    </>
                                )}
                            </VStack>

                            <HStack style={{ gap: 12 }}>
                                <Button
                                    variant="solid"
                                    action="primary"
                                    onPress={() => selected && handleDownloadExcel(selected.id)}
                                    disabled={
                                        isDownloading ||
                                        !selected ||
                                        (getUploadStatus?.(selected.id) ?? "unknown") !== "uploaded" ||
                                        !excelService?.downloadExcel
                                    }
                                >
                                    <Text className="text-typography-0">📥 Download Excel</Text>
                                </Button>
                                <Button variant="outline" action="secondary" onPress={() => setIsDetailsOpen(false)}>
                                    <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                                        {t("close") ?? "Schließen"}
                                    </Text>
                                </Button>
                            </HStack>
                        </HStack>
                    </Pressable>
                </Pressable>
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
    if (sectionKey === "injection") {
        return (
            <VStack className="gap-2">
                {data?.mainMenu && (
                    <DataBlock title="Main Menu" entries={Object.entries(data.mainMenu)} isDark={isDark} />
                )}
                {Array.isArray(data?.subMenuValues?.values) && (
                    <ArrayBlock
                        title="Sub Menu · Werte"
                        entries={data.subMenuValues.values}
                        columns={["index", "v", "v2"]}
                        isDark={isDark}
                    />
                )}
                {data?.switchType && (
                    <DataBlock title="Switch Type" entries={Object.entries(data.switchType)} isDark={isDark} />
                )}
            </VStack>
        );
    }

    if (sectionKey === "holdingPressure") {
        return (
            <VStack className="gap-2">
                {data?.mainMenu && (
                    <DataBlock title="Main Menu" entries={Object.entries(data.mainMenu)} isDark={isDark} />
                )}
                {Array.isArray(data?.subMenusValues?.values) && (
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
            <VStack className="gap-2">
                {data?.mainMenu && (
                    <DataBlock title="Main Menu" entries={Object.entries(data.mainMenu)} isDark={isDark} />
                )}
                {Array.isArray(data?.dosingSpeedsValues?.values) && (
                    <ArrayBlock
                        title="Speeds"
                        entries={data.dosingSpeedsValues.values}
                        columns={["index", "v", "v2"]}
                        isDark={isDark}
                    />
                )}
                {Array.isArray(data?.dosingPressuresValues?.values) && (
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
        return (
            <VStack className="gap-1">
                {Object.entries(data).map(([label, value]) => (
                    <HStack key={label} style={{ justifyContent: "space-between" }}>
                        <Text className={isDark ? "text-typography-200" : "text-typography-600"}>{label}</Text>
                        <Text className={isDark ? "text-typography-50" : "text-typography-900"}>
                            {String(value)}
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
        <VStack className="gap-1">
            <Text className={`mb-1 ${isDark ? "text-typography-200" : "text-typography-600"}`}>{title}</Text>
            {entries.map(([label, value]) => (
                <HStack key={label} style={{ justifyContent: "space-between" }}>
                    <Text className={isDark ? "text-typography-200" : "text-typography-600"}>{label}</Text>
                    <Text className={isDark ? "text-typography-50" : "text-typography-900"}>{String(value)}</Text>
                </HStack>
            ))}
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
        <VStack className="gap-1">
            <Text className={`mb-1 ${isDark ? "text-typography-200" : "text-typography-600"}`}>{title}</Text>
            <VStack className="gap-1">
                <HStack style={{ justifyContent: "space-between" }}>
                    {columns.map((col) => (
                        <Text key={col} className={isDark ? "text-typography-200" : "text-typography-600"}>
                            {col}
                        </Text>
                    ))}
                </HStack>
                {entries.map((row, idx) => (
                    <HStack key={idx} style={{ justifyContent: "space-between" }}>
                        {columns.map((col) => (
                            <Text key={col} className={isDark ? "text-typography-50" : "text-typography-900"}>
                                {String(row[col] ?? (col === "index" ? idx + 1 : "-"))}
                            </Text>
                        ))}
                    </HStack>
                ))}
            </VStack>
        </VStack>
    );
}
