// @ts-nocheck
import { MonthEntry } from "@/lib/calculatorUtils";
import { monthNames } from "./constant";

interface TodResponse {
  id: number;
  month: string; // "MAY"
  year: number; // 2026
  todConsumptionList: {
    tod: string;
    discomOaConsumption: number;
    oaConsumption: number;
  }[];
  // tod: "TOD_1" | "TOD_2" | "TOD_3" | "TOD_4";
  consumption: number;
  totalDiscomOaBill: number;
  totalOaBill?: number;
  peakDemand: number;
}

export function transformToPayload(data: any, metadata: any) {
  return data.map((item) => {
    // Parse month string (format: "YYYY-MM")
    const [yearStr, monthStr] = item?.month?.split("-") ??
      item?.monthISO?.split("-") ?? ["", ""];

    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr);
    const monthName = monthNames[monthNum - 1];
    const peakDemand = Number(item?.peakDemand);

    const todDataMap = new Map<
      string,
      { tod: string; discom: number; oa: number }
    >();

    // Scan for all TOD keys (tod1, tod2, ..., todN and oaTod1, oaTod2, ..., oaTodN)
    Object.keys(item).forEach((key) => {
      const discomMatch = key.match(/^tod(\d+)(Discom)?$/i);
      const oaMatch = key.match(/^(oaTod|tod)(\d+)Oa$/i);

      if (discomMatch && !key.toLowerCase().endsWith("oa")) {
        const id = discomMatch[1];
        const val = parseFloat(item[key]) || 0;
        if (!todDataMap.has(id))
          todDataMap.set(id, { tod: `TOD_${id}`, discom: 0, oa: 0 });
        todDataMap.get(id)!.discom = val;
      } else if (oaMatch) {
        const id = oaMatch[2];
        const val = parseFloat(item[key]) || 0;
        if (!todDataMap.has(id))
          todDataMap.set(id, { tod: `TOD_${id}`, discom: 0, oa: 0 });
        todDataMap.get(id)!.oa = val;
      }
    });

    // Create todConsumptionList array with non-zero values
    const todConsumptionList = Array.from(todDataMap.values())
      .filter((t) => t.discom > 0 || t.oa > 0)
      .map((t) => ({
        tod: t.tod,
        discomOaConsumption: t.discom,
        oaConsumption: metadata?.usesOA ? t.oa : 0,
      }));

    // Return formatted object
    return {
      month: monthName,
      year: year,
      totalDiscomOaBill: parseFloat(item.billAmount) || 0,
      totalOaBill: parseFloat(item?.oaBillAmount) || 0,
      todConsumptionList: todConsumptionList,
      peakDemand,
      oaConsumptionSlotWise: [],
    };
  });
}

export function buildMonthEntry(data: TodResponse[]): MonthEntry[] {
  if (!data || data.length === 0) return [];

  // Month-wise grouping
  const monthMap = new Map<
    string,
    {
      month: string;
      year: number;
      tod1: string;
      tod2: string;
      tod3: string;
      tod4: string;
      billAmount: number;
      peakDemand: number;
    }
  >();

  // Group data by month and year
  data.forEach((item) => {
    const key = `${item.month}-${item.year}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: item.month,
        year: item.year,
        tod1: "0",
        tod2: "0",
        tod3: "0",
        tod4: "0",
        billAmount: item.totalDiscomBill,
        peakDemand: item.peakDemand,
      });
    }

    const monthData = monthMap.get(key)!;

    item.todConsumptionList.forEach((todItem) => {
      switch (todItem.tod) {
        case "TOD_1":
          monthData.tod1 = todItem.discomConsumption.toString();
          break;

        case "TOD_2":
          monthData.tod2 = todItem.discomConsumption.toString();
          break;

        case "TOD_3":
          monthData.tod3 = todItem.discomConsumption.toString();
          break;

        case "TOD_4":
          monthData.tod4 = todItem.discomConsumption.toString();
          break;
      }
    });
  });

  // Convert month names to month numbers
  const monthNames: Record<string, string> = {
    JANUARY: "01",
    FEBRUARY: "02",
    MARCH: "03",
    APRIL: "04",
    MAY: "05",
    JUNE: "06",
    JULY: "07",
    AUGUST: "08",
    SEPTEMBER: "09",
    OCTOBER: "10",
    NOVEMBER: "11",
    DECEMBER: "12",
  };

  // Create MonthEntry array from grouped data
  const monthEntries: MonthEntry[] = Array.from(monthMap.entries()).map(
    ([key, monthData], index) => {
      const monthNumber = monthNames[monthData.month.toUpperCase()] || "01";
      const monthISO = `${monthData.year}-${monthNumber}`;

      return {
        id: `${key}-${index}`,
        monthISO: monthISO,
        expanded: false,
        billAmount: monthData.billAmount.toString(),
        tod1: monthData.tod1,
        tod2: monthData.tod2,
        tod3: monthData.tod3,
        tod4: monthData.tod4,
        peakDemand: monthData.peakDemand,
      };
    },
  );

  return monthEntries;
}

export function buildMonthEntryV2(data: TodResponse[]): MonthEntry[] {
  if (!data || data.length === 0) return [];

  const monthMap = new Map<
    string,
    {
      month: string;
      year: number;
      billAmount: number;
      oaBillAmount: number;
      peakDemand: number;
      tods: Record<string, string | number>;
    }
  >();

  data.forEach((item) => {
    const key = `${item.month}-${item.year}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: item.month,
        year: item.year,
        billAmount: item.totalDiscomOaBill,
        oaBillAmount: item.totalOaBill ?? 0,
        peakDemand: item.peakDemand,
        tods: {},
      });
    }

    const monthData = monthMap.get(key)!;

    item.todConsumptionList.forEach((todItem) => {
      // TOD_1 -> 1
      const slot = todItem.tod.split("_")[1];

      const discomKey = `tod${slot}Discom`;
      const oaKey = `tod${slot}Oa`;

      monthData.tods[discomKey] = todItem.discomOaConsumption ?? 0;
      monthData.tods[oaKey] = todItem.oaConsumption ?? 0;
    });
  });

  const monthNames: Record<string, string> = {
    JANUARY: "01",
    FEBRUARY: "02",
    MARCH: "03",
    APRIL: "04",
    MAY: "05",
    JUNE: "06",
    JULY: "07",
    AUGUST: "08",
    SEPTEMBER: "09",
    OCTOBER: "10",
    NOVEMBER: "11",
    DECEMBER: "12",
  };

  const monthEntries: MonthEntry[] = Array.from(monthMap.entries()).map(
    ([key, monthData], index) => {
      const monthNumber = monthNames[monthData.month.toUpperCase()] || "01";
      const monthISO = `${monthData.year}-${monthNumber}`;

      return {
        id: `${key}-${index}`,
        monthISO,
        expanded: false,
        billAmount: monthData.billAmount.toString(),
        oaBillAmount:
          monthData.oaBillAmount > 0 ? monthData.oaBillAmount.toString() : "",
        peakDemand: monthData.peakDemand,
        ...monthData.tods, // dynamic tod values
        peakDemandUnit: "kW",
      };
    },
  );

  return monthEntries;
}

