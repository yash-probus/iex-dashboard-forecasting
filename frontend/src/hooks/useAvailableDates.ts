import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiClient } from "@/api/client";

export function useAvailableDates(market: string) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchDates = async () => {
      try {
        const res = await apiClient.get(`/forecast/dates?market=${market.toLowerCase()}`);
        if (!cancelled && res.data && res.data.success && Array.isArray(res.data.data)) {
          const sorted = [...res.data.data].sort((a: string, b: string) => b.localeCompare(a));
          setDates(sorted);
        }
      } catch (err) {
        console.error("Failed to load available forecast dates:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDates();
    return () => {
      cancelled = true;
    };
  }, [market]);

  const latestDate = dates.length > 0 ? dates[0] : null;
  const earliestDate = dates.length > 0 ? dates[dates.length - 1] : null;

  const maxDate = latestDate ? parseISO(latestDate) : new Date();
  const minDate = earliestDate ? parseISO(earliestDate) : new Date(2020, 0, 1);

  const isAvailable = (d: Date | string) => {
    const str = typeof d === "string" ? d : format(d, "yyyy-MM-dd");
    return dates.includes(str);
  };

  return {
    dates,
    latestDate,
    earliestDate,
    maxDate,
    minDate,
    isAvailable,
    loading,
  };
}
