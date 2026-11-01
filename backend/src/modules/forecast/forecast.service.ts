import prisma from '../../config/prisma';
import { VidyutPravahScraper } from '../../services/scraper.service';
import { NppAdjustmentService } from '../dataset/npp-adjustment.service';
import { StarrocksService } from '../../services/starrocks.service';


export interface ForecastIntervalData {
  date: string;
  hour: string;
  timeBlock: string;
  intervalNumber: number;
  purchaseBid: number;
  sellBid: number;
  mcv: number;
  fsv: number;
  mcp: number | null;
  mcpDayahead?: number | null;
  mcpNowcast?: number | null;
  actualMcp?: number | null;
  confidence?: string;
  priceRange?: string;
}

export interface DemandForecastIntervalData {
  date: string;
  hour: string;
  timeBlock: string;
  intervalNumber: number;
  demand: number; // in MW or kW
  actualDemand?: number | null;
  frequency?: number; // in Hz
}

export class ForecastService {
  /**
   * Helper to format timeblock from interval number
   */
  private static getIntervalTime(intervalNum: number): string {
    const totalMinutes = (intervalNum - 1) * 15;
    const startHour = Math.floor(totalMinutes / 60);
    const startMin = totalMinutes % 60;
    const endMinutes = totalMinutes + 15;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(startHour)}:${pad(startMin)}-${pad(endHour)}:${pad(endMin)}`;
  }

  private static getISTComponents(timestamp: any) {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      return { dateStr: '', hourStr: '00:00', startH: '00', startM: '00', hour: '01', intervalNumber: 1, timeBlock: '00:00 - 00:15' };
    }

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(d);
    
    let year = '', month = '', day = '', hour = '00', minute = '00';
    for (const part of parts) {
      if (part.type === 'year') year = part.value;
      if (part.type === 'month') month = part.value;
      if (part.type === 'day') day = part.value;
      if (part.type === 'hour') hour = part.value === '24' ? '00' : part.value;
      if (part.type === 'minute') minute = part.value;
    }
    
    const dateStr = `${year}-${month}-${day}`;
    const startH = String(hour).padStart(2, '0');
    const startM = String(minute).padStart(2, '0');
    const hourStr = `${startH}:${startM}`;
    const hNum = parseInt(startH, 10) || 0;
    const mNum = parseInt(startM, 10) || 0;
    const minutes = hNum * 60 + mNum;
    const intervalNumber = Math.floor(minutes / 15) + 1;
    
    const nextMin = (mNum + 15) % 60;
    const nextH = nextMin === 0 ? (hNum + 1) % 24 : hNum;
    const nextHStr = String(nextH).padStart(2, '0');
    const nextMStr = String(nextMin).padStart(2, '0');
    const timeBlock = `${hourStr} - ${nextHStr}:${nextMStr}`;

    return { dateStr, hourStr, startH, startM, hour: String(hNum + 1).padStart(2, '0'), intervalNumber, timeBlock };
  }

  /**
   * Generates a date array between two dates
   */
  private static getDatesInRange(startDateStr: string, endDateStr: string): string[] {
    const dates: string[] = [];
    const curr = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    // limit safety to prevent endless loops
    let limit = 0;
    while (curr <= end && limit < 100) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      limit++;
    }
    return dates;
  }

  private static aggregatePriceIntervals(records: ForecastIntervalData[], interval: string): ForecastIntervalData[] {
    if (interval === '15min') return records;

    if (interval === 'hourly') {
      const hourlyData: ForecastIntervalData[] = [];
      for (let h = 0; h < 24; h++) {
        const hourStr = h.toString().padStart(2, '0');
        const hourRecords = records.filter(r => parseInt(r.hour) === h + 1);
        if (hourRecords.length === 0) continue;

        const mcpRecords = hourRecords.filter(r => r.mcp !== null);
        const sumMcp = mcpRecords.reduce((sum, r) => sum + (r.mcp as number), 0);
        const sumPurchase = hourRecords.reduce((sum, r) => sum + r.purchaseBid, 0);
        const sumSell = hourRecords.reduce((sum, r) => sum + r.sellBid, 0);
        const sumMcv = hourRecords.reduce((sum, r) => sum + r.mcv, 0);
        const sumFsv = hourRecords.reduce((sum, r) => sum + r.fsv, 0);

        // Aggregate actualMcp
        const actualRecords = hourRecords.filter(r => r.actualMcp !== null && r.actualMcp !== undefined);
        const sumActualMcp = actualRecords.reduce((sum, r) => sum + (r.actualMcp || 0), 0);
        const actualMcp = actualRecords.length > 0 
          ? parseFloat((sumActualMcp / actualRecords.length).toFixed(2))
          : null;

        // Aggregate confidence
        const confRecords = hourRecords.filter(r => r.confidence !== 'N/A' && r.confidence !== undefined && r.confidence !== null);
        const sumConf = confRecords.reduce((sum, r) => sum + Number(r.confidence || 0), 0);
        const confidence = confRecords.length > 0
          ? (sumConf / confRecords.length).toFixed(2)
          : 'N/A';

        // Aggregate dayahead
        const dayaheadRecords = hourRecords.filter(r => r.mcpDayahead !== null && r.mcpDayahead !== undefined);
        const sumDayahead = dayaheadRecords.reduce((sum, r) => sum + (r.mcpDayahead as number), 0);
        const mcpDayahead = dayaheadRecords.length > 0 ? parseFloat((sumDayahead / dayaheadRecords.length).toFixed(2)) : null;

        // Aggregate nowcast
        const nowcastRecords = hourRecords.filter(r => r.mcpNowcast !== null && r.mcpNowcast !== undefined);
        const sumNowcast = nowcastRecords.reduce((sum, r) => sum + (r.mcpNowcast as number), 0);
        const mcpNowcast = nowcastRecords.length > 0 ? parseFloat((sumNowcast / nowcastRecords.length).toFixed(2)) : null;

        hourlyData.push({
          date: hourRecords[0].date,
          hour: hourStr,
          timeBlock: `${hourStr}:00`,
          intervalNumber: h + 1,
          purchaseBid: Math.round(sumPurchase / hourRecords.length),
          sellBid: Math.round(sumSell / hourRecords.length),
          mcv: Math.round(sumMcv / hourRecords.length),
          fsv: Math.round(sumFsv / hourRecords.length),
          mcp: mcpRecords.length > 0 ? parseFloat((sumMcp / mcpRecords.length).toFixed(2)) : null,
          mcpDayahead,
          mcpNowcast,
          actualMcp,
          confidence
        });
      }
      return hourlyData;
    }

    // Daily aggregation
    const mcpRecords = records.filter(r => r.mcp !== null);
    const sumMcp = mcpRecords.reduce((sum, r) => sum + (r.mcp as number), 0);
    const sumPurchase = records.reduce((sum, r) => sum + r.purchaseBid, 0);
    const sumSell = records.reduce((sum, r) => sum + r.sellBid, 0);
    const sumMcv = records.reduce((sum, r) => sum + r.mcv, 0);
    const sumFsv = records.reduce((sum, r) => sum + r.fsv, 0);

    // Aggregate actualMcp
    const actualRecords = records.filter(r => r.actualMcp !== null && r.actualMcp !== undefined);
    const sumActualMcp = actualRecords.reduce((sum, r) => sum + (r.actualMcp || 0), 0);
    const actualMcp = actualRecords.length > 0 
      ? parseFloat((sumActualMcp / actualRecords.length).toFixed(2))
      : null;

    // Aggregate confidence
    const confRecords = records.filter(r => r.confidence !== 'N/A' && r.confidence !== undefined && r.confidence !== null);
    const sumConf = confRecords.reduce((sum, r) => sum + Number(r.confidence || 0), 0);
    const confidence = confRecords.length > 0
      ? (sumConf / confRecords.length).toFixed(2)
      : 'N/A';

    // Aggregate dayahead
    const dayaheadRecords = records.filter(r => r.mcpDayahead !== null && r.mcpDayahead !== undefined);
    const sumDayahead = dayaheadRecords.reduce((sum, r) => sum + (r.mcpDayahead as number), 0);
    const mcpDayahead = dayaheadRecords.length > 0 ? parseFloat((sumDayahead / dayaheadRecords.length).toFixed(2)) : null;

    // Aggregate nowcast
    const nowcastRecords = records.filter(r => r.mcpNowcast !== null && r.mcpNowcast !== undefined);
    const sumNowcast = nowcastRecords.reduce((sum, r) => sum + (r.mcpNowcast as number), 0);
    const mcpNowcast = nowcastRecords.length > 0 ? parseFloat((sumNowcast / nowcastRecords.length).toFixed(2)) : null;

    return [{
      date: records[0].date,
      hour: '00',
      timeBlock: 'Daily',
      intervalNumber: 1,
      purchaseBid: Math.round(sumPurchase / records.length),
      sellBid: Math.round(sumSell / records.length),
      mcv: Math.round(sumMcv / records.length),
      fsv: Math.round(sumFsv / records.length),
      mcp: mcpRecords.length > 0 ? parseFloat((sumMcp / mcpRecords.length).toFixed(2)) : null,
      mcpDayahead,
      mcpNowcast,
      actualMcp,
      confidence
    }];
  }

  /**
   * Fetch Price Forecast
   */
  public static async getPriceForecast(market: string, startDateStr: string, endDateStr: string, interval: string = '15min', model: string = 'Model1') {
    if (market.toUpperCase() === 'NPP' || market.toUpperCase() === 'GENERATION') {
      return this.getGenerationForecast(startDateStr, endDateStr, interval, model);
    }

    const intervals: ForecastIntervalData[] = [];
    const actualMap = new Map<string, number>();
    const dates = this.getDatesInRange(startDateStr, endDateStr);

    if (market.toUpperCase() === 'DAM') {
      try {
        const modelMatch = String(model).match(/\d+/);
        let modelNum = modelMatch ? parseInt(modelMatch[0], 10) : 1;

        // Fetch actuals for mapping from UP market table
        const actuals = await prisma.exchangeDamRate.findMany({
          where: {
            state: { in: ['UP', 'Uttar Pradesh', 'N2'] },
            date: {
              gte: new Date(startDateStr),
              lte: new Date(endDateStr)
            }
          },
          select: { date: true, intervalTime: true, mcp: true }
        });

        const actualRows = actuals.map(a => {
          const d = new Date(a.intervalTime);
          const timeblock = Math.floor((d.getUTCHours() * 60 + d.getUTCMinutes()) / 15) + 1;
          return { date: a.date, timeblock, mcp: a.mcp };
        });

        for (const act of actualRows) {
          const dateStr = act.date instanceof Date 
            ? act.date.toISOString().split('T')[0] 
            : new Date(act.date).toISOString().split('T')[0];
          const key = `${dateStr}_${act.timeblock}`;
          actualMap.set(key, parseFloat((Number(act.mcp) / 1000.0).toFixed(2)));
        }

        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT DISTINCT ON (forecasting_for::date, time_block) * FROM "forecasting"."dam_forecasting"
           WHERE forecasting_for::date >= $1::date AND forecasting_for::date <= $2::date
           AND model_number = $3
           ORDER BY forecasting_for::date ASC, time_block ASC, forecast_date DESC;`,
          startDateStr,
          endDateStr,
          modelNum
        );

        if (rows && rows.length > 0) {
          const formatted = rows.map(r => {
            const hourNum = Math.floor((r.time_block - 1) / 4) + 1;
            const hour = hourNum.toString().padStart(2, '0');
            const timeBlock = this.getIntervalTime(r.time_block);
            
            // predicted_mcp is stored in Rs/MWh. Convert to Rs/kWh by dividing by 1000.0
            const mcp = parseFloat((Number(r.predicted_mcp) / 1000.0).toFixed(2));
            
            const dateStr = r.forecasting_for instanceof Date 
              ? r.forecasting_for.toISOString().split('T')[0] 
              : new Date(r.forecasting_for).toISOString().split('T')[0];

            const key = `${dateStr}_${r.time_block}`;
            const actualMcp = actualMap.has(key) ? actualMap.get(key) : null;

            return {
              date: dateStr,
              hour,
              timeBlock,
              intervalNumber: r.time_block,
              purchaseBid: 0,
              sellBid: 0,
              mcv: 0,
              fsv: 0,
              mcp,
              actualMcp,
              confidence: r.confidence_pct !== undefined && r.confidence_pct !== null ? String(r.confidence_pct) : 'N/A',
              priceRange: r.price_range || 'N/A'
            };
          });

          intervals.push(...this.aggregatePriceIntervals(formatted, interval));
        }
      } catch (e) {
        console.error('[ForecastService] Error querying dam_forecasting:', e);
      }
    } else if (market.toUpperCase() === 'GDAM' || market.toUpperCase() === 'RTM') {
      try {
        const isGdam = market.toUpperCase() === 'GDAM';
        
        // Fetch actuals for mapping from UP market tables
        let actuals = [];
        if (isGdam) {
          actuals = await prisma.exchangeGdamRate.findMany({
            where: {
              state: { in: ['UP', 'Uttar Pradesh', 'N2'] },
              date: { gte: new Date(startDateStr), lte: new Date(endDateStr) }
            },
            select: { date: true, intervalTime: true, mcp: true }
          });
        } else {
          actuals = await prisma.exchangeRtmRate.findMany({
            where: {
              state: { in: ['UP', 'Uttar Pradesh', 'N2'] },
              date: { gte: new Date(startDateStr), lte: new Date(endDateStr) }
            },
            select: { date: true, intervalTime: true, mcp: true }
          });
        }

        const actualRows = actuals.map(a => {
          const d = new Date(a.intervalTime);
          const timeblock = Math.floor((d.getUTCHours() * 60 + d.getUTCMinutes()) / 15) + 1;
          return { date: a.date, timeblock, mcp: a.mcp };
        });

        for (const act of actualRows) {
          const dateStr = act.date instanceof Date 
            ? act.date.toISOString().split('T')[0] 
            : new Date(act.date).toISOString().split('T')[0];
          const key = `${dateStr}_${act.timeblock}`;
          actualMap.set(key, parseFloat((Number(act.mcp) / 1000.0).toFixed(2)));
        }

        // Fetch forecast
        if (isGdam) {
          const modelMatch = String(model).match(/\d+/);
          const modelNumber = modelMatch ? parseInt(modelMatch[0], 10) : 1;
          let mcpForecastRows: any[] = [];

          for (const schema of ['forecasting', 'public']) {
            try {
              mcpForecastRows = await prisma.$queryRawUnsafe(
                `SELECT DISTINCT ON (COALESCE(forecasting_for, date), interval_number)
                    COALESCE(forecasting_for, date)::text AS date,
                    interval_number AS "intervalNumber",
                    interval_time AS "intervalTime",
                    forecast_mcp AS "forecastMcp",
                    confidence,
                    price_range AS "priceRange"
                 FROM "${schema}"."GdamMcpForecast"
                 WHERE COALESCE(forecasting_for, date) >= $1::date
                   AND COALESCE(forecasting_for, date) <= $2::date
                   AND COALESCE(model_number, 1) = $3
                 ORDER BY COALESCE(forecasting_for, date), interval_number, created_at DESC`,
                startDateStr,
                endDateStr,
                modelNumber
              );
              if (mcpForecastRows.length > 0) break;
            } catch (error) {
              console.error(`[ForecastService] Error querying ${schema}.GdamMcpForecast:`, error);
            }
          }

          const forecastMap = new Map();
          if (mcpForecastRows.length > 0) {
            for (const row of mcpForecastRows) {
              forecastMap.set(`${String(row.date).split('T')[0]}_${row.intervalNumber}`, row);
            }
          } else {
            const dateFormats: string[] = [];
            for (const date of dates) {
              dateFormats.push(date);
              const parts = date.split('-');
              if (parts.length === 3) {
                dateFormats.push(`${parts[2]}-${parts[1]}-${parts[0]}`);
              }
            }

            const legacyRows = await prisma.forecastGdam.findMany({
              where: { date: { in: dateFormats } },
              orderBy: [{ date: 'asc' }, { intervalNumber: 'asc' }]
            });

            for (const row of legacyRows) {
              let normalizedDate = row.date;
              if (row.date && row.date.includes('-')) {
                const parts = row.date.split('-');
                if (parts[0].length === 2 && parts[2].length === 4) {
                  normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
              }
              forecastMap.set(`${normalizedDate}_${row.intervalNumber}`, row);
            }
          }
          
          const rawFormatted = [];
          
          for (const dStr of dates) {
            for (let t = 1; t <= 96; t++) {
              const key = `${dStr}_${t}`;
              const fRow = forecastMap.get(key);
              const actMcp = actualMap.has(key) ? actualMap.get(key) : null;
              
              if (!fRow && actMcp === null) {
                continue;
              }
              
              const hourNum = Math.floor((t - 1) / 4) + 1;
              const hour = hourNum.toString().padStart(2, '0');
              const timeBlock = this.getIntervalTime(t);
              
              const forecastMcp = fRow?.forecastMcp ?? fRow?.predictedMcp;
              const mcp = forecastMcp !== null && forecastMcp !== undefined ? parseFloat((Number(forecastMcp) / 1000.0).toFixed(2)) : null;
              
              rawFormatted.push({
                date: dStr,
                hour,
                timeBlock,
                intervalNumber: t,
                purchaseBid: Number(fRow?.purchaseBid || 0),
                sellBid: Number(fRow?.sellBidTotal || fRow?.sellBid || 0),
                mcv: Number(fRow?.mcvTotal || fRow?.mcv || 0),
                fsv: Number(fRow?.fsvTotal || fRow?.fsv || 0),
                mcp,
                actualMcp: actMcp,
                confidence: fRow?.confidence !== null && fRow?.confidence !== undefined ? String(fRow.confidence) : 'N/A',
                priceRange: fRow?.priceRange || fRow?.price_range || 'N/A'
              });
            }
          }
          
          if (rawFormatted.length > 0) {
            intervals.push(...this.aggregatePriceIntervals(rawFormatted, interval));
          }
        } else {
          // RTM uses Prisma Model
          const [dayaheadRows, nowcastRows] = await Promise.all([
            prisma.rtmDayahead.findMany({
              where: { date: { gte: startDateStr, lte: endDateStr } },
              orderBy: [{ date: 'asc' }, { intervalNumber: 'asc' }]
            }),
            prisma.rtmNowcast.findMany({
              where: { date: { gte: startDateStr, lte: endDateStr } },
              orderBy: [{ date: 'asc' }, { intervalNumber: 'asc' }, { forecastedAt: 'asc' }] // ascending so last overwrites
            })
          ]);
          
          const dayaheadMap = new Map();
          for (const r of dayaheadRows) {
            dayaheadMap.set(`${r.date}_${r.intervalNumber}`, r);
          }
          
          const nowcastMap = new Map();
          for (const r of nowcastRows) {
            nowcastMap.set(`${r.date}_${r.intervalNumber}`, r);
          }

          const rawFormatted = [];
          
          for (const dStr of dates) {
            for (let t = 1; t <= 96; t++) {
              const key = `${dStr}_${t}`;
              const dRow = dayaheadMap.get(key);
              const nRow = nowcastMap.get(key);
              const actMcp = actualMap.has(key) ? actualMap.get(key) : null;
              
              if (!dRow && !nRow && actMcp === null) {
                continue; // no data for this block
              }
              
              const hourNum = Math.floor((t - 1) / 4) + 1;
              const hour = hourNum.toString().padStart(2, '0');
              const timeBlock = this.getIntervalTime(t);
              
              const mcpDayahead = dRow?.predictedMcp !== null && dRow?.predictedMcp !== undefined ? parseFloat((Number(dRow.predictedMcp) / 1000.0).toFixed(2)) : null;
              const mcpNowcast = nRow?.predictedMcp !== null && nRow?.predictedMcp !== undefined ? parseFloat((Number(nRow.predictedMcp) / 1000.0).toFixed(2)) : null;

              const confidenceDayahead = dRow?.confidence !== null && dRow?.confidence !== undefined ? String(dRow.confidence) : 'N/A';
              const priceRangeDayahead = dRow?.price_range || 'N/A';
              const confidenceNowcast = nRow?.confidence !== null && nRow?.confidence !== undefined ? String(nRow.confidence) : 'N/A';
              const priceRangeNowcast = nRow?.price_range || 'N/A';

              rawFormatted.push({
                date: dStr,
                hour,
                timeBlock,
                intervalNumber: t,
                purchaseBid: 0,
                sellBid: 0,
                mcv: 0,
                fsv: 0,
                mcp: null, // rtm_forecasting removed
                mcpDayahead,
                mcpNowcast,
                actualMcp: actMcp,
                confidenceDayahead,
                priceRangeDayahead,
                confidenceNowcast,
                priceRangeNowcast,
                confidence: 'N/A',
                priceRange: 'N/A'
              });
            }
          }
          
          if (rawFormatted.length > 0) {
            intervals.push(...this.aggregatePriceIntervals(rawFormatted, interval));
          }
        }
      } catch (e) {
         console.error(`[ForecastService] Error querying ${market} forecasting:`, e);
      }
    }

    // If no forecast intervals were created, but we have actual data, let's create intervals for them
    // Note: for RTM this shouldn't happen because we iterate all 96 blocks in the RTM branch if there is any data.
    // This mostly applies to GDAM now.
    if (intervals.length === 0 && actualMap.size > 0) {
      const defaultFormatted = [];
      for (const [key, actualMcp] of actualMap.entries()) {
        const [dStr, tStr] = key.split('_');
        const t = parseInt(tStr);
        const hourNum = Math.floor((t - 1) / 4) + 1;
        const hour = hourNum.toString().padStart(2, '0');
        const timeBlock = this.getIntervalTime(t);
        defaultFormatted.push({
          date: dStr,
          hour,
          timeBlock,
          intervalNumber: t,
          purchaseBid: 0,
          sellBid: 0,
          mcv: 0,
          fsv: 0,
          mcp: null,
          actualMcp: actualMcp,
          confidence: 'N/A',
          priceRange: 'N/A'
        });
      }
      // Sort defaultFormatted by date then interval
      defaultFormatted.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.intervalNumber - b.intervalNumber;
      });
      intervals.push(...this.aggregatePriceIntervals(defaultFormatted, interval));
    }

    // Compute analytics
    let sumMcp = 0;
    let sumActualMcp = 0;
    let actualCount = 0;
    let forecastCount = 0;
    let sumFsv = 0;
    let maxMcp = -Infinity;
    let minForecastMcp = Infinity;
    let minActualMcp = Infinity;
    let maxMcv = -Infinity;
    let maxFsv = -Infinity;

    let sumAbsoluteError = 0;
    let sumPercentageError = 0;
    let errorCount = 0;
    
    let sumConfidence = 0;
    let confidenceCount = 0;

    for (const row of intervals) {
      let mcpVal: any = row.mcp;
      if (mcpVal === null || mcpVal === undefined) {
        // Fallback to mcpDayahead for RTM Forecast
        mcpVal = row.mcpDayahead;
      }
      const mcp = (mcpVal !== null && mcpVal !== undefined) ? Number(mcpVal) : null;
      const actualMcp = row.actualMcp !== null && row.actualMcp !== undefined ? Number(row.actualMcp) : null;
      const fsv = Number(row.fsv || 0);
      const mcv = Number(row.mcv || 0);

      if (mcp !== null) {
        sumMcp += mcp;
        forecastCount++;
        if (mcp > maxMcp) maxMcp = mcp;
        if (mcp < minForecastMcp) minForecastMcp = mcp;
      }
      sumFsv += fsv;
      if (mcv > maxMcv) maxMcv = mcv;
      if (fsv > maxFsv) maxFsv = fsv;

      if (row.confidence !== 'N/A' && row.confidence !== null && row.confidence !== undefined) {
        sumConfidence += Number(row.confidence);
        confidenceCount++;
      }

      if (actualMcp !== null) {
        sumActualMcp += actualMcp;
        actualCount++;
        if (actualMcp < minActualMcp) minActualMcp = actualMcp;

        // Absolute error calculation
        if (mcp !== null) {
          const absErr = Math.abs(actualMcp - mcp);
          sumAbsoluteError += absErr;

          if (actualMcp > 0) {
            sumPercentageError += (absErr / actualMcp);
            errorCount++;
          }
        }
      }
    }

    const averageMcpForecasted = forecastCount > 0 ? sumMcp / forecastCount : 0;
    const averageMcpActual = actualCount > 0 ? sumActualMcp / actualCount : null;
    const minMcpForecasted = minForecastMcp === Infinity ? 0 : minForecastMcp;
    const minMcpActual = minActualMcp === Infinity ? null : minActualMcp;

    const mae = actualCount > 0 ? sumAbsoluteError / actualCount : null;
    const mape = errorCount > 0 ? (sumPercentageError / errorCount) * 100 : null;
    const wmape = sumActualMcp > 0 ? (sumAbsoluteError / sumActualMcp) * 100 : null;

    return {
      intervals,
      analytics: {
        averageMcp: parseFloat(averageMcpForecasted.toFixed(2)),
        averageMcpForecasted: parseFloat(averageMcpForecasted.toFixed(2)),
        averageMcpActual: averageMcpActual !== null ? parseFloat(averageMcpActual.toFixed(2)) : 'N/A',
        totalVolume: parseFloat(sumFsv.toFixed(2)),
        maxMcv: maxMcv === -Infinity ? 0 : maxMcv,
        maxFsv: maxFsv === -Infinity ? 0 : maxFsv,
        maxMcp: maxMcp === -Infinity ? 0 : parseFloat(maxMcp.toFixed(2)),
        minMcp: minMcpForecasted === Infinity ? 0 : parseFloat(minMcpForecasted.toFixed(2)),
        minMcpForecasted: parseFloat(minMcpForecasted.toFixed(2)),
        minMcpActual: minMcpActual !== null ? parseFloat(minMcpActual.toFixed(2)) : 'N/A',
        mape: mape !== null ? `${mape.toFixed(2)}%` : 'N/A',
        mae: mae !== null ? parseFloat(mae.toFixed(2)) : 'N/A',
        wmape: wmape !== null ? `${wmape.toFixed(2)}%` : 'N/A',
        confidence: confidenceCount > 0 ? (sumConfidence / confidenceCount).toFixed(2) : 'N/A'
      }
    };
  }

  /**
   * Fetch Demand Forecast
   */
  public static async getDemandForecast(type: string, startDateStr: string, endDateStr: string, interval: string = '15min', meterNo?: string) {
    const dates = this.getDatesInRange(startDateStr, endDateStr);
    const intervals: DemandForecastIntervalData[] = [];

    // Base params
    const isAllIndia = type === 'all-india';

    try {
      if (isAllIndia) {
        // Automatically fetch live NPP demand data for requested dates if actual records are missing or date is today
        const todayStr = new Date().toISOString().split('T')[0];
        for (const dateStr of dates) {
          try {
            const existingCount = await prisma.nppAdjustedDemandData.count({ where: { date: dateStr } });
            if (existingCount === 0 || dateStr === todayStr) {
              const liveData = await VidyutPravahScraper.getNppDemandData(dateStr);
              if (liveData && liveData.length > 0) {
                await prisma.nppRawDemandData.createMany({
                  data: liveData.map(d => ({
                    date: d.date,
                    timeStr: d.timeStr,
                    demandMet: d.demandMet,
                    dataUpdatedAt: d.dataUpdatedAt,
                    fetchedAt: new Date(),
                  })),
                  skipDuplicates: true
                });
                await NppAdjustmentService.updateAdjustedDemandForDate(dateStr);
              }
            }
          } catch (eScrape) {
            console.error(`[ForecastService] Live NPP demand polling failed for ${dateStr}:`, eScrape);
          }
        }

        // Build the timestamp range based on dates array (assumed dates are in IST, so we parse properly)
        const startDate = new Date(`${dates[0]}T00:00:00+05:30`);
        const endDate = new Date(`${dates[dates.length - 1]}T23:59:59+05:30`);

        let records = await prisma.forecastAllIndiaDemandV2.findMany({
          where: { 
            timestamp: { 
              gte: startDate,
              lte: endDate
            } 
          },
          orderBy: [{ timestamp: 'asc' }]
        });

        // Fallback to Generation_forecasting if ForecastAllIndiaDemandV2 is empty
        if (!records || records.length === 0) {
          try {
            const genRows: any[] = await prisma.$queryRawUnsafe(
              `SELECT DISTINCT ON (forecast_for_timestamp, source)
                  forecast_for_timestamp,
                  source,
                  forecast_mw
               FROM "forecasting"."Generation_forecasting"
               WHERE (forecast_for_timestamp::date)::text >= $1 AND (forecast_for_timestamp::date)::text <= $2
               ORDER BY forecast_for_timestamp ASC, source ASC, forecast_generated_at DESC`,
              dates[0],
              dates[dates.length - 1]
            );
            if (genRows && genRows.length > 0) {
              const timeMap = new Map<string, { timestamp: Date, demand: number }>();
              for (const row of genRows) {
                const tsKey = new Date(row.forecast_for_timestamp).toISOString();
                if (!timeMap.has(tsKey)) {
                  timeMap.set(tsKey, { timestamp: new Date(row.forecast_for_timestamp), demand: 0 });
                }
                timeMap.get(tsKey)!.demand += Number(row.forecast_mw || 0);
              }
              records = Array.from(timeMap.values()).map(item => ({
                timestamp: item.timestamp,
                forecast_demand: parseFloat(item.demand.toFixed(2))
              })) as any[];
            }
          } catch (eGen) {
            console.error('[ForecastService] Error fallback querying Generation_forecasting:', eGen);
          }
        }

        const actualRecords = await prisma.nppAdjustedDemandData.findMany({
          where: { date: { in: dates } }
        }).then(res => res.length > 0 ? res : prisma.nppRawDemandData.findMany({ where: { date: { in: dates } } }));

        const actualMap = new Map<string, number>();
        actualRecords.forEach((a: any) => {
          const rawTime = a.timeStr ? (a.timeStr.includes(' ') ? a.timeStr.split(' ')[1] || a.timeStr.split(' ')[0] : a.timeStr) : '';
          if (rawTime) {
            actualMap.set(`${a.date}_${rawTime}`, Number(a.demandMet));

            const parts = rawTime.split(':').map(Number);
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              const totalMins = parts[0] * 60 + parts[1];
              const slotMins = Math.floor(totalMins / 15) * 15;
              const slotH = String(Math.floor(slotMins / 60) % 24).padStart(2, '0');
              const slotM = String(slotMins % 60).padStart(2, '0');
              const slotStr = `${slotH}:${slotM}`;
              const intervalNum = Math.floor(totalMins / 15) + 1;

              if (!actualMap.has(`${a.date}_${slotStr}`)) {
                actualMap.set(`${a.date}_${slotStr}`, Number(a.demandMet));
              }
              if (!actualMap.has(`${a.date}_${intervalNum}`)) {
                actualMap.set(`${a.date}_${intervalNum}`, Number(a.demandMet));
              }
            }
          }
        });

        if (records && records.length > 0) {
          const formatted = records.map(r => {
            const { dateStr, hourStr, intervalNumber, timeBlock } = ForecastService.getISTComponents(r.timestamp);
            const forecastedVal = r.forecast_demand !== null ? Number(r.forecast_demand) : 0;
            const actualVal = actualMap.get(`${dateStr}_${hourStr}`) ?? actualMap.get(`${dateStr}_${intervalNumber}`) ?? null;

            return {
              date: dateStr,
              hour: hourStr,
              timeBlock: timeBlock,
              intervalNumber: intervalNumber,
              demand: forecastedVal,
              actualDemand: actualVal
            };
          });


          // Only keep intervals that match our requested dates
          const filtered = formatted.filter(f => dates.includes(f.date) || dates.length === 1);
          intervals.push(...this.aggregateDemandIntervals(filtered, interval));
        } else if (actualMap.size > 0) {
          // If no forecast records, construct intervals from actualMap
          const defaultFormatted: DemandForecastIntervalData[] = [];
          for (const dateStr of dates) {
            for (let t = 1; t <= 96; t++) {
              const hourNum = Math.floor((t - 1) / 4);
              const minNum = ((t - 1) % 4) * 15;
              const startH = String(hourNum).padStart(2, '0');
              const startM = String(minNum).padStart(2, '0');
              const hourStr = `${startH}:${startM}`;
              const nextMin = (minNum + 15) % 60;
              const nextHour = nextMin === 0 ? (hourNum + 1) % 24 : hourNum;
              const timeBlock = `${hourStr} - ${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;

              const actVal = actualMap.get(`${dateStr}_${hourStr}`) ?? actualMap.get(`${dateStr}_${t}`) ?? null;
              if (actVal !== null) {
                defaultFormatted.push({
                  date: dateStr,
                  hour: startH,
                  timeBlock,
                  intervalNumber: t,
                  demand: 0,
                  actualDemand: actVal
                });
              }
            }
          }
          if (defaultFormatted.length > 0) {
            intervals.push(...this.aggregateDemandIntervals(defaultFormatted, interval));
          }
        }
      } else {
        // Consumer demand
        let formatted: DemandForecastIntervalData[] = [];

        try {
          const [records, actualMap] = await Promise.all([
            prisma.$queryRawUnsafe(
              `SELECT timestamp, (timestamp::date)::text as date_str, slot_number, forecasted_energy, actual_energy
               FROM "forecasting"."consumer_demand_forecasting"
               WHERE (timestamp::date)::text = ANY($1::text[])
               ORDER BY timestamp ASC, slot_number ASC`,
              dates
            ) as Promise<any[]>,
            StarrocksService.getConsumerActualDemandMap(dates, meterNo)
          ]);

          formatted = records.map((r: any) => {
            const dateStr = r.date_str || (
              typeof r.timestamp === 'string'
                ? r.timestamp.split('T')[0]
                : new Date(r.timestamp).toISOString().split('T')[0]
            );

            const slotNum = Number(r.slot_number || 1);
            const startMins = (slotNum - 1) * 15;
            const endMins = slotNum * 15;

            const startH = String(Math.floor(startMins / 60) % 24).padStart(2, '0');
            const startM = String(startMins % 60).padStart(2, '0');
            const endH = String(Math.floor(endMins / 60) % 24).padStart(2, '0');
            const endM = String(endMins % 60).padStart(2, '0');

            const timeBlock = `${startH}:${startM} - ${endH}:${endM}`;
            const hourNum = Math.floor((slotNum - 1) / 4) + 1;

            const starrocksVal = actualMap.get(`${dateStr}_${startH}:${startM}`) ?? actualMap.get(`${dateStr}_${slotNum}`);
            let actualVal: number | null = null;
            if (starrocksVal !== undefined && starrocksVal !== null) {
              actualVal = starrocksVal;
            } else if (r.actual_energy !== null && r.actual_energy !== undefined) {
              const rawAct = Number(r.actual_energy);
              actualVal = rawAct > 300 ? Number((rawAct * 0.4).toFixed(2)) : rawAct;
            }

            return {
              date: dateStr,
              hour: String(hourNum).padStart(2, '0'),
              timeBlock,
              intervalNumber: slotNum,
              demand: r.forecasted_energy !== null && r.forecasted_energy !== undefined 
                ? Number(r.forecasted_energy) 
                : (r.forecast_demand !== null && r.forecast_demand !== undefined ? Number(r.forecast_demand) : 0),
              actualDemand: actualVal
            };
          });
        } catch {
          // Legacy schema fallback (timestamp + forecast_demand)
          const records: any[] = await prisma.$queryRawUnsafe(
            `SELECT timestamp, (timestamp::date)::text as date_str, forecast_demand
             FROM "forecasting"."consumer_demand_forecasting"
             WHERE (timestamp::date)::text = ANY($1::text[])
             ORDER BY timestamp ASC`,
            dates
          );

          formatted = records.map((r: any, idx: number) => {
            const dateStr = r.date_str || (
              typeof r.timestamp === 'string'
                ? r.timestamp.split('T')[0]
                : new Date(r.timestamp).toISOString().split('T')[0]
            );

            const slotNum = idx + 1;
            const startMins = (slotNum - 1) * 15;
            const endMins = slotNum * 15;

            const startH = String(Math.floor(startMins / 60) % 24).padStart(2, '0');
            const startM = String(startMins % 60).padStart(2, '0');
            const endH = String(Math.floor(endMins / 60) % 24).padStart(2, '0');
            const endM = String(endMins % 60).padStart(2, '0');

            const timeBlock = `${startH}:${startM} - ${endH}:${endM}`;
            const hourNum = Math.floor((slotNum - 1) / 4) + 1;

            return {
              date: dateStr,
              hour: String(hourNum).padStart(2, '0'),
              timeBlock,
              intervalNumber: slotNum,
              demand: r.forecast_demand !== null && r.forecast_demand !== undefined ? Number(r.forecast_demand) : 0,
              actualDemand: null
            };
          });
        }

        if (formatted.length > 0) {

          intervals.push(...this.aggregateDemandIntervals(formatted, interval));
        }
      }
    } catch (e) {
      console.warn('[ForecastService] Error querying DB for demand:', e);
    }



    // Analytics computation
    let sumDemand = 0;
    let maxDemand = -Infinity;
    let minDemand = Infinity;

    let sumActualDemand = 0;
    let sumAbsoluteError = 0;
    let sumPercentageError = 0;
    let errorCount = 0;
    let actualCount = 0;

    for (const row of intervals) {
      const dem = row.demand;
      const actual = row.actualDemand !== null && row.actualDemand !== undefined ? Number(row.actualDemand) : null;
      
      sumDemand += dem;
      if (dem > maxDemand) maxDemand = dem;
      if (dem < minDemand) minDemand = dem;

      if (actual !== null) {
        sumActualDemand += actual;
        actualCount++;
        const absErr = Math.abs(actual - dem);
        sumAbsoluteError += absErr;
        
        if (actual > 0) {
          sumPercentageError += (absErr / actual);
          errorCount++;
        }
      }
    }

    const averageDemand = intervals.length > 0 ? sumDemand / intervals.length : 0;
    const mae = actualCount > 0 ? sumAbsoluteError / actualCount : null;
    const mape = errorCount > 0 ? (sumPercentageError / errorCount) * 100 : null;
    const wmape = sumActualDemand > 0 ? (sumAbsoluteError / sumActualDemand) * 100 : null;

    return {
      intervals,
      analytics: {
        averageDemand: Math.round(averageDemand),
        maxDemand: maxDemand === -Infinity ? 0 : maxDemand,
        minDemand: minDemand === Infinity ? 0 : minDemand,
        totalEnergyKwh: Math.round(sumDemand * 0.25), // assuming 15min intervals for total energy integration
        mape: mape !== null ? `${mape.toFixed(2)}%` : 'N/A',
        mae: mae !== null ? parseFloat(mae.toFixed(2)) : 'N/A',
        wmape: wmape !== null ? `${wmape.toFixed(2)}%` : 'N/A'
      }
    };
  }

  private static aggregateDemandIntervals(records: DemandForecastIntervalData[], interval: string): DemandForecastIntervalData[] {
    if (interval === '15min') return records;

    if (interval === 'hourly') {
      const hourlyData: DemandForecastIntervalData[] = [];
      for (let h = 0; h < 24; h++) {
        const hourStr = h.toString().padStart(2, '0');
        const hourRecords = records.filter(r => parseInt(r.hour) === h + 1);
        if (hourRecords.length === 0) continue;

        const avgDemand = hourRecords.reduce((acc, r) => acc + r.demand, 0) / hourRecords.length;

        let avgActual: number | null = null;
        const validActuals = hourRecords.filter(r => r.actualDemand !== null && r.actualDemand !== undefined);
        if (validActuals.length > 0) {
          avgActual = validActuals.reduce((acc, r) => acc + (r.actualDemand || 0), 0) / validActuals.length;
        }

        hourlyData.push({
          date: hourRecords[0].date,
          hour: hourStr,
          timeBlock: `${hourStr}:00 - ${(h + 1).toString().padStart(2, '0')}:00`,
          intervalNumber: h + 1,
          demand: parseFloat(avgDemand.toFixed(2)),
          actualDemand: avgActual !== null ? parseFloat(avgActual.toFixed(2)) : null
        });
      }
      return hourlyData;
    }

    if (interval === 'daily') {
      const dailyMap: { [date: string]: DemandForecastIntervalData[] } = {};
      records.forEach(r => {
        if (!dailyMap[r.date]) dailyMap[r.date] = [];
        dailyMap[r.date].push(r);
      });

      return Object.keys(dailyMap).map(date => {
        const dateRecords = dailyMap[date];
        const avgDemand = dateRecords.reduce((acc, r) => acc + r.demand, 0) / dateRecords.length;

        let avgActual: number | null = null;
        const validActuals = dateRecords.filter(r => r.actualDemand !== null && r.actualDemand !== undefined);
        if (validActuals.length > 0) {
          avgActual = validActuals.reduce((acc, r) => acc + (r.actualDemand || 0), 0) / validActuals.length;
        }

        return {
          date,
          hour: '24',
          timeBlock: 'Full Day',
          intervalNumber: 1,
          demand: parseFloat(avgDemand.toFixed(2)),
          actualDemand: avgActual !== null ? parseFloat(avgActual.toFixed(2)) : null
        };
      });
    }

    return records;
  }

  static async getForecastDates(market: string): Promise<string[]> {
    return this.getAvailableDates(market);
  }

  // Common service method for date lookups
  static async getAvailableDates(market: string): Promise<string[]> {
    if (market.toUpperCase() === 'DAM') {
      try {
        const [forecastRows, actualRows] = await Promise.all([
          prisma.damForecasting.findMany({
            select: { forecasting_for: true },
            distinct: ['forecasting_for']
          }),
          prisma.dataset.findMany({
            where: { market: 'DAM', status: 'ACTIVE' },
            select: { deliveryDate: true },
            distinct: ['deliveryDate']
          })
        ]);

        const allDates = new Set<string>();
        forecastRows.forEach(r => {
          if (r.forecasting_for) {
            const dStr = r.forecasting_for instanceof Date 
              ? r.forecasting_for.toISOString().split('T')[0] 
              : new Date(r.forecasting_for).toISOString().split('T')[0];
            allDates.add(dStr);
          }
        });
        actualRows.forEach(r => {
          if (r.deliveryDate) {
            const dStr = r.deliveryDate instanceof Date 
              ? r.deliveryDate.toISOString().split('T')[0] 
              : new Date(r.deliveryDate).toISOString().split('T')[0];
            allDates.add(dStr);
          }
        });
        return Array.from(allDates).sort((a, b) => b.localeCompare(a));
      } catch (e) { 
        console.error('[ForecastService] Error in DAM dates:', e);
        return []; 
      }
    } else if (market.toUpperCase() === 'GDAM') {
      try {
        let mcpForecastDateRows: Array<{ date: string }> = [];
        for (const schema of ['forecasting', 'public']) {
          try {
            mcpForecastDateRows = await prisma.$queryRawUnsafe(
              `SELECT DISTINCT COALESCE(forecasting_for, date)::text AS date
               FROM "${schema}"."GdamMcpForecast"
               WHERE COALESCE(forecasting_for, date) IS NOT NULL
               ORDER BY date DESC`
            );
            if (mcpForecastDateRows.length > 0) break;
          } catch (error) {
            console.error(`[ForecastService] Error querying ${schema}.GdamMcpForecast dates:`, error);
          }
        }

        const [legacyForecastRows, actualRows] = await Promise.all([
          prisma.forecastGdam.findMany({
            select: { date: true },
            distinct: ['date']
          }),
          prisma.dataset.findMany({
            where: { market: 'GDAM', status: 'ACTIVE' },
            select: { deliveryDate: true },
            distinct: ['deliveryDate']
          })
        ]);
        const allDates = new Set<string>();
        mcpForecastDateRows.forEach(row => {
          if (row.date) allDates.add(String(row.date).split('T')[0]);
        });
        legacyForecastRows.forEach(r => {
          if (r.date) {
            let dStr = r.date;
            if (dStr.includes('-')) {
              const parts = dStr.split('-');
              if (parts[0].length === 2 && parts[2].length === 4) {
                dStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
            }
            allDates.add(dStr);
          }
        });
        actualRows.forEach(r => {
          if (r.deliveryDate) {
            const dStr = r.deliveryDate instanceof Date 
              ? r.deliveryDate.toISOString().split('T')[0] 
              : new Date(r.deliveryDate).toISOString().split('T')[0];
            allDates.add(dStr);
          }
        });
        return Array.from(allDates).sort((a, b) => b.localeCompare(a));
      } catch (e) { 
        console.error('[ForecastService] Error in GDAM dates:', e);
        return []; 
      }
    } else if (market.toUpperCase() === 'RTM') {
      try {
        const [dayaheadRows, nowcastRows, actualRows] = await Promise.all([
          prisma.rtmDayahead.findMany({
            select: { date: true },
            distinct: ['date']
          }),
          prisma.rtmNowcast.findMany({
            select: { date: true },
            distinct: ['date']
          }),
          prisma.dataset.findMany({
            where: { market: 'RTM', status: 'ACTIVE' },
            select: { deliveryDate: true },
            distinct: ['deliveryDate']
          })
        ]);
        const allDates = new Set<string>();
        dayaheadRows.forEach(r => allDates.add(r.date));
        nowcastRows.forEach(r => allDates.add(r.date));
        actualRows.forEach(r => {
          const dStr = r.deliveryDate instanceof Date 
            ? r.deliveryDate.toISOString().split('T')[0] 
            : new Date(r.deliveryDate).toISOString().split('T')[0];
          allDates.add(dStr);
        });
        return Array.from(allDates).sort((a, b) => b.localeCompare(a));
      } catch (e) { return []; }
    } else if (market.toUpperCase() === 'CONSUMER') {
      try {
        const rows: Array<{ date_str: string }> = await prisma.$queryRawUnsafe(
          `SELECT DISTINCT (timestamp::date)::text as date_str
           FROM "forecasting"."consumer_demand_forecasting"
           WHERE timestamp IS NOT NULL
           ORDER BY date_str DESC`
        );
        return rows.map(r => r.date_str);
      } catch (e) { return []; }
    } else if (market.toUpperCase() === 'ALL-INDIA') {
      try {
        const [v2Rows, genRows, actualRows] = await Promise.all([
          prisma.forecastAllIndiaDemandV2.findMany({
            select: { timestamp: true },
            distinct: ['timestamp']
          }),
          prisma.$queryRawUnsafe(`SELECT DISTINCT (forecast_for_timestamp::date)::text as date_str FROM "forecasting"."Generation_forecasting"`) as Promise<any[]>,
          prisma.nppAdjustedDemandData.findMany({
            select: { date: true },
            distinct: ['date']
          })
        ]);
        const allDates = new Set<string>();
        v2Rows.forEach(r => {
          const istDate = new Date(r.timestamp.getTime() + (5.5 * 60 * 60 * 1000));
          allDates.add(istDate.toISOString().split('T')[0]);
        });
        if (Array.isArray(genRows)) {
          genRows.forEach((r: any) => { if (r.date_str) allDates.add(r.date_str.split('T')[0]); });
        }
        actualRows.forEach(r => { if (r.date) allDates.add(r.date); });
        return Array.from(allDates).sort((a, b) => b.localeCompare(a));
      } catch (e) { return []; }
    } else if (market.toUpperCase() === 'NPP' || market.toUpperCase() === 'GENERATION') {
      try {
        const allDates = new Set<string>();
        let rows: Array<{ date_str: string }> = [];
        try {
          rows = await prisma.$queryRawUnsafe(
            `SELECT DISTINCT (forecast_for_timestamp::date)::text as date_str
             FROM "forecasting"."Generation_forecasting"
             WHERE forecast_for_timestamp IS NOT NULL
             ORDER BY date_str DESC`
          );
        } catch (e1) {
          try {
            rows = await prisma.$queryRawUnsafe(
              `SELECT DISTINCT (forecast_for_timestamp::date)::text as date_str
               FROM forecasting.generation_forecasting
               WHERE forecast_for_timestamp IS NOT NULL
               ORDER BY date_str DESC`
            );
          } catch (e2) {}
        }
        if (Array.isArray(rows)) {
          rows.forEach(r => { if (r.date_str) allDates.add(r.date_str.split('T')[0]); });
        }

        const actualRecords = await prisma.nppAdjustedGenerationData.findMany({
          select: { date: true },
          distinct: ['date']
        });
        actualRecords.forEach(a => { if (a.date) allDates.add(a.date); });

        return Array.from(allDates).sort((a, b) => b.localeCompare(a));
      } catch (e) {
        console.error('[ForecastService] Error fetching NPP dates:', e);
        return [];
      }
    }
    return [];
  }

  /**
   * Fetch Generation Forecast
   */
  public static async getGenerationForecast(startDateStr: string, endDateStr: string, interval: string = '15min', model: string = 'Model1') {
    const dates = this.getDatesInRange(startDateStr, endDateStr);
    const intervals: any[] = [];

    try {
      // 1. Fetch actual generation data from NppAdjustedGenerationData
      const actualRecords = await prisma.nppAdjustedGenerationData.findMany({
        where: { date: { in: dates } }
      });
      const actualMap = new Map<string, number>();
      actualRecords.forEach((a: any) => {
        const totalActual = (a.thermal || 0) + (a.gas || 0) + (a.nuclear || 0) + (a.hydro || 0) + (a.wind || 0) + (a.solar || 0);
        actualMap.set(`${a.date}_${a.timeStr}`, Number(totalActual.toFixed(2)));
      });

      // 2. Fetch forecasted generation data with robust table name & query fallbacks
      let forecastRows: any[] = [];
      try {
        forecastRows = await prisma.$queryRawUnsafe(
          `SELECT DISTINCT ON (forecast_for_timestamp, source)
              forecast_for_timestamp,
              source,
              forecast_mw,
              confidence_score
           FROM "forecasting"."Generation_forecasting"
           WHERE (forecast_for_timestamp::date)::text >= $1 AND (forecast_for_timestamp::date)::text <= $2
           ORDER BY forecast_for_timestamp ASC, source ASC, forecast_generated_at DESC`,
          startDateStr,
          endDateStr
        );
      } catch (e1) {
        try {
          forecastRows = await prisma.$queryRawUnsafe(
            `SELECT DISTINCT ON (forecast_for_timestamp, source)
                forecast_for_timestamp,
                source,
                forecast_mw,
                confidence_score
             FROM forecasting.generation_forecasting
             WHERE (forecast_for_timestamp::date)::text >= $1 AND (forecast_for_timestamp::date)::text <= $2
             ORDER BY forecast_for_timestamp ASC, source ASC, forecast_generated_at DESC`,
            startDateStr,
            endDateStr
          );
        } catch (e2) {
          console.error('[ForecastService] Query failed on both table names:', e2);
        }
      }

      if (!forecastRows || forecastRows.length === 0) {
        try {
          forecastRows = await prisma.$queryRawUnsafe(
            `SELECT DISTINCT ON (forecast_for_timestamp, source)
                forecast_for_timestamp,
                source,
                forecast_mw,
                confidence_score
             FROM forecasting.generation_forecasting
             WHERE DATE(forecast_for_timestamp) >= $1::date AND DATE(forecast_for_timestamp) <= $2::date
             ORDER BY forecast_for_timestamp ASC, source ASC, forecast_generated_at DESC`,
            startDateStr,
            endDateStr
          );
        } catch (e3) {
          // Final fallback
        }
      }

      const timeMap = new Map();
      for (const r of forecastRows) {
        const d = new Date(r.forecast_for_timestamp);
        const tsKey = d.toISOString();
        if (!timeMap.has(tsKey)) {
          timeMap.set(tsKey, { date: d, sources: {}, totalMw: 0, confs: [] });
        }
        const item = timeMap.get(tsKey);
        const mw = Number(r.forecast_mw || 0);
        item.sources[r.source] = parseFloat(mw.toFixed(2));
        item.totalMw += mw;
        if (r.confidence_score !== null && r.confidence_score !== undefined) {
          item.confs.push(Number(r.confidence_score));
        }
      }

      const rawFormatted = Array.from(timeMap.values()).map(item => {
        const { dateStr, hourStr, startH, startM, intervalNumber, timeBlock } = ForecastService.getISTComponents(item.date);
        const slotKey = `${startH}:${startM}`;
        const actGen = actualMap.has(`${dateStr}_${slotKey}`) ? actualMap.get(`${dateStr}_${slotKey}`) : (actualMap.has(`${dates[0]}_${slotKey}`) ? actualMap.get(`${dates[0]}_${slotKey}`) : null);
        const avgConf = item.confs.length > 0 ? (item.confs.reduce((a: number, b: number) => a + b, 0) / item.confs.length).toFixed(1) + '%' : 'N/A';

        return {
          date: dateStr,
          hour: hourStr,
          timeBlock,
          intervalNumber,
          generation: parseFloat(item.totalMw.toFixed(2)),
          actualGeneration: actGen !== undefined ? actGen : null,
          confidence: avgConf,
          ...item.sources
        };
      });

      // Forward-fill actualGeneration
      let lastActualGen: number | null = null;
      for (let i = 0; i < rawFormatted.length; i++) {
        if (rawFormatted[i].actualGeneration !== null && rawFormatted[i].actualGeneration !== undefined) {
          lastActualGen = rawFormatted[i].actualGeneration;
        } else if (lastActualGen !== null) {
          rawFormatted[i].actualGeneration = lastActualGen;
        }
      }

      // Backward-fill actualGeneration (if initial slots of day were missing)
      let firstActualGen: number | null = null;
      for (let i = rawFormatted.length - 1; i >= 0; i--) {
        if (rawFormatted[i].actualGeneration !== null && rawFormatted[i].actualGeneration !== undefined) {
          firstActualGen = rawFormatted[i].actualGeneration;
        } else if (firstActualGen !== null) {
          rawFormatted[i].actualGeneration = firstActualGen;
        }
      }

      if (rawFormatted.length === 0 && actualRecords.length > 0) {
        // Build intervals from actualRecords if no forecast rows found
        actualRecords.forEach((a: any) => {
          const totalActual = (a.thermal || 0) + (a.gas || 0) + (a.nuclear || 0) + (a.hydro || 0) + (a.wind || 0) + (a.solar || 0);
          const timeStr = a.timeStr || '00:00';
          const parts = timeStr.split(':');
          const hNum = parseInt(parts[0], 10) || 0;
          const mNum = parseInt(parts[1], 10) || 0;
          const minutes = hNum * 60 + mNum;
          const intervalNumber = Math.floor(minutes / 15) + 1;
          const endMinutes = minutes + 15;
          const endH = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
          const endM = String(endMinutes % 60).padStart(2, '0');
          const hourStr = String(hNum + 1).padStart(2, '0');
          const startH = String(hNum).padStart(2, '0');
          const startM = String(mNum).padStart(2, '0');
          const timeBlock = `${startH}:${startM} - ${endH}:${endM}`;

          rawFormatted.push({
            date: a.date,
            hour: hourStr,
            timeBlock,
            intervalNumber,
            generation: totalActual > 0 ? Number(totalActual.toFixed(2)) : 0,
            actualGeneration: Number(totalActual.toFixed(2)),
            confidence: 'N/A',
            thermal: a.thermal,
            gas: a.gas,
            nuclear: a.nuclear,
            hydro: a.hydro,
            wind: a.wind,
            solar: a.solar
          });
        });
      }

      if (rawFormatted.length === 0) {
        // Ultimate Fallback: Find latest available date in NppAdjustedGenerationData
        const latestActual = await prisma.nppAdjustedGenerationData.findFirst({
          orderBy: { date: 'desc' },
          select: { date: true }
        });
        if (latestActual && latestActual.date) {
          const fallbackRecords = await prisma.nppAdjustedGenerationData.findMany({
            where: { date: latestActual.date },
            orderBy: { timeStr: 'asc' }
          });
          fallbackRecords.forEach((a: any) => {
            const totalActual = (a.thermal || 0) + (a.gas || 0) + (a.nuclear || 0) + (a.hydro || 0) + (a.wind || 0) + (a.solar || 0);
            const timeStr = a.timeStr || '00:00';
            const parts = timeStr.split(':');
            const hNum = parseInt(parts[0], 10) || 0;
            const mNum = parseInt(parts[1], 10) || 0;
            const minutes = hNum * 60 + mNum;
            const intervalNumber = Math.floor(minutes / 15) + 1;
            const endMinutes = minutes + 15;
            const endH = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
            const endM = String(endMinutes % 60).padStart(2, '0');
            const hourStr = String(hNum + 1).padStart(2, '0');
            const startH = String(hNum).padStart(2, '0');
            const startM = String(mNum).padStart(2, '0');
            const timeBlock = `${startH}:${startM} - ${endH}:${endM}`;

            rawFormatted.push({
              date: a.date,
              hour: hourStr,
              timeBlock,
              intervalNumber,
              generation: totalActual > 0 ? Number(totalActual.toFixed(2)) : 0,
              actualGeneration: Number(totalActual.toFixed(2)),
              confidence: 'N/A',
              thermal: a.thermal,
              gas: a.gas,
              nuclear: a.nuclear,
              hydro: a.hydro,
              wind: a.wind,
              solar: a.solar
            });
          });
        }
      }

      if (rawFormatted.length > 0) {
        intervals.push(...this.aggregateGenerationIntervals(rawFormatted, interval));
      }
    } catch (e) {
      console.error('[ForecastService] Error querying Generation_forecasting:', e);
    }

    // Analytics computation
    let sumGen = 0;
    let maxGen = -Infinity;
    let minGen = Infinity;
    let sumActualGen = 0;
    let sumAbsoluteError = 0;
    let sumPercentageError = 0;
    let errorCount = 0;
    let actualCount = 0;
    let sumConfidence = 0;
    let confidenceCount = 0;

    for (const row of intervals) {
      const gen = row.generation;
      const actual = row.actualGeneration !== null && row.actualGeneration !== undefined ? Number(row.actualGeneration) : null;
      
      sumGen += gen;
      if (gen > maxGen) maxGen = gen;
      if (gen < minGen) minGen = gen;

      if (row.confidence && row.confidence !== 'N/A') {
        const confNum = parseFloat(row.confidence);
        if (!isNaN(confNum)) {
          sumConfidence += confNum;
          confidenceCount++;
        }
      }

      if (actual !== null) {
        sumActualGen += actual;
        actualCount++;
        const absErr = Math.abs(actual - gen);
        sumAbsoluteError += absErr;
        
        if (actual > 0) {
          sumPercentageError += (absErr / actual);
          errorCount++;
        }
      }
    }

    const averageGeneration = intervals.length > 0 ? sumGen / intervals.length : 0;
    const averageGenerationActual = actualCount > 0 ? sumActualGen / actualCount : null;
    const mae = actualCount > 0 ? sumAbsoluteError / actualCount : null;
    const mape = errorCount > 0 ? (sumPercentageError / errorCount) * 100 : null;
    const wmape = sumActualGen > 0 ? (sumAbsoluteError / sumActualGen) * 100 : null;

    const validActuals = intervals.map(i => i.actualGeneration).filter(v => v !== null && v !== undefined);

    return {
      intervals,
      analytics: {
        averageGeneration: Math.round(averageGeneration),
        averageGenerationForecasted: Math.round(averageGeneration),
        averageGenerationActual: averageGenerationActual !== null ? Math.round(averageGenerationActual) : 'N/A',
        minGeneration: minGen === Infinity ? 0 : Math.round(minGen),
        minGenerationForecasted: minGen === Infinity ? 0 : Math.round(minGen),
        minGenerationActual: validActuals.length > 0 ? Math.round(Math.min(...validActuals)) : 'N/A',
        maxGeneration: maxGen === -Infinity ? 0 : Math.round(maxGen),
        mape: mape !== null ? `${mape.toFixed(2)}%` : 'N/A',
        mae: mae !== null ? parseFloat(mae.toFixed(2)) : 'N/A',
        wmape: wmape !== null ? `${wmape.toFixed(2)}%` : 'N/A',
        confidence: confidenceCount > 0 ? `${(sumConfidence / confidenceCount).toFixed(1)}%` : 'N/A'
      }
    };
  }

  private static aggregateGenerationIntervals(records: any[], interval: string): any[] {
    if (interval === '15min') return records;

    if (interval === 'hourly') {
      const hourlyData: any[] = [];
      for (let h = 0; h < 24; h++) {
        const hourStr = (h + 1).toString().padStart(2, '0');
        const hourRecords = records.filter(r => parseInt(r.hour) === h + 1);
        if (hourRecords.length === 0) continue;

        const avgGen = hourRecords.reduce((acc, r) => acc + r.generation, 0) / hourRecords.length;

        let avgActual: number | null = null;
        const validActuals = hourRecords.filter(r => r.actualGeneration !== null && r.actualGeneration !== undefined);
        if (validActuals.length > 0) {
          avgActual = validActuals.reduce((acc, r) => acc + (r.actualGeneration || 0), 0) / validActuals.length;
        }

        hourlyData.push({
          date: hourRecords[0].date,
          hour: hourStr,
          timeBlock: `${(h).toString().padStart(2, '0')}:00 - ${hourStr}:00`,
          intervalNumber: h + 1,
          generation: parseFloat(avgGen.toFixed(2)),
          actualGeneration: avgActual !== null ? parseFloat(avgActual.toFixed(2)) : null,
          confidence: hourRecords[0].confidence
        });
      }
      return hourlyData;
    }

    if (interval === 'daily') {
      const dailyMap: { [date: string]: any[] } = {};
      records.forEach(r => {
        if (!dailyMap[r.date]) dailyMap[r.date] = [];
        dailyMap[r.date].push(r);
      });

      return Object.keys(dailyMap).map(date => {
        const dateRecords = dailyMap[date];
        const avgGen = dateRecords.reduce((acc, r) => acc + r.generation, 0) / dateRecords.length;

        let avgActual: number | null = null;
        const validActuals = dateRecords.filter(r => r.actualGeneration !== null && r.actualGeneration !== undefined);
        if (validActuals.length > 0) {
          avgActual = validActuals.reduce((acc, r) => acc + (r.actualGeneration || 0), 0) / validActuals.length;
        }

        return {
          date,
          hour: '24',
          timeBlock: 'Full Day',
          intervalNumber: 1,
          generation: parseFloat(avgGen.toFixed(2)),
          actualGeneration: avgActual !== null ? parseFloat(avgActual.toFixed(2)) : null,
          confidence: dateRecords[0].confidence
        };
      });
    }

    return records;
  }

  /**
   * Fetch Market Selection Recommendation Forecast
   */
  public static async getMarketSelectionForecast(startDateStr: string, endDateStr: string) {
    const dates = this.getDatesInRange(startDateStr, endDateStr);
    
    // 1. Query Prisma database for cached forecasts
    let cachedRows = await prisma.marketForecasting.findMany({
      where: { date: { in: dates } },
      orderBy: { date: 'asc' }
    });

    const cachedDates = new Set(cachedRows.map(r => r.date));
    const missingDates = dates.filter(d => !cachedDates.has(d));

    // 2. If any requested dates are missing from the cache, trigger Python calculation
    if (missingDates.length > 0) {
      console.log(`[ForecastService] Missing cached records for dates: ${missingDates.join(', ')}. Running python prediction...`);
      try {
        const path = require('path');
        const fs = require('fs');
        const { execFileSync } = require('child_process');
        
        const candidateScripts = [
          path.join(__dirname, '../../../scripts/predict_market_selection.py'),
          path.join(__dirname, '../../scripts/predict_market_selection.py'),
          path.join(process.cwd(), 'scripts/predict_market_selection.py'),
          path.join(process.cwd(), 'backend/scripts/predict_market_selection.py'),
        ];
        const scriptPath = candidateScripts.find((p: string) => fs.existsSync(p)) || candidateScripts[0];

        const candidatePython = [
          path.join(__dirname, '../../../venv/bin/python'),
          path.join(process.cwd(), 'venv/bin/python'),
          path.join(process.cwd(), 'backend/venv/bin/python'),
        ];
        const foundPython = candidatePython.find((p: string) => fs.existsSync(p));
        const pythonExecutable = foundPython || 'python3';

        const sortedMissing = [...missingDates].sort();
        const minMissing = sortedMissing[0];
        const maxMissing = sortedMissing[sortedMissing.length - 1];

        console.log(`[ForecastService] Executing Python: ${pythonExecutable} ${scriptPath} ${minMissing} ${maxMissing}`);
        const stdout = execFileSync(pythonExecutable, [scriptPath, minMissing, maxMissing], { 
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        const output = JSON.parse(stdout);
        if (output.error) {
          throw new Error(output.error);
        }

        if (output.results) {
          const transactions = [];
          for (const dayResult of output.results) {
            const dateVal = dayResult.date;
            const slotsVal = dayResult.slots; // Array of TOD slots

            transactions.push(
              prisma.marketForecasting.upsert({
                where: { date: dateVal },
                update: { slots: slotsVal },
                create: { date: dateVal, slots: slotsVal }
              })
            );
          }
          await prisma.$transaction(transactions);
          console.log(`[ForecastService] Successfully cached ${transactions.length} daily forecasts in DB.`);
          
          // Re-fetch from cache
          cachedRows = await prisma.marketForecasting.findMany({
            where: { date: { in: dates } },
            orderBy: { date: 'asc' }
          });
        }
      } catch (pythonErr: any) {
        const detail = (pythonErr.stderr ? pythonErr.stderr.toString() : '') || (pythonErr.stdout ? pythonErr.stdout.toString() : '') || pythonErr.message;
        console.error('[ForecastService] Python prediction failed:', detail);
        if (cachedRows.length === 0) {
          throw new Error(`Failed to calculate market selection forecast: ${detail}`);
        }
      }
    }

    // 3. Map database rows to the JSON format expected by the frontend
    const results = cachedRows.map(row => ({
      date: row.date,
      slots: typeof row.slots === 'string' ? JSON.parse(row.slots) : row.slots
    }));

    return { results };
  }

  public static async getMeters() {
    return await StarrocksService.getAvailableMeters();
  }
}
