import React, { useEffect, useState } from "react";
import { Building2, PiggyBank, Zap } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import type { RecommendationResult } from "./recommendationMock";

function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  chip,
  chipTone,
  iconTone,
  delay,
}: {
  icon: typeof Zap;
  label: string;
  value: number;
  suffix: string;
  chip: string;
  chipTone: "positive" | "negative" | "neutral";
  iconTone: string;
  delay: number;
}) {
  const v = useCountUp(value);
  return (
    <div className="card-surface card-lift fade-up p-5 bg-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className={cn("grid size-8 place-items-center rounded-lg", iconTone)}>
          <Icon className="size-4" />
        </span>
        <span
          className={cn(
            "whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[11px] tabular-nums",
            chipTone === "positive" && "border-positive/30 bg-positive/10 text-positive font-medium",
            chipTone === "negative" && "border-negative/30 bg-negative/10 text-negative font-medium",
            chipTone === "neutral" && "bg-muted text-muted-foreground border-border",
          )}
        >
          {chip}
        </span>
      </div>
      <div className="mt-4 label-caps">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          ₹{v.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

export function ComparisonCards({ result }: { result: RecommendationResult }) {
  const saving = result.savingPerUnit >= 0;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        icon={Building2}
        label="Discom TOD tariff"
        value={result.discomTariff}
        suffix="/kWh"
        chip="Baseline"
        chipTone="neutral"
        iconTone="bg-muted text-muted-foreground"
        delay={80}
      />
      <StatCard
        icon={Zap}
        label="Landed cost"
        value={result.iexLanded}
        suffix="/kWh"
        chip="All-in"
        chipTone="neutral"
        iconTone="bg-teal/10 text-teal"
        delay={160}
      />
      <StatCard
        icon={PiggyBank}
        label={saving ? "Savings" : "Extra cost"}
        value={Math.abs(result.savingPerUnit)}
        suffix="/kWh"
        chip={`${saving ? "Save" : "Costs"} ${Math.abs(result.savingPct)}%`}
        chipTone={saving ? "positive" : "negative"}
        iconTone={saving ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}
        delay={240}
      />
    </div>
  );
}

export function ComparisonChart({ result }: { result: RecommendationResult }) {
  const data = [
    { name: "Discom tariff", value: result.discomTariff, fill: "#64748B" },
    { name: "IEX landed", value: result.iexLanded, fill: "#7C3AED" },
  ];
  const saving = result.savingPerUnit >= 0;

  return (
    <div className="card-surface fade-up p-6 bg-card" style={{ animationDelay: "320ms" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Landed cost comparison</h3>
          <p className="text-xs text-muted-foreground">₹ per kWh, all-in</p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 font-mono text-xs tabular-nums font-medium",
            saving
              ? "border-positive/30 bg-positive/10 text-positive"
              : "border-negative/30 bg-negative/10 text-negative",
          )}
        >
          Δ {saving ? "−" : "+"}₹{Math.abs(result.savingPerUnit).toFixed(2)}
        </span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 10, bottom: 10 }} barCategoryGap={24}>
            <XAxis type="number" hide domain={[0, "dataMax + 1"]} />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              width={96}
              tick={{ fill: "var(--muted-foreground, #64748B)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted, #F1F5F9)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--popover, #FFFFFF)",
                border: "1px solid var(--border, #E2E8F0)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground, #0F172A)",
              }}
              formatter={(v: any) => [`₹${Number(v).toFixed(2)}/kWh`, ""]}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={700}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: any) => `₹${Number(v).toFixed(2)}`}
                style={{ fill: "var(--foreground, #0F172A)", fontFamily: "monospace", fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
