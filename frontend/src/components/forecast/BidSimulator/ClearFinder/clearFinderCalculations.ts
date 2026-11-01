/**
 * Pure calculation engine for Clear Finder.
 * Uses ONLY Forecast MCP, Price Range (low-high), and Confidence.
 * ACTUAL MCP is NOT used in any live decision, label, or calculation.
 *
 * NEW PRINCIPLE: Confidence does NOT block a bid. It only increases
 * the safety headroom (buffer) the bid needs above the forecast range.
 */

export type BidType = "buy" | "sell";
export type StrictnessLevel = "strict" | "balanced" | "relaxed";

export type ClearLikelihood =
  | "sure_clear"
  | "likely_clear"
  | "risky"
  | "will_not_clear"
  | "no_data";

export interface StrictnessThresholds {
  highMin: number;
  mediumMin: number;
}

/**
 * Confidence thresholds (easy-to-edit constants).
 */
export const STRICTNESS_CONFIG: Record<StrictnessLevel, StrictnessThresholds> = {
  strict: { highMin: 90, mediumMin: 80 },
  balanced: { highMin: 85, mediumMin: 70 },
  relaxed: { highMin: 80, mediumMin: 60 },
};

/**
 * Base Safety Buffers (₹/kWh) based on confidence level.
 */
export const BASE_SAFETY_BUFFER: Record<"high" | "medium" | "low", number> = {
  high: 0.00,
  medium: 0.25,
  low: 0.50,
};

/**
 * Strictness multipliers for safety buffer headroom.
 * Strict: x1.5, Balanced: x1.0, Relaxed: x0.5.
 */
export const STRICTNESS_MULTIPLIER: Record<StrictnessLevel, number> = {
  strict: 1.5,
  balanced: 1.0,
  relaxed: 0.5,
};

export const DEFAULT_PRICE_PRESETS = [2, 3, 4, 5, 7, 10];

export type ConfidenceLevel = "high" | "medium" | "low" | "no_data";

/**
 * Evaluates confidence level based on strictness thresholds.
 */
export function evaluateConfidence(
  confidence: number | null | undefined,
  strictness: StrictnessLevel = "balanced"
): ConfidenceLevel {
  if (confidence === null || confidence === undefined || isNaN(confidence)) {
    return "no_data";
  }

  const { highMin, mediumMin } = STRICTNESS_CONFIG[strictness];
  if (confidence >= highMin) return "high";
  if (confidence >= mediumMin) return "medium";
  return "low";
}

/**
 * Returns the effective safety buffer (₹/kWh) for a given confidence level and strictness.
 */
export function getSafetyBuffer(
  confidenceLevel: ConfidenceLevel,
  strictness: StrictnessLevel = "balanced"
): number {
  if (confidenceLevel === "no_data") return 0.50;
  const base = BASE_SAFETY_BUFFER[confidenceLevel];
  const mult = STRICTNESS_MULTIPLIER[strictness];
  return +(base * mult).toFixed(2);
}

/**
 * Checks pass/fail status for the 3 individual criteria against bid price.
 */
export interface CriterionCheck {
  name: string;
  passed: boolean;
  actualText: string;
  requirementText: string;
}

export interface WhyThisLabelExplanation {
  forecastCheck: CriterionCheck;
  rangeCheck: CriterionCheck;
  confidenceCheck: CriterionCheck;
  safetyBufferUsed: number;
  confidenceLevel: ConfidenceLevel;
  ruleExplanation: string;
}

