// @ts-nocheck
import {
  Activity,
  ActivitySquare,
  BarChart3,
  Calendar,
  FileStack,
  Gauge,
  Hash,
  MapPin,
  Pin,
  Radio,
  Zap,
} from "lucide-react";
import BarCodeSvg from "@/assets/svgIcons/plot-meter-insights/Barcode.svg";
import StackSvg from "@/assets/svgIcons/plot-meter-insights/Stack.svg";
import MapPinSimpleSvg from "@/assets/svgIcons/plot-meter-insights/MapPinSimple.svg";
import { isAuthenticated } from "@/lib/auth";

export function getStateAndDiscomList(respone = []) {
  const stateMap = new Map(); // normalized state -> { label, value, discoms }

  respone?.forEach((d: any) => {
    if (!d || !d.state) return;
    
    const normalized = d.state.toUpperCase().replace(/_/g, ' ');
    const discoms = d.discomList || [];
    
    if (stateMap.has(normalized)) {
      const existing = stateMap.get(normalized);
      // Merge unique discoms based on 'discom' identifier
      const existingDiscomIds = new Set(existing.discoms.map((dc: any) => dc.discom));
      const newDiscoms = discoms.filter((dc: any) => !existingDiscomIds.has(dc.discom));
      existing.discoms = [...existing.discoms, ...newDiscoms];
      // Keep the nicer display name (prefer "Uttar Pradesh" over "UTTAR_PRADESH")
      if (d.displayName && !d.displayName.includes('_') && existing.value.includes('_')) {
         existing.value = d.displayName;
         existing.label = d.state;
      }
    } else {
      stateMap.set(normalized, {
        label: d.state,
        value: d.displayName || d.state,
        discoms: [...discoms]
      });
    }
  });

  const getStateList = Array.from(stateMap.values())
    .filter((entry: any) => entry.discoms.length > 0)
    .map((entry: any) => ({
      label: entry.label,
      value: entry.value,
    }));

  const getDiscomList = Array.from(stateMap.values()).reduce((acc: any, entry: any) => {
    acc[entry.label] = entry.discoms;
    return acc;
  }, {});

  return {
    getStateList,
    getDiscomList,
  };
}

