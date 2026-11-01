import type { ForecastRow } from "../mockData";

export interface DaySummary {
  date: string;
  dayLabel: string;
  mae: number | null;
  wmape: number | null;
  avgForecast: number;
  avgActual: number | null;
  confidence: number;
  totalBlocks: number;
  evaluatedBlocks: number;
  isBestDay?: boolean;
  isWorstDay?: boolean;
}

export interface ToleranceOption {
  id: "abs_020" | "abs_025" | "abs_050" | "abs_100" | "pct_10";
  label: string;
  unit: string;
}

export const TOLERANCE_OPTIONS: ToleranceOption[] = [
  { id: "abs_020", label: "±₹0.20", unit: "₹" },
  { id: "abs_025", label: "±₹0.25", unit: "₹" },
  { id: "abs_050", label: "±₹0.50", unit: "₹" },
  { id: "abs_100", label: "±₹1.00", unit: "₹" },
  { id: "pct_10", label: "±10%", unit: "%" },
];

export interface VerdictConfig {
  excellentThreshold: number; // e.g. <= 4.0%
  goodThreshold: number;      // e.g. <= 7.0%
  averageThreshold: number;   // e.g. <= 10.0%
}

export const DEFAULT_VERDICT_CONFIG: VerdictConfig = {
  excellentThreshold: 4.5,
  goodThreshold: 7.5,
  averageThreshold: 11.0,
};

export interface HourlyHeatmapCell {
  hour: string; // "00", "01" ... "23"
  timeRange: string; // "00:00 - 01:00"
  forecast: number;
  actual: number | null;
  absError: number | null;
  pctError: number | null;
  status: "none" | "great" | "good" | "moderate" | "poor";
}

export interface DayHeatmapRow {
  date: string;
  dayLabel: string;
  cells: HourlyHeatmapCell[];
}

export interface TimeOfDaySegment {
  name: string;
  period: string; // "00:00 - 06:00"
  blockRange: string;
  mae: number | null;
  wmape: number | null;
  avgForecast: number;
  avgActual: number | null;
  totalBlocks: number;
  evaluatedBlocks: number;
  compliantBlocks: number;
}

export interface RankedBlock {
  date: string;
  timeBlock: string;
  hour: string;
  forecast: number;
  actual: number;
  absError: number;
  pctError: number;
  type: "over" | "under" | "exact";
}

export interface SevenDayReportData {
  modelId: string;
  modelName: string;
  market: string;
  startDate: string;
  endDate: string;
  totalRows: number;
  evaluatedRowsCount: number;

  // Verdict
  rating: "Excellent" | "Good" | "Average" | "Poor";
  ratingColor: string;
  ratingBg: string;
  verdictSummary: string;

  // 7-day KPIs
  wmape: number | null;
  mae: number | null;
  confidence: number;
  avgForecast: number;
  avgActual: number | null;

  // Comparison with prior 7 days
  priorWmape: number | null;
  priorMae: number | null;
  priorConfidence: number | null;
  priorAvgForecast: number | null;
  priorAvgActual: number | null;
  wmapeDelta: number | null;
  maeDelta: number | null;

  // Daily Trend
  dailySummaries: DaySummary[];
  bestDay: DaySummary | null;
  worstDay: DaySummary | null;

  // Tolerance & Accuracy
  toleranceCompliance: {
    withinCount: number;
    totalCount: number;
    pct: number;
    byDay: { date: string; dayLabel: string; within: number; total: number; pct: number }[];
  };

  // Heatmap
  heatmapRows: DayHeatmapRow[];

  // Time of Day
  todSegments: TimeOfDaySegment[];

  // Bias Analysis
  bias: {
    overCount: number;
    overPct: number;
    underCount: number;
    underPct: number;
    exactCount: number;
    exactPct: number;
    avgBias: number; // positive = over-forecast, negative = under-forecast
    interpretation: string;
  };

  // Best & Worst Blocks
  topWorstBlocks: RankedBlock[];
  topBestBlocks: RankedBlock[];

  // Bidding Impact
  biddingImpact: {
    safeBlocks: number;
    safePct: number;
    riskyBlocks: number;
    riskyPct: number;
    avgClearingDeviation: number;
    estimatedExposure: number; // in ₹/kWh
    primaryRiskTimeOfDay: string;
    assumptionText: string;
  };
}

/** Check if row has valid numeric actual MCP */
export function hasActual(r: ForecastRow): boolean {
  return r.actualMcp !== null && r.actualMcp !== undefined && !isNaN(r.actualMcp);
}

