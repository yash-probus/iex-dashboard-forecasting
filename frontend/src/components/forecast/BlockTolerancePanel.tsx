/**
 * Block Error Tolerance & Bidding Window
 * Replaced 100% from Lovable project.
 * Wrapped in a modern wide collapsible drawer / dropdown bar so it takes
 * minimal space when closed, and reveals the full 96-block ribbon and KPI panel on click.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Activity, ChevronDown, Clock, Crosshair, Layers, ShieldCheck, Sliders, X } from "lucide-react";
import {
  MAX_TOL,
  MIN_TOL,
  blockTime,
  computeTolerance,
  formatDuration,
  makeMockBlocks,
  type EnrichedBlock,
  type PriceBlock,
} from "../../lib/tolerance";
import type { ForecastRow } from "./mockData";

export interface BlockTolerancePanelProps {
  blocks?: PriceBlock[];
  rows?: ForecastRow[];
  defaultTolerance?: number;
  onToleranceChange?: (t: number) => void;
  defaultExpanded?: boolean;
}

const SNAPS = [1, 3, 5, 10, 15, 20, 25];
const PRESETS = [3, 5, 10, 15, 20];

/* ---------- small helpers ---------- */

function status(t: number) {
  if (t <= 3) return { label: "High Precision", cls: "bg-cleared-soft text-cleared border border-cleared/30" };
  if (t <= 10) return { label: "Balanced", cls: "bg-balanced-soft text-balanced border border-balanced/30" };
  return { label: "Aggressive", cls: "bg-aggressive-soft text-aggressive border border-aggressive/30" };
}

