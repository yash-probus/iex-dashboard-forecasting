import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, HelpCircle, Activity, Sparkles, AlertCircle } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { apiClient } from "@/api/client";
import {
  computeHistoricalCalibration,
  type HistoricalCalibrationResult,
  type BidType,
  type StrictnessLevel,
  type HistoricalRowWithActual,
} from "../clearFinderCalculations";

interface ClearFinderCalibrationPanelProps {
  selectedPrice: number;
  bidType: BidType;
  strictness: StrictnessLevel;
  selectedDate: string;
  market: string;
}

export const ClearFinderCalibrationPanel: React.FC<ClearFinderCalibrationPanelProps> = ({
  selectedPrice,
  bidType,
  strictness,
  selectedDate,
  market,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalRowWithActual[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy load historical data when panel is opened for the first time
  useEffect(() => {
    if (!isOpen || historicalData !== null || loading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchHistory = async () => {
      try {
        let endDate: Date;
        try {
          endDate = parseISO(selectedDate);
          if (isNaN(endDate.getTime())) endDate = new Date();
        } catch {
          endDate = new Date();
        }

        // Fetch up to 14-21 days ending yesterday to get rich sample with actual MCP
        const endStr = format(subDays(endDate, 1), "yyyy-MM-dd");
        const startStr = format(subDays(endDate, 20), "yyyy-MM-dd");

        const res = await apiClient.get(
          `/forecast/price?market=${market.toLowerCase()}&startDate=${startStr}&endDate=${endStr}&interval=15min&model=Model3`
        );

        if (cancelled) return;

        if (res.data && res.data.success && Array.isArray(res.data.data?.intervals)) {
          const intervals = res.data.data.intervals;
          const mapped: HistoricalRowWithActual[] = intervals.map((row: any) => {
            let mcpVal = 0;
            if (row.mcp !== null && row.mcp !== undefined && !isNaN(Number(row.mcp))) {
              mcpVal = Number(row.mcp);
            }
            let actVal: number | null = null;
            if (row.actualMcp !== null && row.actualMcp !== undefined && !isNaN(Number(row.actualMcp))) {
              actVal = Number(row.actualMcp);
            }
            let pMin = mcpVal * 0.95;
            let pMax = mcpVal * 1.05;
            if (row.priceRange && typeof row.priceRange === "string" && row.priceRange.includes("-")) {
              const parts = row.priceRange.split("-").map((p: string) => parseFloat(p.trim()));
              if (!isNaN(parts[0]) && !isNaN(parts[1])) {
                pMin = parts[0] > 50 ? +(parts[0] / 1000).toFixed(2) : parts[0];
                pMax = parts[1] > 50 ? +(parts[1] / 1000).toFixed(2) : parts[1];
              }
            }
            const conf = row.confidence && !isNaN(Number(row.confidence)) ? Number(row.confidence) : null;
            return {
              forecastedMcp: mcpVal,
              actualMcp: actVal,
              priceMin: pMin,
              priceMax: pMax,
              confidence: conf,
            };
          });
          setHistoricalData(mapped);
        } else {
          setHistoricalData([]);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn("[ClearFinderCalibrationPanel] History fetch fallback:", err);
          setError("Historical actuals backtest currently unavailable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedDate, market, historicalData, loading]);

  const calibrationResult: HistoricalCalibrationResult | null = React.useMemo(() => {
    if (!historicalData || historicalData.length === 0) return null;
    return computeHistoricalCalibration(historicalData, selectedPrice, bidType, strictness);
  }, [historicalData, selectedPrice, bidType, strictness]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 shadow-sm backdrop-blur-sm overflow-hidden transition-all">
      {/* Header Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Confidence Threshold Calibration Panel
              </h3>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Verification Only
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Empirical backtest: evaluates how actual exchange clearing hit rates correlate with model confidence buckets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{isOpen ? "Hide Verification" : "Show Verification"}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="border-t border-border/50 p-5 space-y-4 bg-muted/10">
          {/* Audit Notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Strict Rule of Separation:</strong> Uses past actual MCP for verification & calibration only; actual MCP is strictly <em>never</em> used in live forward-looking labels or decisions.
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading past 20-day historical intervals for confidence bucket calibration...
            </div>
          ) : error ? (
            <div className="py-4 text-center text-xs text-muted-foreground">{error}</div>
          ) : calibrationResult ? (
            <div className="space-y-4">
              {/* Hit rate summary by label */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                  <div className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    Sure Clear Historical Hit Rate
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {calibrationResult.labelStats.sureClearHitRatePct}%
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {calibrationResult.labelStats.sureClearHits} of {calibrationResult.labelStats.sureClearTotal} blocks cleared
                  </div>
                </div>

                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-center">
                  <div className="text-[11px] font-bold uppercase text-sky-600 dark:text-sky-400">
                    Likely Clear Historical Hit Rate
                  </div>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                    {calibrationResult.labelStats.likelyClearHitRatePct}%
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {calibrationResult.labelStats.likelyClearHits} of {calibrationResult.labelStats.likelyClearTotal} blocks cleared
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                  <div className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">
                    Risky Historical Hit Rate
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {calibrationResult.labelStats.riskyHitRatePct}%
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {calibrationResult.labelStats.riskyHits} of {calibrationResult.labelStats.riskyTotal} blocks cleared
                  </div>
                </div>
              </div>

              {/* Bucket Table */}
              <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/50 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Confidence Bucket</th>
                      <th className="px-3.5 py-2.5 text-center">Forecast Range Cleared</th>
                      <th className="px-3.5 py-2.5 text-center">Really Cleared on Exchange</th>
                      <th className="px-3.5 py-2.5 text-center">Empirical Hit Rate</th>
                      <th className="px-3.5 py-2.5 text-right">Headroom Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {calibrationResult.bucketStats.map((b) => (
                      <tr key={b.bucketLabel} className="hover:bg-muted/30">
                        <td className="px-3.5 py-2.5 font-bold text-foreground">
                          {b.bucketLabel}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {b.rangeClearedTotal} blocks
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-semibold text-foreground">
                          {b.reallyClearedHits} blocks
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                              b.hitRatePct >= 95
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : b.hitRatePct >= 80
                                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {b.rangeClearedTotal > 0 ? `${b.hitRatePct}%` : "No data"}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-[11px] text-muted-foreground">
                          {b.rangeClearedTotal > 0 && b.hitRatePct >= 95 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              High certainty (Small/Zero buffer)
                            </span>
                          ) : b.rangeClearedTotal > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              Safety buffer (+₹0.25–₹0.50) recommended
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Recommendation Hint */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/40 rounded-xl p-3 border border-border/50">
                <Sparkles className="h-4 w-4 text-teal-500 shrink-0" />
                <span>
                  <strong>Buffer Calibration Guide:</strong> {calibrationResult.recommendationHint}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No historical data available for calibration.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
