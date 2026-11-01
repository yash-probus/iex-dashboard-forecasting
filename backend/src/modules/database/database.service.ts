import { PrismaClient } from '@prisma/client';
import { Response } from 'express';

const prisma = new PrismaClient();

// Defined interface for the bucket mapping structure
interface DemandBucket {
  total: number;
  count: number;
  max: number;
  min: number;
}

interface GenerationBucket {
  count: number;
  thermalTotal: number;
  gasTotal: number;
  nuclearTotal: number;
  hydroTotal: number;
  windTotal: number;
  solarTotal: number;
}

interface StateRegionMap {
  name: string;
  price: number | null;
  states: Array<{
    name: string;
    demand: number;
    unit: string;
  }>;
}

import axios from 'axios';

export class DatabaseService {
  async getWeatherData(startDate?: string, endDate?: string, type?: string, latitude?: string, longitude?: string) {
    try {
      if (latitude && longitude) {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        if (type === 'historical') {
          const start = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
          const end = endDate || new Date().toISOString().split('T')[0];
          const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,sunshine_duration,relative_humidity_2m_max,precipitation_probability_max,sunrise,sunset&timezone=Asia/Kolkata`;
          
          const response = await axios.get(url);
          const daily = response.data?.daily;
          if (!daily || !daily.time) return [];

          const dailyDates: string[] = daily.time;
          const maxTemps: number[] = daily.temperature_2m_max;
          const minTemps: number[] = daily.temperature_2m_min;
          const windSpeeds: number[] = daily.wind_speed_10m_max;
          const relativeHumidities: number[] = daily.relative_humidity_2m_max;
          const precipProbs: number[] = daily.precipitation_probability_max || [];
          const precipSums: number[] = daily.precipitation_sum;
          const sunshineDurations: number[] = daily.sunshine_duration;
          const sunrises: string[] = daily.sunrise;
          const sunsets: string[] = daily.sunset;

          const data = [];
          for (let i = 0; i < dailyDates.length; i++) {
            const date = dailyDates[i];
            const rawSunrise = sunrises[i] || "";
            const rawSunset = sunsets[i] || "";
            const sunrise = rawSunrise.includes('T') ? rawSunrise.split('T')[1] : rawSunrise || '05:30';
            const sunset = rawSunset.includes('T') ? rawSunset.split('T')[1] : rawSunset || '19:00';
            
            data.push({
              id: `hist-${date}`,
              date,
              maxTemp: maxTemps[i] != null ? Number(maxTemps[i].toFixed(1)) : 30,
              minTemp: minTemps[i] != null ? Number(minTemps[i].toFixed(1)) : 18,
              windSpeed: windSpeeds[i] != null ? Number(windSpeeds[i].toFixed(1)) : 10,
              relativeHumidity: relativeHumidities[i] != null ? Number(relativeHumidities[i].toFixed(1)) : 50,
              precipitationProb: precipProbs[i] != null ? Number(precipProbs[i].toFixed(1)) : 0,
              precipitationSum: precipSums[i] != null ? Number(precipSums[i].toFixed(2)) : 0,
              sunshineDuration: sunshineDurations[i] != null ? Number((sunshineDurations[i] / 3600).toFixed(2)) : 8.0,
              sunrise,
              sunset,
              isActual: true,
              updatedAt: new Date()
            });
          }
          return data;
        } else {
          // Forecast
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability,precipitation&daily=sunrise,sunset,sunshine_duration&forecast_days=16&past_days=1&timezone=Asia/Kolkata`;
          const response = await axios.get(url);
          const hourly = response.data?.hourly;
          const daily = response.data?.daily;
          
          if (!hourly || !hourly.time) return [];

          const hourlyTime: string[] = hourly.time;
          const temps: number[] = hourly.temperature_2m;
          const relativeHumidities: number[] = hourly.relative_humidity_2m;
          const windSpeeds: number[] = hourly.wind_speed_10m;
          const precipProbs: number[] = hourly.precipitation_probability;
          const precipSums: number[] = hourly.precipitation;

          const dailyDates: string[] = daily ? daily.time : [];
          const dailySunrises: string[] = daily ? daily.sunrise : [];
          const dailySunsets: string[] = daily ? daily.sunset : [];
          const dailySunshineDurations: number[] = daily ? daily.sunshine_duration : [];

          const now = new Date();
          const currentHourStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;

          const data = [];
          for (let i = 0; i < hourlyTime.length; i++) {
            const datetimeStr = hourlyTime[i];
            const [date, timeStr] = datetimeStr.split('T');
            if (startDate && date < startDate) continue;
            if (endDate && date > endDate) continue;

            const dailyIndex = dailyDates.indexOf(date);
            let sunrise = "05:30";
            let sunset = "19:00";
            let sunshineDuration = 8.0;

            if (dailyIndex !== -1) {
              const rawSunrise = dailySunrises[dailyIndex];
              const rawSunset = dailySunsets[dailyIndex];
              sunrise = rawSunrise ? rawSunrise.split('T')[1] : "05:30";
              sunset = rawSunset ? rawSunset.split('T')[1] : "19:00";
              sunshineDuration = dailySunshineDurations[dailyIndex] ? Number((dailySunshineDurations[dailyIndex] / 3600).toFixed(2)) : 0;
            }

            const isActual = datetimeStr <= currentHourStr;
            data.push({
              id: `forecast-${date}-${timeStr}`,
              date,
              timeStr,
              maxTemp: temps[i],
              minTemp: temps[i],
              windSpeed: windSpeeds[i] || 10,
              relativeHumidity: relativeHumidities[i] || 0,
              precipitationProb: precipProbs[i] || 0,
              precipitationSum: precipSums[i] || 0,
              sunshineDuration,
              sunrise,
              sunset,
              isActual,
              updatedAt: new Date()
            });
          }
          return data;
        }
      }

      if (type === 'historical') {
        const data = await prisma.weatherHistorical.findMany({
          where: startDate && endDate
            ? { date: { gte: startDate, lte: endDate } }
            : startDate
            ? { date: { gte: startDate } }
            : endDate
            ? { date: { lte: endDate } }
            : undefined,
          orderBy: { date: 'asc' }
        });
        return data;
      } else {
        // default to forecast (hourly)
        const data = await prisma.weatherForecastHourly.findMany({
          where: startDate && endDate
            ? { date: { gte: startDate, lte: endDate } }
            : startDate
            ? { date: { gte: startDate } }
            : endDate
            ? { date: { lte: endDate } }
            : undefined,
          orderBy: [
            { date: 'asc' },
            { timeStr: 'asc' }
          ]
        });
        return data;
      }
    } catch (error: unknown) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  }

