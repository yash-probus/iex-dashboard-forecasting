import { useState, useEffect } from 'react';
import { upMarketApi } from '../api/upMarket.api';
import { MarketFilters } from './useMarketFilters';

export function useUpMarketData(
  marketType: 'DAM' | 'RTM' | 'GDAM',
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
        const dataRes = await upMarketApi.getMarketData(marketType, filters.startDate, filters.endDate);

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
  }, [marketType, filters.startDate, filters.endDate]);

  return {
    data,
    summaryMetrics,
    isLoading,
    error,
    rawFilteredCount: data.length,
    aggregatedCount: data.length
  };
}
