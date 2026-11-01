import { useState, useEffect } from 'react';
import { dashboardApi } from '../api/dashboard.api';
import { MarketFilters } from './useMarketFilters';

export function useMarketData(
  marketType: 'DAM' | 'GDAM' | 'RTM' | 'REC',
  filters: MarketFilters
) {
  const [data, setData] = useState<any[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<any>({
    averageMcp: 0,
    totalVolume: 0,
    maxMcv: 0,
    maxFsv: 0,
    maxMcp: 0,
    minMcp: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch intervals and analytics in unified payload
        const dataRes = await dashboardApi.getMarketData(marketType, filters.startDate, filters.endDate, filters.interval);

        if (isMounted) {
          setData(dataRes.data.intervals || []);
          setSummaryMetrics(dataRes.data.analytics || {
            averageMcp: 0, totalVolume: 0, maxMcv: 0, maxFsv: 0, maxMcp: 0, minMcp: 0
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setData([]);
          setSummaryMetrics({
            averageMcp: 0, totalVolume: 0, maxMcv: 0, maxFsv: 0, maxMcp: 0, minMcp: 0
          });
          // 404 is an expected empty state, not a fatal error
          if (err.response?.status === 404) {
            setError('No data available for the selected date.');
          } else {
            setError(err.message || 'Failed to fetch market data');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [marketType, filters.startDate, filters.endDate, filters.interval]);

  return {
    data,
    summaryMetrics,
    isLoading,
    error,
    rawFilteredCount: data.length,
    aggregatedCount: data.length
  };
}
