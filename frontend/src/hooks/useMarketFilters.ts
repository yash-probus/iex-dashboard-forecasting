import { useState } from 'react';

export type IntervalFilter = '15min' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface MarketFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  interval: IntervalFilter;
}

export function useMarketFilters(initialStartDate: string = new Date().toISOString().split('T')[0], initialEndDate: string = new Date().toISOString().split('T')[0], initialInterval: IntervalFilter = '15min') {
  const [filters, setFilters] = useState<MarketFilters>({
    startDate: initialStartDate,
    endDate: initialEndDate,
    interval: initialInterval,
  });

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setFilters((prev) => ({ ...prev, startDate: newStartDate, endDate: newEndDate }));
  };

  const handleIntervalChange = (newInterval: IntervalFilter) => {
    setFilters((prev) => ({ ...prev, interval: newInterval }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: initialStartDate,
      endDate: initialEndDate,
      interval: initialInterval,
    });
  };

  return {
    filters,
    handleDateChange,
    handleIntervalChange,
    resetFilters,
  };
}
