// Types, constants and calculation logic for Market Recommendation / Landed Cost Calculator

export type SlotKind = "offpeak" | "normal" | "peak";

export interface RecommendationInput {
  state: string;
  category: string;
  voltage: string;
  todMonth: string;
  todSlot: string;
  iexPrice: number;
}

export type Verdict = "BUY FROM IEX" | "PARTIAL SHIFT" | "STAY WITH DISCOM";

export interface CostComponent {
  label: string;
  note: string;
  value: number; // Rs./kWh
}

export interface LossComponent {
  label: string;
  pct: number;
}

export interface RecommendationResult {
  charges: CostComponent[]; // Open Access charges, Rs./kWh
  losses: LossComponent[]; // Open Access losses, %
  discomParts: CostComponent[]; // Energy, TOD, Fuel
  energyAtDrawal: number; // IEX price grossed up for losses
  verdict: Verdict;
  confidence: number; // 0-100
  reason: string;
  discomTariff: number;
  iexLanded: number;
  savingPerUnit: number;
  savingPct: number;
  breakdown: CostComponent[];
  generatedAt: string; // e.g. "08 Oct 2026"
}

export const STATES = [
  "Uttar Pradesh",
  "Maharashtra (MSEDCL)",
  "Gujarat",
  "Tamilnadu",
  "Karnataka (BESCOM)",
  "Rajasthan",
  "Madhya Pradesh",
  "Punjab",
  "Haryana",
  "Delhi (BRPL)",
  "Delhi (BYPL)",
  "Delhi (TPDDL)",
  "Telangana (SPDCL)",
  "Telangana (NPDCL)",
  "Andhra Pradesh (SPDCL)",
  "Andhra Pradesh (CPDCL)",
  "Andhra Pradesh (EPDCL)",
  "West Bengal",
  "Bihar",
  "Jharkhand",
  "Odisha (TPCODL)",
  "Odisha (TPWODL)",
  "Odisha (TPSODL)",
  "Odisha (TPNODL)",
  "Chhattisgarh",
  "Uttarakhand",
  "Himachal Pradesh",
  "Assam",
  "Goa",
  "Kerala",
  "Chandigarh",
  "Daman & Diu",
  "Dadar Nagar Haveli",
  "Maharashtra (BEST)",
  "Maharashtra (AEML)",
  "Maharashtra (TPC-D)",
  "Pondicherry",
  "Meghalaya",
  "Arunachal Pradesh"
];

export const CATEGORIES = ["Commercial", "Industrial", "Institutional", "Railway Traction"];
export const VOLTAGES = ["11", "33", "66", "132", "220"];

export const TOD_MONTHS = [
  { value: "Apr - Sept", label: "Apr – Sept" },
  { value: "Oct - Mar", label: "Oct – Mar" },
];

export const TOD_SLOTS: { value: string; label: string; window: string; kind: SlotKind }[] = [
  { value: "Off-peak (0400 - 1000 Hrs)", label: "Off-peak", window: "0400 – 1000", kind: "offpeak" },
  { value: "Normal (1000 - 1900 Hrs)", label: "Normal", window: "1000 – 1900", kind: "normal" },
  { value: "Peak (1900 - 0400 Hrs)", label: "Peak", window: "1900 – 0400", kind: "peak" },
];

export const PRICE_QUICK_PICKS = [3, 4, 5, 6];

export const DEFAULT_INPUT: RecommendationInput = {
  state: "Uttar Pradesh",
  category: "Commercial",
  voltage: "33",
  todMonth: "Apr - Sept",
  todSlot: "Normal (1000 - 1900 Hrs)",
  iexPrice: 4,
};

export function formatDate(d: Date): string {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return `${String(d.getDate()).padStart(2, "0")} ${m} ${d.getFullYear()}`;
}

const CATEGORY_BASE: Record<string, number> = {
  Commercial: 8.6,
  Industrial: 7.4,
  Institutional: 7.9,
  "Railway Traction": 7.1,
};

const SLOT_FACTOR: Record<string, number> = {
  offpeak: 0.85,
  normal: 1,
  peak: 1.2,
};

