import { WeatherEngine } from '../services/weather.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Triggering hourly forecast sync...');
  await WeatherEngine.updateHourlyForecast();
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