export function formatMonthYear(value: string) {
  const date = new Date(value + "-01"); // day add karna padta hai
  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export const formatYYYYMM = (m: any) => {
  if (!m) return '-';
  const str = String(m);
  if (str.length === 6) {
    const year = str.substring(0, 4);
    const monthIndex = parseInt(str.substring(4, 6), 10) - 1;
    const date = new Date(Number(year), monthIndex);
    return date.toLocaleString('default', { month: 'short' }) + ' ' + year;
  }
  
  // fallback for older 1-12 format if any
  const num = Number(m);
  if (num >= 1 && num <= 12) {
      const date = new Date(2026, num - 1);
      return date.toLocaleString('default', { month: 'short' }) + ' 2026';
  }
  
  return str;
};

export const getBillingMonthStr = (m: any) => {
  if (!m) return '-';
  const str = String(m);
  if (str.length === 6) {
    const year = parseInt(str.substring(0, 4), 10);
    const monthIndex = parseInt(str.substring(4, 6), 10) - 1;
    const date = new Date(year, monthIndex - 1);
    return date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
  }
  
  const num = Number(m);
  if (num >= 1 && num <= 12) {
      const date = new Date(2026, num - 2);
      return date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
  }
  
  return str;
};

export const formatToTwoDecimals = (
  value: string | number,
  decimal: number = 2,
) => {
  const num = Number(value);

  if (isNaN(num) || num === 0) return "-";

  const str = num.toString();

  if (!str.includes(".")) return str; // no decimal

  const [intPart, decimalPart] = str.split(".");

  return decimalPart.length <= decimal
    ? str
    : `${intPart}.${decimalPart.slice(0, decimal)}`;
};

export const formatIndianNumber = (value?: number | string) => {
  const numValue = Number(value);
  if (value === undefined || value === null || isNaN(numValue)) return "-";

  const absNum = Math.abs(numValue);
  const sign = numValue < 0 ? "-" : "";

  if (absNum >= 10000000) {
    return sign + formatToTwoDecimals(absNum / 10000000) + "Cr";
  } else if (absNum >= 100000) {
    return sign + formatToTwoDecimals(absNum / 100000) + "L";
  } else if (absNum >= 1000) {
    return sign + formatToTwoDecimals(absNum / 1000) + "K";
  }
  return sign + absNum;
};

export const sortedData = (data: any[]) => {
  return [...data].sort((a, b) => {
    return a.tod.localeCompare(b.tod, undefined, { numeric: true });
  });
};

export const getYesterdayPeak = (data: any) => {
  if (!data?.length) return "-";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD
  const yesterdayData = data.find((item) => item.date === yesterdayStr);

  if (!yesterdayData || yesterdayData.peakKVA === 0) return "-";

  return formatIndianNumber(formatToTwoDecimals(yesterdayData.peakKVA));
};

export const getMetricBgColor = (statusValue, trendValue) => {
  const NEGATIVE_STATUS = ["ERROR", "WARN"];
  const POSITIVE_STATUS = ["SUCCESS", "STABLE", "EXCELLENT"];

  if (NEGATIVE_STATUS.includes(statusValue)) {
    return "bg-[#FFF1F1] text-[#C20000]";
  }

  if (POSITIVE_STATUS.includes(statusValue)) {
    return "bg-[#E3FFD1] text-[#378A00]";
  }

  if (statusValue === "FLUCTUATION") return "bg-[#FFF9E5] text-[#FFB134]";
  if (statusValue === "OVER_COMPENSATED")
    return "bg-orange-500/20 text-orange-500";

  const trend = Number(trendValue);

  if (trend > 0) return "bg-[#E3FFD1] text-[#378A00]";
  if (trend < 0) return "bg-[#FFF1F1] text-[#C20000]";

  return "";
};

export const PHASE_INSTANT_DATA = [
  {
    title: "Phase Voltage (V)",
    phaseKeyR: "phaseVoltage_R",
    phaseKeyY: "phaseVoltage_Y",
    phaseKeyB: "phaseVoltage_B",
  },
  {
    title: "Phase Current (A)",
    phaseKeyR: "phaseCurrent_R",
    phaseKeyY: "phaseCurrent_Y",
    phaseKeyB: "phaseCurrent_B",
  },
  {
    title: "Power Factor",
    phaseKeyR: "powerFactor_R",
    phaseKeyY: "powerFactor_Y",
    phaseKeyB: "powerFactor_B",
  },
];

export const METRIC_CARDS = [
  {
    key: "activePowerKw",
    title: "Active Power",
    value: "145.2",
    unit: "kW",
    icon: Activity,
    updatedAt: "just now",
    trend: {
      key: "deltaActivePowerKw",
      value: "2.4",
      isPositive: true,
    },
  },
  {
    key: "apparentPowerKva",
    title: "Apparent Power",
    value: "152.4",
    unit: "kVA",
    icon: Gauge,
    updatedAt: "just now",
    trend: {
      key: "deltaApparentPowerKva",
      value: "1.1",
      isPositive: false,
    },
  },
  {
    key: "reactivePowerKvar",
    title: "Reactive Power",
    value: "48.6",
    unit: "kVAr",
    icon: Activity,
    updatedAt: "just now",
    trend: {
      key: "deltaReactivePowerKvar",
      value: "1.8",
      isPositive: true,
    },
  },
  {
    key: "averagePowerFactor",
    title: "Avg. Power Factor",
    value: "0.9",
    min: -1,
    max: 1,
    unit: "",
    icon: Radio,
    updatedAt: "just now",
    status: {
      key: "averagePowerFactorStatus",
      label: "STABLE",
      type: "success",
    },
  },
  {
    key: "maxDemandKw",
    title: "Max Demand",
    value: "182",
    unit: "kVA",
    icon: Gauge,
  },
  {
    key: "frequency",
    title: "Frequency",
    value: "50.02",
    unit: "Hz",
    icon: Radio,
    status: {
      key: "frequencyStatus",
      label: "STABLE",
      type: "success",
    },
  },
];

export const METER_DETAILS = {
  topCard: [
    {
      title: "Meter Number",
      icon: Hash,
      key: "meterNumber",
    },
    {
      title: "Device Serial Number",
      icon: BarCodeSvg,
      key: "deviceSerialNumber",
    },
    {
      title: "Installation Voltage",
      icon: Zap,
      key: "voltageLevel",
    },
    {
      title: "Meter Phase",
      icon: StackSvg,
      key: "meterPhase",
    },
    {
      title: "Installation Date",
      icon: Calendar,
      key: "installationDate",
    },
  ],
  bottomCard: [
    {
      title: "Address",
      icon: MapPin,
      key: "address",
    },
    {
      title: "Latitude",
      icon: MapPinSimpleSvg,
      key: "latitude",
    },
    {
      title: "Longitude",
      icon: MapPinSimpleSvg,
      key: "longitude",
    },
  ],
};

export const POWER_QUALITY_DATA = [
  {
    title: "V-UNBAL",
    value: 1.2,
    unit: "%",
    key: "voltageUnbalance",
    statusKey: "voltageUnbalanceQualityStatus",
  },
  {
    title: "I-UNBAL",
    value: 2.4,
    unit: "%",
    key: "currentUnbalance",
    statusKey: "currentUnbalanceQualityStatus",
  },
  {
    title: "PWR AVAIL",
    value: 91.7,
    unit: "%",
    key: "powerAvailability",
    statusKey: "powerAvailabilityQualityStatus",
  },
];

export const toNumber = (value: unknown, fallback = null) => {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim(); // handle "2,500"
    const parsed = Number(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
};

const formatToCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
}); //** This will format the amount as ₹12,50,000.00 */
const formatToCompactCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 2,
}); //** This will format the amount as ₹1.3L */