/** Number that springs to its new value */
function SpringNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 140, damping: 22 });
  const text = useTransform(reduce ? mv : spring, (v) => v.toFixed(decimals));
  useEffect(() => {
    mv.set(value);
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 0.0001);
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${28 - (d / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------- tolerance slider with coverage curve ---------- */

function ToleranceSlider({
  value,
  onChange,
  curve,
  sweetSpot,
}: {
  value: number;
  onChange: (v: number) => void;
  curve: { t: number; pct: number }[];
  sweetSpot: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pos = (t: number) => ((t - MIN_TOL) / (MAX_TOL - MIN_TOL)) * 100;

  const fromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const raw = MIN_TOL + ((clientX - r.left) / r.width) * (MAX_TOL - MIN_TOL);
    let t = Math.round(Math.min(MAX_TOL, Math.max(MIN_TOL, raw)));
    // magnetic snap: pull toward a snap point within ±0.9%
    const near = SNAPS.find((s) => Math.abs(s - raw) <= 0.9);
    if (near !== undefined) t = near;
    onChange(t);
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    if (e.key in map) {
      e.preventDefault();
      onChange(Math.min(MAX_TOL, Math.max(MIN_TOL, value + map[e.key]!)));
    } else if (e.key === "Home") onChange(MIN_TOL);
    else if (e.key === "End") onChange(MAX_TOL);
    else if (e.key === "PageUp") onChange(SNAPS.find((s) => s > value) ?? MAX_TOL);
    else if (e.key === "PageDown") onChange([...SNAPS].reverse().find((s) => s < value) ?? MIN_TOL);
  };

  // scale y to the observed coverage range so the trade-off is visible
  const lo = Math.min(...curve.map((c) => c.pct)) - 5;
  const hi = Math.max(...curve.map((c) => c.pct));
  const y = (pct: number) => 40 - ((pct - lo) / Math.max(hi - lo, 1)) * 36;
  const area =
    `M0,40 ` + curve.map((c) => `L${pos(c.t)},${y(c.pct)}`).join(" ") + ` L100,40 Z`;
  const line = curve.map((c, i) => `${i ? "L" : "M"}${pos(c.t)},${y(c.pct)}`).join(" ");

  return (
    <div className="select-none">
      <div className="relative h-16">
        {/* coverage curve: % blocks cleared vs tolerance */}
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-12 w-full text-cleared" aria-hidden>
          <defs>
            <linearGradient id="cov" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
            <clipPath id="covClip">
              <rect x="0" y="0" width={pos(value)} height="40" />
            </clipPath>
          </defs>
          <path d={area} fill="url(#cov)" opacity={0.35} />
          <path d={area} fill="url(#cov)" clipPath="url(#covClip)" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" opacity={0.7} />
        </svg>
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 text-[10px] font-medium text-muted-foreground"
          style={{ left: `${pos(sweetSpot)}%` }}
        >
          <span className="rounded bg-card/80 px-1 border border-border/50">sweet spot · <span className="font-mono">{sweetSpot}%</span></span>
          <div className="mx-auto mt-0.5 h-8 w-px border-l border-dashed border-muted-foreground/50" />
        </div>

        {/* track */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Error tolerance"
          aria-valuemin={MIN_TOL}
          aria-valuemax={MAX_TOL}
          aria-valuenow={value}
          aria-valuetext={`${value} percent`}
          onKeyDown={onKey}
          onPointerDown={(e: PointerEvent) => {
            dragging.current = true;
            (e.target as Element).setPointerCapture?.(e.pointerId);
            fromPointer(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && fromPointer(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          className="absolute inset-x-0 bottom-1 h-3 cursor-pointer touch-none rounded-full bg-track outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card"
        >
          <motion.div className="h-full rounded-full bg-accent-gradient" animate={{ width: `${pos(value)}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
          <motion.div
            className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-cleared shadow-layer"
            animate={{ left: `${pos(value)}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* snap ticks + integrated preset chips */}
      <div className="relative mt-2 h-8">
        {SNAPS.map((s) => {
          const active = s === value;
          const chip = PRESETS.includes(s) || s === 1 || s === 25;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              aria-label={`Set tolerance to ${s}%`}
              className={`absolute -translate-x-1/2 rounded-md px-2 py-1 font-mono text-xs transition-colors cursor-pointer ${
                active ? "bg-foreground text-background font-bold shadow-sm" : chip ? "text-muted-foreground hover:bg-muted hover:text-foreground" : ""
              }`}
              style={{ left: `${pos(s)}%` }}
            >
              {s}%
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 96-cell ribbon ---------- */

function cellClass(b: EnrichedBlock, tol: number) {
  if (b.cleared) return "bg-cleared";
  // intensity grows with how far beyond tolerance the block is
  const over = b.errorPct - tol;
  if (over > 15) return "bg-miss-strong hatch";
  if (over > 6) return "bg-miss-strong/60 hatch";
  return "bg-miss hatch";
}

function Ribbon({
  blocks,
  tol,
  peakIndex,
  highlight,
  range,
}: {
  blocks: EnrichedBlock[];
  tol: number;
  peakIndex: number;
  highlight: [number, number] | null;
  range: [number, number];
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<EnrichedBlock | null>(null);
  const visible = blocks.slice(range[0], range[1]);
  const n = visible.length;
  const ticks = Array.from({ length: n / 12 + 1 }, (_, k) => range[0] + k * 12);

  return (
    <div className="relative">
      <div className="relative flex h-24 gap-[2px]" onMouseLeave={() => setHover(null)}>
        {visible.map((b) => {
          const dim = highlight && (b.index < highlight[0] || b.index > highlight[1]);
          return (
            <motion.button
              key={b.index}
              type="button"
              tabIndex={-1}
              aria-label={`${b.start}–${b.end}, error ${b.errorPct.toFixed(1)}%, ${b.cleared ? "cleared" : "outside tolerance"}`}
              onMouseEnter={() => setHover(b)}
              onFocus={() => setHover(b)}
              className={`relative flex-1 rounded-[3px] transition-colors duration-300 ${cellClass(b, tol)}`}
              initial={false}
              animate={{ opacity: dim ? 0.25 : 1, scaleY: b.cleared ? 1 : 0.72 }}
              transition={reduce ? { duration: 0 } : { duration: 0.35, delay: (b.index - range[0]) * 0.004 }}
              style={{ transformOrigin: "bottom" }}
            >
              {b.index === peakIndex && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-miss-strong" aria-hidden>
                  <Crosshair className="h-3.5 w-3.5" />
                </span>
              )}
            </motion.button>
          );
        })}

        {hover && (
          <div
            className="pointer-events-none absolute -top-2 z-20 w-48 -translate-x-1/2 -translate-y-full rounded-lg bg-popover p-3 text-xs text-popover-foreground shadow-layer border border-border"
            style={{ left: `${Math.min(88, Math.max(12, ((hover.index - range[0] + 0.5) / n) * 100))}%` }}
          >
            <div className="font-mono font-semibold">{hover.start} – {hover.end}</div>
            <div className="mt-1.5 grid grid-cols-2 gap-y-0.5 opacity-80">
              <span>Forecast</span><span className="text-right font-mono">₹{hover.forecast.toFixed(2)}</span>
              <span>Actual</span><span className="text-right font-mono">{hover.actual !== null && !isNaN(hover.actual) ? `₹${hover.actual.toFixed(2)}` : "--"}</span>
              <span>Error</span><span className="text-right font-mono">{hover.actual !== null && !isNaN(hover.actual) ? `${hover.errorPct.toFixed(2)}%` : "--"}</span>
            </div>
            <div className={`mt-2 flex items-center gap-1 font-medium ${hover.cleared ? "text-cleared" : "text-miss-strong"}`}>
              {hover.actual !== null && !isNaN(hover.actual) ? (
                <>
                  {hover.cleared ? <ShieldCheck className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {hover.cleared ? "Cleared" : "Outside tolerance"}
                  {hover.index === peakIndex && " · peak deviation"}
                </>
              ) : (
                <span className="text-muted-foreground text-[11px]">Awaiting settlement</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* hour ticks every 3h */}
      <div className="relative mx-2 mt-2 h-4">
        {ticks.map((i) => (
          <span key={i} className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground" style={{ left: `${((i - range[0]) / n) * 100}%` }}>
            {String(i / 4).padStart(2, "0")}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- main component with modern wide dropdown wrapper ---------- */

export function BlockTolerancePanel({
  blocks: propBlocks,
  rows,
  defaultTolerance = 10,
  onToleranceChange,
  defaultExpanded = false,
}: BlockTolerancePanelProps) {
  const [tol, setTol] = useState(defaultTolerance);
  const [selected, setSelected] = useState<number | null>(null);
  const [half, setHalf] = useState<0 | 1 | null>(null); // mobile 48-block mini-view
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const reduce = useReducedMotion();

  // Convert rows to PriceBlock[] if rows passed, otherwise use propBlocks or fallback to mock
  const blocks: PriceBlock[] = useMemo(() => {
    if (propBlocks && propBlocks.length > 0) return propBlocks;
    if (rows && rows.length > 0) {
      return rows.map((r, i) => ({
        start: r.timeBlock ? r.timeBlock.split("-")[0].trim() : blockTime(i),
        forecast: r.forecastedMcp,
        actual: r.actualMcp,
      }));
    }
    return makeMockBlocks();
  }, [propBlocks, rows]);

  const r = useMemo(() => computeTolerance(blocks, tol), [blocks, tol]);

  const change = useCallback(
    (t: number) => {
      setTol(t);
      setSelected(null);
      onToleranceChange?.(t);
    },
    [onToleranceChange],
  );

  const st = status(tol);
  const range: [number, number] = half === null ? [0, 96] : half === 0 ? [0, 48] : [48, 96];
  const win = selected !== null ? r.windows[selected] : null;

  const hourlyDev = useMemo(
    () => Array.from({ length: 24 }, (_, h) => r.blocks.slice(h * 4, h * 4 + 4).reduce((s, b) => s + b.deviation, 0) / 4),
    [r.blocks],
  );
  const hourlyErr = useMemo(
    () => Array.from({ length: 24 }, (_, h) => Math.max(...r.blocks.slice(h * 4, h * 4 + 4).map((b) => b.deviation))),
    [r.blocks],
  );

  // radial ring progress
  const ringC = 2 * Math.PI * 34;
  const ring = useMotionValue(ringC);
  useEffect(() => {
    const target = ringC * (1 - r.clearedPct / 100);
    if (reduce) ring.set(target);
    else animate(ring, target, { type: "spring", stiffness: 120, damping: 20 });
  }, [r.clearedPct, ring, ringC, reduce]);

  return (
    <div className="mb-6 w-full rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-cleared/30">
      {/* 
        WIDE DROPDOWN / ACCORDION HEADER
        Provides compact view with presets & stats when collapsed,
        and expands the full 100% Lovable component on click.
      */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-6 cursor-pointer select-none transition-colors hover:bg-muted/30"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {/* Left: Icon, Title & Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cleared/15 text-cleared border border-cleared/20">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                Block Error Tolerance & Bidding Window
              </h3>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                {st.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              96 blocks · 15 min each · tolerance: <span className="font-mono font-medium text-foreground">≤ {tol}%</span>
            </p>
          </div>
        </div>

        {/* Center/Right: Collapsed quick stats & presets matching user request */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 ml-auto" onClick={(e) => e.stopPropagation()}>
          {/* Quick Presets Bar: PRESET 3% 5% 10% 15% 20% */}
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2 py-1 shadow-2xs">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground">PRESET:</span>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => change(p)}
                className={`rounded px-2 py-0.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
                  tol === p
                    ? "bg-foreground text-background shadow-xs scale-105"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-xs">
            {r.hasActuals ? (
              <>
                <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-cleared" />
                  <span className="text-cleared font-semibold">{r.clearedCount}</span>/96
                  <span className="text-muted-foreground text-[11px]">({r.clearedPct.toFixed(0)}%)</span>
                </span>
                <span className="h-3 w-px bg-border/80" />
                <span className="flex items-center gap-1 font-mono text-muted-foreground text-[11px]">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {formatDuration(r.clearedMinutes)}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 font-mono text-muted-foreground text-[11px]">
                <Clock className="h-3 w-3 text-muted-foreground" />
                Awaiting Settlement
              </span>
            )}
          </div>

          {/* Wide Dropdown Action Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted transition-colors cursor-pointer"
          >
            <span>{isOpen ? "Collapse" : "Expand Details"}</span>
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* 
        EXPANDED PANEL: 100% EXACT LOVABLE COMPONENT
      */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border"
          >
            <section aria-labelledby="bet-title" className="bg-card">
              <div className="grid lg:grid-cols-[1fr_360px]">
                {/* LEFT: ribbon + control */}
                <div className="p-5 sm:p-8">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 id="bet-title" className="text-lg font-semibold tracking-tight">
                        Block Error Tolerance & Bidding Window
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        96 blocks · 15 min each · forecast vs actual clearing price
                      </p>
                    </div>
                    <motion.span layout className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${st.cls}`} aria-live="polite">
                      {st.label}
                    </motion.span>
                  </header>

                  {/* ribbon */}
                  <div className="mt-10">
                    <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-cleared inline-block" /> Cleared</span>
                        <span className="flex items-center gap-1.5"><i className="hatch h-2.5 w-2.5 rounded-sm bg-miss-strong/60 inline-block" /> Outside</span>
                        <span className="flex items-center gap-1.5"><Crosshair className="h-3 w-3 text-miss-strong" /> Peak</span>
                      </div>
                      <div className="flex gap-1 sm:hidden" role="group" aria-label="Ribbon view">
                        {(["Day", "AM", "PM"] as const).map((l, i) => {
                          const v = i === 0 ? null : ((i - 1) as 0 | 1);
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setHalf(v)}
                              aria-pressed={half === v}
                              className={`rounded px-2 py-0.5 cursor-pointer ${half === v ? "bg-foreground text-background" : "bg-muted"}`}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="-mx-1 overflow-x-auto px-1 pt-6">
                      <div className={half === null ? "min-w-[640px] sm:min-w-0" : ""}>
                        <Ribbon blocks={r.blocks} tol={tol} peakIndex={r.peak.index} highlight={win ? [win.startIndex, win.endIndex] : null} range={range} />

                        {/* bidding window brackets */}
                        <div className="relative mt-3 h-10" role="list" aria-label="Bidding windows">
                          {r.windows.map((w, i) => {
                            const a = Math.max(w.startIndex, range[0]);
                            const b = Math.min(w.endIndex + 1, range[1]);
                            if (b <= a) return null;
                            const span = range[1] - range[0];
                            const wide = w.blocks >= 8;
                            return (
                              <motion.button
                                key={`${w.startIndex}-${w.endIndex}`}
                                role="listitem"
                                layout={!reduce}
                                onClick={() => setSelected(selected === i ? null : i)}
                                aria-pressed={selected === i}
                                aria-label={`Bidding window ${w.label}, ${w.duration}`}
                                title={`${w.label} · ${w.duration}`}
                                className="group absolute top-0 h-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                                style={{ left: `${((a - range[0]) / span) * 100}%`, width: `${((b - a) / span) * 100}%` }}
                              >
                                <span className={`block h-1.5 rounded-b-sm border-x-2 border-b-2 transition-colors ${selected === i ? "border-foreground" : "border-cleared group-hover:border-foreground/60"}`} />
                                {wide && (
                                  <span className="mt-1 block truncate px-1 text-center font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
                                    {w.label} · {w.duration}
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* tolerance control */}
                  <div className="mt-8 rounded-xl border border-border bg-surface p-5">
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-sm font-medium">Error tolerance</span>
                      <span className="font-mono text-2xl font-semibold tracking-tight">
                        ≤ <SpringNumber value={tol} />%
                      </span>
                    </div>
                    <ToleranceSlider value={tol} onChange={change} curve={r.curve} sweetSpot={r.sweetSpot} />
                    <p className="mt-1 text-[11px] text-muted-foreground">Curve shows % of blocks cleared at each tolerance. Use ← → or PgUp/PgDn.</p>
                  </div>
                </div>

                {/* RIGHT: glass KPI panel */}
                <aside className="glass border-t border-border p-5 sm:p-8 lg:border-l lg:border-t-0" aria-label="Key metrics">
                  <div className="grid gap-4">
                    {/* cleared blocks ring */}
                    <div className="flex items-center gap-5 rounded-xl border border-border bg-card/70 p-4">
                      <svg viewBox="0 0 80 80" className="h-24 w-24 shrink-0 -rotate-90" aria-hidden>
                        <circle cx="40" cy="40" r="34" fill="none" strokeWidth="8" className="stroke-track" />
                        <motion.circle cx="40" cy="40" r="34" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-cleared" strokeDasharray={ringC} style={{ strokeDashoffset: ring }} />
                      </svg>
                      <div>
                        <div className="text-xs text-muted-foreground">Cleared blocks</div>
                        <div className="font-mono text-3xl font-semibold tracking-tight">
                          <SpringNumber value={r.clearedCount} />
                          <span className="text-base text-muted-foreground"> / {r.total}</span>
                        </div>
                        <div className="font-mono text-sm text-cleared"><SpringNumber value={r.clearedPct} decimals={1} />%</div>
                      </div>
                    </div>

                    {/* bidding window */}
                    <div className="rounded-xl border border-border bg-card/70 p-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Bidding window</span><Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 font-mono text-3xl font-semibold tracking-tight">
                        {formatDuration(r.clearedMinutes)}
                        <span className="text-base text-muted-foreground"> / 24h</span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
                        <motion.div className="h-full rounded-full bg-accent-gradient" animate={{ width: `${(r.clearedMinutes / 1440) * 100}%` }} transition={{ type: "spring", stiffness: 140, damping: 22 }} />
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">across <span className="font-mono">{r.windows.length}</span> window{r.windows.length === 1 ? "" : "s"}</div>
                    </div>

                    {/* RMSE + peak */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-border bg-card/70 p-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>RMSE</span><Activity className="h-3.5 w-3.5" /></div>
                        <div className="mt-1 font-mono text-xl font-semibold">₹{r.rmse.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">per kWh</div>
                        <Sparkline data={hourlyDev} className="mt-2 h-6 w-full text-teal" />
                      </div>
                      <div className="rounded-xl border border-border bg-card/70 p-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Peak dev.</span><Crosshair className="h-3.5 w-3.5" /></div>
                        <div className="mt-1 font-mono text-xl font-semibold text-miss-strong">₹{r.peak.deviation.toFixed(2)}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{r.peak.start}–{r.peak.end}</div>
                        <Sparkline data={hourlyErr} className="mt-2 h-6 w-full text-miss-strong" />
                      </div>
                    </div>

                    {/* insight */}
                    <p className="flex gap-2 rounded-xl bg-accent p-4 text-sm leading-relaxed text-accent-foreground border border-accent-foreground/10" aria-live="polite">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      {r.insight}
                    </p>
                  </div>
                </aside>
              </div>

              {/* Bottom collapse bar */}
              <div className="flex justify-center border-t border-border/60 py-2.5 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                >
                  <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                  <span>Collapse Bidding Ribbon</span>
                </button>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
