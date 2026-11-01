import React, { useMemo, useState } from "react";
import {
  Area, Bar, Brush, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps,
} from "recharts";
import { AreaChart as AreaIcon, BarChart3, CalendarIcon, LineChart as LineIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { PRICE_CAP, type ForecastRow } from "./mockData";

type View = "line" | "area" | "bar";

interface ForecastChartProps {
  rows: ForecastRow[];
  date: string;
  market: string;
  highlight: string | null;
  isToday: boolean;
}

/** TOD peak windows (start labels in HH:MM). */
const PEAKS: [string, string][] = [["06:00", "09:00"], ["18:00", "23:00"]];

export function ForecastChart({ rows, date, market, highlight, isToday }: ForecastChartProps) {
  const [view, setView] = useState<View>("area");
  const [show, setShow] = useState({ forecast: true, actual: true, band: true });

  const data = useMemo(
    () => rows.map((r) => ({ ...r, t: r.timeBlock.slice(0, 5), band: [r.priceMin, r.priceMax] as [number, number] })),
    [rows],
  );
  const step = Math.max(1, Math.round(data.length / 24));
  const nearest = (hhmm: string) => data.find((d) => d.t >= hhmm)?.t ?? data[data.length - 1]?.t;
  const now = new Date();
  const nowLabel = nearest(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  const hl = highlight ? data.find((d) => d.timeBlock === highlight)?.t : null;

  return (
    <section className="surface fade-up p-5 md:p-6 bg-card border rounded-2xl shadow-sm" style={{ animationDelay: "250ms" }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{market} Forecast — Graph view</h2>
          <span className="num inline-flex items-center gap-1.5 rounded-md border bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">
            <CalendarIcon className="size-3" /> {(() => {
              try {
                return format(parseISO(date), "dd MMM yyyy");
              } catch {
                return date;
              }
            })()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip on={show.forecast} dot="bg-forecast" onClick={() => setShow((s) => ({ ...s, forecast: !s.forecast }))}>Forecasted MCP</Chip>
          <Chip on={show.actual} dot="bg-actual" onClick={() => setShow((s) => ({ ...s, actual: !s.actual }))}>Actual MCP</Chip>
          <Chip on={show.band} dot="bg-forecast/30" onClick={() => setShow((s) => ({ ...s, band: !s.band }))}>95% band</Chip>
          <div className="ml-1 flex rounded-lg border bg-surface-2 p-0.5">
            {([["line", LineIcon], ["area", AreaIcon], ["bar", BarChart3]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={`${v} view`}
                aria-pressed={view === v}
                className={cn("rounded-md p-1.5 transition-all", view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[480px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--forecast, #7C3AED)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--forecast, #7C3AED)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--actual, #14B8A6)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--actual, #14B8A6)" stopOpacity={0} />
              </linearGradient>
              <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <CartesianGrid stroke="var(--grid, rgba(100,116,139,0.18))" strokeDasharray="3 4" vertical={false} />
            {PEAKS.map(([a, b]) => (
              <ReferenceArea key={a} x1={nearest(a) ?? ""} x2={nearest(b) ?? ""} fill="var(--peak, rgba(244,63,94,0.06))" ifOverflow="extendDomain" />
            ))}
            <XAxis
              dataKey="t"
              interval={step * 2 - 1}
              tick={{ fontSize: 11, fill: "var(--muted-foreground, #64748B)", fontFamily: "var(--font-mono, monospace)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border, #E2E8F0)" }}
            />
            <YAxis
              domain={[0, 12]}
              ticks={[0, 2, 4, 6, 8, 10, 12]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground, #64748B)", fontFamily: "var(--font-mono, monospace)" }}
              tickLine={false}
              axisLine={false}
              width={52}
              label={{ value: "₹/kWh", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "var(--muted-foreground, #64748B)" }}
            />
            <ReferenceLine
              y={PRICE_CAP}
              stroke="var(--negative, #F43F5E)"
              strokeDasharray="5 5"
              strokeOpacity={0.6}
              label={{ value: "Price Cap ₹10.00", position: "insideTopLeft", fontSize: 10, fill: "var(--negative, #F43F5E)" }}
            />
            {show.band && <Area dataKey="band" stroke="none" fill="var(--forecast, #7C3AED)" fillOpacity={0.12} isAnimationActive={false} />}

            {show.actual && view === "bar" && <Bar dataKey="actualMcp" fill="var(--actual, #14B8A6)" radius={[3, 3, 0, 0]} />}
            {show.forecast && view === "bar" && <Bar dataKey="forecastedMcp" fill="var(--forecast, #7C3AED)" radius={[3, 3, 0, 0]} />}
            {show.actual && view === "area" && <Area type="monotone" dataKey="actualMcp" stroke="var(--actual, #14B8A6)" strokeWidth={2.5} fill="url(#gA)" animationDuration={900} />}
            {show.forecast && view === "area" && <Area type="monotone" dataKey="forecastedMcp" stroke="var(--forecast, #7C3AED)" strokeWidth={2.5} fill="url(#gF)" filter="url(#glow)" animationDuration={900} />}
            {show.actual && view === "line" && <Line type="monotone" dataKey="actualMcp" stroke="var(--actual, #14B8A6)" strokeWidth={2.5} dot={false} animationDuration={900} />}
            {show.forecast && view === "line" && <Line type="monotone" dataKey="forecastedMcp" stroke="var(--forecast, #7C3AED)" strokeWidth={2.5} dot={false} filter="url(#glow)" animationDuration={900} />}

            {isToday && nowLabel && (
              <ReferenceLine x={nowLabel} stroke="var(--gdam, #14B8A6)" strokeDasharray="2 3" label={{ value: "● NOW", position: "top", fontSize: 10, fill: "var(--gdam, #14B8A6)" }} />
            )}
            {hl && <ReferenceLine x={hl} stroke="var(--brand, #7C3AED)" strokeWidth={1.5} />}

            <Tooltip content={<GlassTooltip />} cursor={{ stroke: "var(--muted-foreground, #64748B)", strokeOpacity: 0.3 }} />
            <Brush dataKey="t" height={26} travellerWidth={8} stroke="var(--brand, #7C3AED)" fill="var(--surface-2, #F1F5F9)" fillOpacity={0.4} tickFormatter={() => ""} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Chip({ on, dot, children, onClick }: { on: boolean; dot: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer",
        on ? "bg-card text-foreground border-border shadow-xs" : "bg-transparent text-muted-foreground opacity-60 line-through",
      )}
    >
      <span className={cn("size-2 rounded-full", dot)} />
      {children}
    </button>
  );
}

function GlassTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const r = payload[0]!.payload as ForecastRow;
  const hasActual = r.actualMcp !== null && r.actualMcp !== undefined && !isNaN(r.actualMcp);
  const delta = hasActual ? r.forecastedMcp - (r.actualMcp as number) : null;
  return (
    <div className="glass shadow-float min-w-[200px] rounded-xl border p-3 text-xs bg-card/90 backdrop-blur-md">
      <div className="num mb-2 font-semibold text-foreground">{r.timeBlock}</div>
      <Row dot="bg-forecast" k="Forecast" v={`₹${r.forecastedMcp.toFixed(2)}`} />
      <Row dot="bg-actual" k="Actual" v={hasActual ? `₹${(r.actualMcp as number).toFixed(2)}` : "Pending"} />
      <div className="my-2 h-px bg-border" />
      <div className="flex items-center justify-between py-0.5">
        <span className="text-muted-foreground">Delta</span>
        {delta !== null ? (
          <span className={cn("num rounded px-1.5 py-0.5 font-semibold", delta >= 0 ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
            {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
          </span>
        ) : (
          <span className="num text-muted-foreground">—</span>
        )}
      </div>
      <Row k="Confidence" v={`${r.confidence.toFixed(2)}%`} />
    </div>
  );
}

function Row({ dot, k, v }: { dot?: string; k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-0.5">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {dot && <span className={cn("size-1.5 rounded-full", dot)} />}
        {k}
      </span>
      <span className="num font-medium text-foreground">{v}</span>
    </div>
  );
}
