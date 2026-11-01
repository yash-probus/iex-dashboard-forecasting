import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlotKind } from "./recommendationMock";

export interface TodOption {
  value: string;
  label: string;
  window?: string;
  kind?: SlotKind;
}

interface TodSlotPickerProps {
  options: (TodOption | string)[];
  value: string;
  onChange: (v: string) => void;
  label: string;
  showIcon?: boolean;
}

const KIND_ACTIVE: Record<SlotKind, string> = {
  offpeak: "border-teal/40 bg-teal/10 text-teal",
  normal: "border-foreground/25 bg-muted text-foreground",
  peak: "border-negative/40 bg-negative/10 text-negative",
};

const KIND_DOT: Record<SlotKind, string> = {
  offpeak: "bg-teal",
  normal: "bg-muted-foreground",
  peak: "bg-negative",
};

function normalizeOption(o: TodOption | string): TodOption {
  if (typeof o !== "string") return o;

  // Pattern like: "Normal (1000 - 1900 Hrs)"
  const match = o.match(/^([^(]+)(?:\(([^)]+)\))?/);
  if (match) {
    const rawLabel = match[1].trim();
    const rawWindow = match[2] ? match[2].replace(/Hrs/i, "").trim().replace(/-/g, "–") : undefined;
    
    let kind: SlotKind | undefined = undefined;
    const lower = rawLabel.toLowerCase();
    if (lower.includes("off")) {
      kind = "offpeak";
    } else if (lower.includes("peak")) {
      kind = "peak";
    } else if (lower.includes("normal")) {
      kind = "normal";
    }

    return {
      value: o,
      label: rawLabel,
      window: rawWindow,
      kind,
    };
  }

  return { value: o, label: o };
}

export function TodSlotPicker({ options, value, onChange, label, showIcon }: TodSlotPickerProps) {
  const normalized = options.map(normalizeOption);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid gap-2", normalized.length === 3 ? "grid-cols-3" : "grid-cols-2")}
    >
      {normalized.map((o) => {
        const active = o.value.toLowerCase().trim() === value.toLowerCase().trim();
        const kind = o.kind;

        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "focus-ring flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.98] cursor-pointer",
              active
                ? kind
                  ? KIND_ACTIVE[kind]
                  : "border-primary-line bg-primary-soft text-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary-line hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {kind ? (
                <span className={cn("size-1.5 rounded-full shrink-0", KIND_DOT[kind])} />
              ) : (
                showIcon && <Clock className="size-3.5 shrink-0" />
              )}
              {o.label}
            </span>
            {o.window && (
              <span className="whitespace-nowrap font-mono text-[10px] opacity-80">
                {o.window}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