/**
 * Core pure label evaluation function.
 * P = bid price, F = forecast MCP, L = range low, H = range high.
 * Let B = SAFETY_BUFFER[confidence level] * strictnessMultiplier.
 *
 * BUY:
 * - L > P -> "Will Not Clear"
 * - else F > P -> "Risky"
 * - else if H + B <= P -> "Sure Clear" (whole range clears with the safety headroom)
 * - else if H <= P -> "Likely Clear" (whole range clears but headroom is smaller than the buffer)
 * - else (F <= P < H, range partly crosses the price):
 *     confidence High -> "Likely Clear"; Medium or Low -> "Risky"
 *
 * SELL (mirror):
 * - H < P -> "Will Not Clear"
 * - else F < P -> "Risky"
 * - else if L - B >= P -> "Sure Clear" (whole range clears with the safety headroom)
 * - else if L >= P -> "Likely Clear" (whole range clears but headroom is smaller than the buffer)
 * - else (L < P <= F, range partly crosses the price):
 *     confidence High -> "Likely Clear"; Medium or Low -> "Risky"
 */
export function evaluateBlockLikelihood(
  bidPrice: number,
  forecastMcp: number | null | undefined,
  priceMin: number | null | undefined,
  priceMax: number | null | undefined,
  confidence: number | null | undefined,
  bidType: BidType = "buy",
  strictness: StrictnessLevel = "balanced"
): ClearLikelihood {
  if (
    forecastMcp === null ||
    forecastMcp === undefined ||
    isNaN(forecastMcp) ||
    priceMin === null ||
    priceMin === undefined ||
    isNaN(priceMin) ||
    priceMax === null ||
    priceMax === undefined ||
    isNaN(priceMax) ||
    confidence === null ||
    confidence === undefined ||
    isNaN(confidence)
  ) {
    return "no_data";
  }

  const P = bidPrice;
  const F = forecastMcp;
  const L = Math.min(priceMin, priceMax);
  const H = Math.max(priceMin, priceMax);
  const C = evaluateConfidence(confidence, strictness);

  if (C === "no_data") return "no_data";

  const B = getSafetyBuffer(C, strictness);
  const EPS = 1e-9;

  if (bidType === "buy") {
    // 1. L > P -> Will Not Clear
    if (L > P + EPS) {
      return "will_not_clear";
    }
    // 2. else F > P -> Risky
    if (F > P + EPS) {
      return "risky";
    }
    // 3. else if H + B <= P -> Sure Clear (whole range clears with safety headroom)
    if (H + B <= P + EPS) {
      return "sure_clear";
    }
    // 4. else if H <= P -> Likely Clear (whole range clears, headroom < buffer)
    if (H <= P + EPS) {
      return "likely_clear";
    }
    // 5. else (F <= P < H, range partly crosses price)
    if (C === "high") {
      return "likely_clear";
    }
    return "risky";
  } else {
    // SELL (mirror)
    // 1. H < P -> Will Not Clear
    if (H < P - EPS) {
      return "will_not_clear";
    }
    // 2. else F < P -> Risky
    if (F < P - EPS) {
      return "risky";
    }
    // 3. else if L - B >= P -> Sure Clear (whole range clears with safety headroom)
    if (L - B >= P - EPS) {
      return "sure_clear";
    }
    // 4. else if L >= P -> Likely Clear (whole range clears, headroom < buffer)
    if (L >= P - EPS) {
      return "likely_clear";
    }
    // 5. else (L < P <= F, range partly crosses price)
    if (C === "high") {
      return "likely_clear";
    }
    return "risky";
  }
}

/**
 * Explains "Why this label?" with 3 clear pass/fail checks and safety buffer used.
 */
