/**
 * Pure calculation functions for MW Price Difference & Error Impact Analyzer.
 *
 * Energy unit fundamentals (IEX 15-minute trading blocks):
 * - 1 MW power continuous for 1 hour = 1 MWh = 1,000 kWh (units).
 * - 1 15-minute block = 0.25 hour.
 * - 1 MW power in 1 block (15 min) = 1 * 0.25 * 1000 = 250 kWh (units).
 * - 1 MW power in 1 full day (96 blocks) = 96 * 250 = 24,000 kWh (units).
 * - For capacity C (MW): Block Units = C * 250 kWh.
 */

import type { ForecastRow } from "../mockData";

export const UNITS_PER_MW_PER_BLOCK = 250; // kWh per MW in 15 minutes
export const BLOCKS_PER_DAY = 96;
export const UNITS_PER_MW_PER_DAY = UNITS_PER_MW_PER_BLOCK * BLOCKS_PER_DAY; // 24,000 kWh

export type ErrorTier = "low" | "medium" | "high" | "no_actual";
export type MetricMode = "price_delta" | "percentage";

export interface MwImpactBlock {
  date: string;
  timeBlock: string;
  hour: string;
  forecastedMcp: number;
  actualMcp: number | null;
  priceDelta: number | null; // actual - forecast (₹/kWh)
  absPriceDelta: number | null; // |actual - forecast| (₹/kWh)
  errorPercent: number | null; // (|actual - forecast| / actual) * 100
  isLowError: boolean | null; // errorPercent !== null && errorPercent < 5.0
  isCompliant: boolean | null; // meets the active threshold (e.g. <= 50 paise or < 5%)
  errorTier: ErrorTier;
  blockKwh: number; // capacityMw * 250
  costImpactRs: number | null; // priceDelta * blockKwh (₹)
  absCostDeviationRs: number | null; // absPriceDelta * blockKwh (₹)
}

export interface SlotGroupSummary {
  count: number;
  pctOfTotalBlocks: number;
  totalKwh: number;
  avgForecastMcp: number;
  avgActualMcp: number;
  avgPriceDeltaRs: number;
  avgErrorPct: number;
  netCostImpactRs: number;
  absCostDeviationRs: number;
}

export interface DaySummary {
  date: string;
  totalSlots: number;
  slotsWithActual: number;
  compliantCount: number;
  compliantPct: number;
  totalKwh: number;
  avgForecastMcp: number;
  avgActualMcp: number;
  netCostImpactRs: number;
  absCostDeviationRs: number;
  wmape: number;
}

export interface MwImpactSummary {
  capacityMw: number;
  metricMode: MetricMode;
  priceThresholdRs: number;
  errorPercentThreshold: number;
  totalBlocks: number;
  blocksWithActual: number;
  blocksPending: number;
  
  // Slots meeting the active threshold (e.g. <= 50 paise or < 5%)
  compliantSlots: SlotGroupSummary;
  // Slots exceeding the active threshold (outliers / higher variance)
  exceedingSlots: SlotGroupSummary;

  // Backward-compatible aliases for < 5% error vs remaining
  lowErrorSlots: SlotGroupSummary;
  remainingSlots: SlotGroupSummary;

  // Multi-day Breakdown per Date
  daySummaries: DaySummary[];

  // Full Period / Day Metrics
  fullDayTotalKwh: number;
  fullDayAvgForecastMcp: number;
  fullDayAvgActualMcp: number;
  fullDayNetImpactRs: number;
  fullDayAbsDeviationRs: number;
  fullDayWmape: number; // sum(|actual - forecast|) / sum(actual) * 100
}

/**
 * Calculates per-block MW metrics from forecast and actual rows.
 */
