import { useEffect, useMemo, useState } from "react";
import { aggregate, type ForecastRow, type Interval } from "@/components/forecast/mockData";
import { apiClient } from "@/api/client";

export interface ForecastKpis {
  avgF: number;
  avgA: number | null;
  minF: number;
  minA: number | null;
  mae: number | null;
  wmape: number | null;
  confidence: number;
  rmse: number | null;
  maxError: number | null;
  worstBlock: string;
  countWithin5?: number;
  countWithin10?: number;
  countWithin15?: number;
  pctWithin5?: number;
  pctWithin10?: number;
  pctWithin15?: number;
  clearedHours5?: number;
  clearedHours10?: number;
  clearedHours15?: number;
}

/**
 * Live database-connected forecast data hook.
 * Queries /forecast/price endpoint for exact real market forecasts & actuals.
 * Never silently generates artificial mock data for missing or future dates.
 */
export function useForecastData(
  date: string, 
  model: string, 
  interval: Interval, 
  nonce = 0, 
  market = "GDAM",
  rtmType: "dayahead" | "nowcast" = "dayahead"
) {
  const [raw, setRaw] = useState<ForecastRow[] | null>(null);
  const [backendKpis, setBackendKpis] = useState<ForecastKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const rtmParam = market.toUpperCase() === "RTM" ? `&rtmType=${rtmType}` : "";
        const res = await apiClient.get(
          `/forecast/price?market=${market.toLowerCase()}&startDate=${date}&endDate=${date}&interval=15min&model=Model${model}${rtmParam}`
        );

        if (cancelled) return;

        if (res.data && res.data.success && Array.isArray(res.data.data?.intervals)) {
          const apiIntervals = res.data.data.intervals;
          const analytics = res.data.data.analytics;

          if (apiIntervals.length > 0) {
            const mappedRows: ForecastRow[] = apiIntervals.map((row: any, idx: number) => {
              // Forecast price: check mcp (DAM/GDAM) or nowcast/dayahead (RTM)
              let mcpVal: number = 0;
              let confVal = 80;
              let pRangeStr = row.priceRange;

              if (row.mcp !== null && row.mcp !== undefined && !isNaN(Number(row.mcp))) {
                mcpVal = Number(row.mcp);
              } else if (market.toUpperCase() === "RTM") {
                if (rtmType === "nowcast") {
                  mcpVal = (row.mcpNowcast !== null && row.mcpNowcast !== undefined && !isNaN(Number(row.mcpNowcast)))
                    ? Number(row.mcpNowcast)
                    : 0;
                  confVal = row.confidenceNowcast && row.confidenceNowcast !== "N/A" && !isNaN(Number(row.confidenceNowcast))
                    ? Number(row.confidenceNowcast)
                    : 0;
                  pRangeStr = row.priceRangeNowcast || row.priceRange;
                } else {
                  mcpVal = (row.mcpDayahead !== null && row.mcpDayahead !== undefined && !isNaN(Number(row.mcpDayahead)))
                    ? Number(row.mcpDayahead)
                    : 0;
                  confVal = row.confidenceDayahead && row.confidenceDayahead !== "N/A" && !isNaN(Number(row.confidenceDayahead))
                    ? Number(row.confidenceDayahead)
                    : 0;
                  pRangeStr = row.priceRangeDayahead || row.priceRange;
                }
              } else if (row.mcpDayahead !== null && row.mcpDayahead !== undefined && !isNaN(Number(row.mcpDayahead))) {
                mcpVal = Number(row.mcpDayahead);
              } else if (row.mcpNowcast !== null && row.mcpNowcast !== undefined && !isNaN(Number(row.mcpNowcast))) {
                mcpVal = Number(row.mcpNowcast);
              }

              // Confidence for non-RTM
              if (market.toUpperCase() !== "RTM" && row.confidence && row.confidence !== "N/A" && !isNaN(Number(row.confidence))) {
                confVal = Number(row.confidence);
              }

              // Actual price: NULL if market hasn't cleared yet (e.g. tomorrow / future)
              let actVal: number | null = null;
              if (row.actualMcp !== null && row.actualMcp !== undefined && row.actualMcp !== "" && !isNaN(Number(row.actualMcp))) {
                actVal = Number(row.actualMcp);
              }

              // Price range parsing
              let pMin = +(mcpVal * 0.95).toFixed(2);
              let pMax = +Math.min(10, mcpVal * 1.05).toFixed(2);
              if (pRangeStr && typeof pRangeStr === "string" && pRangeStr.includes("-")) {
                const parts = pRangeStr.split("-").map((p: string) => parseFloat(p.trim()));
                if (!isNaN(parts[0]) && !isNaN(parts[1])) {
                  pMin = parts[0] > 50 ? +(parts[0] / 1000).toFixed(2) : parts[0];
                  pMax = parts[1] > 50 ? +(parts[1] / 1000).toFixed(2) : parts[1];
                }
              }

              // Format timeblock consistently e.g. "00:00 - 00:15"
              let tb = row.timeBlock || "";
              if (tb.includes("-") && !tb.includes(" - ")) {
                const [start, end] = tb.split("-");
                tb = `${start.trim()} - ${end.trim()}`;
              } else if (!tb) {
                const sH = String(Math.floor((idx * 15) / 60)).padStart(2, "0");
                const sM = String((idx * 15) % 60).padStart(2, "0");
                const eH = String(Math.floor(((idx + 1) * 15) / 60)).padStart(2, "0");
                const eM = String(((idx + 1) * 15) % 60).padStart(2, "0");
                tb = `${sH}:${sM} - ${eH}:${eM}`;
              }

              return {
                date: row.date || date,
                hour: String(row.hour || String(Math.floor(idx / 4) + 1).padStart(2, "0")),
                timeBlock: tb,
                forecastedMcp: +mcpVal.toFixed(2),
                actualMcp: actVal !== null ? +actVal.toFixed(2) : (null as any),
                priceMin: +pMin.toFixed(2),
                priceMax: +pMax.toFixed(2),
                confidence: +confVal.toFixed(2),
              };
            });

            // For RTM, compute live analytics directly from mappedRows matching Real PROLT metrics exactly
            if (market.toUpperCase() === "RTM") {
              const validF = mappedRows.filter(r => r.forecastedMcp !== null && !isNaN(r.forecastedMcp) && r.forecastedMcp > 0);
              const validActuals = mappedRows.filter(r => r.actualMcp !== null && !isNaN(r.actualMcp));
              const validBoth = mappedRows.filter(r => r.forecastedMcp !== null && !isNaN(r.forecastedMcp) && r.forecastedMcp > 0 && r.actualMcp !== null && !isNaN(r.actualMcp));

              const avgF = validF.length > 0 ? validF.reduce((s, r) => s + r.forecastedMcp, 0) / validF.length : 0;
              const avgA = validActuals.length > 0 ? validActuals.reduce((s, r) => s + r.actualMcp!, 0) / validActuals.length : null;
              const minF = validF.length > 0 ? Math.min(...validF.map(r => r.forecastedMcp)) : 0;
              const minA = validActuals.length > 0 ? Math.min(...validActuals.map(r => r.actualMcp!)) : null;

              let sumAbsErr = 0;
              let sumSquaredErr = 0;
              const sumActualMcp = validActuals.reduce((s, r) => s + r.actualMcp!, 0);
              let within5 = 0;
              let within10 = 0;
              let within15 = 0;
              let maxErr = 0;
              let worstTb = "N/A";

              for (const r of validBoth) {
                const diff = Math.abs(r.actualMcp! - r.forecastedMcp);
                sumAbsErr += diff;
                sumSquaredErr += diff * diff;
                if (diff > maxErr) {
                  maxErr = diff;
                  worstTb = r.timeBlock;
                }
                const denom = r.actualMcp! > 0 ? r.actualMcp! : (r.forecastedMcp > 0 ? r.forecastedMcp : 1);
                const pct = (diff / denom) * 100;
                if (pct <= 5) within5++;
                if (pct <= 10) within10++;
                if (pct <= 15) within15++;
              }

              // In Real PROLT: MAE is sumAbsErr / cleared actual blocks; WMAPE is sumAbsErr / sumActualMcp * 100
              const mae = validActuals.length > 0 ? +(sumAbsErr / validActuals.length).toFixed(2) : null;
              const wmape = sumActualMcp > 0 ? +((sumAbsErr / sumActualMcp) * 100).toFixed(2) : null;
              const rmse = validBoth.length > 0 ? +(Math.sqrt(sumSquaredErr / validBoth.length)).toFixed(2) : null;

              const validC = mappedRows.filter(r => r.confidence !== null && !isNaN(r.confidence) && r.confidence > 0);
              const avgC = validC.length > 0 ? +(validC.reduce((s, r) => s + r.confidence, 0) / validC.length).toFixed(2) : 80;

              const hoursPerBlock = validBoth.length > 0 ? 24 / validBoth.length : 0.25;

              setBackendKpis({
                avgF: +avgF.toFixed(2),
                avgA: avgA !== null ? +avgA.toFixed(2) : null,
                minF: +minF.toFixed(2),
                minA: minA !== null ? +minA.toFixed(2) : null,
                mae,
                wmape,
                rmse,
                confidence: avgC,
                maxError: +maxErr.toFixed(2),
                worstBlock: worstTb,
                countWithin5: within5,
                countWithin10: within10,
                countWithin15: within15,
                pctWithin5: validBoth.length > 0 ? +((within5 / validBoth.length) * 100).toFixed(1) : undefined,
                pctWithin10: validBoth.length > 0 ? +((within10 / validBoth.length) * 100).toFixed(1) : undefined,
                pctWithin15: validBoth.length > 0 ? +((within15 / validBoth.length) * 100).toFixed(1) : undefined,
                clearedHours5: +(within5 * hoursPerBlock).toFixed(2),
                clearedHours10: +(within10 * hoursPerBlock).toFixed(2),
                clearedHours15: +(within15 * hoursPerBlock).toFixed(2),
              });
            } else if (analytics) {
              setBackendKpis({
                avgF: Number(analytics.averageMcpForecasted ?? analytics.averageMcp ?? 0),
                avgA: analytics.averageMcpActual !== "N/A" && analytics.averageMcpActual !== null && !isNaN(Number(analytics.averageMcpActual))
                  ? Number(analytics.averageMcpActual)
                  : null,
                minF: Number(analytics.minMcpForecasted ?? analytics.minMcp ?? 0),
                minA: analytics.minMcpActual !== "N/A" && analytics.minMcpActual !== null && !isNaN(Number(analytics.minMcpActual))
                  ? Number(analytics.minMcpActual)
                  : null,
                mae: analytics.mae !== "N/A" && analytics.mae !== null && !isNaN(Number(analytics.mae))
                  ? Number(analytics.mae)
                  : null,
                wmape: analytics.wmape !== "N/A" && analytics.wmape !== null && !isNaN(parseFloat(String(analytics.wmape)))
                  ? parseFloat(String(analytics.wmape))
                  : null,
                confidence: analytics.confidence !== "N/A" && analytics.confidence !== null && !isNaN(Number(analytics.confidence))
                  ? Number(analytics.confidence)
                  : 80,
                rmse: analytics.rmse !== "N/A" && analytics.rmse !== null && !isNaN(Number(analytics.rmse))
                  ? Number(analytics.rmse)
                  : null,
                maxError: analytics.maxError !== "N/A" && analytics.maxError !== null && !isNaN(Number(analytics.maxError))
                  ? Number(analytics.maxError)
                  : null,
                worstBlock: analytics.maxErrorTimeBlock || "N/A",
                countWithin5: analytics.countWithin5,
                countWithin10: analytics.countWithin10,
                countWithin15: analytics.countWithin15,
                pctWithin5: analytics.blocksWithin5Pct !== "N/A" ? Number(analytics.blocksWithin5Pct) : undefined,
                pctWithin10: analytics.blocksWithin10Pct !== "N/A" ? Number(analytics.blocksWithin10Pct) : undefined,
                pctWithin15: analytics.blocksWithin15Pct !== "N/A" ? Number(analytics.blocksWithin15Pct) : undefined,
                clearedHours5: analytics.clearedHoursWithin5,
                clearedHours10: analytics.clearedHoursWithin10,
                clearedHours15: analytics.clearedHoursWithin15,
              });
            } else {
              setBackendKpis(null);
            }

            setRaw(mappedRows);
            setLoading(false);
            return;
          }
        }

        // If no intervals returned from DB, do NOT generate fake mock data
        setRaw([]);
        setBackendKpis(null);
        setError(`No forecast records available in database for ${date}.`);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[useForecastData] API error:", err);
          setRaw([]);
          setBackendKpis(null);
          setError(err.message || "Failed to fetch forecast from live database.");
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [date, model, nonce, market, rtmType]);

  const rows = useMemo(() => {
    if (!raw || raw.length === 0) return raw;
    return aggregate(raw, interval);
  }, [raw, interval]);

  return {
    rows,
    kpis: backendKpis,
    loading,
    error,
  };
}