export function explainBlockLikelihood(
  bidPrice: number,
  forecastMcp: number | null | undefined,
  priceMin: number | null | undefined,
  priceMax: number | null | undefined,
  confidence: number | null | undefined,
  bidType: BidType = "buy",
  strictness: StrictnessLevel = "balanced"
): WhyThisLabelExplanation {
  const L = priceMin !== null && priceMin !== undefined ? Math.min(priceMin, priceMax ?? priceMin) : null;
  const H = priceMax !== null && priceMax !== undefined ? Math.max(priceMin ?? priceMax, priceMax) : null;
  const F = forecastMcp ?? null;
  const C = evaluateConfidence(confidence, strictness);
  const B = getSafetyBuffer(C, strictness);
  const confVal = confidence !== null && confidence !== undefined ? +confidence.toFixed(1) : null;
  const { highMin, mediumMin } = STRICTNESS_CONFIG[strictness];

  if (F === null || L === null || H === null || confVal === null) {
    return {
      forecastCheck: { name: "Forecast MCP", passed: false, actualText: "Missing", requirementText: "Valid forecast required" },
      rangeCheck: { name: "Price Range", passed: false, actualText: "Missing", requirementText: "Valid range required" },
      confidenceCheck: { name: "Model Confidence", passed: false, actualText: "Missing", requirementText: "Valid confidence required" },
      safetyBufferUsed: B,
      confidenceLevel: C,
      ruleExplanation: "Data is incomplete for this interval.",
    };
  }

  const EPS = 1e-9;

  if (bidType === "buy") {
    const forecastPassed = F <= bidPrice + EPS;
    const wholeRangeWithBufferPassed = H + B <= bidPrice + EPS;
    const wholeRangePassed = H <= bidPrice + EPS;
    const confPassed = C === "high";

    let rule = "";
    if (L > bidPrice + EPS) {
      rule = `Range floor (₹${L.toFixed(2)}) is above your bid (₹${bidPrice.toFixed(2)}). Impossible to clear.`;
    } else if (F > bidPrice + EPS) {
      rule = `Forecast (₹${F.toFixed(2)}) exceeds bid price (₹${bidPrice.toFixed(2)}). Price risk.`;
    } else if (wholeRangeWithBufferPassed) {
      rule = `Whole range ceiling (₹${H.toFixed(2)}) + safety buffer (₹${B.toFixed(2)}) ≤ bid price (₹${bidPrice.toFixed(2)}). Guaranteed headroom.`;
    } else if (wholeRangePassed) {
      rule = `Whole range clears (₹${H.toFixed(2)} ≤ ₹${bidPrice.toFixed(2)}), but buffer headroom (₹${(H + B).toFixed(2)}) exceeds bid.`;
    } else {
      rule = `Forecast clears, but range ceiling (₹${H.toFixed(2)}) crosses above bid price.`;
    }

    return {
      forecastCheck: {
        name: "Forecast MCP",
        passed: forecastPassed,
        actualText: `₹${F.toFixed(2)}`,
        requirementText: `≤ ₹${bidPrice.toFixed(2)}`,
      },
      rangeCheck: {
        name: "Price Range + Buffer",
        passed: wholeRangeWithBufferPassed,
        actualText: `₹${L.toFixed(2)}–₹${H.toFixed(2)} (+₹${B.toFixed(2)})`,
        requirementText: `H + B = ₹${(H + B).toFixed(2)} ≤ ₹${bidPrice.toFixed(2)}`,
      },
      confidenceCheck: {
        name: "Confidence",
        passed: confPassed,
        actualText: `${confVal}% (${C.toUpperCase()})`,
        requirementText: `High (≥${highMin}%) requires ₹0.00 buffer; ${C.toUpperCase()} requires ₹${B.toFixed(2)}`,
      },
      safetyBufferUsed: B,
      confidenceLevel: C,
      ruleExplanation: rule,
    };
  } else {
    // Sell
    const forecastPassed = F >= bidPrice - EPS;
    const wholeRangeWithBufferPassed = L - B >= bidPrice - EPS;
    const wholeRangePassed = L >= bidPrice - EPS;
    const confPassed = C === "high";

    let rule = "";
    if (H < bidPrice - EPS) {
      rule = `Range ceiling (₹${H.toFixed(2)}) is below offer (₹${bidPrice.toFixed(2)}). Impossible to clear.`;
    } else if (F < bidPrice - EPS) {
      rule = `Forecast (₹${F.toFixed(2)}) is below offer price (₹${bidPrice.toFixed(2)}).`;
    } else if (wholeRangeWithBufferPassed) {
      rule = `Whole range floor (₹${L.toFixed(2)}) - safety buffer (₹${B.toFixed(2)}) ≥ offer price (₹${bidPrice.toFixed(2)}).`;
    } else if (wholeRangePassed) {
      rule = `Whole range clears (₹${L.toFixed(2)} ≥ ₹${bidPrice.toFixed(2)}), but buffer headroom (₹${(L - B).toFixed(2)}) dips below offer.`;
    } else {
      rule = `Forecast clears, but lower range (₹${L.toFixed(2)}) crosses below offer.`;
    }

    return {
      forecastCheck: {
        name: "Forecast MCP",
        passed: forecastPassed,
        actualText: `₹${F.toFixed(2)}`,
        requirementText: `≥ ₹${bidPrice.toFixed(2)}`,
      },
      rangeCheck: {
        name: "Price Range - Buffer",
        passed: wholeRangeWithBufferPassed,
        actualText: `₹${L.toFixed(2)}–₹${H.toFixed(2)} (-₹${B.toFixed(2)})`,
        requirementText: `L - B = ₹${(L - B).toFixed(2)} ≥ ₹${bidPrice.toFixed(2)}`,
      },
      confidenceCheck: {
        name: "Confidence",
        passed: confPassed,
        actualText: `${confVal}% (${C.toUpperCase()})`,
        requirementText: `High (≥${highMin}%) requires ₹0.00 buffer; ${C.toUpperCase()} requires ₹${B.toFixed(2)}`,
      },
      safetyBufferUsed: B,
      confidenceLevel: C,
      ruleExplanation: rule,
    };
  }
}

