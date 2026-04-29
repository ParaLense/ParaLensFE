import AsyncStorage from "@react-native-async-storage/async-storage";

import type { FullScanDto, SectionScreenshots } from "./types";

const STORAGE_KEY = "paralens.fullscans.v1";
const SCREENSHOTS_KEY_PREFIX = "paralens.screenshots.";

export interface FullScanRecord extends FullScanDto {}

/**
 * Load full scans WITHOUT screenshots (loaded separately on demand)
 */
export async function loadFullScans(): Promise<FullScanRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Screenshots are stored separately, so we just return the scan metadata
    return parsed as FullScanRecord[];
  } catch (error) {
    console.warn("loadFullScans failed", error);
    return [];
  }
}

/**
 * Save full scans - screenshots are stored separately in upsertSection to avoid memory issues
 */
export async function saveFullScans(records: FullScanRecord[]): Promise<void> {
  try {
    // Remove any sectionScreenshots that might be in records (they shouldn't be, but just in case)
    const recordsWithoutScreenshots = records.map(record => {
      const { sectionScreenshots, ...rest } = record;
      return rest;
    });

    // Save main scan data (without large base64 images)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recordsWithoutScreenshots));
  } catch (error) {
    console.warn("saveFullScans failed", error);
  }
}

/**
 * Save screenshots for a specific scan (stored separately from main scan data)
 */
export async function saveScreenshots(scanId: number, screenshots: SectionScreenshots): Promise<void> {
  try {
    const key = `${SCREENSHOTS_KEY_PREFIX}${scanId}`;
    await AsyncStorage.setItem(key, JSON.stringify(screenshots));
  } catch (error) {
    console.warn(`saveScreenshots failed for scan ${scanId}`, error);
  }
}

/**
 * Load screenshots for a specific scan (on demand, not at app start)
 */
export async function loadScreenshots(scanId: number): Promise<SectionScreenshots | null> {
  try {
    const key = `${SCREENSHOTS_KEY_PREFIX}${scanId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SectionScreenshots;
  } catch (error) {
    console.warn(`loadScreenshots failed for scan ${scanId}`, error);
    return null;
  }
}

/**
 * Delete screenshots for a specific scan
 */
export async function deleteScreenshots(scanId: number): Promise<void> {
  try {
    const key = `${SCREENSHOTS_KEY_PREFIX}${scanId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`deleteScreenshots failed for scan ${scanId}`, error);
  }
}

export function createEmptyFullScan(author: string): FullScanRecord {
  const nowIso = new Date().toISOString();
  const id = Date.now();
  return { id, author, date: nowIso };
}


