import React, { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Search,
  Filter,
  CheckCircle2,
  ShieldAlert,
  XCircle,
  HelpCircle,
  Info,
  Layers,
} from "lucide-react";
import type { ClearFinderBlock, ClearLikelihood, BidType } from "../clearFinderCalculations";
import { PRICE_CAP } from "../../../mockData";

interface ClearFinderBlockTableProps {
  blocks: ClearFinderBlock[];
  bidType: BidType;
  bidPrice: number;
}

type SortField =
  | "timeBlock"
  | "hour"
  | "forecastedMcp"
  | "actualMcp"
  | "priceMin"
  | "confidence"
  | "likelihood";

export const ClearFinderBlockTable: React.FC<ClearFinderBlockTableProps> = ({
  blocks,
  bidType,
  bidPrice,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("timeBlock");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filteredAndSorted = useMemo(() => {
    let list = blocks;

    // Default to Recommended only (Sure + Likely) unless showAll is true
    if (!showAll && labelFilter === "all") {
      list = list.filter((b) => b.likelihood === "sure_clear" || b.likelihood === "likely_clear");
    } else if (labelFilter !== "all") {
      list = list.filter((b) => b.likelihood === labelFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.timeBlock.toLowerCase().includes(q) ||
          b.hour.toLowerCase().includes(q) ||
          b.likelihood.toLowerCase().includes(q) ||
          b.bidPriceNeeded.displayStatus.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "actualMcp") {
        valA = a.actualMcp ?? -1;
        valB = b.actualMcp ?? -1;
      } else if (sortField === "priceMin") {
        valA = a.priceMin ?? -1;
        valB = b.priceMin ?? -1;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [blocks, showAll, labelFilter, search, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sureCount = blocks.filter((b) => b.likelihood === "sure_clear").length;
  const likelyCount = blocks.filter((b) => b.likelihood === "likely_clear").length;

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-teal-500" />
            15-Minute Clearing Likelihood Table
            <span className="text-[11px] font-normal text-muted-foreground">
              — {showAll ? `All ${blocks.length} Blocks` : `Recommended Only (${sureCount + likelyCount} Blocks)`}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Estimated from forecast range and confidence. Not a guarantee of clearing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Recommended vs Show All */}
          <div className="flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                !showAll
                  ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Recommended ({sureCount + likelyCount})
            </button>
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                showAll
                  ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Show All ({blocks.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search block..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-28 sm:w-36 rounded-lg border border-border/70 bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Label Filter */}
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="h-8 rounded-lg border border-border/70 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Categories</option>
              <option value="sure_clear">Sure Clear (🟢)</option>
              <option value="likely_clear">Likely Clear (🔵)</option>
              <option value="risky">Risky (🟡)</option>
              <option value="will_not_clear">Will Not Clear (🔴)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assumptions Banner */}
      <div className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-[11px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 text-teal-500 shrink-0" />
        <span>
          <strong>Bid Price Needed ({bidType.toUpperCase()}):</strong> Sure Clear requires bidding ≥ Upper Range + Safety Buffer (H + B). Likely Clear requires bidding ≥ Upper Range (H). Confidence determines the required safety headroom (High ₹0.00, Medium ₹0.25, Low ₹0.50).
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/50 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
            <tr>
              <th
                onClick={() => handleSort("timeBlock")}
                className="cursor-pointer px-3.5 py-2.5 hover:text-foreground"
              >
                <div className="flex items-center gap-1">
                  Time Block
                  {sortField === "timeBlock" &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </div>
              </th>
              <th
                onClick={() => handleSort("forecastedMcp")}
                className="cursor-pointer px-3.5 py-2.5 hover:text-foreground text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  Forecast MCP
                  {sortField === "forecastedMcp" &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </div>
              </th>
              <th
                onClick={() => handleSort("actualMcp")}
                className="cursor-pointer px-3.5 py-2.5 hover:text-foreground text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  Actual MCP
                  {sortField === "actualMcp" &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </div>
              </th>
              <th
                onClick={() => handleSort("priceMin")}
                className="cursor-pointer px-3.5 py-2.5 hover:text-foreground"
              >
                <div className="flex items-center gap-1">
                  Price Range (₹)
                  {sortField === "priceMin" &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </div>
              </th>
              <th
                onClick={() => handleSort("confidence")}
                className="cursor-pointer px-3.5 py-2.5 hover:text-foreground text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  Confidence
                  {sortField === "confidence" &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </div>
              </th>
              <th
                onClick={() => handleSort("likelihood")}
                className="cursor-pointer px-3.5 py-2.5 hover:text-foreground"
              >
                <div className="flex items-center gap-1">
                  Clearing Likelihood
                  {sortField === "likelihood" &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </div>
              </th>
              <th className="px-3.5 py-2.5 font-bold text-foreground">
                Bid Price Needed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-medium">
            {filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((b) => (
                <tr
                  key={b.timeBlock}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3.5 py-2.5 font-mono text-xs text-foreground font-semibold">
                    {b.timeBlock}
                  </td>

                  <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                    ₹{b.forecastedMcp.toFixed(2)}
                  </td>

                  <td className="px-3.5 py-2.5 text-right font-mono text-xs">
                    {b.actualMcp !== null ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-bold text-foreground">₹{b.actualMcp.toFixed(2)}</span>
                        {b.actualCleared !== null && (
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                              b.actualCleared
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            }`}
                            title={`Exchange actual ₹${b.actualMcp.toFixed(2)} ${
                              b.actualCleared ? "≤" : ">"
                            } active bid ₹${bidPrice.toFixed(2)} → ${
                              b.actualCleared ? "Cleared on Exchange!" : "Missed (Bid too low)"
                            }`}
                          >
                            {b.actualCleared ? "Cleared" : "Missed"}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </td>

                  <td className="px-3.5 py-2.5">
                    {b.priceMin !== null && b.priceMax !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="relative h-1.5 w-16 rounded-full bg-muted">
                          <div
                            className="absolute inset-y-0 rounded-full bg-teal-500/70"
                            style={{
                              left: `${(b.priceMin / PRICE_CAP) * 100}%`,
                              right: `${Math.max(
                                0,
                                100 - (b.priceMax / PRICE_CAP) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {b.priceMin.toFixed(2)}–{b.priceMax.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </td>

                  <td className="px-3.5 py-2.5 text-center">
                    {b.confidence !== null ? (
                      <div className="inline-flex items-center gap-1.5">
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-teal-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, b.confidence))}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs text-foreground font-semibold">
                          {b.confidence.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </td>

                  <td className="px-3.5 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                        b.likelihood === "sure_clear"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : b.likelihood === "likely_clear"
                          ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                          : b.likelihood === "risky"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : b.likelihood === "will_not_clear"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {b.likelihood === "sure_clear" && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {b.likelihood === "likely_clear" && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {b.likelihood === "risky" && (
                        <ShieldAlert className="h-3 w-3" />
                      )}
                      {b.likelihood === "will_not_clear" && (
                        <XCircle className="h-3 w-3" />
                      )}
                      {b.likelihood.replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="px-3.5 py-2.5 font-mono text-xs">
                    {b.bidPriceNeeded.isBidable ? (
                      <span className="text-foreground font-semibold">
                        {b.bidPriceNeeded.displayStatus}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">
                        {b.bidPriceNeeded.displayStatus}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-xs text-muted-foreground"
                >
                  No blocks match the selected filter. Try changing your search or switching to "Show All".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredAndSorted.length} of {blocks.length} 15-minute intervals
        </span>
        <span>
          {sureCount} Sure Clear · {likelyCount} Likely Clear · {blocks.length - sureCount - likelyCount} Other
        </span>
      </div>
    </div>
  );
};