/**
 * Calculates the exact "Bid Price Needed" for a block to achieve a target label.
 * Every block with valid data receives a price (never "not bid-able").
 *
 * Buy:
 * - Sure Clear needs bid >= H + B
 * - Likely Clear needs bid >= H (or bid >= F when confidence is High)
 *
 * Sell:
 * - Sure Clear needs offer <= L - B
 * - Likely Clear needs offer <= L (or offer <= F when confidence is High)
 */
export interface BidPriceNeeded {
  sureClearPrice: number | null;
  likelyClearPrice: number | null;
  displayStatus: string;
  safetyBufferUsed: number;
  confidenceLevel: ConfidenceLevel;
  isBidable: boolean;
}

export function calculateBidPriceNeeded(
  forecastMcp: number | null | undefined,
  priceMin: number | null | undefined,
  priceMax: number | null | undefined,
  confidence: number | null | undefined,
  bidType: BidType = "buy",
  strictness: StrictnessLevel = "balanced"
): BidPriceNeeded {
  if (
    forecastMcp === null ||
    forecastMcp === undefined ||
    priceMin === null ||
    priceMin === undefined ||
    priceMax === null ||
    priceMax === undefined ||
    confidence === null ||
    confidence === undefined
  ) {
    return {
      sureClearPrice: null,
      likelyClearPrice: null,
      displayStatus: "No data",
      safetyBufferUsed: 0,
      confidenceLevel: "no_data",
      isBidable: false,
    };
  }

  const F = forecastMcp;
  const L = Math.min(priceMin, priceMax);
  const H = Math.max(priceMin, priceMax);
  const C = evaluateConfidence(confidence, strictness);
  const B = getSafetyBuffer(C, strictness);

  if (bidType === "buy") {
    const sureP = +(H + B).toFixed(2);
    const likelyP = +(C === "high" ? Math.min(H, F) : H).toFixed(2);
    const bufferNote = B > 0 ? ` (+₹${B.toFixed(2)} buf, ${C})` : ` (${C})`;

    return {
      sureClearPrice: sureP,
      likelyClearPrice: likelyP,
      displayStatus: `Sure: ≥ ₹${sureP.toFixed(2)}${bufferNote} · Likely: ≥ ₹${likelyP.toFixed(2)}`,
      safetyBufferUsed: B,
      confidenceLevel: C,
      isBidable: true,
    };
  } else {
    // Sell
    const sureP = +Math.max(0, L - B).toFixed(2);
    const likelyP = +(C === "high" ? Math.max(L, F) : L).toFixed(2);
    const bufferNote = B > 0 ? ` (-₹${B.toFixed(2)} buf, ${C})` : ` (${C})`;

    return {
      sureClearPrice: sureP,
      likelyClearPrice: likelyP,
      displayStatus: `Sure: ≤ ₹${sureP.toFixed(2)}${bufferNote} · Likely: ≤ ₹${likelyP.toFixed(2)}`,
      safetyBufferUsed: B,
      confidenceLevel: C,
      isBidable: true,
    };
  }
}

