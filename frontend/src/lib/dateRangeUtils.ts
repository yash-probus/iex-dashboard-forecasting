import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from "date-fns";

export type TimeDuration =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "ytd"
  | "last12months";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export const TIME_DURATION_OPTIONS: {
  value: TimeDuration;
  label: string;
  shortLabel: string;
}[] = [
  { value: "today", label: "Today", shortLabel: "Today" },
  { value: "yesterday", label: "Yesterday", shortLabel: "Yesterday" },
  { value: "last7days", label: "Last 7 Days", shortLabel: "7D" },
  { value: "last30days", label: "Last 30 Days", shortLabel: "30D" },
  { value: "thisMonth", label: "This Month", shortLabel: "MTD" },
  { value: "lastMonth", label: "Last Month", shortLabel: "Last Mo" },
  { value: "ytd", label: "Year to Date", shortLabel: "YTD" },
  { value: "last12months", label: "Last 12 Months", shortLabel: "12M" },
];

export function getDateRangeForDuration(duration: TimeDuration): DateRange {
  const now = new Date();

  switch (duration) {
    case "today":
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        label: "Today",
      };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        label: "Yesterday",
      };
    case "last7days":
      return {
        startDate: startOfDay(subDays(now, 6)),
        endDate: endOfDay(now),
        label: "Last 7 Days",
      };
    case "last30days":
      return {
        startDate: startOfDay(subDays(now, 29)),
        endDate: endOfDay(now),
        label: "Last 30 Days",
      };
    case "thisMonth":
      return {
        startDate: startOfMonth(now),
        endDate: endOfDay(now),
        label: "This Month",
      };
    case "lastMonth":
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
        label: "Last Month",
      };
    case "ytd":
      return {
        startDate: startOfYear(now),
        endDate: endOfDay(now),
        label: "Year to Date",
      };
    case "last12months":
      return {
        startDate: startOfDay(subMonths(now, 12)),
        endDate: endOfDay(now),
        label: "Last 12 Months",
      };
    default:
      return {
        startDate: startOfDay(subDays(now, 29)),
        endDate: endOfDay(now),
        label: "Last 30 Days",
      };
  }
}

export function getDurationLabel(duration: TimeDuration): string {
  const option = TIME_DURATION_OPTIONS.find((opt) => opt.value === duration);
  return option?.label || "Last 30 Days";
}
