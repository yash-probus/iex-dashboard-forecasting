import { useEffect, useRef, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { apiClient } from "@/api/client";
import type { ForecastRow } from "../mockData";

// In-memory session cache to avoid hammering the backend
const cache = new Map<string, { currentRows: ForecastRow[]; priorRows: ForecastRow[]; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export function useSevenDayReportData(
  endDateStr: string,
  model: string,
  market: string,
  isOpen: boolean,
  rtmType: "dayahead" | "nowcast" = "dayahead"
) {
  const [currentRows, setCurrentRows] = useState<ForecastRow[]>([]);
  const [priorRows, setPriorRows] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeReqRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen || !endDateStr) return;

    let parsedEndDate: Date;
    try {
      parsedEndDate = parseISO(endDateStr);
      if (isNaN(parsedEndDate.getTime())) parsedEndDate = new Date();
    } catch {
      parsedEndDate = new Date();
    }

    // 7 days ending at endDateStr (inclusive): [endDate - 6, endDate]
    const curStart = format(subDays(parsedEndDate, 6), "yyyy-MM-dd");
    const curEnd = format(parsedEndDate, "yyyy-MM-dd");

    // Prior 7 days: [endDate - 13, endDate - 7]
    const priorStart = format(subDays(parsedEndDate, 13), "yyyy-MM-dd");
    const priorEnd = format(subDays(parsedEndDate, 7), "yyyy-MM-dd");

    const cacheKey = `${market.toLowerCase()}_${rtmType}_m${model}_${curStart}_${curEnd}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setCurrentRows(cached.currentRows);
      setPriorRows(cached.priorRows);
      setLoading(false);
      setError(null);
      return;
    }

    const reqId = ++activeReqRef.current;
    setLoading(true);
    setError(null);

    const mapApiIntervals = (rawIntervals: any[], defaultDate: string): ForecastRow[] => {
      return (rawIntervals || []).map((row: any, idx: number) => {
        let mcpVal: number = 0;
        if (row.mcp !== null && row.mcp !== undefined && !isNaN(Number(row.mcp))) {
          mcpVal = Number(row.mcp);
        } else if (market.toUpperCase() === "RTM") {
          if (rtmType === "nowcast") {
            mcpVal = (row.mcpNowcast !== null && row.mcpNowcast !== undefined && !isNaN(Number(row.mcpNowcast)))
              ? Number(row.mcpNowcast)
              : Number(row.mcpDayahead ?? 0);
          } else {
            mcpVal = (row.mcpDayahead !== null && row.mcpDayahead !== undefined && !isNaN(Number(row.mcpDayahead)))
              ? Number(row.mcpDayahead)
              : Number(row.mcpNowcast ?? 0);
          }
        } else if (row.mcpDayahead !== null && row.mcpDayahead !== undefined && !isNaN(Number(row.mcpDayahead))) {
          mcpVal = Number(row.mcpDayahead);
        } else if (row.mcpNowcast !== null && row.mcpNowcast !== undefined && !isNaN(Number(row.mcpNowcast))) {
          mcpVal = Number(row.mcpNowcast);
        }

        let actVal: number | null = null;
        if (row.actualMcp !== null && row.actualMcp !== undefined && row.actualMcp !== "" && !isNaN(Number(row.actualMcp))) {
          actVal = Number(row.actualMcp);
        }

        let tb = row.timeBlock || "";
        if (tb.includes("-") && !tb.includes(" - ")) {
          const [start, end] = tb.split("-");
          tb = `${start.trim()} - ${end.trim()}`;
        } else if (!tb) {
          const sH = String(Math.floor((idx * 15) / 60)).padStart(2, "0");
          const sM = String((idx * 15) % 60).padStart(2, "0");
          const eH = String(Math.floor(((idx + 1) * 15) / 60)).padStart(2, "0");
          const eM = String(((idx + 1) * 15) % 60).padStart(2, "0");
          tb = `${sH}:${sM} - ${eH}:${eM}`;
        }

        const confVal = row.confidence && row.confidence !== "N/A" && !isNaN(Number(row.confidence))
          ? Number(row.confidence)
          : 80;

        return {
          date: row.date || defaultDate,
          hour: String(row.hour || String(Math.floor(idx / 4) + 1).padStart(2, "0")),
          timeBlock: tb,
          forecastedMcp: +mcpVal.toFixed(2),
          actualMcp: actVal !== null ? +actVal.toFixed(2) : null,
          priceMin: +(mcpVal * 0.95).toFixed(2),
          priceMax: +Math.min(10, mcpVal * 1.05).toFixed(2),
          confidence: +confVal.toFixed(1),
        };
      });
    };

    const fetchAll = async () => {
      try {
        const rtmParam = market.toLowerCase() === "rtm" ? `&rtmType=${rtmType}` : "";
        const [curRes, priorRes] = await Promise.allSettled([
          apiClient.get(
            `/forecast/price?market=${market.toLowerCase()}&startDate=${curStart}&endDate=${curEnd}&interval=15min&model=Model${model}${rtmParam}`
          ),
          apiClient.get(
            `/forecast/price?market=${market.toLowerCase()}&startDate=${priorStart}&endDate=${priorEnd}&interval=15min&model=Model${model}${rtmParam}`
          ),
        ]);

        if (reqId !== activeReqRef.current) return;

        let curData: ForecastRow[] = [];
        let priorData: ForecastRow[] = [];

        if (curRes.status === "fulfilled" && curRes.value.data?.success && Array.isArray(curRes.value.data.data?.intervals)) {
          curData = mapApiIntervals(curRes.value.data.data.intervals, curEnd);
        }

        if (priorRes.status === "fulfilled" && priorRes.value.data?.success && Array.isArray(priorRes.value.data.data?.intervals)) {
          priorData = mapApiIntervals(priorRes.value.data.data.intervals, priorEnd);
        }

        if (curData.length === 0) {
          setError(`No forecast records returned for ${curStart} to ${curEnd}.`);
        } else {
          cache.set(cacheKey, { currentRows: curData, priorRows: priorData, timestamp: Date.now() });
          setCurrentRows(curData);
          setPriorRows(priorData);
        }
      } catch (err: any) {
        if (reqId === activeReqRef.current) {
          console.error("[useSevenDayReportData] Fetch error:", err);
          setError(err?.message || "Failed to load 7-day forecast data.");
        }
      } finally {
        if (reqId === activeReqRef.current) {
          setLoading(false);
        }
      }
    };

    fetchAll();
  }, [endDateStr, model, market, isOpen, rtmType]);

  return {
    currentRows,
    priorRows,
    loading,
    error,
  };
}
