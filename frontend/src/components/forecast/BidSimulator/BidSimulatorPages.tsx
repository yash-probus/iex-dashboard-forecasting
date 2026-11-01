import React from "react";
import type { ForecastRow } from "../mockData";
import {
  runClearFinder,
  type ClearFinderResult,
  type BidType,
  type StrictnessLevel,
} from "./ClearFinder/clearFinderCalculations";
import { ClearFinderHero } from "./ClearFinder/sections/ClearFinderHero";
import { ClearFinderTimeline } from "./ClearFinder/sections/ClearFinderTimeline";
import { ClearFinderWindows } from "./ClearFinder/sections/ClearFinderWindows";
import { ClearFinderPriceLadder } from "./ClearFinder/sections/ClearFinderPriceLadder";
import { ClearFinderBlockTable } from "./ClearFinder/sections/ClearFinderBlockTable";

export interface ClearFinderPageProps {
  result: ClearFinderResult;
  market: string;
  selectedDate: string;
  selectedModel: string;
  isCapture?: boolean;
}

export function ClearFinderPageFooter({
  market,
  selectedModel,
  selectedDate,
  pageNumber,
  totalPages = 2,
}: {
  market: string;
  selectedModel: string;
  selectedDate: string;
  pageNumber: number;
  totalPages?: number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground mt-auto">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">PROLT Clear Finder</span>
        <span>•</span>
        <span>
          {market} • {selectedModel} • {selectedDate}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>Confidential • Operational Bidding Advisory</span>
        <span className="font-mono font-medium">
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  );
}

/**
 * PAGE 1: Overview, Price Ladder, Hero & 24h Likelihood Ribbon
 */
export function ClearFinderPage1({
  result,
  market,
  selectedDate,
  selectedModel,
  isCapture,
}: ClearFinderPageProps) {
  return (
    <div
      className={`flex flex-col justify-between bg-background p-8 text-foreground ${
        isCapture ? "w-[1080px] h-[1350px] overflow-hidden" : "min-h-[1100px]"
      }`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-teal-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                PROLT Clear Finder Report
              </span>
              <span className="text-xs text-muted-foreground">
                Page 1: Benchmark Sensitivity & Clearing Ribbon
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
              {market} 15-Minute Clearing Likelihood Advisory
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Forecast Date: <strong className="text-foreground">{selectedDate}</strong> • Model:{" "}
              <strong className="text-foreground">{selectedModel}</strong> • Strategy:{" "}
              <strong className="text-foreground capitalize">{result.bidType} Bid @ ₹{result.bidPrice.toFixed(2)}/kWh</strong>
            </p>
          </div>

          <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Sure Clear Certainty
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {result.sureClearCount} / {result.totalBlocks} Blocks
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {result.sureClearPct}% of trading day
            </div>
          </div>
        </div>

        {/* Hero Card */}
        <ClearFinderHero result={result} />

        {/* Price Ladder Sensitivity */}
        <ClearFinderPriceLadder
          ladder={result.priceLadder}
          selectedPrice={result.bidPrice}
          bidType={result.bidType}
          onSelectPrice={() => {}}
        />

        {/* 24-Hour Ribbon */}
        <ClearFinderTimeline
          blocks={result.blocks}
          bidPrice={result.bidPrice}
          bidType={result.bidType}
        />
      </div>

      <ClearFinderPageFooter
        market={market}
        selectedModel={selectedModel}
        selectedDate={selectedDate}
        pageNumber={1}
        totalPages={2}
      />
    </div>
  );
}

/**
 * PAGE 2: Continuous Windows & 15-Min Detailed Blocks Table
 */
export function ClearFinderPage2({
  result,
  market,
  selectedDate,
  selectedModel,
  isCapture,
}: ClearFinderPageProps) {
  return (
    <div
      className={`flex flex-col justify-between bg-background p-8 text-foreground ${
        isCapture ? "w-[1080px] h-[1350px] overflow-hidden" : "min-h-[1100px]"
      }`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-teal-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                PROLT Clear Finder Report
              </span>
              <span className="text-xs text-muted-foreground">
                Page 2: Clearing Windows & Required Bid Rates
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Continuous Windows & Bid Price Requirements
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Forecast Date: <strong className="text-foreground">{selectedDate}</strong> • Market:{" "}
              <strong className="text-foreground">{market}</strong>
            </p>
          </div>
        </div>

        {/* Continuous Clearing Windows */}
        <ClearFinderWindows windows={result.windows} />

        {/* Block Table (Recommended Blocks) */}
        <ClearFinderBlockTable
          blocks={result.blocks}
          bidType={result.bidType}
          bidPrice={result.bidPrice}
        />
      </div>

      <ClearFinderPageFooter
        market={market}
        selectedModel={selectedModel}
        selectedDate={selectedDate}
        pageNumber={2}
        totalPages={2}
      />
    </div>
  );
}
