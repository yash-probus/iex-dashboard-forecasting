import React, { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  STATES,
  TOD_MONTHS,
  TOD_SLOTS,
  VOLTAGES,
  type RecommendationInput,
} from "./recommendationMock";
import { PriceInput } from "./PriceInput";
import { TodSlotPicker, type TodOption } from "./TodSlotPicker";

interface ConfigPanelProps {
  value: RecommendationInput;
  onChange: (v: RecommendationInput) => void;
  onSubmit: () => void;
  onClear: () => void;
  loading: boolean;
  stateOptions?: string[];
  categoryOptions?: string[];
  voltageOptions?: string[];
  monthOptions?: (TodOption | string)[];
  slotOptions?: (TodOption | string)[];
}

function Section({ title, step, children }: { title: string; step: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-primary">{step}</span>
        <h3 className="label-caps">{title}</h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, help, children }: { label: string; htmlFor?: string; help?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
        {label}
      </label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

const triggerCls =
  "h-10 w-full bg-card border-border focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary text-foreground";

export function ConfigPanel({
  value,
  onChange,
  onSubmit,
  onClear,
  loading,
  stateOptions = STATES,
  categoryOptions = CATEGORIES,
  voltageOptions = VOLTAGES,
  monthOptions = TOD_MONTHS,
  slotOptions = TOD_SLOTS,
}: ConfigPanelProps) {
  const [stateOpen, setStateOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof RecommendationInput>(k: K, v: RecommendationInput[K]) =>
    onChange({ ...value, [k]: v });

  const priceError = !Number.isFinite(value.iexPrice)
    ? "Enter an IEX price."
    : value.iexPrice <= 0 || value.iexPrice > 10
      ? "Price must be between ₹0.01 and ₹10."
      : undefined;

  const valid = !priceError && !!value.state;

  const submit = () => {
    setTouched(true);
    if (valid && !loading) onSubmit();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog],[data-radix-popper-content-wrapper]")) {
        setTouched(false);
        onClear();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClear]);

  return (
    <TooltipProvider delayDuration={200}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="card-surface flex flex-col overflow-hidden lg:sticky lg:top-4 bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Configure</h2>
            <p className="text-xs text-muted-foreground">Inputs for the landed-cost comparison</p>
          </div>
          <span className="rounded-full border border-primary-line bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary">
            6 inputs
          </span>
        </div>

        <div className="space-y-8 p-6">
          <Section title="Consumer Profile" step="01">
            <Field label="State (Discom)" help="Determines tariff schedule and surcharges.">
              <Popover open={stateOpen} onOpenChange={setStateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={stateOpen}
                    className={cn(
                      "focus-ring flex items-center justify-between rounded-md border px-3 text-sm cursor-pointer",
                      triggerCls,
                    )}
                  >
                    <span className="truncate">{value.state || "Select state"}</span>
                    <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground ml-2" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Search state…" className="h-9" />
                    <CommandList className="max-h-60 overflow-y-auto">
                      <CommandEmpty>No state found.</CommandEmpty>
                      <CommandGroup>
                        {stateOptions.map((s) => (
                          <CommandItem
                            key={s}
                            value={s}
                            onSelect={() => {
                              set("state", s);
                              setStateOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "size-4 mr-2",
                                s === value.state ? "text-primary opacity-100" : "opacity-0",
                              )}
                            />
                            {s}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Consumer Category">
                <Select value={value.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className={triggerCls}>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c} className="cursor-pointer">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Voltage Level (kV)">
                <Select value={value.voltage} onValueChange={(v) => set("voltage", v)}>
                  <SelectTrigger className={cn(triggerCls, "font-mono")}>
                    <SelectValue placeholder="Voltage" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {voltageOptions.map((v) => (
                      <SelectItem key={v} value={v} className="font-mono cursor-pointer">
                        {v} kV
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Tariff Window" step="02">
            <Field label="TOD Month">
              <TodSlotPicker
                label="TOD Month"
                options={monthOptions}
                value={value.todMonth}
                onChange={(v) => set("todMonth", v)}
                showIcon
              />
            </Field>

            <Field label="TOD Slot" help="Peak slots carry a surcharge on the Discom tariff.">
              <TodSlotPicker
                label="TOD Slot"
                options={slotOptions}
                value={value.todSlot}
                onChange={(v) => set("todSlot", v)}
              />
            </Field>
          </Section>

          <Section title="Market Input" step="03">
            <Field label="IEX Price (₹/unit)" htmlFor="iex-price">
              <PriceInput
                value={value.iexPrice}
                onChange={(v) => set("iexPrice", v)}
                error={touched ? priceError : undefined}
              />
            </Field>
          </Section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-card/90 px-6 py-4 backdrop-blur">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setTouched(false);
                  onClear();
                }}
                className="active:scale-[0.98] cursor-pointer"
              >
                <RotateCcw className="size-4" /> Clear
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Reset to defaults <kbd className="ml-1 font-mono text-[10px] bg-muted px-1 rounded">Esc</kbd>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="submit"
                variant="premium"
                disabled={loading}
                className="px-5 cursor-pointer bg-gradient-primary text-white shadow-glow"
              >
                <Sparkles className="size-4" /> {loading ? "Analysing…" : "Get Recommendation"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Submit <kbd className="ml-1 font-mono text-[10px] bg-muted px-1 rounded">Enter</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </form>
    </TooltipProvider>
  );
}
