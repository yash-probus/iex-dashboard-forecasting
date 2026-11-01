import React from "react";
import { Table, Zap, CheckCircle2, ChevronRight, BarChart2 } from "lucide-react";
import type { PriceLadderRow, BidType } from "../clearFinderCalculations";

interface ClearFinderPriceLadderProps {
  ladder: PriceLadderRow[];
  selectedPrice: number;
  bidType: BidType;
  onSelectPrice: (price: number) => void;
}

export const ClearFinderPriceLadder: React.FC<ClearFinderPriceLadderProps> = ({
  ladder,
  selectedPrice,
  bidType,
  onSelectPrice,
}) => {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Price Ladder (Preset Sensitivity)
              <span className="text-[11px] font-normal text-muted-foreground">
                — Click any row to preview clearing certainty
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Evaluates clearing certainty at standard benchmark prices across all 96 blocks.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-muted-foreground">Active Price: </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/80 px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
            ₹{selectedPrice.toFixed(2)} / kWh
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/50 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-3.5 py-2.5">Preset Price</th>
              <th className="px-3.5 py-2.5 text-center text-emerald-600 dark:text-emerald-400">
                Sure Clear (🟢)
              </th>
              <th className="px-3.5 py-2.5 text-center text-sky-600 dark:text-sky-400">
                Likely Clear (🔵)
              </th>
              <th className="px-3.5 py-2.5 text-center text-amber-600 dark:text-amber-400">
                Risky (🟡)
              </th>
              <th className="px-3.5 py-2.5 text-center text-rose-600 dark:text-rose-400">
                Will Not Clear (🔴)
              </th>
              <th className="px-3.5 py-2.5 text-center font-bold">
                Total Bid-able (Sure + Likely)
              </th>
              <th className="px-3.5 py-2.5 w-36">Clearing Distribution</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-medium">
            {ladder.map((row) => {
              const isSelected = Math.abs(row.price - selectedPrice) < 0.001;
              return (
                <tr
                  key={row.price}
                  onClick={() => onSelectPrice(row.price)}
                  className={`cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? "bg-accent/40 font-semibold shadow-inner"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground">
                        ₹{row.price.toFixed(2)}
                      </span>
                      {isSelected && (
                        <span className="rounded bg-teal-500/20 px-1.5 py-0.2 text-[9px] font-bold text-teal-600 dark:text-teal-400">
                          Selected
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-3.5 py-2.5 text-center">
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {row.sureClearCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({row.sureClearPct}%)
                    </span>
                  </td>

                  <td className="px-3.5 py-2.5 text-center">
                    <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                      {row.likelyClearCount}
                    </span>
                  </td>

                  <td className="px-3.5 py-2.5 text-center">
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {row.riskyCount}
                    </span>
                  </td>

                  <td className="px-3.5 py-2.5 text-center">
                    <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {row.willNotClearCount}
                    </span>
                  </td>

                  <td className="px-3.5 py-2.5 text-center font-bold">
                    <span className="text-xs text-foreground">
                      {row.totalBidableCount} / 96
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({row.bidablePct}%)
                    </span>
                  </td>

                  <td className="px-3.5 py-2.5">
                    {/* Mini proportional bar chart */}
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${(row.sureClearCount / 96) * 100}%` }}
                        title={`Sure Clear: ${row.sureClearCount}`}
                      />
                      <div
                        className="bg-sky-500"
                        style={{ width: `${(row.likelyClearCount / 96) * 100}%` }}
                        title={`Likely Clear: ${row.likelyClearCount}`}
                      />
                      <div
                        className="bg-amber-500"
                        style={{ width: `${(row.riskyCount / 96) * 100}%` }}
                        title={`Risky: ${row.riskyCount}`}
                      />
                      <div
                        className="bg-rose-500"
                        style={{ width: `${(row.willNotClearCount / 96) * 100}%` }}
                        title={`Will Not Clear: ${row.willNotClearCount}`}
                      />
                    </div>
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        isSelected
                          ? "bg-teal-600 text-white dark:bg-teal-500"
                          : "border border-border/80 text-foreground hover:bg-accent"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPrice(row.price);
                      }}
                    >
                      {isSelected ? "Active" : "Apply"}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
