// @ts-nocheck
import moment from "moment";

export const monthNames = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

export const STATE_MAP = {
  ANDHRA_PRADESH: "AP",
  ARUNACHAL_PRADESH: "AR",
  ASSAM: "AS",
  BIHAR: "BR",
  CHHATTISGARH: "CG",
  GOA: "GA",
  GUJARAT: "GJ",
  HARYANA: "HR",
  HIMACHAL_PRADESH: "HP",
  JHARKHAND: "JH",
  KARNATAKA: "KA",
  KERALA: "KL",
  MADHYA_PRADESH: "MP",
  MAHARASHTRA: "MH",
  MANIPUR: "MN",
  MEGHALAYA: "ML",
  MIZORAM: "MZ",
  NAGALAND: "NL",
  ODISHA: "OD",
  PUNJAB: "PB",
  RAJASTHAN: "RJ",
  SIKKIM: "SK",
  TAMIL_NADU: "TN",
  TELANGANA: "TS",
  TRIPURA: "TR",
  UTTAR_PRADESH: "UP",
  UTTARAKHAND: "UK",
  WEST_BENGAL: "WB",
  ANDAMAN_AND_NICOBAR_ISLANDS: "AN",
  CHANDIGARH: "CH",
  DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU: "DN",
  DELHI: "DL",
  JAMMU_AND_KASHMIR: "JK",
  LADAKH: "LA",
  LAKSHADWEEP: "LD",
  PUDUCHERRY: "PY",
};

export const getLast12Months = () => {
  const months = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const monthName = d.toLocaleString("default", { month: "long" });

    const year = d.getFullYear();

    months.push({
      value: `${monthName} ${year}`,
      label: `${monthName.toLowerCase()}-${year}`,
    });
  }

  return months;
};
export const TOD_SLOTS = [
  { id: "tod1", key: 1, label: "TOD-1", legend: "05:00 – 11:00" },
  { id: "tod2", key: 2, label: "TOD-2", legend: "11:00 – 17:00" },
  { id: "tod3", key: 3, label: "TOD-3", legend: "17:00 – 23:00" },
  { id: "tod4", key: 4, label: "TOD-4", legend: "23:00 – 05:00" },
];

export const RETCH_INTERVAL = 6 * 60 * 1000;

export function getPreviousMonth(selectedMonth: string, year: number) {
  const upperMonth = selectedMonth.toUpperCase();

  let index = monthNames.indexOf(upperMonth);

  if (index === -1) {
    throw new Error("Invalid month");
  }

  // Previous month logic
  let prevIndex = index - 1;
  let newYear = year;

  if (prevIndex < 0) {
    prevIndex = 11; // DECEMBER
    newYear = year - 1; // year bhi change hoga
  }

  return {
    month: monthNames[prevIndex],
    year: newYear,
  };
}

export const getNextMonthYear = (month, year) => {
  const next = moment()
    .month(month) // 0–11 (Jan = 0)
    .year(year)
    .add(1, "month");

  return `${next.format("MMMM")}`;
};