  async getAllIndiaDemand(startDate?: string, endDate?: string) {
    try {
      const targetStartDate = startDate || new Date().toISOString().split('T')[0];
      const targetEndDate = endDate || targetStartDate;

      const rawRecords = await prisma.nppRawDemandData.findMany({
        where: {
          date: {
            gte: targetStartDate,
            lte: targetEndDate
          }
        },
        orderBy: [
          { date: 'asc' },
          { timeStr: 'asc' }
        ]
      });

      // Aggregate logic
      const adjustedMap: Record<string, DemandBucket> = {};

      for (const record of rawRecords) {
        const timePart = record.timeStr.includes(' ') ? record.timeStr.split(' ')[1] : record.timeStr;
        let [hh, mm] = timePart.split(':').map(Number);

        if (isNaN(hh) || isNaN(mm)) continue;
        if (hh === 24) hh = 0;

        // Calculate the 15-minute block label (e.g. 00:14)
        const blockStartMin = Math.floor(mm / 15) * 15;
        const blockEndMin = blockStartMin + 14;

        const adjustedTimeStr = `${record.date} ${String(hh).padStart(2, '0')}:${String(blockEndMin).padStart(2, '0')}`;

        if (!adjustedMap[adjustedTimeStr]) {
          adjustedMap[adjustedTimeStr] = {
            total: 0,
            count: 0,
            max: -Infinity,
            min: Infinity
          };
        }

        const bucket = adjustedMap[adjustedTimeStr];
        bucket.total += record.demandMet;
        bucket.count += 1;
        if (record.demandMet > bucket.max) bucket.max = record.demandMet;
        if (record.demandMet < bucket.min) bucket.min = record.demandMet;
      }

      const adjustedData = Object.keys(adjustedMap).sort().map(timeStr => {
        const bucket = adjustedMap[timeStr];
        return {
          timeStr,
          avgDemand: Math.round(bucket.total / bucket.count),
          maxDemand: bucket.max === -Infinity ? 0 : bucket.max,
          minDemand: bucket.min === Infinity ? 0 : bucket.min
        };
      });

      return {
        raw: rawRecords.map(r => ({
          ...r,
          timeStr: `${r.date} ${r.timeStr.includes(' ') ? r.timeStr.split(' ')[1] : r.timeStr}`,
          dataUpdatedAt: r.dataUpdatedAt,
          fetchedAt: r.fetchedAt
        })),
        adjusted: adjustedData
      };

    } catch (error: unknown) {
      console.error('Error fetching All India Demand (NPP):', error);
      throw error;
    }
  }

