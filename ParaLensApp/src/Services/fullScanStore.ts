import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScanDto } from '../types/common';

const STORAGE_KEY = 'paralens.fullscans.v1';

export interface FullScanRecord extends FullScanDto {}

export async function loadFullScans(): Promise<FullScanRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as FullScanRecord[];
  } catch (e) {
    return [];
  }
}

export async function saveFullScans(records: FullScanRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function createEmptyFullScan(author: string): FullScanRecord {
  const nowIso = new Date().toISOString();
  const id = Date.now();
  return { id, author, date: nowIso };
}


