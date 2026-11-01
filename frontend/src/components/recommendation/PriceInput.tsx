import React from "react";
import { Minus, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { PRICE_QUICK_PICKS } from "./recommendationMock";
import { cn } from "@/lib/utils";

interface PriceInputProps {
  value: number;
  onChange: (v: number) => void;
  error?: string | undefined;
}

const clamp = (v: number) => Math.min(10, Math.max(0, +v.toFixed(2)));

export function PriceInput({ value, onChange, error }: PriceInputProps) {
  const step = (d: number) => onChange(clamp((Number.isFinite(value) ? value : 0) + d));

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex h-14 items-center rounded-lg border bg-card transition-shadow focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15",
          error && "border-negative focus-within:border-negative focus-within:ring-negative/15",
        )}
      >
        <span className="pl-4 font-mono text-lg text-muted-foreground select-none">₹</span>
        <input
          id="iex-price"
          type="number"
          inputMode="decimal"
          step={0.05}
          min={0}
          max={10}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
          className="h-full w-full min-w-0 bg-transparent px-2 font-mono text-2xl font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none text-foreground"
          aria-invalid={!!error}
          aria-describedby="iex-price-help"
        />
        <span className="pr-3 text-sm text-muted-foreground select-none">/kWh</span>
        <div className="flex h-full border-l border-border">
          <button
            type="button"
            onClick={() => step(-0.05)}
            aria-label="Decrease by 0.05"
            className="focus-ring grid w-11 place-items-center text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => step(0.05)}
            aria-label="Increase by 0.05"
            className="focus-ring grid w-11 place-items-center rounded-r-lg border-l border-border text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <Slider
        min={0}
        max={10}
        step={0.05}
        value={[Number.isFinite(value) ? value : 0]}
        onValueChange={([v]) => onChange(clamp(v ?? 0))}
        aria-label="IEX price slider"
        className="cursor-pointer"
      />
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>₹0</span>
        <span>₹5</span>
        <span>₹10</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRICE_QUICK_PICKS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "focus-ring rounded-full border px-3 py-1 font-mono text-xs transition active:scale-[0.98] cursor-pointer",
              value === p
                ? "border-primary-line bg-primary-soft text-primary font-semibold"
                : "text-muted-foreground border-border hover:border-primary-line hover:text-foreground",
            )}
          >
            ₹{p}
          </button>
        ))}
      </div>
      <p id="iex-price-help" className={cn("text-xs", error ? "text-negative" : "text-muted-foreground")}>
        {error ?? "Expected IEX clearing price (GDAM/DAM) for the selected slot."}
      </p>
    </div>
  );
}
