/**
 * OCR History Hook
 * Main hook for managing OCR scan history and field aggregation
 */

import { useCallback, useMemo, useState } from 'react';
// Use internal barrel imports (not the public @/features/ocr) to avoid circular dependency
import type {
  OcrScanResult,
  OcrFieldResult,
  OcrFieldType,
  ParsedScrollbarValue,
  FieldAggregation,
  UseOcrHistoryConfig,
  ExpectedUnitConfig,
  UnitSystem,
  ValueMode,
} from '../types';
import {
  DEFAULT_MAX_HISTORY_PER_FIELD,
  DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY,
  START_KEYWORDS,
  END_KEYWORDS, MIN_SCANS_FOR_READY,
} from '../constants';
import {
  parseScrollbarFromScan,
  parseValueFromScan,
  parseCheckboxFromScan,
} from '../parsers';
import {
  mergeParsedScrollbar,
  computeMajorityString,
  computeBestScrollbar,
} from '../aggregation';


type UnitConfig = {
  system?: UnitSystem;
  mode?: ValueMode;
};

type TemplateUnitInfo = {
  expectedUnits?: ExpectedUnitConfig;
  expectedKeyUnits?: ExpectedUnitConfig;
};

const extractExpectedUnitConfig = (
  raw?: string[] | ExpectedUnitConfig
): ExpectedUnitConfig | undefined => {
  if (!raw) return undefined;
  if (!Array.isArray(raw)) return raw;
  // Legacy array form: we cannot reliably distinguish iso/imperial or relative/absolute,
  // so we leave this undefined for classification purposes.
  return undefined;
};

const classifyUnitAgainstConfig = (
  unit: string | undefined,
  cfg?: ExpectedUnitConfig,
  isKeyUnit = false
): { system?: UnitSystem; mode?: ValueMode } => {
  if (!unit || !cfg) return {};
  const matches: { system: UnitSystem; mode: ValueMode }[] = [];
  const systems: UnitSystem[] = ['iso', 'imperial'];
  const modes: ValueMode[] = ['relative', 'absolute'];

  for (const system of systems) {
    const sysCfg = cfg[system];
    if (!sysCfg) continue;
    for (const mode of modes) {
      const expected = sysCfg[mode];
      if (!expected) continue;
      if (expected === unit) {
        matches.push({ system, mode });
      }
    }
  }

  if (matches.length === 0) return {};

  const uniqueSystems = Array.from(new Set(matches.map(m => m.system)));
  const uniqueModes = Array.from(new Set(matches.map(m => m.mode)));

  const system = uniqueSystems.length === 1 ? uniqueSystems[0] : undefined;
  const mode = uniqueModes.length === 1 ? uniqueModes[0] : undefined;

  return { system, mode };
};