export function landingTransformPayload(input) {
  console.log(input);
  return {
    state: input.state.toUpperCase(),
    discom: input.discom.toUpperCase(),
    consumerCategory: input.customerType.toUpperCase(),
    voltageLevel: `${input.voltageLevel.voltageLevel}`,
    month: input.month.value.split(" ")[0].toUpperCase(),
    year: input.month.value.split(" ")[1],
    applyElectricityDuty: input.ed,
    sanctionedLoad: Number(input.sanctionedLoad),
    hvCategory: input.category?.toUpperCase(),
    hvSubCategory: input.subCategory?.toUpperCase(),
    todInfoList: Object.keys(input)
      .filter((key) => {
        const match = key.match(/^tod([a-zA-Z0-9_]+)Units$/i);
        return (
          match &&
          input[key] !== undefined &&
          input[key] !== null &&
          input[key] !== "" &&
          Number(input[key]) > 0
        );
      })
      .map((key) => {
        const match = key.match(/^tod([a-zA-Z0-9_]+)Units$/i);
        const slotName = match ? match[1].toUpperCase() : "";
        return {
          todId: `TOD_${slotName}`,
          todValue: Number(input[key]) || 0,
        };
      })
      .sort((a, b) => {
        const aId = parseInt(a.todId.split("_")[1]);
        const bId = parseInt(b.todId.split("_")[1]);
        if (isNaN(aId) && isNaN(bId)) return a.todId.localeCompare(b.todId);
        if (isNaN(aId)) return 1;
        if (isNaN(bId)) return -1;
        return aId - bId;
      }),
  };
}

// SLot Data Transformation
export function transformSlotData(res1: any, res2: any, res3: any) {
  const slotData = Object.entries(res1.days).map(([dateKey, dayData]: any) => {
    const dayNumber = dateKey.split("-")[2];

    const res2Day = res2.days?.[dateKey] || {};
    const res3Day = res3.days?.[dateKey] || {};

    return {
      day: `Day ${Number(dayNumber)}`,
      date: dayNumber,

      actualPaid: dayData.actualPaid ?? 0,
      proltSuggested: dayData.proltSuggestedCost ?? 0,

      units: res3Day.totalProltConsumption ?? 0,

      actualOaUnits: 0,

      actualDiscomUnits: res2Day.actualDiscomConsumption ?? 0,

      recommendedOaUnits: res3Day.proltOaConsumption ?? 0,

      recommendedDiscomUnits: res3Day.proltDiscomConsumption ?? 0,
    };
  });

  return slotData;
}

export function transformMonthlyBreakdownSlotData(response: any) {
  return Object.entries(response.days).map(([dateKey, value]: any) => {
    const dayNumber = dateKey.split("-")[2];

    return {
      day: `Day ${Number(dayNumber)}`,
      date: dayNumber,

      actualPaid: value.youPaid ?? 0,
      proltSuggested: value.proltSuggested ?? 0,

      units: value.totalUnits ?? 0,

      actualOaUnits: value.oaUnits ?? 0,

      actualDiscomUnits: value.discomUnits ?? 0,

      recommendedOaUnits: value.oaUnits ?? 0,

      recommendedDiscomUnits: value.discomUnits ?? 0,
    };
  });
}