  async getGenerationData(startDate?: string, endDate?: string) {
    try {
      const targetStartDate = startDate || new Date().toISOString().split('T')[0];
      const targetEndDate = endDate || targetStartDate;

      const rawRecords = await prisma.nppRawGenerationData.findMany({
        where: {
          date: {
            gte: targetStartDate,
            lte: targetEndDate
          }
        },
        orderBy: [
          { date: 'asc' },
          { timeStr: 'asc' }
        ]
      });

      if (rawRecords.length === 0) {
        const adjustedRecords = await prisma.nppAdjustedGenerationData.findMany({
          where: {
            date: {
              gte: targetStartDate,
              lte: targetEndDate
            }
          },
          orderBy: [
            { date: 'asc' },
            { timeStr: 'asc' }
          ]
        });

        if (adjustedRecords.length > 0) {
          const adjustedData = adjustedRecords.map(r => ({
            timeStr: `${r.date} ${r.timeStr}`,
            thermal: r.thermal || 0,
            gas: r.gas || 0,
            nuclear: r.nuclear || 0,
            hydro: r.hydro || 0,
            wind: r.wind || 0,
            solar: r.solar || 0
          }));

          return {
            raw: adjustedData.map(r => ({ ...r, dataUpdatedAt: r.timeStr, fetchedAt: r.timeStr })),
            adjusted: adjustedData
          };
        }

        // Fallback: Find latest available date in nppAdjustedGenerationData or nppRawGenerationData
        const latestAdjusted = await prisma.nppAdjustedGenerationData.findFirst({
          orderBy: { date: 'desc' },
          select: { date: true }
        });
        const latestRaw = await prisma.nppRawGenerationData.findFirst({
          orderBy: { date: 'desc' },
          select: { date: true }
        });

        const fallbackDate = latestAdjusted?.date || latestRaw?.date;
        if (fallbackDate) {
          const fallbackAdjusted = await prisma.nppAdjustedGenerationData.findMany({
            where: { date: fallbackDate },
            orderBy: { timeStr: 'asc' }
          });

          if (fallbackAdjusted.length > 0) {
            const adjustedData = fallbackAdjusted.map(r => ({
              timeStr: `${r.date} ${r.timeStr}`,
              thermal: r.thermal || 0,
              gas: r.gas || 0,
              nuclear: r.nuclear || 0,
              hydro: r.hydro || 0,
              wind: r.wind || 0,
              solar: r.solar || 0
            }));

            return {
              raw: adjustedData.map(r => ({ ...r, dataUpdatedAt: r.timeStr, fetchedAt: r.timeStr })),
              adjusted: adjustedData
            };
          }
        }
      }

      // Aggregate logic
      const adjustedMap: Record<string, GenerationBucket> = {};

      for (const record of rawRecords) {
        const timePart = record.timeStr.includes(' ') ? record.timeStr.split(' ')[1] : record.timeStr;
        let [hh, mm] = timePart.split(':').map(Number);

        if (isNaN(hh) || isNaN(mm)) continue;
        if (hh === 24) hh = 0;

        // Calculate the 15-minute block label (e.g. 00:14)
        const blockStartMin = Math.floor(mm / 15) * 15;
        const blockEndMin = blockStartMin + 14;

        const adjustedTimeStr = `${record.date} ${String(hh).padStart(2, '0')}:${String(blockEndMin).padStart(2, '0')}`;

        if (!adjustedMap[adjustedTimeStr]) {
          adjustedMap[adjustedTimeStr] = {
            count: 0,
            thermalTotal: 0, gasTotal: 0, nuclearTotal: 0, hydroTotal: 0, windTotal: 0, solarTotal: 0
          };
        }

        const bucket = adjustedMap[adjustedTimeStr];
        bucket.count += 1;
        bucket.thermalTotal += (record.thermal || 0);
        bucket.gasTotal += (record.gas || 0);
        bucket.nuclearTotal += (record.nuclear || 0);
        bucket.hydroTotal += (record.hydro || 0);
        bucket.windTotal += (record.wind || 0);
        bucket.solarTotal += (record.solar || 0);
      }

      const adjustedData = Object.keys(adjustedMap).sort().map(timeStr => {
        const bucket = adjustedMap[timeStr];
        return {
          timeStr,
          thermal: Math.round(bucket.thermalTotal / bucket.count),
          gas: Math.round(bucket.gasTotal / bucket.count),
          nuclear: Math.round(bucket.nuclearTotal / bucket.count),
          hydro: Math.round(bucket.hydroTotal / bucket.count),
          wind: Math.round(bucket.windTotal / bucket.count),
          solar: Math.round(bucket.solarTotal / bucket.count)
        };
      });

      return {
        raw: rawRecords.map(r => ({
          ...r,
          timeStr: `${r.date} ${r.timeStr.includes(' ') ? r.timeStr.split(' ')[1] : r.timeStr}`
        })),
        adjusted: adjustedData
      };

    } catch (error: unknown) {
      console.error('Error fetching Generation Data:', error);
      throw error;
    }
  }

