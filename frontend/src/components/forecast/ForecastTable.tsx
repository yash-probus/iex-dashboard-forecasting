import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Rows3, Rows4, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { PRICE_CAP, type ForecastRow } from "./mockData";

type SortKey = keyof ForecastRow | "delta";

interface ForecastTableProps {
  rows: ForecastRow[];
  market: string;
  highlight: string | null;
  onHighlight: (tb: string | null) => void;
  onExport: () => void;
}

const COLS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "timeBlock", label: "Time block" },
  { key: "date", label: "Date" },
  { key: "hour", label: "Hour" },
  { key: "forecastedMcp", label: "Forecast ₹/kWh", num: true },
  { key: "actualMcp", label: "Actual ₹/kWh", num: true },
  { key: "delta", label: "Delta", num: true },
  { key: "priceMin", label: "Price range" },
  { key: "confidence", label: "Confidence" },
];

export function ForecastTable({ rows, market, highlight, onHighlight, onExport }: ForecastTableProps) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [size, setSize] = useState(24);
  const [page, setPage] = useState(0);
  const [dense, setDense] = useState(false);

  const filtered = useMemo(() => {
    let r = rows.filter((x) => !q || x.timeBlock.includes(q) || x.hour.includes(q));
    if (sort) {
      const val = (x: ForecastRow) => {
        if (sort.key === "delta") {
          return x.actualMcp !== null && x.actualMcp !== undefined && !isNaN(x.actualMcp)
            ? x.forecastedMcp - x.actualMcp
            : -Infinity;
        }
        const v = x[sort.key];
        return typeof v === "number" ? v : (v ?? "");
      };
      r = [...r].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
    }
    return r;
  }, [rows, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * size, cur * size + size);
  const cell = dense ? "py-1.5" : "py-3";

  return (
    <section className="surface fade-up overflow-hidden bg-card border rounded-2xl shadow-sm" style={{ animationDelay: "350ms" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{market} Forecast — Tabular view</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-8 items-center gap-2 rounded-lg border bg-card px-2.5 text-xs focus-within:border-brand">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search time block…"
              className="w-36 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-xs"
              aria-label="Search time block"
            />
          </label>
          <button
            onClick={() => setDense((d) => !d)}
            className="grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            aria-label="Toggle density"
          >
            {dense ? <Rows4 className="size-3.5" /> : <Rows3 className="size-3.5" />}
          </button>
          <button
            onClick={onExport}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs font-medium hover:bg-muted text-foreground cursor-pointer transition-colors"
          >
            <Download className="size-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[880px] text-[13px]">
          <thead className="glass sticky top-0 z-10 bg-card/90 backdrop-blur-md">
            <tr className="border-b">
              {COLS.map((c, i) => (
                <th
                  key={c.key}
                  className={cn("label-caps px-4 py-3 text-[10px]", c.num ? "text-right" : "text-left", i === 0 && "sticky left-0 z-10 bg-card")}
                >
                  <button
                    className={cn("inline-flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors", c.num && "flex-row-reverse")}
                    onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}
                  >
                    {c.label}
                    {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              const hasActual = r.actualMcp !== null && r.actualMcp !== undefined && !isNaN(r.actualMcp);
              const delta = hasActual ? r.forecastedMcp - (r.actualMcp as number) : null;
              const active = highlight === r.timeBlock;
              return (
                <tr
                  key={r.timeBlock}
                  onClick={() => onHighlight(active ? null : r.timeBlock)}
                  className={cn("group cursor-pointer border-b transition-colors last:border-0", active ? "bg-accent" : "hover:bg-muted/60")}
                >
                  <td className={cn("num sticky left-0 bg-card px-4 font-medium group-hover:bg-muted text-foreground", cell, active && "bg-accent")}>{r.timeBlock}</td>
                  <td className={cn("num px-4 text-muted-foreground", cell)}>
                    {(() => {
                      try {
                        return format(parseISO(r.date), "dd MMM yyyy");
                      } catch {
                        return r.date;
                      }
                    })()}
                  </td>
                  <td className={cn("num px-4 text-muted-foreground", cell)}>{r.hour}</td>
                  <td className={cn("num px-4 text-right font-medium text-foreground", cell)}>₹{r.forecastedMcp.toFixed(2)}</td>
                  <td className={cn("num px-4 text-right text-muted-foreground", cell)}>
                    {hasActual ? `₹${(r.actualMcp as number).toFixed(2)}` : "—"}
                  </td>
                  <td className={cn("px-4 text-right", cell)}>
                    {delta !== null ? (
                      <span className={cn("num rounded px-1.5 py-0.5 text-[11px] font-semibold", Math.abs(delta) < 0.005 ? "bg-muted text-muted-foreground" : delta > 0 ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(2)}
                      </span>
                    ) : (
                      <span className="num text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cn("px-4", cell)}>
                    <div className="flex items-center gap-2">
                      <div className="relative h-1.5 w-20 rounded-full bg-muted">
                        <div
                          className="absolute inset-y-0 rounded-full bg-forecast/60"
                          style={{ left: `${(r.priceMin / PRICE_CAP) * 100}%`, right: `${Math.max(0, 100 - (r.priceMax / PRICE_CAP) * 100)}%` }}
                        />
                      </div>
                      <span className="num text-[11px] text-muted-foreground">{r.priceMin.toFixed(2)}–{r.priceMax.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className={cn("px-4", cell)}>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gdam" style={{ width: `${Math.min(100, Math.max(0, r.confidence))}%` }} />
                      </div>
                      <span className="num text-xs text-foreground">{r.confidence.toFixed(2)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-surface-2 px-5 py-3 text-xs text-muted-foreground">
        <span className="num">Showing {slice.length} of {filtered.length} intervals</span>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-card p-0.5">
            {[24, 48, 96].map((n) => (
              <button
                key={n}
                onClick={() => { setSize(n); setPage(0); }}
                className={cn("num rounded-md px-2 py-0.5 cursor-pointer transition-colors", size === n ? "bg-accent font-semibold text-accent-foreground" : "hover:text-foreground")}
              >
                {n}
              </button>
            ))}
          </div>
          <button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded-md p-1 hover:bg-muted disabled:opacity-40 cursor-pointer" aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </button>
          <span className="num font-medium text-foreground">{cur + 1} / {pages}</span>
          <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded-md p-1 hover:bg-muted disabled:opacity-40 cursor-pointer" aria-label="Next page">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
