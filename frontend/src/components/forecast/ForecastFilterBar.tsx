import React from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MODELS, type Interval } from "./mockData";

interface ForecastFilterBarProps {
  date: string;
  onDate: (d: string) => void;
  model: string;
  onModel: (m: string) => void;
  interval: Interval;
  onInterval: (i: Interval) => void;
  scrolled: boolean;
  availableDates?: string[];
  maxDate?: Date | null;
  minDate?: Date | null;
  market?: string;
}

const INTERVALS: { id: Interval; label: string }[] = [
  { id: "15m", label: "15m" },
  { id: "30m", label: "30m" },
  { id: "1h", label: "1h" },
];

export function ForecastFilterBar({
  date,
  onDate,
  model,
  onModel,
  interval,
  onInterval,
  scrolled,
  availableDates,
  maxDate,
  minDate,
  market,
}: ForecastFilterBarProps) {
  const modelsList = React.useMemo(() => {
    if (market?.toUpperCase() === "RTM") {
      return MODELS.filter((m) => m.id !== "3");
    }
    return MODELS;
  }, [market]);

  let parsedDate = new Date();
  try {
    const d = parseISO(date);
    if (!isNaN(d.getTime())) parsedDate = d;
  } catch {
    // fallback to today
  }

  const shift = (n: number) => {
    const nextDateStr = format(addDays(parsedDate, n), "yyyy-MM-dd");
    if (availableDates && availableDates.length > 0) {
      if (!availableDates.includes(nextDateStr)) return;
    } else if (maxDate && n > 0 && addDays(parsedDate, n) > maxDate) {
      return;
    }
    onDate(nextDateStr);
  };

  const nextDateStr = format(addDays(parsedDate, 1), "yyyy-MM-dd");
  const prevDateStr = format(addDays(parsedDate, -1), "yyyy-MM-dd");
  const canShiftNext = availableDates && availableDates.length > 0
    ? availableDates.includes(nextDateStr)
    : maxDate ? addDays(parsedDate, 1) <= maxDate : true;
  const canShiftPrev = availableDates && availableDates.length > 0
    ? availableDates.includes(prevDateStr)
    : minDate ? addDays(parsedDate, -1) >= minDate : true;

  return (
    <div className={cn("glass sticky top-0 z-30 -mx-4 mb-6 border-y px-4 py-3 transition-shadow duration-300 md:-mx-8 md:px-8 bg-card/80 backdrop-blur-md", scrolled && "shadow-bar")}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Field label="Forecast date">
          <div className="flex items-center rounded-lg border bg-card">
            <button
              onClick={() => canShiftPrev && shift(-1)}
              disabled={!canShiftPrev}
              className={cn("p-2 transition-colors cursor-pointer", canShiftPrev ? "text-muted-foreground hover:text-foreground" : "opacity-30 cursor-not-allowed")}
              aria-label="Previous day"
              title="Previous day (←)"
            >
              <ChevronLeft className="size-4" />
            </button>
            <Popover>
              <PopoverTrigger className="flex items-center gap-2 border-x px-3 py-1.5 text-[13px] font-medium num cursor-pointer text-foreground bg-transparent border-border">
                <CalendarIcon className="size-3.5 text-muted-foreground" />
                {format(parsedDate, "dd MMM yyyy")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={parsedDate}
                  onSelect={(x: Date | undefined) => x && onDate(format(x, "yyyy-MM-dd"))}
                  disabled={(d) => {
                    const dStr = format(d, "yyyy-MM-dd");
                    if (maxDate && d > maxDate) return true;
                    if (minDate && d < minDate) return true;
                    if (availableDates && availableDates.length > 0) {
                      return !availableDates.includes(dStr);
                    }
                    return false;
                  }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => canShiftNext && shift(1)}
              disabled={!canShiftNext}
              className={cn("p-2 transition-colors cursor-pointer", canShiftNext ? "text-muted-foreground hover:text-foreground" : "opacity-30 cursor-not-allowed")}
              aria-label="Next day"
              title="Next day (→)"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </Field>

        <Field label="Model">
          <Select value={model} onValueChange={onModel}>
            <SelectTrigger className="h-[34px] w-[210px] bg-card text-[13px] text-foreground border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {modelsList.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: m.color }} />
                    <span className="font-medium">{m.name}</span>
                    <span className="num text-[11px] text-muted-foreground ml-1">MAPE {m.mape}%</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Interval">
          <div role="radiogroup" className="flex rounded-lg border bg-surface-2 p-0.5">
            {INTERVALS.map((i) => (
              <button
                key={i.id}
                role="radio"
                aria-checked={interval === i.id}
                onClick={() => onInterval(i.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold num transition-all duration-200 cursor-pointer",
                  interval === i.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {i.label}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="label-caps hidden sm:inline">{label}</span>
      {children}
    </div>
  );
}