  async getStateWiseDemand(dateStr?: string, timeStr?: string) {
    try {
      let finalDateStr = dateStr;
      let finalTimeStr = timeStr;

      // If date/time not provided, find the most recent record's date and time
      if (!finalDateStr || !finalTimeStr) {
        const latest = await prisma.stateDemandData.findFirst({
          orderBy: [
            { date: 'desc' },
            { timeStr: 'desc' }
          ]
        });

        if (latest) {
          finalDateStr = latest.date;
          finalTimeStr = latest.timeStr;
        } else {
          // Fallback if DB is empty
          finalDateStr = new Date().toISOString().split('T')[0];
          finalTimeStr = "00:00";
        }
      }

      const allStates = await prisma.stateDemandData.findMany({
        where: {
          date: finalDateStr,
          timeStr: finalTimeStr
        }
      });

      // Group by region
      const regionsMap: Record<string, StateRegionMap> = {};

      for (const state of allStates) {
        if (!regionsMap[state.region]) {
          regionsMap[state.region] = {
            name: state.region,
            price: state.price,
            states: []
          };
        }
        regionsMap[state.region].states.push({
          name: state.stateName,
          demand: state.demand,
          unit: state.unit
        });
      }

      return {
        timestamp: `${finalDateStr} ${finalTimeStr}`,
        regions: Object.values(regionsMap)
      };
    } catch (error: unknown) {
      console.error('Error fetching state wise demand:', error);
      throw error;
    }
  }

