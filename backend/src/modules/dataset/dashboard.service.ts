import prisma from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export class DashboardService {
  /**
   * Helper to format raw records
   */
  private static formatRecords(records: any[], dateStr: string) {
    return records.map(record => {
      const { intervalTime, id, datasetId, intervalNumber, date, ...rest } = record;
      
      const hourNum = Math.floor((intervalNumber - 1) / 4) + 1;
      const hour = hourNum.toString().padStart(2, '0');

      const formatted: any = { 
        date: dateStr,
        hour,
        timeBlock: intervalTime, 
        intervalNumber 
      };
      
      for (const [key, val] of Object.entries(rest)) {
        if (val !== null && typeof val === 'object' && typeof (val as any).toNumber === 'function') {
          formatted[key] = (val as any).toNumber();
        } else {
          formatted[key] = val;
        }
      }
      return formatted;
    });
  }

  /**
   * Helper to average records
   */
  private static averageRecords(records: any[], extraFields: Record<string, any> = {}) {
    if (records.length === 0) return null;

    const averaged: any = { ...extraFields };
    // get numerical keys by inspecting the first record
    const sample = records[0];
    const keys = Object.keys(sample).filter(k => 
      k !== 'id' && k !== 'datasetId' && k !== 'intervalTime' && k !== 'intervalNumber'
    );

    for (const key of keys) {
      let sum = 0;
      let count = 0;
      for (const row of records) {
        if (row[key] !== null && row[key] !== undefined) {
          const num = typeof row[key] === 'object' && typeof row[key].toNumber === 'function' 
            ? row[key].toNumber() 
            : Number(row[key]);
          sum += num;
          count++;
        }
      }
      averaged[key] = count > 0 ? parseFloat((sum / count).toFixed(4)) : 0;
      // Note: for total volumes (FSV), usually they are summed across blocks if dealing with daily totals?
      // Wait, "Formula: (v1 + v2 + v3 + v4) / 4 Apply this logic to EVERY numerical market metric."
      // The user explicitly stated: "Average all 96 interval records. Formula: dailyValue = sum(all 96 values) / 96 Apply to every numerical metric."
    }
    return averaged;
  }

  private static computeAnalytics(market: string, dateStr: string, aggregatedIntervals: any[]) {
    if (aggregatedIntervals.length === 0) {
      return {
        market,
        deliveryDate: dateStr,
        maxMcp: 0, minMcp: 0, averageMcp: 0,
        maxMcv: 0, maxFsv: 0, totalVolume: 0,
        recordCount: 0
      };
    }

    let sumMcp = 0;
    let sumFsv = 0;
    let maxMcp = -Infinity;
    let minMcp = Infinity;
    let maxMcv = -Infinity;
    let maxFsv = -Infinity;
    
    // For GDAM, the total volume field is fsvTotal. For DAM/RTM it is fsv.
    const fsvKey = market.toUpperCase() === 'GDAM' ? 'fsvTotal' : 'fsv';
    const mcvKey = market.toUpperCase() === 'GDAM' ? 'mcvTotal' : 'mcv';

    for (const row of aggregatedIntervals) {
      const mcp = Number(row.mcp || 0);
      const fsv = Number(row[fsvKey] || 0);
      const mcv = Number(row[mcvKey] || 0);

      sumMcp += mcp;
      sumFsv += fsv;
      if (mcp > maxMcp) maxMcp = mcp;
      if (mcp < minMcp) minMcp = mcp;
      if (mcv > maxMcv) maxMcv = mcv;
      if (fsv > maxFsv) maxFsv = fsv;
    }

    const averageMcp = sumMcp / aggregatedIntervals.length;

    return {
      market,
      deliveryDate: dateStr,
      maxMcp: parseFloat(maxMcp.toFixed(4)),
      minMcp: parseFloat(minMcp.toFixed(4)),
      averageMcp: parseFloat(averageMcp.toFixed(4)),
      maxMcv: parseFloat(maxMcv.toFixed(4)),
      maxFsv: parseFloat(maxFsv.toFixed(4)),
      totalVolume: parseFloat(sumFsv.toFixed(4)),
      recordCount: aggregatedIntervals.length
    };
  }

  /**
   * Universal fetch for dashboard interval data
   */
  public static async getDashboardData(market: string, startDateStr: string, endDateStr: string, interval: string = '15min') {
    if (!startDateStr || !endDateStr) throw new AppError('Date range parameters are required', 400);
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    let intervals: any[] = [];
    let datasetMeta: any = null;

    // Fetch all active datasets within the range, ordered chronologically
    const datasets = await prisma.dataset.findMany({
      where: {
        market: market.toUpperCase() as any,
        status: 'ACTIVE',
        deliveryDate: { gte: startDate, lte: endDate }
      },
      orderBy: { deliveryDate: 'asc' }
    });

    if (datasets.length === 0) {
      throw new AppError(`No ACTIVE datasets found for ${market.toUpperCase()} between ${startDateStr} and ${endDateStr}`, 404);
    }

    datasetMeta = {
      market: datasets[0].market,
      startDate: startDateStr,
      endDate: endDateStr,
      status: datasets[0].status
    };

    for (const ds of datasets) {
      let records: any[] = [];
      if (market.toUpperCase() === 'DAM') {
        records = await prisma.damRecord.findMany({ where: { datasetId: ds.id }, orderBy: { intervalNumber: 'asc' } });
      } else if (market.toUpperCase() === 'GDAM') {
        const transitionDate = new Date('2026-07-13T00:00:00.000Z');
        if (ds.deliveryDate >= transitionDate) {
          records = await prisma.gdamNewRecord.findMany({ where: { datasetId: ds.id }, orderBy: { intervalNumber: 'asc' } });
        } else {
          records = await prisma.gdamRecord.findMany({ where: { datasetId: ds.id }, orderBy: { intervalNumber: 'asc' } });
        }
      } else if (market.toUpperCase() === 'RTM') {
        records = await prisma.rtmRecord.findMany({ where: { datasetId: ds.id }, orderBy: { intervalNumber: 'asc' } });
      } else if (market.toUpperCase() === 'REC') {
        records = await prisma.recRecord.findMany({ where: { datasetId: ds.id }, orderBy: [{ year: 'asc' }, { month: 'asc' }] });
      }

      const dateString = ds.deliveryDate.toISOString().split('T')[0];
      const formatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const prettyDate = formatter.format(ds.deliveryDate);

      if (interval === 'daily') {
        const dailyAveraged = this.averageRecords(records, { date: prettyDate, sortDate: dateString });
        if (dailyAveraged) {
          intervals.push(dailyAveraged);
        }
      } else if (interval === 'hourly') {
        for (let i = 0; i < 24; i++) {
          const chunk = records.slice(i * 4, i * 4 + 4);
          if (chunk.length === 0) continue;
          
          const hourStr = (i + 1).toString().padStart(2, '0');
          const averaged = this.averageRecords(chunk, { date: prettyDate, hour: hourStr });
          if (averaged) {
            intervals.push(averaged);
          }
        }
      } else {
        // Default 15min
        intervals.push(...this.formatRecords(records, prettyDate));
      }
    }

    const analytics = this.computeAnalytics(market, `${startDateStr} to ${endDateStr}`, intervals);

    return {
      dataset: datasetMeta,
      intervals,
      analytics
    };
  }

  /**
   * Analytics backward compatibility wrapper
   */
  public static async getAnalytics(market: string, startDateStr: string, endDateStr: string, interval: string = '15min') {
    const data = await this.getDashboardData(market, startDateStr, endDateStr, interval);
    return data.analytics;
  }

  /**
   * Fetch Dashboard Overview Analytics (Active Datasets Coverage)
   */
  public static async getOverview() {
    const results = await prisma.dataset.groupBy({
      by: ['market'],
      where: { status: 'ACTIVE' },
      _min: { deliveryDate: true },
      _max: { deliveryDate: true },
      _count: { _all: true }
    });

    const overview: Record<string, any> = {
      dam: { coverageStart: null, coverageEnd: null, activeDatasetCount: 0 },
      gdam: { coverageStart: null, coverageEnd: null, activeDatasetCount: 0 },
      rtm: { coverageStart: null, coverageEnd: null, activeDatasetCount: 0 }
    };

    results.forEach(row => {
      const marketKey = row.market.toLowerCase();
      if (overview[marketKey]) {
        overview[marketKey] = {
          coverageStart: row._min.deliveryDate ? row._min.deliveryDate.toISOString() : null,
          coverageEnd: row._max.deliveryDate ? row._max.deliveryDate.toISOString() : null,
          activeDatasetCount: row._count._all
        };
      }
    });

    return overview;
  }
}
