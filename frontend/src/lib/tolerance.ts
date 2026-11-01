/**
 * Pure helpers for the Block Error Tolerance & Bidding Window component.
 * All derived data comes from computeTolerance(blocks, tolerance).
 */

export interface PriceBlock {
  /** "HH:MM" start of the 15-minute block */
  start: string;
  /** Forecast price, ₹/kWh */
  forecast: number;
  /** Actual cleared price, ₹/kWh (null if day-ahead not settled yet) */
  actual: number | null;
}

export interface EnrichedBlock extends PriceBlock {
  index: number;
  end: string;
  deviation: number; // |forecast - actual| in ₹/kWh
  errorPct: number; // absolute % error
  cleared: boolean;
}

export interface BiddingWindow {
  startIndex: number;
  endIndex: number; // inclusive
  blocks: number;
  label: string; // "06:00 – 14:15"
  duration: string; // "8h 15m"
}

export interface ToleranceResult {
  blocks: EnrichedBlock[];
  clearedCount: number;
  total: number;
  clearedPct: number;
  windows: BiddingWindow[];
  clearedMinutes: number;
  rmse: number;
  peak: EnrichedBlock;
  /** coverage % for each integer tolerance 1..25 */
  curve: { t: number; pct: number }[];
  /** tolerance where coverage grows fastest */
  sweetSpot: number;
  insight: string;
  hasActuals: boolean;
}

export const MIN_TOL = 1;
export const MAX_TOL = 25;

const pad = (n: number) => String(n).padStart(2, "0");
export const blockTime = (i: number) => `${pad(Math.floor((i * 15) / 60))}:${pad((i * 15) % 60)}`;

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const errorOf = (b: PriceBlock) => {
  if (b.actual === null || b.actual === undefined) return 0;
  const base = Math.abs(b.actual);
  if (base < 0.001) {
    return Math.abs(b.forecast - b.actual) * 10;
  }
  return (Math.abs(b.forecast - b.actual) / base) * 100;
};

export function computeTolerance(input: PriceBlock[], tolerance: number): ToleranceResult {
  const validBlocks = input.length > 0 ? input : makeMockBlocks();
  const hasActuals = validBlocks.some((b) => b.actual !== null && b.actual !== undefined && b.actual > 0);

  if (!hasActuals) {
    const blocks: EnrichedBlock[] = validBlocks.map((b, index) => ({
      ...b,
      index,
      end: blockTime(index + 1),
      deviation: 0,
      errorPct: 0,
      cleared: false,
    }));
    return {
      blocks,
      clearedCount: 0,
      total: blocks.length,
      clearedPct: 0,
      windows: [],
      clearedMinutes: 0,
      rmse: 0,
      peak: blocks[0] || {
        start: "00:00",
        end: "00:15",
        forecast: 0,
        actual: null,
        deviation: 0,
        errorPct: 0,
        index: 0,
        cleared: false,
      },
      curve: Array.from({ length: MAX_TOL }, (_, k) => ({ t: k + 1, pct: 0 })),
      sweetSpot: 1,
      insight: "Awaiting market settlement. Actual cleared prices for this delivery day will be available once settlements publish.",
      hasActuals: false,
    };
  }

  const blocks: EnrichedBlock[] = validBlocks.map((b, index) => {
    const errorPct = errorOf(b);
    const deviation = b.actual !== null ? Math.abs(b.forecast - b.actual) : 0;
    return {
      ...b,
      index,
      end: blockTime(index + 1),
      deviation,
      errorPct,
      cleared: errorPct <= tolerance + 1e-9,
    };
  });
  const total = blocks.length;
  const clearedCount = blocks.filter((b) => b.cleared).length;

  // Contiguous runs of cleared blocks -> bidding windows
  const windows: BiddingWindow[] = [];
  let runStart = -1;
  blocks.forEach((b, i) => {
    if (b.cleared && runStart < 0) runStart = i;
    const last = i === total - 1;
    if (runStart >= 0 && (!b.cleared || last)) {
      const endIndex = b.cleared && last ? i : i - 1;
      const n = endIndex - runStart + 1;
      windows.push({
        startIndex: runStart,
        endIndex,
        blocks: n,
        label: `${blockTime(runStart)} – ${blockTime(endIndex + 1)}`,
        duration: formatDuration(n * 15),
      });
      runStart = -1;
    }
  });

  const rmse = Math.sqrt(blocks.reduce((s, b) => s + b.deviation ** 2, 0) / Math.max(total, 1));
  const peak = blocks.reduce((p, b) => (b.deviation > p.deviation ? b : p), blocks[0] || {
    start: "00:00",
    end: "00:15",
    forecast: 0,
    actual: 0,
    deviation: 0,
    errorPct: 0,
    index: 0,
    cleared: false,
  });

  const curve = Array.from({ length: MAX_TOL }, (_, k) => {
    const t = k + 1;
    return { t, pct: (blocks.filter((b) => b.errorPct <= t + 1e-9).length / total) * 100 };
  });
  let sweetSpot = 1;
  let best = -1;
  for (let k = 1; k < curve.length; k++) {
    const gain = curve[k]!.pct - curve[k - 1]!.pct;
    if (gain > best) {
      best = gain;
      sweetSpot = curve[k]!.t;
    }
  }

  const clearedMinutes = clearedCount * 15;
  const insight =
    clearedCount === 0
      ? `No block is within ${tolerance}% yet — widen the tolerance to open a bidding window.`
      : `Safe to bid ${formatDuration(clearedMinutes)} of the day. The weakest block is ${peak.start}–${peak.end} (₹${peak.deviation.toFixed(2)} off).`;

  return {
    blocks,
    clearedCount,
    total,
    clearedPct: (clearedCount / total) * 100,
    windows,
    clearedMinutes,
    rmse,
    peak,
    curve,
    sweetSpot,
    insight,
    hasActuals: true,
  };
}