export interface ClearFinderBlock {
  date: string;
  hour: string;
  timeBlock: string;
  forecastedMcp: number;
  actualMcp: number | null;
  actualCleared: boolean | null;
  priceMin: number | null;
  priceMax: number | null;
  confidence: number | null;
  confidenceLevel: ConfidenceLevel;
  likelihood: ClearLikelihood;
  whyExplanation: WhyThisLabelExplanation;
  bidPriceNeeded: BidPriceNeeded;
}

export interface ClearFinderWindow {
  startTime: string;
  endTime: string;
  likelihood: ClearLikelihood;
  blockCount: number;
  durationHours: number;
}

export interface PriceLadderRow {
  price: number;
  sureClearCount: number;
  likelyClearCount: number;
  riskyCount: number;
  willNotClearCount: number;
  noDataCount: number;
  totalBidableCount: number; // Sure + Likely
  sureClearPct: number;
  bidablePct: number;
}

export interface ClearFinderResult {
  bidPrice: number;
  bidType: BidType;
  strictness: StrictnessLevel;
  totalBlocks: number;
  sureClearCount: number;
  sureClearPct: number;
  likelyClearCount: number;
  likelyClearPct: number;
  riskyCount: number;
  riskyPct: number;
  willNotClearCount: number;
  willNotClearPct: number;
  noDataCount: number;
  blocks: ClearFinderBlock[];
  windows: ClearFinderWindow[];
  priceLadder: PriceLadderRow[];
  defaultSelectedPrice: number;
  summaryRecommendation: string;
}

export interface RawForecastRow {
  date: string;
  hour: string;
  timeBlock: string;
  forecastedMcp: number;
  actualMcp?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  confidence?: number | null;
}

/**
 * Extracts contiguous windows of the same likelihood category.
 */
export function extractContinuousWindows(blocks: ClearFinderBlock[]): ClearFinderWindow[] {
  if (!blocks || blocks.length === 0) return [];

  const windows: ClearFinderWindow[] = [];
  let curLikelihood: ClearLikelihood | null = null;
  let curStart = "";
  let curEnd = "";
  let count = 0;

  for (const b of blocks) {
    const parts = b.timeBlock.split("-").map((s) => s.trim());
    const startT = parts[0] || `${b.hour}:00`;
    const endT = parts[1] || `${b.hour}:15`;

    if (curLikelihood === null) {
      curLikelihood = b.likelihood;
      curStart = startT;
      curEnd = endT;
      count = 1;
    } else if (curLikelihood === b.likelihood) {
      curEnd = endT;
      count++;
    } else {
      windows.push({
        startTime: curStart,
        endTime: curEnd,
        likelihood: curLikelihood,
        blockCount: count,
        durationHours: +(count * 0.25).toFixed(2),
      });
      curLikelihood = b.likelihood;
      curStart = startT;
      curEnd = endT;
      count = 1;
    }
  }

  if (curLikelihood !== null) {
    windows.push({
      startTime: curStart,
      endTime: curEnd,
      likelihood: curLikelihood,
      blockCount: count,
      durationHours: +(count * 0.25).toFixed(2),
    });
  }

  return windows;
}

/**
 * Computes price ladder presets statistics across the 96 forecast rows.
 */
