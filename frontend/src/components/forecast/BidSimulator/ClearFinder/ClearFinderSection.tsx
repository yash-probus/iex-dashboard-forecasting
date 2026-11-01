import React, { useMemo, useState } from "react";
import { Info, Sparkles, SlidersHorizontal, RotateCcw, ArrowRightLeft } from "lucide-react";
import type { ForecastRow } from "../../mockData";
import {
  runClearFinder,
  type BidType,
  type StrictnessLevel,
  STRICTNESS_CONFIG,
  getSafetyBuffer,
} from "./clearFinderCalculations";
import { ClearFinderPriceLadder } from "./sections/ClearFinderPriceLadder";
import { ClearFinderHero } from "./sections/ClearFinderHero";
import { ClearFinderTimeline } from "./sections/ClearFinderTimeline";
import { ClearFinderWindows } from "./sections/ClearFinderWindows";
import { ClearFinderBlockTable } from "./sections/ClearFinderBlockTable";
import { ClearFinderCalibrationPanel } from "./sections/ClearFinderCalibrationPanel";

interface ClearFinderSectionProps {
  rows: ForecastRow[];
  market: string;
  selectedDate: string;
}

export const ClearFinderSection: React.FC<ClearFinderSectionProps> = ({
  rows,
  market,
  selectedDate,
}) => {
  const [bidType, setBidType] = useState<BidType>("buy");
  const [strictness, setStrictness] = useState<StrictnessLevel>("balanced");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [selectedLadderPrice, setSelectedLadderPrice] = useState<number | null>(null);

  // Parse custom price input if provided
  const parsedCustomPrice = useMemo(() => {
    if (!customPrice.trim()) return null;
    const num = parseFloat(customPrice);
    return isNaN(num) || num < 0 ? null : Math.round(num * 100) / 100;
  }, [customPrice]);

  // Determine active bid price: custom override > clicked ladder price > null (will auto-select lowest with sure clear)
  const effectivePrice = parsedCustomPrice ?? selectedLadderPrice;

  // Run pure simulation
  const result = useMemo(() => {
    return runClearFinder(rows, effectivePrice, bidType, strictness);
  }, [rows, effectivePrice, bidType, strictness]);

  const activeBidPrice = result.bidPrice;

  // Handle price selection from ladder
  const handleSelectLadderPrice = (price: number) => {
    setCustomPrice(""); // Clear custom input when clicking ladder
    setSelectedLadderPrice(price);
  };

  // Reset to auto-selected default
  const handleResetToDefault = () => {
    setCustomPrice("");
    setSelectedLadderPrice(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Buy/Sell and Rule line */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Simulation Intent:
              </span>
              <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setBidType("buy")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    bidType === "buy"
                      ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Buy Bid
                </button>
                <button
                  type="button"
                  onClick={() => setBidType("sell")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    bidType === "sell"
                      ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sell Offer
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground font-medium">
              <strong>Exchange Rule:</strong>{" "}
              {bidType === "buy"
                ? "Buy bid clears when Bid Price ≥ Market Clearing Price (MCP). Equal counts as clear."
                : "Sell offer clears when Offer Price ≤ Market Clearing Price (MCP). Equal counts as clear."}
            </p>
          </div>

          {/* Right: Controls (Strictness & Custom Price) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Strictness Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Strictness:</span>
              <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-0.5">
                {(["strict", "balanced", "relaxed"] as StrictnessLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setStrictness(lvl)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                      strictness === lvl
                        ? "bg-accent font-bold text-accent-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Price Input (Optional override) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Custom ₹:</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.05"
                  placeholder={`Auto (₹${result.defaultSelectedPrice.toFixed(2)})`}
                  value={customPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                      setCustomPrice(val);
                    }
                  }}
                  className="h-8 w-28 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {(customPrice || selectedLadderPrice !== null) && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  title="Reset to default preset"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Confidence Thresholds & Safety Headroom Note */}
        <div className="flex flex-wrap items-center justify-between border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground gap-2">
          <span>
            Active Headroom Buffers: High <strong>+₹{getSafetyBuffer("high", strictness).toFixed(2)}</strong> (≥{STRICTNESS_CONFIG[strictness].highMin}%) · Medium <strong>+₹{getSafetyBuffer("medium", strictness).toFixed(2)}</strong> ({STRICTNESS_CONFIG[strictness].mediumMin}–{STRICTNESS_CONFIG[strictness].highMin}%) · Low <strong>+₹{getSafetyBuffer("low", strictness).toFixed(2)}</strong> (&lt;{STRICTNESS_CONFIG[strictness].mediumMin}%)
          </span>
          <span>
            Estimated from {market} forecast for <strong>{selectedDate}</strong> (96 blocks). Zero actual MCP used in live labels.
          </span>
        </div>
      </div>

      {/* 1. Price Ladder (Preset Sensitivity Table & Bar Chart) */}
      <ClearFinderPriceLadder
        ladder={result.priceLadder}
        selectedPrice={activeBidPrice}
        bidType={bidType}
        onSelectPrice={handleSelectLadderPrice}
      />

      {/* 2. Hero Summary Card */}
      <ClearFinderHero result={result} />

      {/* 3. 24-Hour Clearing Likelihood Ribbon (96 Blocks) with "Why this label?" card */}
      <ClearFinderTimeline
        blocks={result.blocks}
        bidPrice={activeBidPrice}
        bidType={bidType}
      />

      {/* 4. Continuous Operational Windows */}
      <ClearFinderWindows windows={result.windows} />

      {/* 5. 15-Minute Clearing Likelihood Table with "Bid Price Needed" */}
      <ClearFinderBlockTable
        blocks={result.blocks}
        bidType={bidType}
        bidPrice={activeBidPrice}
      />

      {/* 6. Historical Threshold Calibration Panel (Collapsible, verification only) */}
      <ClearFinderCalibrationPanel
        selectedPrice={activeBidPrice}
        bidType={bidType}
        strictness={strictness}
        selectedDate={selectedDate}
        market={market}
      />
    </div>
  );
};
