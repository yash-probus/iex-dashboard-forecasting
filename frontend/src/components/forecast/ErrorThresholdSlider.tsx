import React, { useMemo, useState } from "react";
import { SlidersHorizontal, ShieldCheck, Award, Target, AlertTriangle, Clock, Layers, CheckCircle2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import type { ForecastRow } from "./mockData";

export interface ErrorThresholdSliderProps {
  rows: ForecastRow[];
  rmse?: number;
  maxError?: number;
  worstBlock?: string;
  className?: string;
}

/**
 * High-visibility, compact interactive Error Tolerance & Bidding Hours Explorer.
 * Allows users to manually drag a threshold slider (or click presets)
 * to instantly inspect what percentage & number of blocks fall within that error band,
 * and exactly how many hours (out of 24 hrs) are cleared for bidding.
 */
export function ErrorThresholdSlider({
  rows,
  rmse = 0,
  maxError = 0,
  worstBlock = "",
  className,
}: ErrorThresholdSliderProps) {
  const [threshold, setThreshold] = useState<number>(10);

  // Calculate percentage, count of blocks, and cleared hours within threshold
  const {
    countWithin,
    pctBlocks,
    total,
    clearedHours,
    clearedHoursFormatted,
    fullHoursCount,
  } = useMemo(() => {
    if (!rows || rows.length === 0) {
      return {
        countWithin: 0,
        pctBlocks: 0,
        total: 0,
        clearedHours: 0,
        clearedHoursFormatted: "0h 00m",
        fullHoursCount: 0,
      };
    }
    let count = 0;
    const hourBlockMap = new Map<string, { total: number; compliant: number }>();

    for (const r of rows) {
      const act = r.actualMcp !== null && r.actualMcp !== undefined && !isNaN(r.actualMcp) ? r.actualMcp : null;
      const err = act !== null ? Math.abs(r.forecastedMcp - act) : 0;
      const denom = (act !== null && act > 0) ? act : (r.forecastedMcp > 0 ? r.forecastedMcp : 1);
      const pct = act !== null ? (err / denom) * 100 : 0;
      const isCompliant = act !== null ? pct <= threshold : false;

      if (isCompliant) {
        count++;
      }

      // Track distribution across 24 calendar hours
      const h = r.hour || "01";
      const entry = hourBlockMap.get(h) || { total: 0, compliant: 0 };
      entry.total++;
      if (isCompliant) entry.compliant++;
      hourBlockMap.set(h, entry);
    }

    const t = rows.length;
    const pct = t > 0 ? (count / t) * 100 : 0;
    const hoursPerBlock = t > 0 ? 24 / t : 0.25;
    const hours = count * hoursPerBlock;

    const hPart = Math.floor(hours);
    const mPart = Math.round((hours - hPart) * 60);
    const formatted = `${hPart}h ${mPart < 10 ? `0${mPart}` : mPart}m`;

    // Count how many 1-hour slots are 100% compliant
    let fullHours = 0;
    for (const entry of hourBlockMap.values()) {
      if (entry.total > 0 && entry.compliant === entry.total) {
        fullHours++;
      }
    }

    return {
      countWithin: count,
      pctBlocks: pct,
      total: t,
      clearedHours: hours,
      clearedHoursFormatted: formatted,
      fullHoursCount: fullHours,
    };
  }, [rows, threshold]);

  // Tone styling & badge based on threshold
  const tone = useMemo(() => {
    if (threshold <= 5) {
      return {
        label: "High Precision",
        badgeBg: "rgba(16, 185, 129, 0.12)",
        badgeText: "#059669",
        badgeBorder: "rgba(16, 185, 129, 0.3)",
        gradient: "linear-gradient(90deg, #10B981 0%, #059669 100%)",
        color: "#10B981",
        icon: ShieldCheck,
      };
    }
    if (threshold <= 10) {
      return {
        label: "CERC DSM Band",
        badgeBg: "rgba(37, 99, 235, 0.12)",
        badgeText: "#2563EB",
        badgeBorder: "rgba(37, 99, 235, 0.3)",
        gradient: "linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)",
        color: "#2563EB",
        icon: Award,
      };
    }
    if (threshold <= 15) {
      return {
        label: "Extended Tolerance",
        badgeBg: "rgba(124, 58, 237, 0.12)",
        badgeText: "#7C3AED",
        badgeBorder: "rgba(124, 58, 237, 0.3)",
        gradient: "linear-gradient(90deg, #7C3AED 0%, #6366F1 100%)",
        color: "#7C3AED",
        icon: Target,
      };
    }
    return {
      label: "Wide Range",
      badgeBg: "rgba(245, 158, 11, 0.12)",
      badgeText: "#D97706",
      badgeBorder: "rgba(245, 158, 11, 0.3)",
      gradient: "linear-gradient(90deg, #F59E0B 0%, #EA580C 100%)",
      color: "#F59E0B",
      icon: AlertTriangle,
    };
  }, [threshold]);

  const animatedPct = useCountUp(pctBlocks);
  const animatedHours = useCountUp(clearedHours);
  const presets = [3, 5, 10, 15, 20];

  return (
    <div
      className={cn(
        "surface lift relative rounded-2xl border p-4 sm:p-5 mb-6 shadow-sm transition-all",
        className
      )}
      style={{
        minHeight: "fit-content",
        overflow: "visible",
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left Section: Controls, Slider & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Header row with Icon, Title, Badge & Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="grid size-8 place-items-center rounded-lg shrink-0"
                style={{ backgroundColor: "rgba(124, 58, 237, 0.12)", color: "#7C3AED" }}
              >
                <SlidersHorizontal className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    Block Error Tolerance & Bidding Window
                  </h4>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: tone.badgeBg,
                      color: tone.badgeText,
                      borderColor: tone.badgeBorder,
                    }}
                  >
                    {tone.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Slide or select an error tolerance to evaluate actionable bidding hours & blocks
                </p>
              </div>
            </div>

            {/* Quick 1-click Preset Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline">
                Preset:
              </span>
              {presets.map((p) => {
                const isActive = Math.abs(threshold - p) < 0.25;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setThreshold(p)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer select-none"
                    style={
                      isActive
                        ? {
                            backgroundColor: tone.color,
                            color: "#FFFFFF",
                            borderColor: tone.color,
                            boxShadow: `0 2px 8px ${tone.badgeBorder}`,
                          }
                        : {
                            backgroundColor: "rgba(241, 245, 249, 0.8)",
                            color: "#475569",
                            borderColor: "rgba(203, 213, 225, 0.8)",
                          }
                    }
                  >
                    {p}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Slider Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Min: 1%</span>
              <span
                className="font-semibold px-2.5 py-0.5 rounded-md text-xs border flex items-center gap-1.5"
                style={{
                  backgroundColor: tone.badgeBg,
                  color: tone.badgeText,
                  borderColor: tone.badgeBorder,
                }}
              >
                <span>Tolerance: ≤ {threshold.toFixed(1)}% error</span>
                <span className="opacity-40">•</span>
                <span>{countWithin} of {total} Blocks ({pctBlocks.toFixed(1)}%)</span>
                <span className="opacity-40">•</span>
                <span>{clearedHours.toFixed(2)} / 24.0 hrs</span>
              </span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">Max: 25%</span>
            </div>

            <Slider
              value={[threshold]}
              onValueChange={(val) => setThreshold(val[0] ?? 10)}
              min={1}
              max={25}
              step={0.5}
              className="cursor-pointer py-1.5"
              trackClassName="h-2.5 bg-slate-200 dark:bg-slate-700/80 rounded-full"
              rangeClassName="h-full rounded-full transition-all duration-150"
              rangeStyle={{ background: tone.gradient }}
              thumbClassName="h-5 w-5 border-2 bg-white dark:bg-slate-900 shadow-md transition-transform hover:scale-115 active:scale-95"
              thumbStyle={{ borderColor: tone.color, boxShadow: `0 2px 10px ${tone.badgeBorder}` }}
            />
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-[11px] font-sans text-slate-500">Bidding Window:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {clearedHoursFormatted} ({clearedHours.toFixed(2)} / 24.0 hrs)
              </span>
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5 font-mono">
              <Layers className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-[11px] font-sans text-slate-500">Cleared Blocks:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {countWithin} of {total} ({pctBlocks.toFixed(1)}%)
              </span>
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[11px] font-sans text-slate-500">RMSE:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ₹{rmse.toFixed(2)}/kWh
              </span>
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[11px] font-sans text-slate-500">Peak Dev:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ₹{maxError.toFixed(2)}
              </span>
              {worstBlock && (
                <span className="text-[11px] text-slate-500">({worstBlock})</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Compact Readout Card (5 cols) */}
        <div
          className="lg:col-span-5 rounded-xl p-4 flex flex-col justify-between gap-3 border shadow-xs"
          style={{
            backgroundColor: "rgba(241, 245, 249, 0.7)",
            borderColor: "rgba(226, 232, 240, 0.9)",
          }}
        >
          {/* Card Top: Status & Band Pill */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <tone.icon className="size-4 shrink-0" style={{ color: tone.color }} />
              Live Bidding Clearance & Actionability
            </span>
            <span
              className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "rgba(203, 213, 225, 0.8)",
                color: tone.color,
              }}
            >
              ≤ {threshold.toFixed(1)}% error band
            </span>
          </div>

          {/* Dual Stat Tiles: 1) Number of Blocks & %age, 2) Cleared Bidding Hours */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            {/* Tile 1: Blocks Count & %age */}
            <div
              className="p-2.5 rounded-lg border bg-white dark:bg-slate-900/60 flex flex-col justify-between"
              style={{ borderColor: "rgba(226, 232, 240, 0.9)" }}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>Compliant Blocks</span>
                <Layers className="size-3 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="num text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {countWithin}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  / {total} blk
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span
                  className="num text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: tone.badgeBg, color: tone.color }}
                >
                  {animatedPct.toFixed(1)}% of blocks
                </span>
              </div>
            </div>

            {/* Tile 2: Cleared Bidding Hours out of 24 hrs */}
            <div
              className="p-2.5 rounded-lg border bg-white dark:bg-slate-900/60 flex flex-col justify-between"
              style={{ borderColor: "rgba(226, 232, 240, 0.9)" }}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>Bidding Window</span>
                <Clock className="size-3 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className="num text-2xl font-black tracking-tight"
                  style={{ color: tone.color }}
                >
                  {animatedHours.toFixed(1)}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  / 24.0 hrs
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span
                  className="num text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "rgba(37, 99, 235, 0.1)", color: "#2563EB" }}
                >
                  {clearedHoursFormatted} cleared
                </span>
                {fullHoursCount > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    ({fullHoursCount}h full)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Visual Animated Fill Track */}
          <div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/80">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(0, pctBlocks))}%`,
                  background: tone.gradient,
                }}
              />
            </div>
          </div>

          {/* Actionable Summary sentence */}
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-snug">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {countWithin} of {total} blocks ({clearedHoursFormatted} across 24 hrs)
            </span>{" "}
            fall within ≤ {threshold.toFixed(1)}% error — actionable for confident bidding placement.
          </p>
        </div>
      </div>
    </div>
  );
}