export function computePriceLadder(
  rows: RawForecastRow[],
  presets: number[] = DEFAULT_PRICE_PRESETS,
  bidType: BidType = "buy",
  strictness: StrictnessLevel = "balanced"
): { priceLadder: PriceLadderRow[]; defaultPrice: number } {
  const total = rows.length || 1;

  const priceLadder: PriceLadderRow[] = presets.map((price) => {
    let sure = 0;
    let likely = 0;
    let risky = 0;
    let willNot = 0;
    let noData = 0;

    for (const r of rows) {
      const label = evaluateBlockLikelihood(
        price,
        r.forecastedMcp,
        r.priceMin,
        r.priceMax,
        r.confidence,
        bidType,
        strictness
      );
      if (label === "sure_clear") sure++;
      else if (label === "likely_clear") likely++;
      else if (label === "risky") risky++;
      else if (label === "will_not_clear") willNot++;
      else noData++;
    }

    const bidable = sure + likely;
    return {
      price,
      sureClearCount: sure,
      likelyClearCount: likely,
      riskyCount: risky,
      willNotClearCount: willNot,
      noDataCount: noData,
      totalBidableCount: bidable,
      sureClearPct: +((sure / total) * 100).toFixed(1),
      bidablePct: +((bidable / total) * 100).toFixed(1),
    };
  });

  // Default selected price: the lowest preset with at least one Sure Clear block (or the first preset if none)
  const lowestWithSure = priceLadder.find((p) => p.sureClearCount > 0);
  const defaultPrice = lowestWithSure ? lowestWithSure.price : (priceLadder[0]?.price ?? presets[0] ?? 4);

  return { priceLadder, defaultPrice };
}

/**
 * Master simulation runner for Clear Finder.
 * Zero reliance on actual MCP. Purely derived from forecast data.
 */
export function runClearFinder(
  rows: RawForecastRow[],
  bidPrice: number | null = null,
  bidType: BidType = "buy",
  strictness: StrictnessLevel = "balanced",
  presets: number[] = DEFAULT_PRICE_PRESETS
): ClearFinderResult {
  const safeRows = rows || [];
  const totalBlocks = safeRows.length;

  // Compute price ladder first
  const { priceLadder, defaultPrice } = computePriceLadder(safeRows, presets, bidType, strictness);

  // Active price: use provided bidPrice or fallback to defaultPrice
  const activePrice = bidPrice !== null && !isNaN(bidPrice) && bidPrice >= 0 ? bidPrice : defaultPrice;

  if (totalBlocks === 0) {
    return {
      bidPrice: activePrice,
      bidType,
      strictness,
      totalBlocks: 0,
      sureClearCount: 0,
      sureClearPct: 0,
      likelyClearCount: 0,
      likelyClearPct: 0,
      riskyCount: 0,
      riskyPct: 0,
      willNotClearCount: 0,
      willNotClearPct: 0,
      noDataCount: 0,
      blocks: [],
      windows: [],
      priceLadder: [],
      defaultSelectedPrice: defaultPrice,
      summaryRecommendation: "No forecast data available for this date.",
    };
  }

  let sureClearCount = 0;
  let likelyClearCount = 0;
  let riskyCount = 0;
  let willNotClearCount = 0;
  let noDataCount = 0;

  const blocks: ClearFinderBlock[] = safeRows.map((r) => {
    const likelihood = evaluateBlockLikelihood(
      activePrice,
      r.forecastedMcp,
      r.priceMin,
      r.priceMax,
      r.confidence,
      bidType,
      strictness
    );

    if (likelihood === "sure_clear") sureClearCount++;
    else if (likelihood === "likely_clear") likelyClearCount++;
    else if (likelihood === "risky") riskyCount++;
    else if (likelihood === "will_not_clear") willNotClearCount++;
    else noDataCount++;

    const confLevel = evaluateConfidence(r.confidence, strictness);
    const why = explainBlockLikelihood(
      activePrice,
      r.forecastedMcp,
      r.priceMin,
      r.priceMax,
      r.confidence,
      bidType,
      strictness
    );
    const bidPriceNeeded = calculateBidPriceNeeded(
      r.forecastedMcp,
      r.priceMin,
      r.priceMax,
      r.confidence,
      bidType,
      strictness
    );

    const hasActual = r.actualMcp !== null && r.actualMcp !== undefined && !isNaN(r.actualMcp);
    const actMcp = hasActual ? Number(r.actualMcp) : null;
    const actCleared = hasActual
      ? bidType === "buy"
        ? actMcp! <= activePrice + 1e-9
        : actMcp! >= activePrice - 1e-9
      : null;

    return {
      date: r.date,
      hour: r.hour,
      timeBlock: r.timeBlock,
      forecastedMcp: r.forecastedMcp,
      actualMcp: actMcp,
      actualCleared: actCleared,
      priceMin: r.priceMin ?? null,
      priceMax: r.priceMax ?? null,
      confidence: r.confidence ?? null,
      confidenceLevel: confLevel,
      likelihood,
      whyExplanation: why,
      bidPriceNeeded,
    };
  });

  const windows = extractContinuousWindows(blocks);

  // Generate actionable summary sentence
  const summaryRecommendation =
    bidType === "buy"
      ? `A Buy bid of ₹${activePrice.toFixed(2)} covers ${sureClearCount} block${sureClearCount === 1 ? "" : "s"} (${(
          (sureClearCount / totalBlocks) *
          100
        ).toFixed(0)}%) as Sure Clear and ${sureClearCount + likelyClearCount} blocks as bid-able.`
      : `A Sell offer of ₹${activePrice.toFixed(2)} covers ${sureClearCount} block${sureClearCount === 1 ? "" : "s"} (${(
          (sureClearCount / totalBlocks) *
          100
        ).toFixed(0)}%) as Sure Clear and ${sureClearCount + likelyClearCount} blocks as bid-able.`;

  return {
    bidPrice: activePrice,
    bidType,
    strictness,
    totalBlocks,
    sureClearCount,
    sureClearPct: +((sureClearCount / totalBlocks) * 100).toFixed(1),
    likelyClearCount,
    likelyClearPct: +((likelyClearCount / totalBlocks) * 100).toFixed(1),
    riskyCount,
    riskyPct: +((riskyCount / totalBlocks) * 100).toFixed(1),
    willNotClearCount,
    willNotClearPct: +((willNotClearCount / totalBlocks) * 100).toFixed(1),
    noDataCount,
    blocks,
    windows,
    priceLadder,
    defaultSelectedPrice: defaultPrice,
    summaryRecommendation,
  };
}