export function computeMockRecommendation(input: RecommendationInput): RecommendationResult {
  const base = CATEGORY_BASE[input.category] ?? 8.12;
  const voltageRebate = Math.min(Number(input.voltage) / 220, 1) * 0.6;
  const seasonAdj = input.todMonth.toLowerCase().includes("apr") ? 0.15 : 0;
  
  const slotKey = input.todSlot.toLowerCase().includes("peak") && !input.todSlot.toLowerCase().includes("off") 
    ? "peak" 
    : input.todSlot.toLowerCase().includes("off") 
      ? "offpeak" 
      : "normal";
  
  const discomTariff = +((base - voltageRebate + seasonAdj) * (SLOT_FACTOR[slotKey] ?? 1)).toFixed(2);

  const charges: CostComponent[] = [
    { label: "ISTS Charges", note: "Inter-state transmission", value: 0.51 },
    { label: "STU Charges", note: "State transmission", value: 0.23 },
    { label: "Wheeling Charges", note: "Discom network", value: Number(input.voltage) >= 66 ? 0.42 : 1.01 },
    { label: "Cross Subsidy Surcharge", note: "State regulator", value: 2.12 },
    { label: "Additional Surcharge", note: "Stranded capacity", value: 0 },
    { label: "Other Charges*", note: "NLDC, SLDC & exchange fee", value: 0.10 },
  ];

  const losses: LossComponent[] = [
    { label: "ISTS Losses", pct: 3.62 },
    { label: "STU Losses", pct: 3.18 },
    { label: "Wheeling Losses", pct: Number(input.voltage) >= 66 ? 0 : 3 },
  ];

  const lossFactor = losses.reduce((f, l) => f * (1 - l.pct / 100), 1);
  const energyAtDrawal = +(input.iexPrice / lossFactor).toFixed(2);
  
  const todCharge = slotKey === "peak" 
    ? +(discomTariff * 0.2).toFixed(2) 
    : slotKey === "offpeak" 
      ? -+(discomTariff * 0.15).toFixed(2) 
      : 0;
  const energyCharge = +(discomTariff - todCharge).toFixed(2);

  const discomParts: CostComponent[] = [
    { label: "Energy Charge", note: "", value: energyCharge },
    { label: "TOD Charge", note: "", value: todCharge },
    { label: "Fuel Surcharge", note: "", value: 0 },
  ];

  const breakdown: CostComponent[] = [
    { label: "Energy at drawal point", note: "IEX price grossed up for losses", value: energyAtDrawal },
    ...charges,
  ];

  const iexLanded = +breakdown.reduce((s, c) => s + c.value, 0).toFixed(2);
  const savingPerUnit = +(discomTariff - iexLanded).toFixed(2);
  const savingPct = +((savingPerUnit / discomTariff) * 100).toFixed(1);

  let verdict: Verdict;
  let reason: string;
  if (savingPct >= 8) {
    verdict = "BUY FROM IEX";
    reason = `Landed cost is ₹${savingPerUnit.toFixed(2)}/kWh below the Discom tariff — a durable margin after all charges.`;
  } else if (savingPct > 0) {
    verdict = "PARTIAL SHIFT";
    reason = `Thin ${savingPct}% advantage. Shift a portion of load to IEX and keep Discom as a hedge.`;
  } else {
    verdict = "STAY WITH DISCOM";
    reason = `IEX is ₹${Math.abs(savingPerUnit).toFixed(2)}/kWh costlier once surcharges and losses are landed.`;
  }
  const confidence = Math.round(Math.min(96, 58 + Math.abs(savingPct) * 1.8));

  return {
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
    breakdown,
    generatedAt: formatDate(new Date()),
  };
}

export const FOOTNOTES = [
  "* Other Charges has been assumed at 10 paise/unit comprising of NLDC charges, SLDC charges and exchange fee.",
  "** Discom Tariff is the energy charge applicable on consumer purchasing power from the distribution licensee.",
];

export const DISCLAIMER =
  "The Landed Cost Calculator (LCC) helps in assessing the indicative actual cost of electricity purchased from the IEX at a particular price point, considering overhead charges and losses applicable in an Open Access transaction. The LCC also provides an indicative per unit saving/ loss compared to discom tariff of the respective state. Open Access charges and losses at Inter-state and Intra-state level are as per the orders of CERC and respective SERCs, notified from time to time. IEX does not guaranty accuracy of the data used in LCC and shall not be liable for any loss arising out of decision based on LCC outcome.";
