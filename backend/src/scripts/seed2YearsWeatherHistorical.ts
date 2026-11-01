import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const START_DATE = '2024-07-01';
const END_DATE   = '2026-07-01';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const axiosClient = axios.create({
  timeout: 30000,
  headers: { 'User-Agent': 'IEXDashboard/1.0' },
});

function getArchiveEnd(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString().split('T')[0];
}

interface DailyWeather {
  date: string;
  maxTemp: number;
  minTemp: number;
  windSpeed: number;
  relativeHumidity: number;
  precipitationProb: number;
  precipitationSum: number;
  sunshineDuration: number;
  sunrise: string;
  sunset: string;
  isActual: boolean;
}

async function fetchArchiveChunk(start: string, end: string, city: any): Promise<DailyWeather[]> {
  const url = 'https://archive-api.open-meteo.com/v1/archive';
  const params = {
    latitude: city.latitude,
    longitude: city.longitude,
    start_date: start,
    end_date: end,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'windspeed_10m_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'sunshine_duration',
      'relative_humidity_2m_max',
      'sunrise',
      'sunset',
    ].join(','),
    timezone: 'Asia/Kolkata',
  };

  const res = await axiosClient.get(url, { params });
  const daily = res.data?.daily;

  if (!daily?.time) return [];

  const todayStr = new Date().toISOString().split('T')[0];

  return daily.time.map((date: string, i: number) => {
    const rawSunrise: string = daily.sunrise?.[i] ?? '';
    const rawSunset:  string = daily.sunset?.[i]  ?? '';

    const sunrise = rawSunrise.includes('T') ? rawSunrise.split('T')[1] : rawSunrise || '05:30';
    const sunset  = rawSunset.includes('T')  ? rawSunset.split('T')[1]  : rawSunset  || '19:00';

    const sunshineSec: number = daily.sunshine_duration?.[i] ?? 0;

    return {
      date,
      maxTemp:           Number((daily.temperature_2m_max?.[i]           ?? 30).toFixed(1)),
      minTemp:           Number((daily.temperature_2m_min?.[i]           ?? 18).toFixed(1)),
      windSpeed:         Number((daily.windspeed_10m_max?.[i]            ?? 10).toFixed(1)),
      relativeHumidity:  Number((daily.relative_humidity_2m_max?.[i]     ?? 50).toFixed(1)),
      precipitationProb: Number((daily.precipitation_probability_max?.[i] ?? 0).toFixed(1)),
      precipitationSum:  Number((daily.precipitation_sum?.[i]            ?? 0).toFixed(2)),
      sunshineDuration:  Number((sunshineSec / 3600).toFixed(2)),
      sunrise,
      sunset,
      isActual: date <= todayStr,
    };
  });
}

function splitIntoChunks(start: string, end: string, chunkDays = 330): Array<[string, string]> {
  const chunks: Array<[string, string]> = [];
  let current = start;
  while (current <= end) {
    const d = new Date(current + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + chunkDays - 1);
    const chunkEnd = d.toISOString().split('T')[0];
    chunks.push([current, chunkEnd > end ? end : chunkEnd]);
    d.setUTCDate(d.getUTCDate() + 1);
    current = d.toISOString().split('T')[0];
    if (current > end) break;
  }
  return chunks;
}

async function main() {
  console.log('Starting Weather 2-Year Historical Seeder...');
  const archiveEnd = getArchiveEnd();
  const effectiveEnd = END_DATE < archiveEnd ? END_DATE : archiveEnd;

  console.log(`Archive up to: ${archiveEnd}`);
  console.log(`Will fetch up to: ${effectiveEnd}`);

  const cities = await prisma.cityStateData.findMany();
  if (cities.length === 0) {
    console.error('No cities found in CityStateData. Please run seedCities.ts first.');
    return;
  }

  for (const city of cities) {
    console.log(`\n--- Fetching historical weather for ${city.cityName} ---`);
    const chunks = splitIntoChunks(START_DATE, effectiveEnd);
    const allRecords: DailyWeather[] = [];

    for (let c = 0; c < chunks.length; c++) {
      const [start, end] = chunks[c];
      console.log(`[CHUNK ${c + 1}/${chunks.length}] Fetching ${start} → ${end}...`);
      try {
        const records = await fetchArchiveChunk(start, end, city);
        allRecords.push(...records);
      } catch (err: any) {
        console.error(`Error in chunk: ${err.message}`);
      }
      if (c < chunks.length - 1) await sleep(1000);
    }

    console.log(`Upserting ${allRecords.length} historical records into WeatherHistorical table for ${city.cityName}...`);
    let upserted = 0;
    for (const r of allRecords) {
      await prisma.weatherHistorical.upsert({
        where: { 
          date_cityId: { date: r.date, cityId: city.id }
        },
        update: {
          maxTemp:           r.maxTemp,
          minTemp:           r.minTemp,
          windSpeed:         r.windSpeed,
          relativeHumidity:  r.relativeHumidity,
          precipitationProb: r.precipitationProb,
          precipitationSum:  r.precipitationSum,
          sunshineDuration:  r.sunshineDuration,
          sunrise:           r.sunrise,
          sunset:            r.sunset,
          isActual:          r.isActual,
        },
        create: {
          date:              r.date,
          city:              { connect: { id: city.id } },
          maxTemp:           r.maxTemp,
          minTemp:           r.minTemp,
          windSpeed:         r.windSpeed,
          relativeHumidity:  r.relativeHumidity,
          precipitationProb: r.precipitationProb,
          precipitationSum:  r.precipitationSum,
          sunshineDuration:  r.sunshineDuration,
          sunrise:           r.sunrise,
          sunset:            r.sunset,
          isActual:          r.isActual,
        },
      });
      upserted++;
    }
    console.log(`Successfully seeded ${upserted} records for ${city.cityName}!`);
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
