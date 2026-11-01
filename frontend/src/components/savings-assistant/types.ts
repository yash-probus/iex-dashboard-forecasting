export interface ParsedBillData {
  tod1: string;
  tod2: string;
  tod3: string;
  tod4: string;
  billAmount: string;
}

// OA Slot-level data from CSV
export interface OASlotData {
  deliveryDate: string;
  periodStart: string;
  periodEnd: string;
  qtyMw: number;
  rateMwh: number;
  amount: number;
}

// Parsed OA bill with aggregated data
export interface ParsedOABillData {
  slots: OASlotData[];
  totalMwh: number;
  totalSpend: number;
  totalUnits: number; // kWh
}

export interface FileMapping {
  id: string;
  file: File;
  detectedMonth: string;
  selectedMonth: string;
  fileType: "discom" | "oa";
  parsedData?: ParsedBillData;
  parsedOaData?: ParsedOABillData; // OA-specific parsed data
  hasDiscomBill?: boolean; // Visual indicator: DISCOM bill uploaded for this month
  hasOaBill?: boolean; // Visual indicator: OA bill uploaded for this month
}

// Merged month entry combining OA and DISCOM data
export interface MergedMonthEntry {
  monthISO: string;
  hasDiscomBill: boolean;
  hasOaBill: boolean;
  discomData?: ParsedBillData;
  oaData?: ParsedOABillData;
  totalKwh: number;
  totalBill: number;
}

export interface ManualMonthEntry {
  id: string;
  month: string;
  year?: number;
  tod1?: string;
  tod2?: string;
  tod3?: string;
  tod4?: string;
  billAmount: string;
  expanded: boolean;
  hasOaBill: boolean | undefined;
  oaFiles: File[];
  // New fields for UP HV-2 calculation
  avgDailyDemand?: string; // kVA or kW
  avgWorkingHours?: string; // Hours per day
  oaBillAmount?: string;
  // Peak demand fields for manual flow
  peakDemand?: string;
  peakDemandUnit?: string;
  isNew?: boolean;
  isEdited?: boolean;
  isLocked?: boolean;
  [key: string]: any; // Support for dynamic TOD and OA slots
}

export interface ConsumerMetadata {
  state: string;
  discom: string;
  category: string;
  voltageLevel: string;
  sanctionedLoad: string;
  usesOA?: any;
  isEditable?: boolean;
}

export interface PreviewItem {
  month: string;
  totalKwh: number;
  totalBill: number | null;
  oaFilesUploaded: number;
  oaTotalKwh: number;
}

export interface CalculationStep {
  id: number;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
}

export interface DayWiseData {
  day: string;
  date: string;
  actualPaid: number;
  proltSuggested: number;
  oaActual: number;
  discomActual: number;
  oaSuggested: number;
  discomSuggested: number;
}

export interface SlotDrilldownData {
  date: string;
  hour: number;
  block: number;
  interval: string;
  kwh: number;
  actualSource: string;
  actualCost: number;
  predOaPrice: number;
  recSource: string;
  recCost: number;
  slotSaving: number;
}

export interface InsightData {
  type: "peak-hours" | "peak-months" | "cost-consumption";
  title: string;
  description: string;
  suggestion: string;
}

export type FlowStep =
  | "welcome"
  | "upload"
  | "manual"
  | "preview"
  | "calculating"
  | "results";