/**
 * Deterministic mock day: 65 blocks <= 1% error (3 windows),
 * RMSE ₹0.92/kWh, peak deviation ₹6.03 at 15:30–15:45.
 */
export function makeMockBlocks(): PriceBlock[] {
  const cleared = (i: number) => (i <= 19) || (i >= 24 && i <= 55) || (i >= 70 && i <= 82);
  const PEAK = 62;
  const actual = Array.from({ length: 96 }, (_, i) => {
    const h = i / 4;
    const base = 4.2 + 1.6 * Math.sin(((h - 6) / 24) * Math.PI * 2) + 2.4 * Math.exp(-((h - 19.5) ** 2) / 6);
    return +(base + 0.25 * Math.sin(i * 1.7)).toFixed(2);
  });
  actual[PEAK] = 10;
  const pseudo = (i: number) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;

  // Error % for each non-cleared, non-peak block — spread so the coverage curve has shape
  const raw: Record<number, number> = {};
  for (let i = 0; i < 96; i++) if (!cleared(i) && i !== PEAK) raw[i] = 2 + pseudo(i) * 30;

  // Scale outside-tolerance deviations so overall RMSE lands on 0.92
  const clearedDev = (i: number) => actual[i]! * (0.002 + pseudo(i) * 0.007);
  const targetSq = 96 * 0.92 ** 2 - 6.03 ** 2 - Array.from({ length: 96 }, (_, i) => i).filter(cleared).reduce((s, i) => s + clearedDev(i) ** 2, 0);
  const rawSq = Object.entries(raw).reduce((s, [i, p]) => s + (actual[+i]! * p / 100) ** 2, 0);
  const k = Math.sqrt(Math.max(targetSq, 1) / Math.max(rawSq, 1));

  return actual.map((a, i) => {
    let dev: number;
    if (i === PEAK) dev = -6.03;
    else if (cleared(i)) dev = clearedDev(i) * (i % 2 ? 1 : -1);
    else dev = Math.max(actual[i]! * 0.012, (actual[i]! * raw[i]! * k) / 100) * (i % 3 ? 1 : -1);
    return { start: blockTime(i), actual: a, forecast: +(a + dev).toFixed(4) };
  });
}