// -------------------------------------------------------------
// VERIFICATION ONLY: Historical Threshold Calibration Analysis
// (Uses past actual MCP for backtesting verification only;
// NEVER called by or passed into the live label function)
// -------------------------------------------------------------

export interface ConfidenceBucketStats {
  bucketLabel: string; // "<50", "50-60", "60-70", "70-85", "85+"
  rangeClearedTotal: number;
  reallyClearedHits: number;
  hitRatePct: number;
}

export interface LabelHitRateStats {
  sureClearTotal: number;
  sureClearHits: number;
  sureClearHitRatePct: number;
  likelyClearTotal: number;
  likelyClearHits: number;
  likelyClearHitRatePct: number;
  riskyTotal: number;
  riskyHits: number;
  riskyHitRatePct: number;
}

export interface HistoricalCalibrationResult {
  totalHistoricalIntervals: number;
  bucketStats: ConfidenceBucketStats[];
  labelStats: LabelHitRateStats;
  recommendationHint: string;
}

export interface HistoricalRowWithActual {
  forecastedMcp: number;
  actualMcp: number | null | undefined;
  priceMin?: number | null;
  priceMax?: number | null;
  confidence?: number | null;
}

export function computeHistoricalCalibration(
  historicalRows: HistoricalRowWithActual[],
  selectedPrice: number,
  bidType: BidType = "buy",
  strictness: StrictnessLevel = "balanced"
): HistoricalCalibrationResult {
  const buckets: {
    label: string;
    filter: (conf: number) => boolean;
    rangeClearedTotal: number;
    reallyClearedHits: number;
  }[] = [
    { label: "<50%", filter: (c) => c < 50, rangeClearedTotal: 0, reallyClearedHits: 0 },
    { label: "50–60%", filter: (c) => c >= 50 && c < 60, rangeClearedTotal: 0, reallyClearedHits: 0 },
    { label: "60–70%", filter: (c) => c >= 60 && c < 70, rangeClearedTotal: 0, reallyClearedHits: 0 },
    { label: "70–85%", filter: (c) => c >= 70 && c < 85, rangeClearedTotal: 0, reallyClearedHits: 0 },
    { label: "85%+", filter: (c) => c >= 85, rangeClearedTotal: 0, reallyClearedHits: 0 },
  ];

  let sureTotal = 0, sureHits = 0;
  let likelyTotal = 0, likelyHits = 0;
  let riskyTotal = 0, riskyHits = 0;
  let totalValid = 0;

  for (const r of historicalRows) {
    if (r.actualMcp === null || r.actualMcp === undefined || isNaN(r.actualMcp)) continue;
    if (r.confidence === null || r.confidence === undefined || isNaN(r.confidence)) continue;
    if (r.priceMin === null || r.priceMin === undefined || isNaN(r.priceMin)) continue;
    if (r.priceMax === null || r.priceMax === undefined || isNaN(r.priceMax)) continue;

    totalValid++;
    const actual = r.actualMcp;
    const reallyCleared = bidType === "buy" ? actual <= selectedPrice + 1e-9 : actual >= selectedPrice - 1e-9;
    const rangeCleared =
      bidType === "buy"
        ? Math.max(r.priceMin, r.priceMax) <= selectedPrice + 1e-9
        : Math.min(r.priceMin, r.priceMax) >= selectedPrice - 1e-9;

    // Check confidence bucket
    for (const b of buckets) {
      if (b.filter(r.confidence)) {
        if (rangeCleared) {
          b.rangeClearedTotal++;
          if (reallyCleared) b.reallyClearedHits++;
        }
        break;
      }
    }

    // Label hit rate check
    const label = evaluateBlockLikelihood(
      selectedPrice,
      r.forecastedMcp,
      r.priceMin,
      r.priceMax,
      r.confidence,
      bidType,
      strictness
    );

    if (label === "sure_clear") {
      sureTotal++;
      if (reallyCleared) sureHits++;
    } else if (label === "likely_clear") {
      likelyTotal++;
      if (reallyCleared) likelyHits++;
    } else if (label === "risky") {
      riskyTotal++;
      if (reallyCleared) riskyHits++;
    }
  }

  const bucketStats: ConfidenceBucketStats[] = buckets.map((b) => ({
    bucketLabel: b.label,
    rangeClearedTotal: b.rangeClearedTotal,
    reallyClearedHits: b.reallyClearedHits,
    hitRatePct: b.rangeClearedTotal > 0 ? +((b.reallyClearedHits / b.rangeClearedTotal) * 100).toFixed(1) : 0,
  }));

  const labelStats: LabelHitRateStats = {
    sureClearTotal: sureTotal,
    sureClearHits: sureHits,
    sureClearHitRatePct: sureTotal > 0 ? +((sureHits / sureTotal) * 100).toFixed(1) : 0,
    likelyClearTotal: likelyTotal,
    likelyClearHits: likelyHits,
    likelyClearHitRatePct: likelyTotal > 0 ? +((likelyHits / likelyTotal) * 100).toFixed(1) : 0,
    riskyTotal: riskyTotal,
    riskyHits: riskyHits,
    riskyHitRatePct: riskyTotal > 0 ? +((riskyHits / riskyTotal) * 100).toFixed(1) : 0,
  };

  const highPerforming = bucketStats.filter((b) => b.rangeClearedTotal >= 5 && b.hitRatePct >= 95).length;
  const recommendationHint =
    highPerforming >= 2
      ? "Buckets with hit rate ≥ 95% can use a smaller buffer; buckets below that need a bigger one."
      : "Confidence buffers provide necessary headroom when actual market prices deviate from forecast ranges.";

  return {
    totalHistoricalIntervals: totalValid,
    bucketStats,
    labelStats,
    recommendationHint,
  };
}
