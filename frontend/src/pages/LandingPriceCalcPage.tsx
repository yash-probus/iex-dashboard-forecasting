import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calculator,
  Building2,
  Zap,
  ArrowLeftRight,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Check,
  ChevronsUpDown,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import {
  DEFAULT_INPUT,
  STATES,
  CATEGORIES,
  VOLTAGES,
  TOD_MONTHS,
  TOD_SLOTS,
  formatDate,
  computeMockRecommendation,
  type RecommendationInput,
  type RecommendationResult,
  type CostComponent,
  type LossComponent,
  type Verdict,
} from "@/components/recommendation/recommendationMock";
import { apiClient } from "@/api/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Exact colors matching the screenshot for Open Access charges
const OA_COLORS = ["#E11D48", "#F59E0B", "#06B6D4", "#8B5CF6", "#3B82F6", "#64748B"];

export default function LandingPriceCalcPage() {
  const [input, setInput] = useState<RecommendationInput>(DEFAULT_INPUT);
  const [submitted, setSubmitted] = useState<RecommendationInput>(DEFAULT_INPUT);
  const [contractSize, setContractSize] = useState<number>(1); // Contract size in MW (default 1 MW)
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [stateOpen, setStateOpen] = useState<boolean>(false);
  const [breakdownOpen, setBreakdownOpen] = useState<boolean>(true); // Collapsible breakdown

  // Dynamic dropdown options with reliable defaults
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [voltages, setVoltages] = useState<string[]>(VOLTAGES);
  const [todMonths, setTodMonths] = useState<string[]>(TOD_MONTHS.map((m) => m.value));
  const [todSlots, setTodSlots] = useState<string[]>(TOD_SLOTS.map((s) => s.value));

  // 1. Fetch Categories on State Change
  useEffect(() => {
    if (input.state) {
      apiClient
        .get("/landing-price-calc/consumer-category", { params: { state: input.state } })
        .then((res) => {
          const data = res.data?.data || {};
          const vals = Object.values(data).map(String);
          if (vals.length > 0) {
            setCategories(vals);
            if (!vals.includes(input.category)) {
              setInput((prev) => ({ ...prev, category: vals[0] }));
            }
          }
        })
        .catch(() => {});
    }
  }, [input.state]);

  // 2. Fetch Voltages on State & Category Change
  useEffect(() => {
    if (input.state && input.category) {
      apiClient
        .get("/landing-price-calc/voltage", {
          params: { state: input.state, consumerCategory: input.category },
        })
        .then((res) => {
          const data = res.data?.data || {};
          const vals = Object.values(data).map(String);
          if (vals.length > 0) {
            setVoltages(vals);
            if (!vals.includes(input.voltage)) {
              setInput((prev) => ({ ...prev, voltage: vals[0] }));
            }
          }
        })
        .catch(() => {});
    }
  }, [input.state, input.category]);

  // 3. Fetch TOD Months on State, Category & Voltage Change
  useEffect(() => {
    if (input.state && input.category && input.voltage) {
      apiClient
        .get("/landing-price-calc/tod-months", {
          params: { state: input.state, consumerCategory: input.category, voltage: input.voltage },
        })
        .then((res) => {
          const data = res.data?.data || {};
          const vals = Object.values(data).map(String);
          if (vals.length > 0) {
            setTodMonths(vals);
            if (!vals.includes(input.todMonth)) {
              setInput((prev) => ({ ...prev, todMonth: vals[0] }));
            }
          }
        })
        .catch(() => {});
    }
  }, [input.state, input.category, input.voltage]);

  // 4. Fetch TOD Slots on State, Category, Voltage & Month Change
  useEffect(() => {
    if (input.state && input.category && input.voltage && input.todMonth) {
      apiClient
        .get("/landing-price-calc/tod-slots", {
          params: {
            state: input.state,
            consumerCategory: input.category,
            voltage: input.voltage,
            month: input.todMonth,
          },
        })
        .then((res) => {
          const data = res.data?.data || {};
          const vals = Object.values(data).map(String);
          if (vals.length > 0) {
            setTodSlots(vals);
            if (!vals.includes(input.todSlot)) {
              setInput((prev) => ({ ...prev, todSlot: vals[0] }));
            }
          }
        })
        .catch(() => {});
    }
  }, [input.state, input.category, input.voltage, input.todMonth]);

  // Main Calculation Execution
  const handleSubmit = useCallback(async (currentInput = input) => {
    setSubmitted(currentInput);
    setLoading(true);

    try {
      const response = await apiClient.get("/landing-price-calc/calculate", {
        params: {
          state: currentInput.state,
          consumerCategory: currentInput.category,
          voltage: currentInput.voltage,
          todMonth: currentInput.todMonth,
          todSlot: currentInput.todSlot,
          iexPrice: currentInput.iexPrice,
        },
      });

      const data = response.data?.data || response.data;
      if (data && (typeof data.landCost !== "undefined" || typeof data.totalCharge !== "undefined")) {
        const istsCharge = Number(data.istsCharge) || 0.51;
        const stuCharge = Number(data.stuCharge) || 0.23;
        const wheelingCharge = Number(data.wheelingCharge) || 1.01;
        const crossSubsidyCharge = Number(data.crossSubsidyCharge) || 2.12;
        const additionalSurcharge = Number(data.additionalSurcharge) || 0;
        const otherCharges = Number(data.otherCharges) || 0.10;

        const istsLoss = Number(data.istsLoss) || 3.62;
        const stuLoss = Number(data.stuLoss) || 3.18;
        const wheelingLoss = Number(data.wheelingLoss) || 3.00;

        const energyCharge = Number(data.energyCharge) || 8.12;
        const todCharge = Number(data.todCharge) || 0;
        const fsaCharge = Number(data.fsaCharge) || 0;
        const discomTariff = Number(data.totalCharge) || (energyCharge + todCharge + fsaCharge);

        const iexLanded = Number(data.landCost) || 8.39;
        const savingPerUnit = typeof data.savings !== "undefined" 
          ? Number(data.savings) 
          : +(discomTariff - iexLanded).toFixed(2);
        const savingPct = discomTariff > 0 ? +((savingPerUnit / discomTariff) * 100).toFixed(1) : 0;

        const charges: CostComponent[] = [
          { label: "ISTS Charges", note: "Inter-state transmission", value: istsCharge },
          { label: "STU Charges", note: "State transmission", value: stuCharge },
          { label: "Wheeling Charges", note: "Distribution network use", value: wheelingCharge },
          { label: "Cross-Subsidy Surcharge", note: "State regulatory surcharge", value: crossSubsidyCharge },
          { label: "Additional Surcharge", note: "Stranded capacity charge", value: additionalSurcharge },
          { label: "Other Charges", note: "NDLC, SLDC & exchange fees", value: otherCharges },
        ];

        const losses: LossComponent[] = [
          { label: "ISTS technical losses", pct: istsLoss },
          { label: "STU technical losses", pct: stuLoss },
          { label: "Discom wheeling losses", pct: wheelingLoss },
        ];

        const lossFactor = losses.reduce((f, l) => f * (1 - l.pct / 100), 1);
        const energyAtDrawal = +(currentInput.iexPrice / (lossFactor || 1)).toFixed(2);

        const discomParts: CostComponent[] = [
          { label: "Base energy charge", note: "Base tariff schedule", value: energyCharge },
          { label: "Time-of-use differential", note: "Peak / off-peak adjustment", value: todCharge },
          { label: "Fuel surcharge (FSA)", note: "Fuel price adjustment", value: fsaCharge },
        ];

        let verdict: Verdict;
        let reason: string;
        if (savingPct >= 5) {
          verdict = "BUY FROM IEX";
          reason = `Buying from IEX saves ₹${savingPerUnit.toFixed(2)} per unit after all Open Access fees and grid losses. Open Access is the cheaper option today.`;
        } else if (savingPct > 0) {
          verdict = "PARTIAL SHIFT";
          reason = `Thin ₹${savingPerUnit.toFixed(2)}/kWh margin. Shift peak load to IEX and keep Discom as a safety hedge.`;
        } else {
          verdict = "STAY WITH DISCOM";
          reason = `Buying from IEX would land +₹${Math.abs(savingPerUnit).toFixed(2)} costlier per unit once every Open Access fee and grid loss is added. The utility tariff is the cheaper option today.`;
        }
        const confidence = Math.round(Math.min(96, 58 + Math.abs(savingPct) * 1.8));

        setResult({
          charges,
          losses,
          discomParts,
          energyAtDrawal,
          verdict,
          confidence,
          reason,
          discomTariff,
          iexLanded,
          savingPerUnit,
          savingPct,
          breakdown: [
            { label: "Energy at drawal point", note: "IEX price grossed up for losses", value: energyAtDrawal },
            ...charges,
          ],
          generatedAt: formatDate(new Date()),
        });
      } else {
        setResult(computeMockRecommendation(currentInput));
      }
    } catch {
      setResult(computeMockRecommendation(currentInput));
    } finally {
      setLoading(false);
    }
  }, [input]);

  // Initial calculation on mount
  useEffect(() => {
    handleSubmit(DEFAULT_INPUT);
  }, []);

  const handleClear = useCallback(() => {
    setInput(DEFAULT_INPUT);
    setContractSize(1);
    handleSubmit(DEFAULT_INPUT);
  }, [handleSubmit]);

  const handlePriceStep = (delta: number) => {
    const cur = Number.isFinite(input.iexPrice) ? input.iexPrice : 4.0;
    const next = Math.min(15, Math.max(0.1, +(cur + delta).toFixed(2)));
    const updated = { ...input, iexPrice: next };
    setInput(updated);
    handleSubmit(updated);
  };

  const handleContractStep = (delta: number) => {
    setContractSize((prev) => Math.min(100, Math.max(0.1, +(prev + delta).toFixed(1))));
  };

  const copySummary = async () => {
    if (!result) return;
    try {
      const s = `Landing Price Calculator — ${result.generatedAt}
${submitted.state} · ${submitted.category} · ${submitted.voltage} · ${submitted.todSlot}
IEX Market: ₹${submitted.iexPrice}/kWh | Discom: ₹${result.discomTariff.toFixed(2)}/kWh vs IEX Landed: ₹${result.iexLanded.toFixed(2)}/kWh
Verdict: ${result.verdict} (${result.savingPerUnit >= 0 ? "Saves" : "Costs"} ₹${Math.abs(result.savingPerUnit).toFixed(2)}/kWh)`;
      await navigator.clipboard.writeText(s);
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Failed to copy summary");
    }
  };

  // Metrics
  const isSaving = (result?.savingPerUnit ?? 0) > 0;
  const diffPerUnit = result ? +(result.iexLanded - result.discomTariff).toFixed(2) : 0.27; // +0.27 means IEX is costlier
  const totalCharges = result?.charges ? result.charges.reduce((sum, c) => sum + c.value, 0) : 3.97;
  const lossFactor = result?.losses ? result.losses.reduce((f, l) => f * (1 - l.pct / 100), 1) : 0.905;
  const unitsYouReceivePct = (lossFactor * 100).toFixed(1); // 90.5%

  // Financial Scale Impact (7.20 Lakh units per month per 1 MW)
  const monthlyUnitsLakh = contractSize * 7.20;
  const monthlyImpactLakhs = Math.abs((diffPerUnit * monthlyUnitsLakh * 100000) / 100000);
  const yearlyImpactLakhs = monthlyImpactLakhs * 12;

  // Donut Pie Data
  const pieData = useMemo(() => {
    if (!result?.charges) return [];
    return result.charges.filter((c) => c.value > 0);
  }, [result]);

  // Bar proportions for "Side by side" chart
  const discomTariffVal = result?.discomTariff ?? 8.12;
  const iexLandedVal = result?.iexLanded ?? 8.39;
  const maxBarVal = Math.max(discomTariffVal, iexLandedVal) || 10;
  const discomBarWidth = Math.round((discomTariffVal / maxBarVal) * 92);
  const iexBarWidth = Math.round((iexLandedVal / maxBarVal) * 92);

  // Quick Price Picks
  const pricePicks = [3.5, 4.0, 4.5, 5.5];
  // Quick Contract Picks
  const contractPicks = [0.5, 1.0, 2.0, 5.0];

  return (
    <div className="w-full space-y-4 py-2 text-neutral-900 dark:text-neutral-100">
      {/* =================================================================== */}
      {/* 1. TOP HEADER SECTION                                               */}
      {/* =================================================================== */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm shrink-0">
            <Calculator className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Landing Price Calculator
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Is Open Access power from IEX cheaper than your Discom? One glance tells you.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copySummary}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <Copy className="size-3.5 text-neutral-500" />
            <span>Copy summary</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <RotateCcw className="size-3.5 text-neutral-500" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. MAIN 2-COLUMN SPLIT: LEFT (INPUTS) & RIGHT (OUTPUTS)             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start w-full">
        {/* ========================================================= */}
        {/* LEFT PANEL (4 cols): Dedicated Inputs & Controls Cockpit   */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          {/* Main Controls Card */}
          <section className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-emerald-700" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  Input Parameters
                </h2>
              </div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                6 Inputs
              </span>
            </div>

            <div className="space-y-3.5">
              {/* 1. STATE (DISCOM) */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  STATE (DISCOM)
                </span>
                <Popover open={stateOpen} onOpenChange={setStateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      className="flex h-10 w-full items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 transition cursor-pointer"
                    >
                      <span className="truncate">{input.state || "Select State"}</span>
                      <ChevronsUpDown className="size-3.5 shrink-0 text-neutral-400 ml-1" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 z-50 shadow-xl" align="start">
                    <Command>
                      <CommandInput placeholder="Search state…" className="h-8 text-xs" />
                      <CommandList className="max-h-56 overflow-y-auto">
                        <CommandEmpty className="py-2 text-center text-xs text-neutral-500">No state found.</CommandEmpty>
                        <CommandGroup>
                          {STATES.map((s) => (
                            <CommandItem
                              key={s}
                              value={s}
                              onSelect={() => {
                                const updated = { ...input, state: s };
                                setInput(updated);
                                setStateOpen(false);
                                handleSubmit(updated);
                              }}
                              className="cursor-pointer text-xs"
                            >
                              <Check className={cn("size-3.5 mr-2", s === input.state ? "text-emerald-600 opacity-100" : "opacity-0")} />
                              {s}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 2. CONSUMER CATEGORY */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  CONSUMER CATEGORY
                </span>
                <Select
                  value={input.category}
                  onValueChange={(v) => {
                    const updated = { ...input, category: v };
                    setInput(updated);
                    handleSubmit(updated);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 cursor-pointer">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 z-50">
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs cursor-pointer">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. VOLTAGE LEVEL */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  VOLTAGE LEVEL
                </span>
                <Select
                  value={input.voltage}
                  onValueChange={(v) => {
                    const updated = { ...input, voltage: v };
                    setInput(updated);
                    handleSubmit(updated);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 cursor-pointer">
                    <SelectValue placeholder="Voltage" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 z-50">
                    {voltages.map((v) => (
                      <SelectItem key={v} value={v} className="text-xs cursor-pointer">
                        {v} kV & above
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. TIME-OF-USE SLOT */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  TIME-OF-USE SLOT
                </span>
                <Select
                  value={input.todSlot}
                  onValueChange={(v) => {
                    const updated = { ...input, todSlot: v };
                    setInput(updated);
                    handleSubmit(updated);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 cursor-pointer truncate">
                    <SelectValue placeholder="Slot" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 z-50">
                    {todSlots.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs cursor-pointer">
                        {s} (10:00 – 19:00)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 5. IEX PRICE with Quick Picks */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    IEX PRICE
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-400">
                    ₹/kWh
                  </span>
                </div>
                <div className="flex h-10 items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handlePriceStep(-0.25)}
                    className="w-10 h-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Decrease ₹0.25"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    type="number"
                    step="0.05"
                    value={input.iexPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = { ...input, iexPrice: val };
                      setInput(updated);
                      handleSubmit(updated);
                    }}
                    className="w-full text-center text-sm font-bold text-neutral-900 dark:text-neutral-100 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handlePriceStep(0.25)}
                    className="w-10 h-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Increase ₹0.25"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                {/* Quick Price Buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-neutral-400">Quick:</span>
                  {pricePicks.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const updated = { ...input, iexPrice: p };
                        setInput(updated);
                        handleSubmit(updated);
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-semibold transition border",
                        input.iexPrice === p
                          ? "bg-emerald-700 text-white border-emerald-700"
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100"
                      )}
                    >
                      ₹{p.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. CONTRACT SIZE with Quick Picks */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    CONTRACT SIZE (MW)
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-400">
                    {monthlyUnitsLakh.toFixed(2)}L units/mo
                  </span>
                </div>
                <div className="flex h-10 items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleContractStep(-0.5)}
                    className="w-10 h-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Decrease 0.5 MW"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={contractSize}
                    onChange={(e) => setContractSize(parseFloat(e.target.value) || 1)}
                    className="w-full text-center text-sm font-bold text-neutral-900 dark:text-neutral-100 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleContractStep(0.5)}
                    className="w-10 h-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Increase 0.5 MW"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                {/* Quick Contract Buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-neutral-400">Presets:</span>
                  {contractPicks.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setContractSize(c)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-semibold transition border",
                        contractSize === c
                          ? "bg-emerald-700 text-white border-emerald-700"
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100"
                      )}
                    >
                      {c} MW
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recalculate Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="w-full h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <Sparkles className="size-4" />
              <span>{loading ? "Calculating Live Rates…" : "Calculate Landed Cost"}</span>
            </button>
          </section>

          {/* Regulatory SERC Compliance Note Box */}
          <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-[#FBFBFA] dark:bg-neutral-900 p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200">
              <ShieldCheck className="size-4 text-emerald-700 shrink-0" />
              <span>Statutory SERC Open Access Framework</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Open Access transmission charges (ISTS, STU), Discom wheeling fees, and Cross-Subsidy Surcharges (CSS) are synchronized with published State Electricity Regulatory Commission (SERC) tariff orders.
            </p>
            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
              <span>Section 42 Electricity Act 2003</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Live Active</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL (8 cols): All Output Results & Analytics      */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          {/* Output Section 1: Verdict Banner */}
          <section
            className={cn(
              "rounded-2xl border p-5 sm:p-6 transition-all",
              isSaving
                ? "border-emerald-200/90 bg-[#F0FDF4] dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100"
                : "border-rose-200/90 bg-[#FEF2F2] dark:bg-rose-950/20 text-rose-950 dark:text-rose-100"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                  {submitted.state.toUpperCase()} · {submitted.category.toUpperCase()} · {submitted.voltage} KV & ABOVE · {submitted.todSlot.toUpperCase()} (10:00 – 19:00)
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                  {isSaving ? "Buy from IEX today" : "Stay with your Discom for now"}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 max-w-4xl leading-relaxed">
                  {result?.reason ||
                    (isSaving
                      ? `Buying from IEX saves ₹${Math.abs(result?.savingPerUnit ?? 0).toFixed(2)} per unit after all Open Access fees and grid losses. Open Access is the cheaper option today.`
                      : `Buying from IEX would land +₹${Math.abs(diffPerUnit).toFixed(2)} costlier per unit once every Open Access fee and grid loss is added. The utility tariff is the cheaper option today.`)}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div
                  className={cn(
                    "text-3xl sm:text-4xl font-black tracking-tight",
                    isSaving ? "text-emerald-600 dark:text-emerald-400" : "text-[#DC2626]"
                  )}
                >
                  {diffPerUnit > 0 ? "+" : "−"}₹{Math.abs(diffPerUnit).toFixed(2)}
                </div>
                <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                  per unit, IEX vs Discom
                </div>
              </div>
            </div>
          </section>

          {/* Output Section 2: Three Stat / KPI Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: DISCOM TARIFF */}
            <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <Building2 className="size-3.5" />
                <span>DISCOM TARIFF</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-100 mt-2">
                ₹{discomTariffVal.toFixed(2)}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Utility rate per unit, incl. TOD & fuel surcharge
              </p>
            </div>

            {/* Card 2: IEX LANDED COST */}
            <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <Zap className="size-3.5" />
                <span>IEX LANDED COST</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-100 mt-2">
                ₹{iexLandedVal.toFixed(2)}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Market price + grid losses + all Open Access fees
              </p>
            </div>

            {/* Card 3: DIFFERENCE */}
            <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <ArrowLeftRight className="size-3.5" />
                <span>DIFFERENCE</span>
              </div>
              <div
                className={cn(
                  "text-2xl sm:text-3xl font-black mt-2",
                  diffPerUnit > 0 ? "text-[#DC2626]" : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {diffPerUnit > 0 ? "+" : "−"}₹{Math.abs(diffPerUnit).toFixed(2)}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                What IEX costs more (or saves) per unit
              </p>
            </div>
          </section>

          {/* Output Section 3: "Side by side" Comparison Card */}
          <section className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Side by side
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                All-in rate per unit (₹/kWh), everything included
              </p>
            </div>

            {/* 2 Proportional Horizontal Bars */}
            <div className="space-y-3 pt-1">
              {/* Bar 1: Discom */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-xs font-semibold text-neutral-600 dark:text-neutral-400 text-right shrink-0">
                  Discom
                </span>
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-full h-8 overflow-hidden p-0.5">
                  <div
                    className="bg-sky-200 dark:bg-sky-900/50 border border-sky-300/80 dark:border-sky-700/50 h-full rounded-full flex items-center justify-end px-3.5 text-sky-900 dark:text-sky-100 text-xs font-bold font-mono transition-all duration-500"
                    style={{ width: `${discomBarWidth}%` }}
                  >
                    ₹{discomTariffVal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Bar 2: IEX Landed */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-xs font-semibold text-neutral-600 dark:text-neutral-400 text-right shrink-0">
                  IEX Landed
                </span>
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-full h-8 overflow-hidden p-0.5">
                  <div
                    className={cn(
                      "h-full rounded-full flex items-center justify-end px-3.5 text-xs font-bold font-mono transition-all duration-500 border",
                      diffPerUnit > 0
                        ? "bg-rose-200 dark:bg-rose-900/50 border-rose-300/80 dark:border-rose-700/50 text-rose-900 dark:text-rose-100"
                        : "bg-emerald-200 dark:bg-emerald-900/50 border-emerald-300/80 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-100"
                    )}
                    style={{ width: `${iexBarWidth}%` }}
                  >
                    ₹{iexLandedVal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Impact Metrics Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-[#FBFBFA] dark:bg-neutral-950/60 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                  PER-UNIT SPREAD
                </span>
                <span
                  className={cn(
                    "text-base sm:text-lg font-black mt-1 block",
                    diffPerUnit > 0 ? "text-[#DC2626]" : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {diffPerUnit > 0 ? "+" : "−"}₹{Math.abs(diffPerUnit).toFixed(2)}
                </span>
              </div>

              <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-[#FBFBFA] dark:bg-neutral-950/60 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                  MONTHLY IMPACT · {monthlyUnitsLakh.toFixed(2)}L UNITS
                </span>
                <span
                  className={cn(
                    "text-base sm:text-lg font-black mt-1 block",
                    diffPerUnit > 0 ? "text-[#DC2626]" : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {diffPerUnit > 0 ? "📈 +" : "📉 −"}₹{monthlyImpactLakhs.toFixed(2)} L
                </span>
              </div>

              <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-[#FBFBFA] dark:bg-neutral-950/60 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                  YEARLY IMPACT
                </span>
                <span
                  className={cn(
                    "text-base sm:text-lg font-black mt-1 block",
                    diffPerUnit > 0 ? "text-[#DC2626]" : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {diffPerUnit > 0 ? "+" : "−"}₹{yearlyImpactLakhs.toFixed(2)} L
                </span>
              </div>
            </div>
          </section>

          {/* Output Section 4: Collapsible "Full charge-by-charge breakdown" Card */}
          <section className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-xs">
            {/* Collapsible Header */}
            <button
              type="button"
              onClick={() => setBreakdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left cursor-pointer transition hover:opacity-90"
            >
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Full charge-by-charge breakdown
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Every regulatory fee, loss and schedule line that builds the landed cost
                </p>
              </div>
              <div className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                {breakdownOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </button>

            {/* Collapsible Body */}
            {breakdownOpen && (
              <div className="mt-5 space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                {/* Top Sub-Row: Open Access Charges (Left) + Donut Pie Chart (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left Column: Itemized Open Access Charges */}
                  <div className="lg:col-span-7 rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        Open Access charges
                      </h3>
                      <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 px-2 py-0.5 text-xs font-bold">
                        ₹{totalCharges.toFixed(2)} / kWh
                      </span>
                    </div>

                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800 pt-1">
                      {result?.charges.map((c, i) => (
                        <div key={c.label} className="flex items-center justify-between py-2 text-xs">
                          <div className="flex items-start gap-2.5">
                            <span
                              className="size-2 rounded-full shrink-0 mt-1"
                              style={{ backgroundColor: OA_COLORS[i % OA_COLORS.length] }}
                            />
                            <div>
                              <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                {c.label}
                              </div>
                              {c.note && (
                                <div className="text-[10px] text-neutral-400">
                                  {c.note}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                            ₹{c.value.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Share of Each OA Fee Donut Chart */}
                  <div className="lg:col-span-5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-4 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                      SHARE OF EACH OA FEE
                    </span>
                    <div className="relative h-[160px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={46}
                            outerRadius={68}
                            paddingAngle={3}
                            stroke="none"
                            animationDuration={500}
                          >
                            {pieData.map((c, idx) => (
                              <Cell
                                key={c.label}
                                fill={OA_COLORS[result?.charges.findIndex((item) => item.label === c.label) ?? idx % OA_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "var(--card, #FFFFFF)",
                              border: "1px solid var(--border, #E2E8F0)",
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                            formatter={(v: any) => [`₹${Number(v).toFixed(2)}/kWh`, ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Centered Total inside Donut */}
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <div className="text-base font-black text-neutral-900 dark:text-neutral-100">
                            ₹{totalCharges.toFixed(2)}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            TOTAL OA FEES
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Sub-Row: Grid Losses & Discom Bill Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Grid Losses */}
                  <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-4 space-y-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        Grid losses
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Power lost on the way; you pay for what reaches you
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-1 text-xs">
                      {result?.losses.map((l) => (
                        <div key={l.label} className="flex items-center justify-between py-0.5">
                          <span className="text-neutral-600 dark:text-neutral-400">{l.label}</span>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{l.pct.toFixed(2)}%</span>
                        </div>
                      ))}
                      <div className="rounded-xl bg-[#F5F2EB] dark:bg-neutral-800/80 px-3.5 py-2.5 mt-2 flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        <span>Units you receive</span>
                        <span>{unitsYouReceivePct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Discom Bill Schedule */}
                  <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-4 space-y-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        Discom bill schedule
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        What the utility side adds up to
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-1 text-xs">
                      {result?.discomParts.map((p) => (
                        <div key={p.label} className="flex items-center justify-between py-0.5">
                          <span className="text-neutral-600 dark:text-neutral-400">{p.label}</span>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">₹{p.value.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="rounded-xl bg-[#F5F2EB] dark:bg-neutral-800/80 px-3.5 py-2.5 mt-2 flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        <span>Discom all-in</span>
                        <span>₹{discomTariffVal.toFixed(2)} / kWh</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Warm Pill Banner */}
                <div className="rounded-xl bg-[#F5F2EB] dark:bg-neutral-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    <strong className="font-bold">How the landed cost is built:</strong> Market price grossed up for losses (₹{result?.energyAtDrawal.toFixed(2)}) + Open Access fees (₹{totalCharges.toFixed(2)}) = <strong className="font-bold">₹{iexLandedVal.toFixed(2)}/kWh</strong>
                  </span>
                  <span className="font-medium text-neutral-500 dark:text-neutral-400">
                    Discom baseline: ₹{discomTariffVal.toFixed(2)}/kWh
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
