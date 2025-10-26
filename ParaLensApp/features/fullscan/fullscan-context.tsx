import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {FullScanDto, ScanMenu} from "@/features/fullscan/types";
import {createEmptyFullScan, loadFullScans, saveFullScans} from "@/features/fullscan/storage";
import scanUploadService from "@/features/api/services/scanUploadService";


interface FullScanContextValue {
    fullScans: FullScanDto[];
    selectedFullScanId: number | null;
    selectFullScan: (id: number | null) => void;
    createFullScan: (author: string) => number;
    upsertSection: (fullScanId: number, section: ScanMenu, payload: any) => void;
    uploadScan: (scanId: number) => Promise<{ success: boolean; error?: string }>;
    updateScan: (scanId: number) => Promise<{ success: boolean; error?: string }>;
    getUploadStatus: (scanId: number) => 'not_uploaded' | 'uploading' | 'uploaded' | 'error' | 'needs_update';
}

const FullScanContext = createContext<FullScanContextValue | undefined>(undefined);

export const FullScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fullScans, setFullScans] = useState<FullScanDto[]>([]);
    const [selectedFullScanId, setSelectedFullScanId] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            const data = await loadFullScans();
            setFullScans(data);
            if (data.length > 0) setSelectedFullScanId(data[data.length - 1].id);
        })();
    }, []);

    useEffect(() => { saveFullScans(fullScans as any); }, [fullScans]);

    const selectFullScan = useCallback((id: number | null) => {
        setSelectedFullScanId(id);
    }, []);

    const createFullScan = useCallback((author: string) => {
        const record = createEmptyFullScan(author);
        setFullScans(prev => [...prev, record]);
        setSelectedFullScanId(record.id);
        return record.id;
    }, []);

    const upsertSection = useCallback((fullScanId: number, section: ScanMenu, payload: any) => {
        setFullScans(prev => prev.map(fs => {
            if (fs.id !== fullScanId) return fs;
            const existingSection: any = (fs as any)[section] || {};
            const merged = { ...existingSection, ...payload };
            const updatedScan = { ...fs, [section]: merged, lastModified: new Date().toISOString() } as FullScanDto;

            // If this scan was previously uploaded, mark it as needing update
            if (updatedScan.uploadStatus === 'uploaded') {
                updatedScan.uploadStatus = 'needs_update';
            }

            return updatedScan;
        }));
    }, []);

    const uploadScan = useCallback(async (scanId: number): Promise<{ success: boolean; error?: string }> => {
        const scan = fullScans.find(fs => fs.id === scanId);
        if (!scan) {
            return { success: false, error: 'Scan not found' };
        }

        // Set uploading status
        setFullScans(prev => prev.map(fs =>
            fs.id === scanId
                ? { ...fs, uploadStatus: 'uploading' as const, uploadError: undefined }
                : fs
        ));

        const result = await scanUploadService.createScan(scan);

        if (result.success) {
            setFullScans(prev => prev.map(fs =>
                fs.id === scanId
                    ? {
                        ...fs,
                        uploadStatus: 'uploaded' as const,
                        serverId: result.serverId,
                        lastUploaded: new Date().toISOString(),
                        lastModified: fs.lastModified || new Date().toISOString(),
                        uploadError: undefined
                    }
                    : fs
            ));
        } else {
            setFullScans(prev => prev.map(fs =>
                fs.id === scanId
                    ? {
                        ...fs,
                        uploadStatus: 'error' as const,
                        uploadError: result.error
                    }
                    : fs
            ));
        }

        return result;
    }, [fullScans]);

    const updateScan = useCallback(async (scanId: number): Promise<{ success: boolean; error?: string }> => {
        const scan = fullScans.find(fs => fs.id === scanId);
        if (!scan || !scan.serverId) {
            return { success: false, error: 'Scan not found or not uploaded' };
        }

        // Set uploading status
        setFullScans(prev => prev.map(fs =>
            fs.id === scanId
                ? { ...fs, uploadStatus: 'uploading' as const, uploadError: undefined }
                : fs
        ));

        const result = await scanUploadService.updateScan(scan, scan.serverId);

        if (result.success) {
            setFullScans(prev => prev.map(fs =>
                fs.id === scanId
                    ? {
                        ...fs,
                        uploadStatus: 'uploaded' as const,
                        lastUploaded: new Date().toISOString(),
                        lastModified: fs.lastModified || new Date().toISOString(),
                        uploadError: undefined
                    }
                    : fs
            ));
        } else {
            setFullScans(prev => prev.map(fs =>
                fs.id === scanId
                    ? {
                        ...fs,
                        uploadStatus: 'error' as const,
                        uploadError: result.error
                    }
                    : fs
            ));
        }

        return result;
    }, [fullScans]);

    const getUploadStatus = useCallback((scanId: number) => {
        const scan = fullScans.find(fs => fs.id === scanId);
        if (!scan) return 'not_uploaded';

        // Check if scan needs update by comparing lastModified with lastUploaded
        if (scan.uploadStatus === 'uploaded' && scan.lastModified && scan.lastUploaded) {
            const modifiedDate = new Date(scan.lastModified);
            const uploadedDate = new Date(scan.lastUploaded);

            // If scan was modified after last upload, it needs update
            if (modifiedDate > uploadedDate) {
                return 'needs_update';
            }
        }

        return scan.uploadStatus || 'not_uploaded';
    }, [fullScans]);

    const value = useMemo(() => ({
        fullScans,
        selectedFullScanId,
        selectFullScan,
        createFullScan,
        upsertSection,
        uploadScan,
        updateScan,
        getUploadStatus
    }), [fullScans, selectedFullScanId, selectFullScan, createFullScan, upsertSection, uploadScan, updateScan, getUploadStatus]);

    return (
        <FullScanContext.Provider value={value}>{children}</FullScanContext.Provider>
    );
};

export function useFullScan() {
    const ctx = useContext(FullScanContext);
    if (!ctx) throw new Error('useFullScan must be used within FullScanProvider');
    return ctx;
}


