import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FullScanDto, ScanMenu } from '../types/common';
import { createEmptyFullScan, loadFullScans, saveFullScans } from '../Services/fullScanStore';

interface FullScanContextValue {
  fullScans: FullScanDto[];
  selectedFullScanId: number | null;
  selectFullScan: (id: number | null) => void;
  createFullScan: (author: string) => number; 
  upsertSection: (fullScanId: number, section: ScanMenu, payload: any) => void;
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
      return { ...fs, [section]: merged } as FullScanDto;
    }));
  }, []);

  const value = useMemo(() => ({ fullScans, selectedFullScanId, selectFullScan, createFullScan, upsertSection }), [fullScans, selectedFullScanId, selectFullScan, createFullScan, upsertSection]);

  return (
    <FullScanContext.Provider value={value}>{children}</FullScanContext.Provider>
  );
};

export function useFullScan() {
  const ctx = useContext(FullScanContext);
  if (!ctx) throw new Error('useFullScan must be used within FullScanProvider');
  return ctx;
}