  async exportDataAsCsvStream(dataset: string, startDate: string, endDate: string, res: Response) {
    try {
      const batchSize = 10000;
      let skip = 0;
      let hasMore = true;

      if (dataset === 'npp') {
        res.write('date,timeStr,demandMet\n');
      } else if (dataset === 'generation') {
        res.write('date,timeStr,thermal,gas,nuclear,hydro,wind,solar\n');
      } else if (dataset === 'state') {
        res.write('date,timeStr,stateName,region,demand,unit,price\n');
      } else if (dataset === 'weather_forecast' || dataset === 'weather') {
        res.write('date,timeStr,maxTemp,minTemp,windSpeed,relativeHumidity,precipitationProb,precipitationSum,sunshineDuration,sunrise,sunset\n');
      } else if (dataset === 'weather_historical') {
        res.write('date,maxTemp,minTemp,windSpeed,relativeHumidity,precipitationProb,precipitationSum,sunshineDuration,sunrise,sunset\n');
      }

      while (hasMore) {
        // Explicitly typed as an array containing any of your entity profiles
        let records: any[] = [];

        if (dataset === 'npp') {
          records = await prisma.nppRawDemandData.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            orderBy: [{ date: 'asc' }, { timeStr: 'asc' }],
            skip,
            take: batchSize
          });

          for (const row of records) {
            res.write(`${row.date},${row.timeStr},${row.demandMet}\n`);
          }
        } else if (dataset === 'generation') {
          records = await prisma.nppRawGenerationData.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            orderBy: [{ date: 'asc' }, { timeStr: 'asc' }],
            skip,
            take: batchSize
          });

          for (const row of records) {
            res.write(`${row.date},${row.timeStr},${row.thermal},${row.gas},${row.nuclear},${row.hydro},${row.wind},${row.solar}\n`);
          }
        } else if (dataset === 'state') {
          records = await prisma.stateDemandData.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            orderBy: [{ date: 'asc' }, { timeStr: 'asc' }, { stateName: 'asc' }],
            skip,
            take: batchSize
          });

          for (const row of records) {
            res.write(`${row.date},${row.timeStr},"${row.stateName}","${row.region}",${row.demand},${row.unit},${row.price}\n`);
          }
        } else if (dataset === 'weather_forecast' || dataset === 'weather') {
          records = await prisma.weatherForecastHourly.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            orderBy: [{ date: 'asc' }, { timeStr: 'asc' }],
            skip,
            take: batchSize
          });

          for (const row of records) {
            res.write(`${row.date},${row.timeStr},${row.maxTemp},${row.minTemp},${row.windSpeed},${row.relativeHumidity},${row.precipitationProb},${row.precipitationSum},${row.sunshineDuration},${row.sunrise},${row.sunset}\n`);
          }
        } else if (dataset === 'weather_historical') {
          records = await prisma.weatherHistorical.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            orderBy: { date: 'asc' },
            skip,
            take: batchSize
          });

          for (const row of records) {
            res.write(`${row.date},${row.maxTemp},${row.minTemp},${row.windSpeed},${row.relativeHumidity},${row.precipitationProb},${row.precipitationSum},${row.sunshineDuration},${row.sunrise},${row.sunset}\n`);
          }
        } else {
          hasMore = false;
          break;
        }

        if (records.length < batchSize) {
          hasMore = false;
        } else {
          skip += batchSize;
        }
      }
    } catch (e: unknown) {
      console.error('Error in exportDataAsCsvStream:', e);
      throw e;
    }
  }

  async getCityStateData() {
    try {
      return await prisma.cityStateData.findMany({
        orderBy: [
          { stateName: 'asc' },
          { cityName: 'asc' }
        ]
      });
    } catch (error) {
      console.error('Error in getCityStateData:', error);
      throw error;
    }
  }

  async exportCityStateAsCsvStream(res: Response) {
    try {
      res.write('cityName,stateName,population,latitude,longitude\n');
      const records = await prisma.cityStateData.findMany({
        orderBy: [
          { stateName: 'asc' },
          { cityName: 'asc' }
        ]
      });
      for (const row of records) {
        res.write(`"${row.cityName}","${row.stateName}",${row.population},${row.latitude},${row.longitude}\n`);
      }
    } catch (e: unknown) {
      console.error('Error in exportCityStateAsCsvStream:', e);
      throw e;
    }
  }

  async createCityStateData(data: { cityName: string; stateName: string; population: number; latitude: number; longitude: number; }) {
    try {
      return await prisma.cityStateData.create({
        data
      });
    } catch (error: any) {
      console.error('Error in createCityStateData:', error);
      if (error.code === 'P2002') {
        throw new Error('City and State entry already exists.');
      }
      throw error;
    }
  }
}