export function calculateMwImpactBlocks(
  rows: ForecastRow[],
  capacityMw: number = 1.0,
  priceThresholdRs: number = 0.50,
  metricMode: MetricMode = "price_delta",
  errorPercentThreshold: number = 5.0
): MwImpactBlock[] {
  const safeCapacity = Math.max(0.01, isNaN(capacityMw) ? 1.0 : capacityMw);
  const blockKwh = +(safeCapacity * UNITS_PER_MW_PER_BLOCK).toFixed(2);
  const EPS = 1e-6;

  return rows.map((r) => {
    const F = r.forecastedMcp;
    const A = r.actualMcp;

    if (A === null || A === undefined || isNaN(A) || F === null || F === undefined || isNaN(F) || F <= 0) {
      return {
        date: r.date,
        timeBlock: r.timeBlock,
        hour: r.hour,
        forecastedMcp: F,
        actualMcp: (A !== null && A !== undefined && !isNaN(A)) ? A : null,
        priceDelta: null,
        absPriceDelta: null,
        errorPercent: null,
        isLowError: null,
        isCompliant: null,
        errorTier: "no_actual",
        blockKwh,
        costImpactRs: null,
        absCostDeviationRs: null,
      };
    }

    const priceDelta = +(A - F).toFixed(4);
    const absPriceDelta = +Math.abs(A - F).toFixed(4);

    // Percentage error against actual price. Handle zero gracefully.
    const denom = A > 0.001 ? A : F > 0.001 ? F : 1;
    const errorPercent = +((absPriceDelta / denom) * 100).toFixed(2);
    const isLowError = errorPercent < 5.0;

    let errorTier: ErrorTier = "low";
    if (absPriceDelta <= priceThresholdRs + EPS) {
      errorTier = "low";
    } else if (absPriceDelta <= priceThresholdRs * 2 + EPS) {
      errorTier = "medium";
    } else {
      errorTier = "high";
    }

    // Is compliant based on selected metric mode
    const isCompliant =
      metricMode === "price_delta"
        ? absPriceDelta <= priceThresholdRs + EPS
        : errorPercent < errorPercentThreshold + EPS;

    const costImpactRs = +(priceDelta * blockKwh).toFixed(2);
    const absCostDeviationRs = +(absPriceDelta * blockKwh).toFixed(2);

    return {
      date: r.date,
      timeBlock: r.timeBlock,
      hour: r.hour,
      forecastedMcp: F,
      actualMcp: A,
      priceDelta,
      absPriceDelta,
      errorPercent,
      isLowError,
      isCompliant,
      errorTier,
      blockKwh,
      costImpactRs,
      absCostDeviationRs,
    };
  });
}

/**
 * Computes executive KPI summary comparing compliant slots vs exceeding slots vs full period.
 */
