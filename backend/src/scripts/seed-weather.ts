import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching historical weather data for the last 2 years...');
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // yesterday
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const cities = await prisma.cityStateData.findMany();
  if (cities.length === 0) {
    console.error('No cities found in CityStateData. Run seedCities.ts first.');
    return;
  }
  const city = cities[0];

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${city.latitude}&longitude=${city.longitude}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,sunshine_duration,relative_humidity_2m_max,precipitation_probability_max,sunrise,sunset&timezone=auto`;

  console.log(`URL: ${url}`);
  
  try {
    const response = await axios.get(url);
    const daily = response.data.daily;
    
    if (!daily || !daily.time) {
      console.error('No daily data returned from Open-Meteo!');
      return;
    }
    
    const dates: string[] = daily.time;
    const maxTemps: number[] = daily.temperature_2m_max;
    const minTemps: number[] = daily.temperature_2m_min;
    const windSpeeds: number[] = daily.wind_speed_10m_max;
    const precipSums: number[] = daily.precipitation_sum;
    const sunshineDurations: number[] = daily.sunshine_duration;
    const relativeHumidities: number[] = daily.relative_humidity_2m_max;
    const precipProbs: number[] = daily.precipitation_probability_max;
    const sunrises: string[] = daily.sunrise;
    const sunsets: string[] = daily.sunset;

    console.log(`Upserting ${dates.length} records into the database...`);
    
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const maxTemp = maxTemps[i] || 35;
      const minTemp = minTemps[i] || 25;
      const windSpeed = windSpeeds[i] || 12;
      const precipitationSum = precipSums[i] || 0;
      const relativeHumidity = relativeHumidities[i] || 50;
      const precipitationProb = precipProbs[i] || 0;
      // Convert sunshine from seconds to hours
      const sunshineDuration = sunshineDurations[i] ? Number((sunshineDurations[i] / 3600).toFixed(2)) : 8;
      
      const sunrise = sunrises[i] ? sunrises[i].split('T')[1] : "05:30";
      const sunset = sunsets[i] ? sunsets[i].split('T')[1] : "19:00";

      await prisma.weatherForecast.upsert({
        where: { date_cityId: { date, cityId: city.id } },
        update: {
          maxTemp,
          minTemp,
          windSpeed,
          relativeHumidity,
          precipitationProb,
          precipitationSum,
          sunshineDuration,
          sunrise,
          sunset,
          isActual: true
        },
        create: {
          date,
          cityId: city.id,
          maxTemp,
          minTemp,
          windSpeed,
          relativeHumidity,
          precipitationProb,
          precipitationSum,
          sunshineDuration,
          sunrise,
          sunset,
          isActual: true
        }
      });
      if (i % 50 === 0) console.log(`Processed ${i}/${dates.length} records...`);
    }

    console.log('Historical weather data seeded successfully!');
  } catch (error: any) {
    console.error('Error fetching/seeding weather data:', error?.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
