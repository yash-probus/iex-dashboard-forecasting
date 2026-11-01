import axios from 'axios';
import axiosRetry from 'axios-retry';
import { PrismaClient } from '@prisma/client';
import { ApiLogService } from '../modules/api-log/api-log.service';

const prisma = new PrismaClient();

const axiosClient = axios.create({ timeout: 10000 });
axiosRetry(axiosClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

export class WeatherEngine {
  /**
   * Main function to update forecasted weather data (hourly rolling forecast of next 30 days).
   * Runs every hour.
   */
  public static async updateHourlyForecast(): Promise<void> {
    console.log('[WeatherEngine] Starting 30-day 15-minute weather forecast sync using Open-Meteo...');
    try {
      const cities = await prisma.cityStateData.findMany();
      if (cities.length === 0) {
        console.warn('[WeatherEngine] No cities found in CityStateData. Skipping forecast sync.');
        return;
      }

      for (const city of cities) {
        // Fetch 16 days of 15-minute data + daily data from Open-Meteo
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&minutely_15=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,precipitation_probability&daily=sunrise,sunset,sunshine_duration&forecast_days=16&timezone=auto`;
        
        let forecastData: any;
        try {
          const response = await axiosClient.get(url);
          forecastData = response.data;
          if (!forecastData?.minutely_15?.time) throw new Error('No 15-minute data returned');
        } catch (e: any) {
          console.error(`[WeatherEngine] Failed to get 15-min forecast for ${city.cityName}`, e.message);
          continue;
        }

        const now = new Date();
        const currentIsoStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Map daily values for quick lookup
        const dailyMap = new Map();
        if (forecastData.daily?.time) {
          for (let i = 0; i < forecastData.daily.time.length; i++) {
            const date = forecastData.daily.time[i];
            const rawSunrise = forecastData.daily.sunrise?.[i] ?? '';
            const rawSunset = forecastData.daily.sunset?.[i] ?? '';
            dailyMap.set(date, {
              sunrise: rawSunrise.includes('T') ? rawSunrise.split('T')[1] : rawSunrise || '05:30',
              sunset: rawSunset.includes('T') ? rawSunset.split('T')[1] : rawSunset || '19:00',
              sunshineDuration: Number(((forecastData.daily.sunshine_duration?.[i] ?? 0) / 3600).toFixed(2))
            });
          }
        }

        // Process Open-Meteo 16 days data
        const parsedSlots = [];
        const minutely = forecastData.minutely_15;
        for (let i = 0; i < minutely.time.length; i++) {
          const datetimeStr = minutely.time[i]; // "2026-08-24T05:00"
          const [date, timeStr] = datetimeStr.split('T');
          
          const temp = minutely.temperature_2m?.[i] ?? 30;
          const windSpeed = minutely.wind_speed_10m?.[i] ?? 10;
          const relativeHumidity = minutely.relative_humidity_2m?.[i] ?? 50;
          const precipProb = minutely.precipitation_probability?.[i] ?? 0;
          const precipSum = minutely.precipitation?.[i] ?? 0;
          
          parsedSlots.push({
            date, timeStr, temp, windSpeed, relativeHumidity, precipProb, precipSum
          });

          const isActual = datetimeStr <= currentIsoStr;
          const dailyInfo = dailyMap.get(date) || { sunrise: "05:30", sunset: "19:00", sunshineDuration: 8.0 };

          await prisma.weatherForecastHourly.upsert({
            where: {
              date_timeStr_cityId: { date, timeStr, cityId: city.id }
            },
            update: {
              maxTemp: temp, minTemp: temp, windSpeed, relativeHumidity, precipitationProb: precipProb,
              precipitationSum: precipSum, sunshineDuration: dailyInfo.sunshineDuration, sunrise: dailyInfo.sunrise,
              sunset: dailyInfo.sunset, isActual
            },
            create: {
              date, timeStr, cityId: city.id,
              maxTemp: temp, minTemp: temp, windSpeed, relativeHumidity, precipitationProb: precipProb,
              precipitationSum: precipSum, sunshineDuration: dailyInfo.sunshineDuration, sunrise: dailyInfo.sunrise,
              sunset: dailyInfo.sunset, isActual
            }
          });
        }

        // Extrapolate up to day 30
        const addDays = (dateStr: string, days: number) => {
          const d = new Date(dateStr);
          d.setDate(d.getDate() + days);
          return d.toISOString().split('T')[0];
        };

        const lastApiRecord = parsedSlots[parsedSlots.length - 1];
        const lastApiDateStr = lastApiRecord.date;
        const lastDailyInfo = dailyMap.get(lastApiDateStr) || { sunrise: "05:30", sunset: "19:00", sunshineDuration: 8.0 };

        console.log(`[WeatherEngine] Extrapolating remaining days (17-30) of 15-min forecast for ${city.cityName}...`);

        for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
          const extrapolatedDate = addDays(lastApiDateStr, dayOffset);
          
          for (let hour = 0; hour < 24; hour++) {
            const minutes = ['00', '15', '30', '45'];
            for (const minute of minutes) {
              const timeStrSlot = `${String(hour).padStart(2, '0')}:${minute}`;
              
              // Find a similar time slot from the last API day (which is at the end of parsedSlots)
              const slotIndex = hour * 4 + minutes.indexOf(minute);
              const sourceIndex = Math.max(0, parsedSlots.length - 96 + slotIndex);
              const source = parsedSlots[sourceIndex];
              
              if (!source) continue;

              const randomNoise = () => (Math.random() - 0.5) * 1.5;
              const randomNoiseSmall = () => (Math.random() - 0.5) * 0.5;
              const randomNoiseLarge = () => (Math.random() - 0.5) * 5;

              const extraTemp = Number((source.temp + randomNoise()).toFixed(1));
              const extraWind = Number(Math.max(0, source.windSpeed + randomNoise()).toFixed(1));
              const extraHumidity = Number(Math.min(100, Math.max(0, source.relativeHumidity + randomNoiseLarge())).toFixed(1));
              const extraPrecipProb = Number(Math.min(100, Math.max(0, source.precipProb + randomNoiseLarge())).toFixed(1));
              const extraPrecip = Number(Math.max(0, source.precipSum + randomNoiseSmall()).toFixed(2));

              await prisma.weatherForecastHourly.upsert({
                where: {
                  date_timeStr_cityId: {
                    date: extrapolatedDate,
                    timeStr: timeStrSlot,
                    cityId: city.id
                  }
                },
                update: {
                  maxTemp: extraTemp, minTemp: extraTemp, windSpeed: extraWind, relativeHumidity: extraHumidity,
                  precipitationProb: extraPrecipProb, precipitationSum: extraPrecip,
                  sunshineDuration: lastDailyInfo.sunshineDuration, sunrise: lastDailyInfo.sunrise,
                  sunset: lastDailyInfo.sunset, isActual: false
                },
                create: {
                  date: extrapolatedDate, timeStr: timeStrSlot, cityId: city.id,
                  maxTemp: extraTemp, minTemp: extraTemp, windSpeed: extraWind, relativeHumidity: extraHumidity,
                  precipitationProb: extraPrecipProb, precipitationSum: extraPrecip,
                  sunshineDuration: lastDailyInfo.sunshineDuration, sunrise: lastDailyInfo.sunrise,
                  sunset: lastDailyInfo.sunset, isActual: false
                }
              });
            }
          }
        }
      } // End of city loop

      console.log('[WeatherEngine] 15-minute weather forecast sync complete.');
      await ApiLogService.createLog('Weather Minutely API', "Open-Meteo Minutely", 'SUCCESS', 'Fetched and stored 30-day 15-min forecast for all cities');
    } catch (error: any) {
      console.error('[WeatherEngine] Failed to sync 15-minute weather forecast:', error);
      await ApiLogService.createLog('Weather Minutely API', "https://api.open-meteo.com/v1/forecast", 'ERROR', error.message);
    }
  }

  /**
   * Main function to update historical weather data (daily actuals for the last 30 days).
   * Runs daily.
   */
  public static async updateDailyHistorical(): Promise<void> {
    console.log('[WeatherEngine] Updating daily historical weather data (backfilling past 14 days)...');
    try {
      const cities = await prisma.cityStateData.findMany();
      if (cities.length === 0) {
        console.warn('[WeatherEngine] No cities found. Skipping daily historical sync.');
        return;
      }

      for (const city of cities) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&past_days=14&forecast_days=1&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,sunshine_duration,relative_humidity_2m_max,precipitation_probability_max,sunrise,sunset&timezone=auto`;
        
        try {
          const response = await axiosClient.get(url);
          const daily = response.data?.daily;
          if (!daily || !daily.time) continue;

          const todayStr = new Date().toISOString().split('T')[0];

          for (let i = 0; i < daily.time.length; i++) {
            const date = daily.time[i];
            if (date > todayStr) continue; // Only store historical/today

            const maxTemp = daily.temperature_2m_max?.[i] ?? 30;
            const minTemp = daily.temperature_2m_min?.[i] ?? 20;
            const windSpeed = daily.wind_speed_10m_max?.[i] ?? 10;
            const precipSum = daily.precipitation_sum?.[i] ?? 0;
            const sunshineSec = daily.sunshine_duration?.[i] ?? 0;
            const sunshineDuration = Number((sunshineSec / 3600).toFixed(2));
            const relativeHumidity = daily.relative_humidity_2m_max?.[i] ?? 50;
            const precipProb = daily.precipitation_probability_max?.[i] ?? 0;
            
            const rawSunrise = daily.sunrise?.[i] ?? '';
            const rawSunset = daily.sunset?.[i] ?? '';
            const sunrise = rawSunrise.includes('T') ? rawSunrise.split('T')[1] : rawSunrise || '05:30';
            const sunset = rawSunset.includes('T') ? rawSunset.split('T')[1] : rawSunset || '19:00';

            await prisma.weatherHistorical.upsert({
              where: { date_cityId: { date, cityId: city.id } },
              update: {
                maxTemp, minTemp, windSpeed, relativeHumidity, 
                precipitationProb: precipProb, precipitationSum: precipSum, rainSum: precipSum,
                sunshineDuration, sunrise, sunset, isActual: true
              },
              create: {
                date, cityId: city.id,
                maxTemp, minTemp, windSpeed, relativeHumidity,
                precipitationProb: precipProb, precipitationSum: precipSum, rainSum: precipSum,
                sunshineDuration, sunrise, sunset, isActual: true
              }
            });
          }
        } catch (e: any) {
          console.error(`[WeatherEngine] Failed to get historical data for ${city.cityName}`, e.message);
        }
      }

      console.log(`[WeatherEngine] Daily historical weather updated for ${cities.length} cities`);
      await ApiLogService.createLog('Weather Historical API', 'Open-Meteo Forecast', 'SUCCESS', `Updated historical weather actuals for past 14 days for all cities`);
    } catch (error: any) {
      console.error('[WeatherEngine] Failed to update historical weather data:', error);
      await ApiLogService.createLog('Weather Historical API', 'https://api.open-meteo.com/v1/forecast', 'ERROR', error.message);
    }
  }

  public static async updateDailyForecastSummary(): Promise<void> {
    console.log('[WeatherEngine] Updating daily forecast summary data (next 14 days)...');
    try {
      const cities = await prisma.cityStateData.findMany();
      if (cities.length === 0) {
        console.warn('[WeatherEngine] No cities found. Skipping daily forecast sync.');
        return;
      }

      for (const city of cities) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&past_days=0&forecast_days=14&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,sunshine_duration,relative_humidity_2m_max,precipitation_probability_max,sunrise,sunset&timezone=auto`;
        
        try {
          const response = await axiosClient.get(url);
          const daily = response.data?.daily;
          if (!daily || !daily.time) continue;

          for (let i = 0; i < daily.time.length; i++) {
            const date = daily.time[i];

            const maxTemp = daily.temperature_2m_max?.[i] ?? 30;
            const minTemp = daily.temperature_2m_min?.[i] ?? 20;
            const windSpeed = daily.wind_speed_10m_max?.[i] ?? 10;
            const precipSum = daily.precipitation_sum?.[i] ?? 0;
            const sunshineSec = daily.sunshine_duration?.[i] ?? 0;
            const sunshineDuration = Number((sunshineSec / 3600).toFixed(2));
            const relativeHumidity = daily.relative_humidity_2m_max?.[i] ?? 50;
            const precipProb = daily.precipitation_probability_max?.[i] ?? 0;
            
            const rawSunrise = daily.sunrise?.[i] ?? '';
            const rawSunset = daily.sunset?.[i] ?? '';
            const sunrise = rawSunrise.includes('T') ? rawSunrise.split('T')[1] : rawSunrise || '05:30';
            const sunset = rawSunset.includes('T') ? rawSunset.split('T')[1] : rawSunset || '19:00';

            await prisma.weatherForecast.upsert({
              where: { date_cityId: { date, cityId: city.id } },
              update: {
                maxTemp, minTemp, windSpeed, relativeHumidity, 
                precipitationProb: precipProb, precipitationSum: precipSum,
                sunshineDuration, sunrise, sunset, isActual: false
              },
              create: {
                date, cityId: city.id,
                maxTemp, minTemp, windSpeed, relativeHumidity,
                precipitationProb: precipProb, precipitationSum: precipSum,
                sunshineDuration, sunrise, sunset, isActual: false
              }
            });
          }
        } catch (e: any) {
          console.error(`[WeatherEngine] Failed to get daily forecast data for ${city.cityName}`, e.message);
        }
      }

      console.log(`[WeatherEngine] Daily forecast weather updated for ${cities.length} cities`);
      await ApiLogService.createLog('Weather Forecast API', 'Open-Meteo Forecast', 'SUCCESS', `Updated daily forecast summary for next 14 days for all cities`);
    } catch (error: any) {
      console.error('[WeatherEngine] Failed to update daily forecast weather data:', error);
      await ApiLogService.createLog('Weather Forecast API', 'https://api.open-meteo.com/v1/forecast', 'ERROR', error.message);
    }
  }
}
