/** All forecast mock calculations, deterministic generator, intervals & models. */

export interface ForecastRow {
  date: string;
  hour: string;
  timeBlock: string;
  forecastedMcp: number;
  actualMcp: number | null;
  priceMin: number;
  priceMax: number;
  confidence: number;
}

export type Interval = "15m" | "30m" | "1h";
export type Market = "DAM" | "GDAM" | "RTM";

export const MODELS = [
  { id: "1", name: "Model 1", mape: 6.12, color: "var(--dam)" },
  { id: "2", name: "Model 2", mape: 5.48, color: "var(--rtm)" },
  { id: "3", name: "Model 3", mape: 4.31, color: "var(--forecast)" },
  { id: "4", name: "Model 4", mape: 4.87, color: "var(--gdam)" },
  { id: "5", name: "Model 5", mape: 5.02, color: "var(--negative)" },
];

export const PRICE_CAP = 10;

/** Deterministic PRNG so date/model always yield the exact same realistic series. */
function rng(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Day-shape: capped overnight/evening, solar trough midday. */
function shape(block: number) {
  const h = block / 4;
  if (h < 7.5 || h >= 17) return 10;
  if (h < 9) return 10 - (h - 7.5) * 5.3;
  if (h < 15) return 2.1 + Math.sin(((h - 9) / 6) * Math.PI) * -0.3;
  return 2.2 + ((h - 15) / 2) ** 2 * 7.8;
}

export function generateForecast(date: string, model: string): ForecastRow[] {
  const seed = [...(date + model)].reduce((a, c) => a + c.charCodeAt(0) * 31, 7);
  const r = rng(seed);
  return Array.from({ length: 96 }, (_, b) => {
    const base = shape(b);
    const actual = Math.min(PRICE_CAP, Math.max(1.5, base + (base < 9.9 ? (r() - 0.35) * 0.6 : 0)));
    const lag = shape(Math.max(0, b - 2));
    const forecast = Math.min(PRICE_CAP, Math.max(1.5, (b > 60 ? lag : base) - (base < 9.9 ? r() * 0.4 : 0)));
    const spread = 0.25 + r() * 0.5;
    return {
      date,
      hour: pad(Math.floor(b / 4) + 1),
      timeBlock: `${fmt(b * 15)}-${fmt(b * 15 + 15)}`,
      forecastedMcp: +forecast.toFixed(2),
      actualMcp: +actual.toFixed(2),
      priceMin: +Math.max(0, forecast - spread).toFixed(2),
      priceMax: +Math.min(PRICE_CAP, forecast + spread * 0.6).toFixed(2),
      confidence: +(76 + r() * 14).toFixed(2),
    };
  });
}

/** Aggregate 15-minute rows into 30m/1h buckets (averaged). */
export function aggregate(rows: ForecastRow[], interval: Interval): ForecastRow[] {
  const size = interval === "15m" ? 1 : interval === "30m" ? 2 : 4;
  if (size === 1) return rows;
  const out: ForecastRow[] = [];
  for (let i = 0; i < rows.length; i += size) {
    const g = rows.slice(i, i + size);
    const avg = (k: keyof ForecastRow) => {
      const valid = g.map((x) => x[k]).filter((v): v is number => typeof v === "number" && !isNaN(v));
      if (valid.length === 0) return null as any;
      return +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2);
    };
    out.push({
      date: g[0]!.date,
      hour: g[0]!.hour,
      timeBlock: `${g[0]!.timeBlock.slice(0, 5)}-${g[g.length - 1]!.timeBlock.slice(6)}`,
      forecastedMcp: avg("forecastedMcp") ?? 0,
      actualMcp: avg("actualMcp"),
      priceMin: Math.min(...g.map((x) => x.priceMin)),
      priceMax: Math.max(...g.map((x) => x.priceMax)),
      confidence: avg("confidence") ?? 0,
    });
  }
  return out;
}

export function computeKpis(rows: ForecastRow[]) {
  const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const f = rows.map((r) => r.forecastedMcp).filter((x): x is number => typeof x === "number" && !isNaN(x));
  const validActualRows = rows.filter((r) => r.actualMcp !== null && r.actualMcp !== undefined && !isNaN(r.actualMcp));
  const hasActuals = validActualRows.length > 0;
  const a = validActualRows.map((r) => r.actualMcp as number);
  const absErr = validActualRows.map((r) => Math.abs(r.forecastedMcp - (r.actualMcp as number)));
  const totalActual = a.reduce((s, x) => s + x, 0);

  // Performance measurement: block-wise error thresholds & benchmarks
  let countWithin5 = 0;
  let countWithin10 = 0;
  let countWithin15 = 0;
  let sumSquaredErr = 0;
  let maxError = 0;
  let worstBlock = "";

  const totalBlocks = rows.length;

  if (hasActuals) {
    for (const r of validActualRows) {
      const act = r.actualMcp as number;
      const err = Math.abs(r.forecastedMcp - act);
      sumSquaredErr += err * err;
      if (err > maxError) {
        maxError = err;
        worstBlock = r.timeBlock;
      }
      const denom = act > 0 ? act : (r.forecastedMcp > 0 ? r.forecastedMcp : 1);
      const pctErr = (err / denom) * 100;
      if (pctErr <= 5) countWithin5++;
      if (pctErr <= 10) countWithin10++;
      if (pctErr <= 15) countWithin15++;
    }
  }

  const evalBlocks = validActualRows.length;
  const pctBlocksWithin5 = evalBlocks > 0 ? (countWithin5 / evalBlocks) * 100 : 0;
  const pctBlocksWithin10 = evalBlocks > 0 ? (countWithin10 / evalBlocks) * 100 : 0;
  const pctBlocksWithin15 = evalBlocks > 0 ? (countWithin15 / evalBlocks) * 100 : 0;
  const countOver15 = Math.max(0, evalBlocks - countWithin15);
  const hoursPerBlock = evalBlocks > 0 ? 24 / totalBlocks : 0.25;
  const hoursWithin5 = +(countWithin5 * hoursPerBlock).toFixed(2);
  const hoursWithin10 = +(countWithin10 * hoursPerBlock).toFixed(2);
  const hoursWithin15 = +(countWithin15 * hoursPerBlock).toFixed(2);
  const rmse = evalBlocks > 0 ? Math.sqrt(sumSquaredErr / evalBlocks) : 0;

  return {
    hasActuals,
    avgF: mean(f),
    avgA: hasActuals ? mean(a) : null,
    minF: f.length ? Math.min(...f) : 0,
    minA: hasActuals && a.length ? Math.min(...a) : null,
    mae: hasActuals ? mean(absErr) : null,
    wmape: hasActuals && totalActual > 0 ? (absErr.reduce((s, x) => s + x, 0) / totalActual) * 100 : null,
    confidence: mean(rows.map((r) => r.confidence)),
    // Performance benchmarks:
    pctBlocksWithin5,
    pctBlocksWithin10,
    pctBlocksWithin15,
    countWithin5,
    countWithin10,
    countWithin15,
    hoursWithin5,
    hoursWithin10,
    hoursWithin15,
    countOver15,
    totalBlocks,
    rmse: hasActuals ? rmse : 0,
    maxError: hasActuals ? maxError : 0,
    worstBlock: hasActuals ? worstBlock : "",
  };
}
