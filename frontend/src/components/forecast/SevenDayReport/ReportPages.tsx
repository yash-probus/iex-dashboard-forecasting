import React from "react";
import type { SevenDayReportData, ToleranceOption } from "./reportCalculations";
import { VerdictBanner } from "./sections/VerdictBanner";
import { KpiGrid } from "./sections/KpiGrid";
import { DailyTrendChart } from "./sections/DailyTrendChart";
import { BlockAccuracyCard } from "./sections/BlockAccuracyCard";
import { ErrorHeatmap } from "./sections/ErrorHeatmap";
import { TimeOfDayPerformance } from "./sections/TimeOfDayPerformance";
import { BiasAnalysisCard } from "./sections/BiasAnalysisCard";
import { BestWorstBlocks } from "./sections/BestWorstBlocks";
import { BiddingImpactCard } from "./sections/BiddingImpactCard";

export interface ReportPageProps {
  report: SevenDayReportData;
  modelInfo: {
    id: string;
    name: string;
    color: string;
  };
  market: string;
  selectedTol?: ToleranceOption["id"];
  onToleranceChange?: (tol: ToleranceOption["id"]) => void;
  isCapture?: boolean;
}

/**
 * Standard footer rendered on every report page.
 * Format: "GDAM Forecast | Model X | date range | Page n of N"
 */
export function ReportPageFooter({
  report,
  modelInfo,
  market,
  pageNumber,
  totalPages = 4,
}: {
  report: SevenDayReportData;
  modelInfo: { name: string };
  market: string;
  pageNumber: number;
  totalPages?: number;
}) {
  return (
    <footer className="mt-auto pt-3 border-t border-border/60 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground select-none avoid-break shrink-0">
      <div className="flex items-center gap-2 font-medium truncate">
        <span className="font-semibold text-foreground">{market} Forecast</span>
        <span className="text-muted-foreground/60">|</span>
        <span>{modelInfo.name}</span>
        <span className="text-muted-foreground/60">|</span>
        <span>
          {report.startDate} to {report.endDate}
        </span>
      </div>
      <div className="flex items-center gap-2 font-mono font-semibold shrink-0 text-foreground">
        <span className="hidden sm:inline text-[10px] text-muted-foreground font-sans font-normal">
          Confidential · Prolt Energy Analytics
        </span>
        <span className="rounded bg-muted/60 px-2 py-0.5 text-xs text-foreground">
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </footer>
  );
}

/**
 * PAGE 1:
 * Header (title, model name, date range) + Verdict banner + KPI cards + Daily trend chart
 */