/** Evaluate if block error is within selected tolerance */
export function isWithinTolerance(forecast: number, actual: number, tolId: ToleranceOption["id"]): boolean {
  const absDiff = Math.abs(forecast - actual);
  if (tolId === "abs_020") return absDiff <= 0.20;
  if (tolId === "abs_025") return absDiff <= 0.25;
  if (tolId === "abs_050") return absDiff <= 0.50;
  if (tolId === "abs_100") return absDiff <= 1.00;
  if (tolId === "pct_10") {
    const denom = actual > 0 ? actual : (forecast > 0 ? forecast : 1);
    return (absDiff / denom) * 100 <= 10.0;
  }
  return absDiff <= 0.50;
}

/** Pure report computer */
export function computeSevenDayReport(
  currentRows: ForecastRow[],
  priorRows: ForecastRow[] = [],
  selectedTolerance: ToleranceOption["id"] = "abs_050",
  modelName = "Model 3",
  market = "GDAM",
  config: VerdictConfig = DEFAULT_VERDICT_CONFIG
): SevenDayReportData {
  const evaluatedRows = currentRows.filter(hasActual);
  const totalRows = currentRows.length;
  const evaluatedRowsCount = evaluatedRows.length;

  // Dates in range
  const datesSet = new Set(currentRows.map((r) => r.date));
  const sortedDates = Array.from(datesSet).sort();
  const startDate = sortedDates[0] || "";
  const endDate = sortedDates[sortedDates.length - 1] || "";

  // 1. Overall Aggregates (Current 7 Days)
  const sumAbsErr = evaluatedRows.reduce((s, r) => s + Math.abs(r.forecastedMcp - (r.actualMcp as number)), 0);
  const sumActual = evaluatedRows.reduce((s, r) => s + (r.actualMcp as number), 0);
  const sumForecast = currentRows.reduce((s, r) => s + r.forecastedMcp, 0);
  const sumConf = currentRows.reduce((s, r) => s + (r.confidence || 0), 0);

  const mae = evaluatedRowsCount > 0 ? +(sumAbsErr / evaluatedRowsCount).toFixed(2) : null;
  const wmape = (evaluatedRowsCount > 0 && sumActual > 0) ? +((sumAbsErr / sumActual) * 100).toFixed(2) : null;
  const confidence = totalRows > 0 ? +(sumConf / totalRows).toFixed(1) : 0;
  const avgForecast = totalRows > 0 ? +(sumForecast / totalRows).toFixed(2) : 0;
  const avgActual = evaluatedRowsCount > 0 ? +(sumActual / evaluatedRowsCount).toFixed(2) : null;

  // 2. Prior 7 Days Aggregates
  const priorEvaluated = priorRows.filter(hasActual);
  const priorSumAbsErr = priorEvaluated.reduce((s, r) => s + Math.abs(r.forecastedMcp - (r.actualMcp as number)), 0);
  const priorSumActual = priorEvaluated.reduce((s, r) => s + (r.actualMcp as number), 0);
  const priorSumForecast = priorRows.reduce((s, r) => s + r.forecastedMcp, 0);
  const priorSumConf = priorRows.reduce((s, r) => s + (r.confidence || 0), 0);

  const priorMae = priorEvaluated.length > 0 ? +(priorSumAbsErr / priorEvaluated.length).toFixed(2) : null;
  const priorWmape = (priorEvaluated.length > 0 && priorSumActual > 0) ? +((priorSumAbsErr / priorSumActual) * 100).toFixed(2) : null;
  const priorConfidence = priorRows.length > 0 ? +(priorSumConf / priorRows.length).toFixed(1) : null;
  const priorAvgForecast = priorRows.length > 0 ? +(priorSumForecast / priorRows.length).toFixed(2) : null;
  const priorAvgActual = priorEvaluated.length > 0 ? +(priorSumActual / priorEvaluated.length).toFixed(2) : null;

  const wmapeDelta = (wmape !== null && priorWmape !== null) ? +(wmape - priorWmape).toFixed(2) : null;
  const maeDelta = (mae !== null && priorMae !== null) ? +(mae - priorMae).toFixed(2) : null;

  // 3. Daily Breakdown
  const daysMap = new Map<string, ForecastRow[]>();
  for (const r of currentRows) {
    if (!daysMap.has(r.date)) daysMap.set(r.date, []);
    daysMap.get(r.date)!.push(r);
  }

  const dailySummaries: DaySummary[] = Array.from(daysMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dRows]) => {
      const evalR = dRows.filter(hasActual);
      const sAbs = evalR.reduce((s, r) => s + Math.abs(r.forecastedMcp - (r.actualMcp as number)), 0);
      const sAct = evalR.reduce((s, r) => s + (r.actualMcp as number), 0);
      const sFrc = dRows.reduce((s, r) => s + r.forecastedMcp, 0);
      const sCnf = dRows.reduce((s, r) => s + (r.confidence || 0), 0);

      const dDate = new Date(date + "T00:00:00");
      const dayLabel = !isNaN(dDate.getTime())
        ? dDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
        : date;

      return {
        date,
        dayLabel,
        mae: evalR.length > 0 ? +(sAbs / evalR.length).toFixed(2) : null,
        wmape: (evalR.length > 0 && sAct > 0) ? +((sAbs / sAct) * 100).toFixed(2) : null,
        avgForecast: +(sFrc / dRows.length).toFixed(2),
        avgActual: evalR.length > 0 ? +(sAct / evalR.length).toFixed(2) : null,
        confidence: +(sCnf / dRows.length).toFixed(1),
        totalBlocks: dRows.length,
        evaluatedBlocks: evalR.length,
      };
    });

  // Identify Best & Worst day (by lowest and highest WMAPE)
  const validDays = dailySummaries.filter((d) => d.wmape !== null);
  let bestDay: DaySummary | null = null;
  let worstDay: DaySummary | null = null;
  if (validDays.length > 0) {
    bestDay = [...validDays].sort((a, b) => (a.wmape as number) - (b.wmape as number))[0] || null;
    worstDay = [...validDays].sort((a, b) => (b.wmape as number) - (a.wmape as number))[0] || null;
    if (bestDay && worstDay && bestDay.date !== worstDay.date) {
      bestDay.isBestDay = true;
      worstDay.isWorstDay = true;
    }
  }

  // 4. Tolerance Compliance
  let totalWithin = 0;
  const toleranceByDay = dailySummaries.map((ds) => {
    const dRows = daysMap.get(ds.date) || [];
    const evalR = dRows.filter(hasActual);
    const within = evalR.filter((r) => isWithinTolerance(r.forecastedMcp, r.actualMcp as number, selectedTolerance)).length;
    totalWithin += within;
    const pct = evalR.length > 0 ? +((within / evalR.length) * 100).toFixed(1) : 0;
    return {
      date: ds.date,
      dayLabel: ds.dayLabel,
      within,
      total: evalR.length,
      pct,
    };
  });

  const tolPct = evaluatedRowsCount > 0 ? +((totalWithin / evaluatedRowsCount) * 100).toFixed(1) : 0;

  // 5. Heatmap (7 Days x 24 Hours)
  const heatmapRows: DayHeatmapRow[] = Array.from(daysMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dRows]) => {
      const dDate = new Date(date + "T00:00:00");
      const dayLabel = !isNaN(dDate.getTime())
        ? dDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })
        : date;

      const cells: HourlyHeatmapCell[] = [];
      for (let h = 0; h < 24; h++) {
        const hourStr = String(h).padStart(2, "0");
        const nextHStr = String(h + 1).padStart(2, "0");
        const timeRange = `${hourStr}:00 - ${nextHStr}:00`;
        const hRows = dRows.filter((r) => {
          const rH = r.hour ? String(parseInt(r.hour, 10) - 1).padStart(2, "0") : r.timeBlock.slice(0, 2);
          return rH === hourStr || r.timeBlock.startsWith(hourStr);
        });

        if (hRows.length === 0) {
          cells.push({
            hour: hourStr,
            timeRange,
            forecast: 0,
            actual: null,
            absError: null,
            pctError: null,
            status: "none",
          });
          continue;
        }

        const avgF = hRows.reduce((s, r) => s + r.forecastedMcp, 0) / hRows.length;
        const validH = hRows.filter(hasActual);
        let avgA: number | null = null;
        let absErr: number | null = null;
        let pctErr: number | null = null;
        let status: HourlyHeatmapCell["status"] = "none";

        if (validH.length > 0) {
          avgA = validH.reduce((s, r) => s + (r.actualMcp as number), 0) / validH.length;
          absErr = +(Math.abs(avgF - avgA)).toFixed(2);
          pctErr = avgA > 0 ? +((absErr / avgA) * 100).toFixed(1) : 0;

          if (absErr <= 0.25) status = "great";
          else if (absErr <= 0.60) status = "good";
          else if (absErr <= 1.20) status = "moderate";
          else status = "poor";
        }

        cells.push({
          hour: hourStr,
          timeRange,
          forecast: +avgF.toFixed(2),
          actual: avgA !== null ? +avgA.toFixed(2) : null,
          absError: absErr,
          pctError: pctErr,
          status,
        });
      }

      return { date, dayLabel, cells };
    });

  // 6. Time of Day Performance
  const todDefs = [
    { name: "Night Base", period: "00:00 – 06:00", startH: 0, endH: 6, blockRange: "Blocks 1–24" },
    { name: "Morning Ramp", period: "06:00 – 10:00", startH: 6, endH: 10, blockRange: "Blocks 25–40" },
    { name: "Solar Dip", period: "10:00 – 16:00", startH: 10, endH: 16, blockRange: "Blocks 41–64" },
    { name: "Evening Peak", period: "16:00 – 24:00", startH: 16, endH: 24, blockRange: "Blocks 65–96" },
  ];

  const todSegments: TimeOfDaySegment[] = todDefs.map((def) => {
    const sRows = currentRows.filter((r) => {
      const h = parseInt(r.timeBlock.slice(0, 2), 10);
      return h >= def.startH && h < def.endH;
    });
    const sEval = sRows.filter(hasActual);
    const sAbs = sEval.reduce((s, r) => s + Math.abs(r.forecastedMcp - (r.actualMcp as number)), 0);
    const sAct = sEval.reduce((s, r) => s + (r.actualMcp as number), 0);
    const sFrc = sRows.reduce((s, r) => s + r.forecastedMcp, 0);
    const compliant = sEval.filter((r) => isWithinTolerance(r.forecastedMcp, r.actualMcp as number, selectedTolerance)).length;

    return {
      name: def.name,
      period: def.period,
      blockRange: def.blockRange,
      mae: sEval.length > 0 ? +(sAbs / sEval.length).toFixed(2) : null,
      wmape: (sEval.length > 0 && sAct > 0) ? +((sAbs / sAct) * 100).toFixed(2) : null,
      avgForecast: sRows.length > 0 ? +(sFrc / sRows.length).toFixed(2) : 0,
      avgActual: sEval.length > 0 ? +(sAct / sEval.length).toFixed(2) : null,
      totalBlocks: sRows.length,
      evaluatedBlocks: sEval.length,
      compliantBlocks: compliant,
    };
  });

  // 7. Bias Analysis
  let overCount = 0;
  let underCount = 0;
  let exactCount = 0;
  let totalBiasSum = 0;

  for (const r of evaluatedRows) {
    const diff = r.forecastedMcp - (r.actualMcp as number);
    totalBiasSum += diff;
    if (diff > 0.05) overCount++;
    else if (diff < -0.05) underCount++;
    else exactCount++;
  }

  const overPct = evaluatedRowsCount > 0 ? +((overCount / evaluatedRowsCount) * 100).toFixed(1) : 0;
  const underPct = evaluatedRowsCount > 0 ? +((underCount / evaluatedRowsCount) * 100).toFixed(1) : 0;
  const exactPct = evaluatedRowsCount > 0 ? +((exactCount / evaluatedRowsCount) * 100).toFixed(1) : 0;
  const avgBias = evaluatedRowsCount > 0 ? +(totalBiasSum / evaluatedRowsCount).toFixed(2) : 0;

  let biasInterpretation = "";
  if (Math.abs(avgBias) <= 0.08) {
    biasInterpretation = "Model demonstrates neutral symmetric clearance. Bids placed track market clearing prices with minimal skew.";
  } else if (avgBias > 0) {
    biasInterpretation = `Model exhibits an upward bias (avg +₹${avgBias}/kWh). Bids may clear comfortably but risk purchasing above actual settlement in high volatile intervals.`;
  } else {
    biasInterpretation = `Model exhibits a conservative downward bias (avg -₹${Math.abs(avgBias)}/kWh). Bids have low price risk but may fail to clear in competitive demand spikes.`;
  }

  // 8. Ranked Blocks (Top 5 Best & Top 5 Worst)
  const rankedRows: RankedBlock[] = evaluatedRows.map((r) => {
    const diff = r.forecastedMcp - (r.actualMcp as number);
    const absDiff = Math.abs(diff);
    const denom = (r.actualMcp as number) > 0 ? (r.actualMcp as number) : 1;
    return {
      date: r.date,
      timeBlock: r.timeBlock,
      hour: r.hour,
      forecast: r.forecastedMcp,
      actual: r.actualMcp as number,
      absError: +absDiff.toFixed(2),
      pctError: +((absDiff / denom) * 100).toFixed(1),
      type: diff > 0.05 ? "over" : diff < -0.05 ? "under" : "exact",
    };
  });

  const topWorstBlocks = [...rankedRows].sort((a, b) => b.absError - a.absError).slice(0, 5);
  const topBestBlocks = [...rankedRows].sort((a, b) => a.absError - b.absError).slice(0, 5);

  // 9. Bidding Impact Simulation
  const safeCount = totalWithin;
  const riskyCount = Math.max(0, evaluatedRowsCount - safeCount);
  const safePct = evaluatedRowsCount > 0 ? +((safeCount / evaluatedRowsCount) * 100).toFixed(1) : 0;
  const riskyPct = evaluatedRowsCount > 0 ? +((riskyCount / evaluatedRowsCount) * 100).toFixed(1) : 0;

  // Find time of day with highest MAE for risk identification
  const worstSegment = [...todSegments].filter((s) => s.mae !== null).sort((a, b) => (b.mae as number) - (a.mae as number))[0];
  const primaryRiskTimeOfDay = worstSegment ? `${worstSegment.name} (${worstSegment.period})` : "Peak hours";

  // Estimated financial impact per kWh
  const estimatedExposure = +(sumAbsErr / (evaluatedRowsCount || 1)).toFixed(2);

  // 10. Verdict Banner
  let rating: SevenDayReportData["rating"] = "Good";
  let ratingColor = "text-emerald-500";
  let ratingBg = "bg-emerald-500/10 border-emerald-500/20";

  const effectiveWmape = wmape ?? 6.0;
  if (effectiveWmape <= config.excellentThreshold) {
    rating = "Excellent";
    ratingColor = "text-emerald-500";
    ratingBg = "bg-emerald-500/10 border-emerald-500/30";
  } else if (effectiveWmape <= config.goodThreshold) {
    rating = "Good";
    ratingColor = "text-teal-500";
    ratingBg = "bg-teal-500/10 border-teal-500/30";
  } else if (effectiveWmape <= config.averageThreshold) {
    rating = "Average";
    ratingColor = "text-amber-500";
    ratingBg = "bg-amber-500/10 border-amber-500/30";
  } else {
    rating = "Poor";
    ratingColor = "text-rose-500";
    ratingBg = "bg-rose-500/10 border-rose-500/30";
  }

  // Plain-English verdict summary sentence
  const biasTendency = avgBias > 0.08 ? "tends to moderately over-forecast" : avgBias < -0.08 ? "tends to under-forecast" : "maintains balanced clearance";
  const verdictSummary = `${modelName} achieved ${wmape !== null ? `${wmape}% WMAPE` : "solid precision"} with ${tolPct}% of 15-min blocks clearing within ${TOLERANCE_OPTIONS.find((t) => t.id === selectedTolerance)?.label || "±₹0.50"}; ${biasTendency} during ${primaryRiskTimeOfDay}.`;

  return {
    modelId: modelName.replace(/\D/g, "") || "3",
    modelName,
    market,
    startDate,
    endDate,
    totalRows,
    evaluatedRowsCount,
    rating,
    ratingColor,
    ratingBg,
    verdictSummary,
    wmape,
    mae,
    confidence,
    avgForecast,
    avgActual,
    priorWmape,
    priorMae,
    priorConfidence,
    priorAvgForecast,
    priorAvgActual,
    wmapeDelta,
    maeDelta,
    dailySummaries,
    bestDay,
    worstDay,
    toleranceCompliance: {
      withinCount: totalWithin,
      totalCount: evaluatedRowsCount,
      pct: tolPct,
      byDay: toleranceByDay,
    },
    heatmapRows,
    todSegments,
    bias: {
      overCount,
      overPct,
      underCount,
      underPct,
      exactCount,
      exactPct,
      avgBias,
      interpretation: biasInterpretation,
    },
    topWorstBlocks,
    topBestBlocks,
    biddingImpact: {
      safeBlocks: safeCount,
      safePct,
      riskyBlocks: riskyCount,
      riskyPct,
      avgClearingDeviation: +(sumAbsErr / (evaluatedRowsCount || 1)).toFixed(2),
      estimatedExposure,
      primaryRiskTimeOfDay,
      assumptionText: "Assumes standard price-taker bid strategy against cleared MCP with chosen tolerance window as the target clearance boundary.",
    },
  };
}