export const useOcrHistory = (config?: UseOcrHistoryConfig) => {
  // Field-level aggregation based on full scan results
  const [scanHistory, setScanHistory] = useState<OcrScanResult[]>([]);
  const [fieldAggregations, setFieldAggregations] = useState<Record<string, FieldAggregation>>({});

  const maxHistoryPerField = config?.maxHistoryPerField ?? DEFAULT_MAX_HISTORY_PER_FIELD;
  const minOccurrencesForMajority = config?.minOccurrencesForMajority ?? DEFAULT_MIN_OCCURRENCES_FOR_MAJORITY;
  const commaRequired = !!config?.commaRequired;

  const templateUnitMap = useMemo<Record<string, TemplateUnitInfo>>(() => {
    const map: Record<string, TemplateUnitInfo> = {};
    const template = config?.template as
      | Array<{
          id: string;
          expectedUnits?: string[] | ExpectedUnitConfig;
          expectedKeyUnits?: string[] | ExpectedUnitConfig;
        }>
      | undefined;
    if (!template) return map;
    for (const box of template) {
      if (!box || !box.id) continue;
      map[box.id] = {
        expectedUnits: extractExpectedUnitConfig(box.expectedUnits),
        expectedKeyUnits: extractExpectedUnitConfig(box.expectedKeyUnits),
      };
    }
    return map;
  }, [config?.template]);

  // Add a full OCR scan result (with boxes) and update field aggregations
  const addFullScanResult = useCallback(
    (scanResult: OcrScanResult) => {
      setScanHistory((prev) => [scanResult, ...prev]);

      setFieldAggregations((prev) => {
        const next: Record<string, FieldAggregation> = { ...prev };

        for (const box of scanResult.boxes ?? []) {
          if (!box || !box.id || !box.type) continue;
          const fieldId = box.id;
          const type = box.type;

          let agg = next[fieldId];
          if (!agg) {
            agg = {
              id: fieldId,
              totalScans: 0,
              uniqueValues: 0,
              rawValues: [],
              typeBreakdown: { value: 0, checkbox: 0, scrollbar: 0 },
              sameUnitAs: box.sameUnitAs,
            };
          } else {
            // Ensure sameUnitAs is updated if present in the new box
            if (box.sameUnitAs) {
              agg.sameUnitAs = box.sameUnitAs;
            }
          }

          agg.totalScans += 1;
          if (type === 'value' || type === 'checkbox' || type === 'scrollbar') {
            agg.typeBreakdown[type] += 1;
          }

          if (type === 'value') {
            const parsed = parseValueFromScan(box, commaRequired);
            if (parsed != null) {

              // If this field has sameUnitAs, try to grab the unit from the source field
              if (box.sameUnitAs && !parsed.unit) {
                const sourceAgg = next[box.sameUnitAs];
                if (sourceAgg && sourceAgg.rawValues.length > 0) {
                   const sourceBest = computeMajorityString(sourceAgg.rawValues, minOccurrencesForMajority);
                   if (sourceBest?.unit) {
                     parsed.unit = sourceBest.unit;
                   }
                }
              }

              agg.rawValues = [parsed, ...agg.rawValues];
              if (agg.rawValues.length > maxHistoryPerField) {
                agg.rawValues = agg.rawValues.slice(0, maxHistoryPerField);
              }
              agg.uniqueValues = new Set(agg.rawValues.map(v => `${v.value}|${v.unit || ''}`)).size;
            }
          } else if (type === 'checkbox') {
            const parsed = parseCheckboxFromScan(box);
            if (parsed != null) {
              agg.rawValues = [parsed, ...agg.rawValues];
              if (agg.rawValues.length > maxHistoryPerField) {
                agg.rawValues = agg.rawValues.slice(0, maxHistoryPerField);
              }
              agg.uniqueValues = new Set(agg.rawValues.map(v => v.value)).size;
            }
          } else if (type === 'scrollbar') {
            const parsedScrollbar = parseScrollbarFromScan(box, commaRequired);
            if (parsedScrollbar) {
              agg.scrollbar = mergeParsedScrollbar(agg.scrollbar, parsedScrollbar);
            }
          }

          next[fieldId] = agg;
        }

        return next;
      });

      return scanResult;
    },
    [commaRequired, maxHistoryPerField, minOccurrencesForMajority]
  );

  // Convenience alias
  const addScanResult = useCallback(
    (scanResult: OcrScanResult) => {
      return addFullScanResult(scanResult);
    },
    [addFullScanResult]
  );

  const getFieldStats = useCallback(
    (fieldId: string) => {
      const agg = fieldAggregations[fieldId];
      if (!agg) {
        return {
          totalScans: 0,
          uniqueValues: 0,
          typeBreakdown: { value: 0, checkbox: 0, scrollbar: 0 },
          rawValues: [],
        };
      }
      return {
        totalScans: agg.totalScans,
        uniqueValues: agg.uniqueValues,
        typeBreakdown: { ...agg.typeBreakdown },
        rawValues: agg.rawValues ?? [],
      };
    },
    [fieldAggregations]
  );

  const getFilteredValue = useCallback(
    (fieldId: string): string | undefined => {
      const agg = fieldAggregations[fieldId];
      if (!agg) return undefined;

      // Scrollbar: try to compute best numeric ranges and format them
      if (agg.scrollbar) {
        const best = computeBestScrollbar(agg.scrollbar, minOccurrencesForMajority);
        if (best) return best.formatted;
      }

      if (!agg.rawValues || agg.rawValues.length === 0) return undefined;
      const best = computeMajorityString(agg.rawValues, minOccurrencesForMajority);
      if (!best) return undefined;

      let unit = best.unit;
      if (agg.sameUnitAs) {
        const sourceAgg = fieldAggregations[agg.sameUnitAs];
        if (sourceAgg && sourceAgg.rawValues.length > 0) {
          const sourceBest = computeMajorityString(sourceAgg.rawValues, minOccurrencesForMajority);
          // Prefer source unit if available, otherwise keep existing (if any)
          if (sourceBest?.unit) {
            unit = sourceBest.unit;
          }
        }
      }

      return unit ? `${best.value} ${unit}` : best.value;
    },
    [fieldAggregations, minOccurrencesForMajority]
  );

  const getScrollbarValue = useCallback(
    (fieldId: string): ParsedScrollbarValue | undefined => {
      const agg = fieldAggregations[fieldId];
      if (!agg?.scrollbar) return undefined;

      const best = computeBestScrollbar(agg.scrollbar, minOccurrencesForMajority);
      return best?.parsed;
    },
    [fieldAggregations, minOccurrencesForMajority]
  );

  const getBestFields = useCallback(
    (): OcrFieldResult[] => {
      const results: OcrFieldResult[] = [];
      const fieldIds = Object.keys(fieldAggregations);

      for (const fieldId of fieldIds) {
        const agg = fieldAggregations[fieldId];
        if (!agg) continue;

        // Scrollbar fields: return structured ParsedScrollbarValue
        if (agg.scrollbar) {
          const best = computeBestScrollbar(agg.scrollbar, minOccurrencesForMajority);
          if (best) {
            results.push({
              box_id: fieldId,
              type: 'scrollbar',
              value: best.parsed,
            });
          }
          continue;
        }

        if (!agg.rawValues || agg.rawValues.length === 0) continue;
        const best = computeMajorityString(agg.rawValues, minOccurrencesForMajority);
        if (!best) continue;

        const tb = agg.typeBreakdown;
        let dominantType: OcrFieldType = 'value';
        if (tb.scrollbar >= tb.value && tb.scrollbar >= tb.checkbox) {
          dominantType = 'scrollbar';
        } else if (tb.checkbox >= tb.value && tb.checkbox >= tb.scrollbar) {
          dominantType = 'checkbox';
        } else {
          dominantType = 'value';
        }

        let unit = best.unit;
        if (agg.sameUnitAs) {
          const sourceAgg = fieldAggregations[agg.sameUnitAs];
          if (sourceAgg && sourceAgg.rawValues.length > 0) {
            const sourceBest = computeMajorityString(sourceAgg.rawValues, minOccurrencesForMajority);
            if (sourceBest?.unit) {
              unit = sourceBest.unit;
            }
          }
        }

        results.push({
          box_id: fieldId,
          type: dominantType,
          value: best.value,
          unit: unit,
        });
      }

      return results;
    },
    [fieldAggregations, minOccurrencesForMajority]
  );

  const getReadyStatus = useCallback(
    (templateFieldIds?: string[]) => {
      if (!templateFieldIds || templateFieldIds.length === 0) {
        return {
          isReady: false,
          filteredCount: 0,
          totalRequired: 0,
          progress: 0,
          remainingUnits: 0,
          requiredUnits: 0,
        };
      }

      let filteredCount = 0;
      let readyCount = 0;
      let progressSum = 0;
      let remainingUnits = 0;
      let requiredUnits = 0;
      const isExcluded = (fieldId: string) => fieldId.endsWith("_end") || fieldId.endsWith("_start");
      const totalRequired = templateFieldIds.filter((id) => !isExcluded(id)).length;

      for (const fieldId of templateFieldIds) {
        if (isExcluded(fieldId)) continue;
        const agg = fieldAggregations[fieldId];

        let majorityProgress = 0;
        let isFiltered = false;

        if (agg?.scrollbar) {
          const best = computeBestScrollbar(agg.scrollbar, minOccurrencesForMajority);
          const parsed = best?.parsed;
          const segments = parsed?.segments
            ? parsed.segments
            : parsed
                ? Object.entries(parsed)
                    .filter(([key]) => Number.isFinite(Number(key)))
                    .map(([, value]) => value as { state?: string } | undefined)
                : [];
          const totalSegments = segments.length;
          const filteredSegments = segments.filter((segment) => segment?.state === "filtered").length;
          majorityProgress = totalSegments > 0 ? filteredSegments / totalSegments : 0;
          isFiltered = totalSegments > 0 && filteredSegments === totalSegments;

          requiredUnits += totalSegments;
          remainingUnits += Math.max(0, totalSegments - filteredSegments);
        } else {
          const rawValues = agg?.rawValues ?? [];
          const majority = computeMajorityString(rawValues, minOccurrencesForMajority);
          if (majority) {
            const majorityKey = `${majority.value}|${majority.unit || ""}`;
            const majorityCount = rawValues.filter(
              (entry) => `${entry.value}|${entry.unit || ""}` === majorityKey
            ).length;
            majorityProgress = Math.min(majorityCount / MIN_SCANS_FOR_READY, 1);
            isFiltered = true;

            requiredUnits += MIN_SCANS_FOR_READY;
            remainingUnits += Math.max(0, MIN_SCANS_FOR_READY - majorityCount);
          } else {
            requiredUnits += MIN_SCANS_FOR_READY;
            remainingUnits += MIN_SCANS_FOR_READY;
          }
        }

        if (isFiltered) {
          filteredCount += 1;
        }
        if (majorityProgress >= 1) {
          readyCount += 1;
        }
        progressSum += majorityProgress;
      }

      const progressByUnits = requiredUnits > 0
        ? Math.min((requiredUnits - remainingUnits) / requiredUnits, 1)
        : 0;
      const progress = totalRequired > 0 ? Math.min(progressSum / totalRequired, 1) : 0;

      return {
        isReady: totalRequired > 0 && readyCount === totalRequired,
        filteredCount,
        totalRequired,
        progress: Math.max(progress, progressByUnits),
        remainingUnits,
        requiredUnits,
      };
    },
    [fieldAggregations, minOccurrencesForMajority]
  );

  const unitConfig: UnitConfig = useMemo(() => {
    const systemCounts: Record<UnitSystem, number> = { iso: 0, imperial: 0 };
    const modeCounts: Record<ValueMode, number> = { absolute: 0, relative: 0 };

    for (const [fieldId, agg] of Object.entries(fieldAggregations)) {
      if (!agg) continue;
      const tpl = templateUnitMap[fieldId];

      // Value/checkbox units
      for (const entry of agg.rawValues ?? []) {
        const u = (entry as any).unit as string | undefined;
        if (!u) continue;
        const { system, mode } = classifyUnitAgainstConfig(u, tpl?.expectedUnits);
        if (system) systemCounts[system] += 1;
        if (mode) modeCounts[mode] += 1;
      }

      // Scrollbar key/value units
      if (agg.scrollbar) {
        const keyUnit = agg.scrollbar.keyUnit ?? undefined;
        const valueUnit = agg.scrollbar.valueUnit ?? undefined;
        if (keyUnit) {
          const { system, mode } = classifyUnitAgainstConfig(
            keyUnit,
            tpl?.expectedKeyUnits,
            true
          );
          if (system) systemCounts[system] += 1;
          if (mode) modeCounts[mode] += 1;
        }
        if (valueUnit) {
          const { system, mode } = classifyUnitAgainstConfig(
            valueUnit,
            tpl?.expectedUnits,
            false
          );
          if (system) systemCounts[system] += 1;
          if (mode) modeCounts[mode] += 1;
        }
      }
    }

    const pickMajority = <T extends string>(
      counts: Record<T, number>,
      threshold: number
    ): T | undefined => {
      const entries = Object.entries(counts) as [T, number][];
      const total = entries.reduce((sum, [, c]) => sum + c, 0);
      if (total === 0) return undefined;
      let best: [T, number] | null = null;
      for (const entry of entries) {
        if (!best || entry[1] > best[1]) {
          best = entry;
        }
      }
      if (!best) return undefined;
      const [bestKey, bestCount] = best;
      const share = bestCount / total;
      return share >= 0.5 ? bestKey : undefined;
    };

    const system = pickMajority<UnitSystem>(systemCounts, 0.5);
    const mode = pickMajority<ValueMode>(modeCounts, 0.5);

    return { system, mode };
  }, [fieldAggregations, templateUnitMap]);

  return {
    // Scan + field aggregation API
    scanHistory,
    fieldAggregations,
    addFullScanResult,
    addScanResult,
    getFieldStats,
    getFilteredValue,
    getScrollbarValue,
    getBestFields,
    getReadyStatus,
    // also export the keyword lists in case callers want to re-use them
    START_KEYWORDS,
    END_KEYWORDS,
    unitConfig,
  } as const;
};