export function ReportPage1({
  report,
  modelInfo,
  market,
  isCapture = false,
}: ReportPageProps) {
  return (
    <div className="flex-1 flex flex-col justify-between gap-4 sm:gap-5">
      {/* Page 1 Executive Title Banner */}
      <header className="border-b border-border/80 pb-3 sm:pb-4 shrink-0 avoid-break">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-foreground">
                {market} Power Forecast Performance Audit
              </h1>
              <span className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                {modelInfo.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              7-Day Evaluation Period: <strong className="text-foreground">{report.startDate}</strong> to{" "}
              <strong className="text-foreground">{report.endDate}</strong> ({report.totalRows} Settlement Blocks · 15-Minute Resolution)
            </p>
          </div>
          <div className="text-left sm:text-right text-[11px] text-muted-foreground font-mono shrink-0">
            <div className="font-semibold text-foreground">Prolt Energy Trading Intelligence</div>
            <div>Official {market} Market Audit</div>
          </div>
        </div>
      </header>

      {/* 1. Verdict Banner */}
      <div className="avoid-break">
        <VerdictBanner report={report} />
      </div>

      {/* 2. KPI Cards */}
      <div className="avoid-break">
        <KpiGrid report={report} />
      </div>

      {/* 3. Daily Trend Chart */}
      <div className="avoid-break flex-1 min-h-[260px]">
        <DailyTrendChart report={report} />
      </div>

      {/* Footer */}
      <ReportPageFooter
        report={report}
        modelInfo={modelInfo}
        market={market}
        pageNumber={1}
        totalPages={4}
      />
    </div>
  );
}

/**
 * PAGE 2:
 * Block accuracy + Heatmap
 */
export function ReportPage2({
  report,
  modelInfo,
  market,
  selectedTol = "abs_050",
  onToleranceChange,
  isCapture = false,
}: ReportPageProps) {
  return (
    <div className="flex-1 flex flex-col justify-between gap-4 sm:gap-5">
      {/* Page 2 Header */}
      <header className="border-b border-border/80 pb-2.5 sm:pb-3 shrink-0 avoid-break">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              Section II
            </span>
            <span className="text-muted-foreground/40">·</span>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Block Accuracy & Hourly Error Heatmap
            </h2>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            <span>{modelInfo.name}</span>
            <span className="mx-1.5 text-muted-foreground/50">|</span>
            <span>{report.startDate} to {report.endDate}</span>
          </div>
        </div>
      </header>

      {/* 4. Block Accuracy & Tolerance Gauge */}
      <div className="avoid-break">
        <BlockAccuracyCard
          report={report}
          selectedTolerance={selectedTol}
          onToleranceChange={onToleranceChange || (() => {})}
          isCapture={isCapture}
        />
      </div>

      {/* 5. Hourly Absolute Error Heatmap */}
      <div className="avoid-break flex-1">
        <ErrorHeatmap report={report} />
      </div>

      {/* Footer */}
      <ReportPageFooter
        report={report}
        modelInfo={modelInfo}
        market={market}
        pageNumber={2}
        totalPages={4}
      />
    </div>
  );
}

/**
 * PAGE 3:
 * Time-of-day performance + Bias analysis + Bidding impact
 */
export function ReportPage3({
  report,
  modelInfo,
  market,
  isCapture = false,
}: ReportPageProps) {
  return (
    <div className="flex-1 flex flex-col justify-between gap-4 sm:gap-5">
      {/* Page 3 Header */}
      <header className="border-b border-border/80 pb-2.5 sm:pb-3 shrink-0 avoid-break">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              Section III
            </span>
            <span className="text-muted-foreground/40">·</span>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Operational Regimes & Bidding Impact Simulation
            </h2>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            <span>{modelInfo.name}</span>
            <span className="mx-1.5 text-muted-foreground/50">|</span>
            <span>{report.startDate} to {report.endDate}</span>
          </div>
        </div>
      </header>

      {/* 6. Time of Day Performance */}
      <div className="avoid-break">
        <TimeOfDayPerformance report={report} />
      </div>

      {/* 7. Forecast Bias & Skew Analysis */}
      <div className="avoid-break">
        <BiasAnalysisCard report={report} />
      </div>

      {/* 8. Bidding & Execution Impact Simulation */}
      <div className="avoid-break">
        <BiddingImpactCard report={report} />
      </div>

      {/* Footer */}
      <ReportPageFooter
        report={report}
        modelInfo={modelInfo}
        market={market}
        pageNumber={3}
        totalPages={4}
      />
    </div>
  );
}

/**
 * PAGE 4:
 * Top 5 worst / best blocks + Settlement Audit Disclaimer
 */
export function ReportPage4({
  report,
  modelInfo,
  market,
  isCapture = false,
}: ReportPageProps) {
  return (
    <div className="flex-1 flex flex-col justify-between gap-4 sm:gap-5">
      {/* Page 4 Header */}
      <header className="border-b border-border/80 pb-2.5 sm:pb-3 shrink-0 avoid-break">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              Section IV
            </span>
            <span className="text-muted-foreground/40">·</span>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Critical Deviations & High-Precision Settlement Blocks
            </h2>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            <span>{modelInfo.name}</span>
            <span className="mx-1.5 text-muted-foreground/50">|</span>
            <span>{report.startDate} to {report.endDate}</span>
          </div>
        </div>
      </header>

      {/* 9. Top 5 Worst & Best Blocks */}
      <div className="avoid-break flex-1">
        <BestWorstBlocks report={report} />
      </div>

      {/* Audit Methodology & Institutional Disclaimer Card */}
      <div className="avoid-break rounded-2xl border border-border bg-muted/15 p-4 sm:p-5 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-border/50 font-semibold text-foreground">
          <span>Audit Methodology & Compliance Verification</span>
          <span className="text-[11px] font-mono text-primary">IEX Market Clearing Engine</span>
        </div>
        <p className="leading-relaxed">
          This 7-Day Performance Audit calculates Weighted Mean Absolute Percentage Error (WMAPE) and Mean Absolute Error (MAE)
          over 672 consecutive 15-minute settlement blocks. Clearing prices are benchmarked against actual market results published
          by the Indian Energy Exchange (IEX).
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground/80 font-mono">
          <span>Target Market: {market}</span>
          <span>Model: {modelInfo.name}</span>
          <span>Sample Size: {report.totalRows} Blocks</span>
          <span>Clearance Compliance: {report.toleranceCompliance.pct}%</span>
        </div>
      </div>

      {/* Footer */}
      <ReportPageFooter
        report={report}
        modelInfo={modelInfo}
        market={market}
        pageNumber={4}
        totalPages={4}
      />
    </div>
  );
}