export function summarizeMwImpact(
  blocks: MwImpactBlock[],
  capacityMw: number = 1.0,
  priceThresholdRs: number = 0.50,
  metricMode: MetricMode = "price_delta",
  errorPercentThreshold: number = 5.0
): MwImpactSummary {
  const safeCapacity = Math.max(0.01, isNaN(capacityMw) ? 1.0 : capacityMw);
  const totalBlocks = blocks.length;

  const validBlocks = blocks.filter((b) => b.actualMcp !== null && b.absPriceDelta !== null);
  const blocksWithActual = validBlocks.length;
  const blocksPending = totalBlocks - blocksWithActual;

  const compliantList = validBlocks.filter((b) => b.isCompliant === true);
  const exceedingList = validBlocks.filter((b) => b.isCompliant === false);

  // Backward compatibility: < 5% error list
  const lowErrorList = validBlocks.filter((b) => b.isLowError === true);
  const remainingList = validBlocks.filter((b) => b.isLowError === false);

  const computeGroup = (list: MwImpactBlock[]): SlotGroupSummary => {
    if (list.length === 0) {
      return {
        count: 0,
        pctOfTotalBlocks: 0,
        totalKwh: 0,
        avgForecastMcp: 0,
        avgActualMcp: 0,
        avgPriceDeltaRs: 0,
        avgErrorPct: 0,
        netCostImpactRs: 0,
        absCostDeviationRs: 0,
      };
    }

    const count = list.length;
    const pctOfTotalBlocks = +(
      (count / (blocksWithActual > 0 ? blocksWithActual : totalBlocks)) *
      100
    ).toFixed(1);
    const totalKwh = +(count * safeCapacity * UNITS_PER_MW_PER_BLOCK).toFixed(2);

    const sumForecast = list.reduce((acc, b) => acc + b.forecastedMcp, 0);
    const sumActual = list.reduce((acc, b) => acc + (b.actualMcp ?? 0), 0);
    const sumPriceDelta = list.reduce((acc, b) => acc + (b.priceDelta ?? 0), 0);
    const sumErrorPct = list.reduce((acc, b) => acc + (b.errorPercent ?? 0), 0);
    const netCostImpactRs = +list.reduce((acc, b) => acc + (b.costImpactRs ?? 0), 0).toFixed(2);
    const absCostDeviationRs = +list
      .reduce((acc, b) => acc + (b.absCostDeviationRs ?? 0), 0)
      .toFixed(2);

    return {
      count,
      pctOfTotalBlocks,
      totalKwh,
      avgForecastMcp: +(sumForecast / count).toFixed(2),
      avgActualMcp: +(sumActual / count).toFixed(2),
      avgPriceDeltaRs: +(sumPriceDelta / count).toFixed(4),
      avgErrorPct: +(sumErrorPct / count).toFixed(2),
      netCostImpactRs,
      absCostDeviationRs,
    };
  };

  const compliantSlots = computeGroup(compliantList);
  const exceedingSlots = computeGroup(exceedingList);
  const lowErrorSlots = computeGroup(lowErrorList);
  const remainingSlots = computeGroup(remainingList);

  // Day-wise breakdown for multi-day date range
  const dateMap = new Map<string, MwImpactBlock[]>();
  for (const b of blocks) {
    const d = b.date || "Unknown";
    const existing = dateMap.get(d) || [];
    existing.push(b);
    dateMap.set(d, existing);
  }

  const daySummaries: DaySummary[] = Array.from(dateMap.entries()).map(([dateStr, dayList]) => {
    const dayValid = dayList.filter((b) => b.actualMcp !== null && b.absPriceDelta !== null);
    const dayCompliant = dayValid.filter((b) => b.isCompliant === true);
    const totalSlots = dayList.length;
    const slotsWithActual = dayValid.length;
    const compliantCount = dayCompliant.length;
    const compliantPct = slotsWithActual > 0 ? +((compliantCount / slotsWithActual) * 100).toFixed(1) : 0;
    const totalKwh = +(dayValid.length * safeCapacity * UNITS_PER_MW_PER_BLOCK).toFixed(2);

    const sumF = dayValid.reduce((acc, b) => acc + b.forecastedMcp, 0);
    const sumA = dayValid.reduce((acc, b) => acc + (b.actualMcp ?? 0), 0);
    const sumAbsDelta = dayValid.reduce((acc, b) => acc + (b.absPriceDelta ?? 0), 0);
    const netCostImpactRs = +dayValid.reduce((acc, b) => acc + (b.costImpactRs ?? 0), 0).toFixed(2);
    const absCostDeviationRs = +dayValid.reduce((acc, b) => acc + (b.absCostDeviationRs ?? 0), 0).toFixed(2);

    const wmape = sumA > 0 ? +((sumAbsDelta / sumA) * 100).toFixed(2) : 0;

    return {
      date: dateStr,
      totalSlots,
      slotsWithActual,
      compliantCount,
      compliantPct,
      totalKwh,
      avgForecastMcp: slotsWithActual > 0 ? +(sumF / slotsWithActual).toFixed(2) : 0,
      avgActualMcp: slotsWithActual > 0 ? +(sumA / slotsWithActual).toFixed(2) : 0,
      netCostImpactRs,
      absCostDeviationRs,
      wmape,
    };
  });

  // Sort day summaries chronologically
  daySummaries.sort((a, b) => a.date.localeCompare(b.date));

  // Full period aggregations
  const fullDayTotalKwh = +(totalBlocks * safeCapacity * UNITS_PER_MW_PER_BLOCK).toFixed(2);
  const sumForecastAll = validBlocks.reduce((acc, b) => acc + b.forecastedMcp, 0);
  const sumActualAll = validBlocks.reduce((acc, b) => acc + (b.actualMcp ?? 0), 0);
  const sumAbsPriceDeltaAll = validBlocks.reduce((acc, b) => acc + (b.absPriceDelta ?? 0), 0);

  const fullDayAvgForecastMcp = validBlocks.length > 0 ? +(sumForecastAll / validBlocks.length).toFixed(2) : 0;
  const fullDayAvgActualMcp = validBlocks.length > 0 ? +(sumActualAll / validBlocks.length).toFixed(2) : 0;
  const fullDayNetImpactRs = +validBlocks.reduce((acc, b) => acc + (b.costImpactRs ?? 0), 0).toFixed(2);
  const fullDayAbsDeviationRs = +validBlocks
    .reduce((acc, b) => acc + (b.absCostDeviationRs ?? 0), 0)
    .toFixed(2);

  const fullDayWmape =
    sumActualAll > 0
      ? +((sumAbsPriceDeltaAll / sumActualAll) * 100).toFixed(2)
      : 0;

  return {
    capacityMw: safeCapacity,
    metricMode,
    priceThresholdRs,
    errorPercentThreshold,
    totalBlocks,
    blocksWithActual,
    blocksPending,
    compliantSlots,
    exceedingSlots,
    lowErrorSlots,
    remainingSlots,
    daySummaries,
    fullDayTotalKwh,
    fullDayAvgForecastMcp,
    fullDayAvgActualMcp,
    fullDayNetImpactRs,
    fullDayAbsDeviationRs,
    fullDayWmape,
  };
}