export function formatToINRCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  return formatToCurrency.format(value);
}

export function formatToCompactINRCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  return formatToCompactCurrency.format(value);
}

export const getInitials = (name = "") => {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join("");
};

export const findMaxPeakSlotAndHighestTodCost = (data: any) => {
  let peakSlotData = null;

  const response = (Object.values(data || {}).flat(Infinity) as any[])
    .sort((a, b) => (a?.startTime || "").localeCompare(b?.startTime || ""))
    .sort((a, b) => (b?.energy || 0) - (a?.energy || 0));

  peakSlotData = {
    startTime: response[0]?.startTime,
    endTime: response[0]?.endTime,
    todId: response[0]?.todId,
    energy: response[0]?.energy,
  };

  return {
    peakSlotData,
  };
};

export const formatPowerValue = (value: number | string, baseUnit = "kW") => {
  if (value === undefined || value === null || value === "-" || value === "")
    return "-";
  const num = Number(value);
  if (isNaN(num)) return "-";

  if (num >= 1000) {
    let megaUnit = "MW";
    if (baseUnit === "kVAh") megaUnit = "MVAh";
    else if (baseUnit === "kWh") megaUnit = "MWh";
    else if (baseUnit.toLowerCase().startsWith("k")) {
      megaUnit = "M" + baseUnit.slice(1);
    }
    return `${formatToTwoDecimals(num / 1000)} ${megaUnit}`;
  }

  return `${formatToTwoDecimals(num)} ${baseUnit}`;
};

export const handleSignupClick = (routeName = "/") => {
  if (isAuthenticated()) {
    return routeName;
  } else {
    return `/login`;
  }
};

export async function downloadCsvWithUtf16Check(blob: Blob, filename: string) {
  let finalBlob = blob;
  try {
    const text = await blob.text();
    const hasSpecialChars = /[^\x00-\x7F]/.test(text);
    if (hasSpecialChars) {
      const BOM = "\uFEFF";
      finalBlob = new Blob([BOM + text], {
        type: "text/csv;charset=utf-8;",
      });
    }
  } catch (e) {
    console.error("Error processing CSV with UTF-16 check:", e);
  }

  const url = window.URL.createObjectURL(finalBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

