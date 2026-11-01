import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateBlockLikelihood,
  evaluateConfidence,
  getSafetyBuffer,
  explainBlockLikelihood,
  calculateBidPriceNeeded,
  computePriceLadder,
  runClearFinder,
  computeHistoricalCalibration,
  type RawForecastRow,
} from "./clearFinderCalculations.ts";

describe("Clear Finder Safety Buffer & Label Logic", () => {
  it("Sanity Check 1: Buy ₹10 with a solar-hour block (range 2 to 4, any confidence) MUST be Sure Clear", () => {
    // Solar block with range 2.0 to 4.0, Low confidence (e.g. 52%)
    // B = 0.50, H + B = 4.50 <= 10.00 -> MUST be sure_clear!
    const resultLow = evaluateBlockLikelihood(10.0, 2.5, 2.0, 4.0, 52.0, "buy", "balanced");
    assert.equal(resultLow, "sure_clear", "Solar hour block at ₹10 buy bid must be Sure Clear even with low confidence");

    const resultMed = evaluateBlockLikelihood(10.0, 2.5, 2.0, 4.0, 75.0, "buy", "balanced");
    assert.equal(resultMed, "sure_clear");

    const resultHigh = evaluateBlockLikelihood(10.0, 2.5, 2.0, 4.0, 92.0, "buy", "balanced");
    assert.equal(resultHigh, "sure_clear");
  });

  it("Sanity Check 2: Buy ₹3 with night blocks (forecast and range ~10) MUST be Will Not Clear", () => {
    // Night block: F=10, L=9.68, H=10, P=3
    // L > P (9.68 > 3) -> MUST be will_not_clear!
    const result = evaluateBlockLikelihood(3.0, 10.0, 9.68, 10.0, 90.0, "buy", "balanced");
    assert.equal(result, "will_not_clear", "Night block must be Will Not Clear when bid price is below range floor");
  });

  it("Strictness Multipliers scale Safety Buffers correctly", () => {
    // High confidence: buffer is always 0
    assert.equal(getSafetyBuffer("high", "strict"), 0.0);
    assert.equal(getSafetyBuffer("high", "balanced"), 0.0);
    assert.equal(getSafetyBuffer("high", "relaxed"), 0.0);

    // Medium confidence: base = 0.25
    assert.equal(getSafetyBuffer("medium", "strict"), 0.38); // 0.25 * 1.5 = 0.375 rounded to 0.38
    assert.equal(getSafetyBuffer("medium", "balanced"), 0.25);
    assert.equal(getSafetyBuffer("medium", "relaxed"), 0.13); // 0.25 * 0.5 = 0.125 rounded to 0.13

    // Low confidence: base = 0.50
    assert.equal(getSafetyBuffer("low", "strict"), 0.75); // 0.50 * 1.5 = 0.75
    assert.equal(getSafetyBuffer("low", "balanced"), 0.50);
    assert.equal(getSafetyBuffer("low", "relaxed"), 0.25); // 0.50 * 0.5 = 0.25
  });

  it("Buy Rule 1: Range floor > Bid price -> Will Not Clear", () => {
    // P=2.0, L=2.1, H=2.5, F=1.8, C=95%
    const res = evaluateBlockLikelihood(2.0, 1.8, 2.1, 2.5, 95.0, "buy");
    assert.equal(res, "will_not_clear");
  });

  it("Buy Rule 2: Forecast > Bid price -> Risky", () => {
    // P=2.0, L=1.5, H=2.5, F=2.2 (> P)
    const res = evaluateBlockLikelihood(2.0, 2.2, 1.5, 2.5, 90.0, "buy");
    assert.equal(res, "risky");
  });

  it("Buy Rule 3: Whole range clears with safety headroom (H + B <= P) -> Sure Clear", () => {
    // Medium confidence: B = 0.25 in balanced
    // F=2.0, L=1.5, H=2.5, B=0.25 => H + B = 2.75.
    // If P = 3.00 (>= 2.75) -> Sure Clear!
    const res = evaluateBlockLikelihood(3.0, 2.0, 1.5, 2.5, 75.0, "buy", "balanced");
    assert.equal(res, "sure_clear");

    // Low confidence: B = 0.50 in balanced
    // F=2.0, L=1.5, H=2.5, B=0.50 => H + B = 3.00.
    // If P = 3.00 (>= 3.00) -> Sure Clear!
    const resLow = evaluateBlockLikelihood(3.0, 2.0, 1.5, 2.5, 55.0, "buy", "balanced");
    assert.equal(resLow, "sure_clear");
  });

  it("Buy Rule 4: Whole range clears without buffer headroom (H <= P < H + B) -> Likely Clear", () => {
    // Low confidence: B = 0.50 in balanced
    // F=2.0, L=1.5, H=2.8 => H + B = 3.30.
    // Bid P = 3.00 (2.8 <= 3.00 < 3.30) -> Likely Clear!
    const res = evaluateBlockLikelihood(3.0, 2.0, 1.5, 2.8, 55.0, "buy", "balanced");
    assert.equal(res, "likely_clear");
  });

  it("Buy Rule 5: Range partly crosses bid (F <= P < H)", () => {
    // F=2.0, L=1.5, H=3.5. Bid P = 2.5.
    // High confidence -> Likely Clear
    assert.equal(evaluateBlockLikelihood(2.5, 2.0, 1.5, 3.5, 90.0, "buy", "balanced"), "likely_clear");
    // Medium confidence -> Risky
    assert.equal(evaluateBlockLikelihood(2.5, 2.0, 1.5, 3.5, 75.0, "buy", "balanced"), "risky");
    // Low confidence -> Risky
    assert.equal(evaluateBlockLikelihood(2.5, 2.0, 1.5, 3.5, 50.0, "buy", "balanced"), "risky");
  });

  it("Sell Rules (exact mirror)", () => {
    // 1. H < P -> Will Not Clear
    assert.equal(evaluateBlockLikelihood(5.0, 3.5, 2.0, 4.0, 90.0, "sell"), "will_not_clear");
    // 2. F < P -> Risky
    assert.equal(evaluateBlockLikelihood(3.5, 3.0, 2.5, 4.5, 90.0, "sell"), "risky");
    // 3. L - B >= P -> Sure Clear
    // F=3.5, L=3.0, H=4.5, Low conf (B=0.50) => L - B = 2.50. Offer P = 2.50 => Sure Clear!
    assert.equal(evaluateBlockLikelihood(2.5, 3.5, 3.0, 4.5, 50.0, "sell", "balanced"), "sure_clear");
    // 4. L >= P > L - B -> Likely Clear
    // Offer P = 2.80 (3.0 >= 2.80 > 2.50) => Likely Clear!
    assert.equal(evaluateBlockLikelihood(2.8, 3.5, 3.0, 4.5, 50.0, "sell", "balanced"), "likely_clear");
    // 5. L < P <= F: High Conf -> Likely, Med/Low -> Risky
    assert.equal(evaluateBlockLikelihood(3.2, 3.5, 3.0, 4.5, 90.0, "sell", "balanced"), "likely_clear");
    assert.equal(evaluateBlockLikelihood(3.2, 3.5, 3.0, 4.5, 55.0, "sell", "balanced"), "risky");
  });

  it("Boundary value equalities (P equal to H, H + B, F, L)", () => {
    // P == H + B (Sure Clear)
    // F=2.0, L=1.5, H=2.5, Low conf B=0.50 => H + B = 3.00. P=3.00
    assert.equal(evaluateBlockLikelihood(3.0, 2.0, 1.5, 2.5, 55.0, "buy", "balanced"), "sure_clear");

    // P == H (Likely Clear when B > 0)
    // P=2.5. H=2.5, H+B=3.00 => P == H clears range, but not buffer => Likely Clear
    assert.equal(evaluateBlockLikelihood(2.5, 2.0, 1.5, 2.5, 55.0, "buy", "balanced"), "likely_clear");

    // P == F
    // F=2.0, P=2.0, L=1.5, H=2.5, High conf => F <= P < H => Likely Clear
    assert.equal(evaluateBlockLikelihood(2.0, 2.0, 1.5, 2.5, 90.0, "buy", "balanced"), "likely_clear");

    // P == L
    // F=2.0, P=1.5, L=1.5, H=2.5 => F > P (2.0 > 1.5) => Risky
    assert.equal(evaluateBlockLikelihood(1.5, 2.0, 1.5, 2.5, 90.0, "buy", "balanced"), "risky");
  });

  it("Bid Price Needed consistency: Bidding at stated price produces stated label", () => {
    const F = 2.5;
    const L = 2.0;
    const H = 3.0;
    const C = 55.0; // Low confidence, B = 0.50

    const needed = calculateBidPriceNeeded(F, L, H, C, "buy", "balanced");
    assert.equal(needed.isBidable, true);
    assert.equal(needed.sureClearPrice, 3.5); // H + B = 3.0 + 0.50
    assert.equal(needed.likelyClearPrice, 3.0); // H = 3.0

    // Bidding at sureClearPrice must produce Sure Clear
    const labelAtSure = evaluateBlockLikelihood(needed.sureClearPrice!, F, L, H, C, "buy", "balanced");
    assert.equal(labelAtSure, "sure_clear");

    // Bidding at likelyClearPrice must produce Likely Clear
    const labelAtLikely = evaluateBlockLikelihood(needed.likelyClearPrice!, F, L, H, C, "buy", "balanced");
    assert.equal(labelAtLikely, "likely_clear");
  });

  it("Missing data returns no_data and never guesses", () => {
    assert.equal(evaluateBlockLikelihood(3.0, null, 2.0, 4.0, 90.0, "buy"), "no_data");
    assert.equal(evaluateBlockLikelihood(3.0, 2.5, null, 4.0, 90.0, "buy"), "no_data");
    assert.equal(evaluateBlockLikelihood(3.0, 2.5, 2.0, null, 90.0, "buy"), "no_data");
    assert.equal(evaluateBlockLikelihood(3.0, 2.5, 2.0, 4.0, null, "buy"), "no_data");
  });

  it("Actual MCP is NOT an input to any label or live simulation function", () => {
    const mockRows: any[] = [
      { date: "2026-10-15", hour: "12", timeBlock: "11:00-11:15", forecastedMcp: 2.1, priceMin: 1.8, priceMax: 2.5, confidence: 55, actualMcp: 10.0 },
    ];

    // Low confidence B=0.50 => H+B = 3.00 <= 3.50 => Sure Clear
    const r1 = runClearFinder(mockRows, 3.5, "buy");
    assert.equal(r1.blocks[0].likelihood, "sure_clear");

    // Modifying actualMcp from 10.0 to 0.0 has zero effect on labels
    mockRows[0].actualMcp = 0.0;
    const r2 = runClearFinder(mockRows, 3.5, "buy");
    assert.equal(r2.blocks[0].likelihood, "sure_clear");
    assert.deepEqual(r1.priceLadder, r2.priceLadder);
  });
});
