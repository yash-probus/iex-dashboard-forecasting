import { PrismaClient } from '@prisma/client';
import { logger } from '../../logger';

const prisma = new PrismaClient();

export class UpMarketService {
  async getMarketData(market: 'DAM' | 'RTM' | 'GDAM', startDate: string, endDate: string, selectedState?: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const whereClause: any = {
        date: {
          gte: start,
          lte: end
        }
      };

      if (selectedState && selectedState !== 'ALL' && selectedState !== 'all') {
        const REGION_ALIASES: Record<string, string[]> = {
          'N1': ['N1', 'Haryana'],
          'N2': ['N2', 'UP', 'Uttar Pradesh', 'Uttarakhand'],
          'N3': ['N3', 'Punjab'],
          'Haryana': ['Haryana', 'N1'],
          'UP': ['UP', 'Uttar Pradesh', 'N2'],
          'Uttar Pradesh': ['Uttar Pradesh', 'UP', 'N2'],
          'Uttarakhand': ['Uttarakhand', 'N2'],
          'Punjab': ['Punjab', 'N3']
        };
        const aliases = REGION_ALIASES[selectedState];
        if (aliases) {
          whereClause.state = { in: aliases };
        } else {
          whereClause.state = selectedState;
        }
      }

      // Fetch from respective table based on market
      let records: any[] = [];
      if (market === 'DAM') {
        records = await prisma.exchangeDamRate.findMany({
          where: whereClause,
          orderBy: [
            { date: 'asc' },
            { intervalTime: 'asc' }
          ]
        });
      } else if (market === 'RTM') {
        records = await prisma.exchangeRtmRate.findMany({
          where: whereClause,
          orderBy: [
            { date: 'asc' },
            { intervalTime: 'asc' }
          ]
        });
      } else if (market === 'GDAM') {
        records = await prisma.exchangeGdamRate.findMany({
          where: whereClause,
          orderBy: [
            { date: 'asc' },
            { intervalTime: 'asc' }
          ]
        });
      }

      if (!records || records.length === 0) {
        return { intervals: [], analytics: this.getEmptyAnalytics() };
      }

      // Format intervals
      const intervals = records.map(r => {
        // extract time string from datetime field (intervalTime)
        let timeStr = '';
        if (r.intervalTime instanceof Date) {
          timeStr = r.intervalTime.toISOString().substring(11, 16);
        } else {
          timeStr = typeof r.intervalTime === 'string' ? r.intervalTime.substring(0, 5) : String(r.intervalTime);
        }

        const hh = parseInt(timeStr.substring(0, 2), 10) || 0;
        const mm = parseInt(timeStr.substring(3, 5), 10) || 0;

        let endMm = mm + 15;
        let endHh = hh;
        if (endMm >= 60) {
          endMm -= 60;
          endHh += 1;
        }
        
        let startHourStr = String(hh).padStart(2, '0');
        let startMinStr = String(mm).padStart(2, '0');
        let endHourStr = String(endHh).padStart(2, '0');
        let endMinStr = String(endMm).padStart(2, '0');
        if (endHh === 24) endHourStr = '24';
        
        const timeBlockStr = `${startHourStr}:${startMinStr}-${endHourStr}:${endMinStr}`;
        const hourStr = `${startHourStr}:00-${String(hh+1).padStart(2, '0')}:00`;

        return {
          id: r.id.toString(),
          date: r.date.toISOString(),
          timeblock: timeStr,
          hour: hourStr,
          timeBlock: timeBlockStr,
          state: r.state,
          region: r.state,
          mcp: r.mcp ? Number(r.mcp) : 0,
          mcv: r.mcv ? Number(r.mcv) : 0,
          purchaseBid: r.purchaseBid ? Number(r.purchaseBid) : 0,
          sellBid: r.sellBid ? Number(r.sellBid) : 0,
        };
      });

      // Calculate analytics
      let totalMcp = 0;
      let maxMcp = -Infinity;
      let minMcp = Infinity;
      let maxMcv = -Infinity;

      intervals.forEach(inv => {
        totalMcp += inv.mcp;
        if (inv.mcp > maxMcp) maxMcp = inv.mcp;
        if (inv.mcp < minMcp) minMcp = inv.mcp;
        if (inv.mcv > maxMcv) maxMcv = inv.mcv;
      });

      const averageMcp = totalMcp / intervals.length;

      return {
        intervals,
        analytics: {
          averageMcp: Number(averageMcp.toFixed(2)),
          maxMcp: maxMcp === -Infinity ? 0 : maxMcp,
          minMcp: minMcp === Infinity ? 0 : minMcp,
          maxMcv: maxMcv === -Infinity ? 0 : maxMcv,
        }
      };

    } catch (error) {
      logger.error(`Error fetching UP Market data for ${market}:`, error);
      throw error;
    }
  }

  private getEmptyAnalytics() {
    return {
      averageMcp: 0,
      totalVolume: 0,
      maxMcv: 0,
      maxFsv: 0,
      maxMcp: 0,
      minMcp: 0
    };
  }
}
