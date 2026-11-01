import React from "react";
import type { LucideIcon } from "lucide-react";
import { Activity } from "lucide-react";
import { Area, AreaChart, Customized, ResponsiveContainer } from "recharts";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

export type Tint = "violet" | "teal" | "rose" | "blue" | "amber" | "emerald";

const TINT: Record<Tint, { chip: string; stroke: string; hex: string }> = {
  emerald: { chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", stroke: "#10B981", hex: "#10B981" },
  violet: { chip: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", stroke: "var(--forecast, #7C3AED)", hex: "#7C3AED" },
  teal: { chip: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20", stroke: "var(--gdam, #14B8A6)", hex: "#14B8A6" },
  rose: { chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", stroke: "var(--negative, #F43F5E)", hex: "#F43F5E" },
  blue: { chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", stroke: "var(--dam, #2563EB)", hex: "#2563EB" },
  amber: { chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", stroke: "var(--rtm, #F59E0B)", hex: "#F59E0B" },
};

/** Deviation (in %) above which the forecast is considered worse than acceptable. */
export const DELTA_TOLERANCE = 5;

interface BaseProps {
  label: string;
  icon: LucideIcon;
  tint: Tint;
  spark?: number[] | undefined;
  className?: string;
  delay?: number;
}

function Shell({ label, icon: Icon, tint, children, className, delay = 0, spark }: BaseProps & { children: React.ReactNode }) {
  const id = `spark-${label.replace(/\W/g, "")}`;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [linePath, setLinePath] = React.useState<string>("");

  React.useEffect(() => {
    if (!spark || spark.length === 0) return;
    const updatePath = () => {
      const el = containerRef.current?.querySelector("path.recharts-area-curve");
      if (el) {
        const d = el.getAttribute("d");
        if (d && d !== linePath) {
          setLinePath(d);
        }
      }
    };
    updatePath();

    let observer: MutationObserver | null = null;
    if (containerRef.current && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(updatePath);
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["d"],
      });
    }

    const t1 = setTimeout(updatePath, 60);
    const t2 = setTimeout(updatePath, 250);
    window.addEventListener("resize", updatePath);
    return () => {
      observer?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", updatePath);
    };
  }, [spark, linePath]);

  const GlowingSparklineDot = React.useCallback(() => {
    if (!linePath) return null;
    const duration = 7 + ((delay || 0) % 4) * 0.4;
    return (
      <g className="sparkline-glowing-dot">
        <animateMotion
          dur={`${duration}s`}
          repeatCount="indefinite"
          path={linePath}
        />
        {/* Outer ambient glow halo */}
        <circle cx={0} cy={0} r={7.5} fill={TINT[tint].hex} opacity={0.32} />
        {/* Primary colored glowing sphere */}
        <circle cx={0} cy={0} r={4.2} fill={TINT[tint].hex} opacity={0.95} />
        {/* Intense white center point */}
        <circle cx={0} cy={0} r={1.9} fill="#FFFFFF" />
      </g>
    );
  }, [linePath, delay, tint]);

  return (
    <div className={cn("surface lift fade-up relative flex h-[176px] flex-col overflow-hidden p-5 bg-card border rounded-2xl shadow-sm", className)} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-3">
        <div className={cn("grid size-9 place-items-center rounded-xl", TINT[tint].chip)}>
          <Icon className="size-4" />
        </div>
        <span className="label-caps">{label}</span>
      </div>
      <div className="relative z-10 mt-4 flex-1">{children}</div>
      {spark && (
        <div
          ref={containerRef}
          className="sparkline-wrapper pointer-events-none absolute inset-x-0 bottom-0 h-12 overflow-hidden"
          style={{
            color: TINT[tint].hex,
            animationDelay: `${(delay || 0) * 10}ms`,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TINT[tint].stroke} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={TINT[tint].stroke} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={TINT[tint].stroke}
                strokeWidth={1.5}
                strokeOpacity={0.4}
                fill={`url(#${id})`}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={TINT[tint].hex}
                strokeWidth={2.4}
                fill="none"
                isAnimationActive={false}
                className="sparkline-stream"
                strokeLinecap="round"
              />
              {linePath && <Customized key={linePath} component={GlowingSparklineDot} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Num({ value, prefix = "", suffix = "", digits = 2, className }: { value: number; prefix?: string | undefined; suffix?: string | undefined; digits?: number; className?: string }) {
  const v = useCountUp(value);
  return (
    <span className={cn("num font-semibold tracking-tight", className)}>
      {prefix}
      {v.toFixed(digits)}
      {suffix}
    </span>
  );
}

/** Wide KPI: Forecast vs Actual side by side with delta chip. */
export function DualKpiCard(props: BaseProps & { forecast: number; actual: number | null }) {
  const hasActual = props.actual !== null && props.actual !== undefined && !isNaN(props.actual);
  const delta = hasActual && props.actual! > 0 ? ((props.forecast - props.actual!) / props.actual!) * 100 : 0;
  const worse = Math.abs(delta) > DELTA_TOLERANCE;
  return (
    <Shell {...props}>
      <div className="flex items-end gap-5">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-forecast" /> Forecasted
          </div>
          <Num value={props.forecast} prefix="₹" className="text-[30px] leading-none text-foreground" />
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-actual" /> Actual
          </div>
          {hasActual ? (
            <Num value={props.actual!} prefix="₹" className="text-[30px] leading-none text-muted-foreground" />
          ) : (
            <span className="text-[20px] font-medium text-muted-foreground">Pending</span>
          )}
        </div>
        {hasActual && (
          <span
            title="Forecast vs Actual"
            className={cn(
              "num ml-auto cursor-help rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              worse ? "bg-negative/10 text-negative" : "bg-positive/10 text-positive",
            )}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </Shell>
  );
}

/** Compact KPI. With `ring`, the value is shown inside a progress ring and no sparkline. */
export function KpiCard(props: BaseProps & { value: number | null; prefix?: string; suffix?: string; ring?: boolean; hint?: string }) {
  const isNumeric = props.value !== null && props.value !== undefined && !isNaN(props.value);
  if (props.ring) {
    return (
      <Shell {...props} spark={undefined}>
        <div className="flex h-full items-center justify-between gap-3">
          {props.hint && <div className="text-[11px] text-muted-foreground">{props.hint}</div>}
          {isNumeric ? <Ring value={props.value!} /> : <span className="text-xl font-semibold text-muted-foreground">N/A</span>}
        </div>
      </Shell>
    );
  }
  return (
    <Shell {...props}>
      {isNumeric ? (
        <Num value={props.value!} prefix={props.prefix} suffix={props.suffix} className="text-[30px] leading-none text-foreground" />
      ) : (
        <span className="text-[30px] font-semibold leading-none text-muted-foreground">--</span>
      )}
      {props.hint && <div className="mt-1.5 text-[11px] text-muted-foreground">{props.hint}</div>}
    </Shell>
  );
}

function Ring({ value }: { value: number }) {
  const v = useCountUp(value);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative -mt-8 size-[84px] shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border, #E2E8F0)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--rtm, #F59E0B)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, v)) / 100)} />
      </svg>
      <span className="num absolute inset-0 grid place-items-center text-[17px] font-semibold text-foreground">{v.toFixed(2)}</span>
    </div>
  );
}

/** Specialized KPI card for accuracy benchmarks with progress fill and block counts. */
export function AccuracyKpiCard({
  label,
  icon: Icon,
  tint,
  value,
  prefix = "",
  suffix = "%",
  blocksText,
  badgeText,
  hint,
  delay = 0,
  className,
  progress,
  digits = 1,
}: {
  label: string;
  icon: LucideIcon;
  tint: Tint;
  value: number;
  prefix?: string;
  suffix?: string;
  blocksText?: string;
  badgeText?: string;
  hint?: string;
  delay?: number;
  className?: string;
  progress?: number;
  digits?: number;
}) {
  const v = useCountUp(value);
  const color = TINT[tint].hex;
  const barWidth = progress !== undefined ? Math.min(100, Math.max(0, progress)) : Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "surface lift fade-up relative flex h-[176px] flex-col justify-between overflow-hidden p-5 bg-card border rounded-2xl shadow-sm",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("grid size-9 place-items-center rounded-xl", TINT[tint].chip)}>
            <Icon className="size-4" />
          </div>
          <span className="label-caps font-semibold">{label}</span>
        </div>
        {badgeText && (
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", TINT[tint].chip)}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="my-auto">
        <div className="flex items-baseline gap-2">
          <span className="num text-[30px] font-semibold leading-none text-foreground tracking-tight">
            {prefix}{v.toFixed(digits)}{suffix}
          </span>
          {blocksText && (
            <span className="text-xs font-medium text-muted-foreground">
              {blocksText}
            </span>
          )}
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${barWidth}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      {hint && (
        <div className="text-[11px] text-muted-foreground truncate">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Full-width Block-wise Accuracy Breakdown bar across all daily intervals. */
export function AccuracyDistributionBar({
  count5,
  count10,
  count15,
  countOver15,
  total,
  rmse,
  maxError,
  worstBlock,
  delay = 300,
}: {
  count5: number;
  count10: number;
  count15: number;
  countOver15: number;
  total: number;
  rmse: number;
  maxError: number;
  worstBlock?: string;
  delay?: number;
}) {
  const p5 = total > 0 ? (count5 / total) * 100 : 0;
  const p5to10 = total > 0 ? (Math.max(0, count10 - count5) / total) * 100 : 0;
  const p10to15 = total > 0 ? (Math.max(0, count15 - count10) / total) * 100 : 0;
  const pOver15 = total > 0 ? (Math.max(0, countOver15) / total) * 100 : 0;

  const count5to10 = Math.max(0, count10 - count5);
  const count10to15 = Math.max(0, count15 - count10);

  return (
    <div
      className="surface lift fade-up col-span-1 sm:col-span-2 xl:col-span-12 p-5 bg-card border rounded-2xl shadow-sm space-y-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Activity className="size-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Block-wise Error Distribution & Accuracy Spectrum
            </h4>
            <p className="text-xs text-muted-foreground">
              Precision performance breakdown evaluated across all {total} timeblocks of the delivery day
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-lg border bg-surface-2 px-3 py-1 font-mono font-medium text-foreground">
            <span className="text-muted-foreground mr-1.5 font-sans">RMSE:</span>
            ₹{rmse.toFixed(2)}/kWh
          </div>
          <div className="rounded-lg border bg-surface-2 px-3 py-1 font-mono font-medium text-foreground">
            <span className="text-muted-foreground mr-1.5 font-sans">Peak Dev:</span>
            ₹{maxError.toFixed(2)} {worstBlock ? `(${worstBlock})` : ""}
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 font-medium text-primary">
            {total} Blocks Evaluated
          </div>
        </div>
      </div>

      {/* Multi-segment Stacked Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-border/50 p-0.5 gap-0.5">
          {p5 > 0 && (
            <div
              className="h-full rounded-l-full bg-emerald-500 transition-all duration-700 hover:opacity-90"
              style={{ width: `${p5}%` }}
              title={`Error < 5%: ${count5} blocks (${p5.toFixed(1)}%)`}
            />
          )}
          {p5to10 > 0 && (
            <div
              className="h-full bg-blue-500 transition-all duration-700 hover:opacity-90"
              style={{ width: `${p5to10}%` }}
              title={`5% - 10% Error: ${count5to10} blocks (${p5to10.toFixed(1)}%)`}
            />
          )}
          {p10to15 > 0 && (
            <div
              className="h-full bg-purple-500 transition-all duration-700 hover:opacity-90"
              style={{ width: `${p10to15}%` }}
              title={`10% - 15% Error: ${count10to15} blocks (${p10to15.toFixed(1)}%)`}
            />
          )}
          {pOver15 > 0 && (
            <div
              className="h-full rounded-r-full bg-rose-500 transition-all duration-700 hover:opacity-90"
              style={{ width: `${pOver15}%` }}
              title={`Error > 15%: ${countOver15} blocks (${pOver15.toFixed(1)}%)`}
            />
          )}
        </div>

        {/* Legend / Pill Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs">
            <span className="size-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">Error &lt; 5%</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {count5} blocks ({p5.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs">
            <span className="size-2.5 rounded-full bg-blue-500 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-blue-700 dark:text-blue-400 truncate">5% – 10% Band</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {count5to10} blocks ({p5to10.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs">
            <span className="size-2.5 rounded-full bg-purple-500 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-purple-700 dark:text-purple-400 truncate">10% – 15% Band</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {count10to15} blocks ({p10to15.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs">
            <span className="size-2.5 rounded-full bg-rose-500 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-rose-700 dark:text-rose-400 truncate">Error &gt; 15%</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {countOver15} blocks ({pOver15.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