/**
 * Parses time block string (e.g. "07:00 - 07:15" or "07:00-07:15") into minute values from midnight.
 */
export function parseTimeBlockMinutes(timeBlockStr: string): { startMinutes: number; endMinutes: number } {
  if (!timeBlockStr) return { startMinutes: 0, endMinutes: 1440 };
  const parts = timeBlockStr.split("-").map((p) => p.trim());
  if (parts.length >= 2) {
    const [sH, sM] = parts[0].split(":").map((v) => parseInt(v, 10) || 0);
    const [eH, eM] = parts[1].split(":").map((v) => parseInt(v, 10) || 0);
    const startMinutes = sH * 60 + sM;
    let endMinutes = eH * 60 + eM;
    // Special case for end of day: e.g. "23:45 - 24:00" or "23:45 - 00:00"
    if (endMinutes === 0 && startMinutes > 0) {
      endMinutes = 1440;
    }
    return { startMinutes, endMinutes };
  }
  return { startMinutes: 0, endMinutes: 1440 };
}

/**
 * Parses a "HH:mm" time string into minutes from midnight (0..1440).
 * Handles "24:00" or "23:59" or "00:00" (at end) as 1440.
 */
export function parseTimeToMinutes(timeStr: string, isEnd: boolean = false): number {
  if (!timeStr) return isEnd ? 1440 : 0;
  const trimmed = timeStr.trim();
  if (trimmed === "24:00" || trimmed === "24:0" || (isEnd && (trimmed === "23:59" || trimmed === "23:59:00"))) {
    return 1440;
  }
  const [hStr, mStr] = trimmed.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const total = h * 60 + m;
  if (isEnd && total === 0 && h === 0 && m === 0) {
    return 1440;
  }
  return total;
}

/**
 * Checks whether a given timeBlock falls inside the [startTime, endTime] window.
 * Supports standard ranges (e.g. 07:00 - 19:00) and overnight spans (e.g. 22:00 - 06:00).
 */
export function isBlockInTimeWindow(
  timeBlockStr: string,
  startTime: string,
  endTime: string
): boolean {
  if (!startTime && !endTime) return true;
  const startLimit = parseTimeToMinutes(startTime || "00:00", false);
  const endLimit = parseTimeToMinutes(endTime || "24:00", true);

  // If full day range: 00:00 to 24:00 (or 0 to 1440)
  if (startLimit === 0 && endLimit >= 1440) return true;

  const { startMinutes, endMinutes } = parseTimeBlockMinutes(timeBlockStr);

  if (startLimit <= endLimit) {
    // Standard interval, e.g. 07:00 to 19:00 (420 to 1140)
    // Block must start at/after startLimit and end at/before endLimit
    return startMinutes >= startLimit && endMinutes <= endLimit;
  } else {
    // Overnight interval, e.g. 22:00 to 06:00 (1320 to 360)
    return startMinutes >= startLimit || endMinutes <= endLimit;
  }
}

/**
 * Filters an array of ForecastRow items based on a time window [startTime, endTime].
 */
export function filterRowsByTimeWindow(
  rows: ForecastRow[],
  startTime: string,
  endTime: string
): ForecastRow[] {
  if (!startTime && !endTime) return rows;
  const startLimit = parseTimeToMinutes(startTime || "00:00", false);
  const endLimit = parseTimeToMinutes(endTime || "24:00", true);
  if (startLimit === 0 && endLimit >= 1440) return rows;

  return rows.filter((r) => isBlockInTimeWindow(r.timeBlock, startTime, endTime));
}

