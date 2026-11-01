import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Building2, TrendingDown } from "lucide-react";
import type { RecommendationResult } from "./recommendationMock";

const PIE_COLORS = ["#7C3AED", "#14B8A6", "#F59E0B", "#F43F5E", "#10B981", "#64748B"];

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between py-2 text-sm ${
        strong ? "border-t border-border font-semibold text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className={strong ? "text-foreground" : ""}>{label}</span>
      <span className="font-mono tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/** Open Access charges (list + donut), losses, and Discom tariff parts. */
export function CostBreakdown({ result: raw }: { result: RecommendationResult }) {
  const result = {
    ...raw,
    charges: raw.charges ?? [],
    losses: raw.losses ?? [],
    discomParts: raw.discomParts ?? [],
    energyAtDrawal: raw.energyAtDrawal ?? 0,
  };

  const chargesTotal = result.charges.reduce((s, c) => s + c.value, 0);
  const pieData = result.charges.filter((c) => c.value > 0);
  const discomTotal = result.discomParts.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-4">
      {/* 1. Open Access Charges Card */}
      <div className="card-surface fade-up p-6 bg-card" style={{ animationDelay: "400ms" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Open Access charges</h3>
            <p className="text-xs text-muted-foreground">₹ per kWh, applied on top of energy</p>
          </div>
          <span className="rounded-full border border-primary-line bg-primary-soft px-2.5 py-1 font-mono text-xs tabular-nums text-primary font-medium">
            Σ ₹{chargesTotal.toFixed(2)}
          </span>
        </div>

        <div className="grid items-center gap-6 sm:grid-cols-[1fr_200px]">
          <div className="divide-y divide-border">
            {result.charges.map((c, i) => (
              <div key={c.label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2.5">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{
                      background: c.value > 0 ? PIE_COLORS[i % PIE_COLORS.length] : "var(--border, #E2E8F0)",
                    }}
                  />
                  <span>
                    <span className="font-medium text-foreground">{c.label}</span>
                    {c.note && <span className="block text-xs text-muted-foreground">{c.note}</span>}
                  </span>
                </span>
                <span className="font-mono tabular-nums text-foreground">{c.value.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={54}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                  animationDuration={700}
                >
                  {pieData.map((c, i) => (
                    <Cell key={c.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover, #FFFFFF)",
                    border: "1px solid var(--border, #E2E8F0)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground, #0F172A)",
                  }}
                  formatter={(v: any) => [`₹${Number(v).toFixed(2)}/kWh`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  ₹{chargesTotal.toFixed(2)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">charges</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Side-by-side: Losses (%) and Discom Tariff (₹/kWh) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-surface card-lift fade-up p-6 bg-card" style={{ animationDelay: "480ms" }}>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-warning/10 text-warning">
              <TrendingDown className="size-4" />
            </span>
            <h3 className="label-caps">Open Access losses (%)</h3>
          </div>
          {result.losses.map((l) => (
            <Row key={l.label} label={l.label} value={`${l.pct}%`} />
          ))}
          <Row label="Energy at drawal" value={`₹${result.energyAtDrawal.toFixed(2)}`} strong />
        </div>

        <div className="card-surface card-lift fade-up p-6 bg-card" style={{ animationDelay: "560ms" }}>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Building2 className="size-4" />
            </span>
            <h3 className="label-caps">Discom tariff** (₹/kWh)</h3>
          </div>
          {result.discomParts.map((p) => (
            <Row key={p.label} label={p.label} value={p.value.toFixed(2)} />
          ))}
          <Row label="Total charges" value={discomTotal.toFixed(2)} strong />
        </div>
      </div>
    </div>
  );
}
