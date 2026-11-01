import cron from 'node-cron';
import { MarketType } from '@prisma/client';
import { iexScraperService } from '../services/iex-scraper.service';
import { logger } from '../logger';

import config from '../config';

// Helper to get today's date in YYYY-MM-DD
function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function initCronJobs() {
  if (!config.runScraper) {
    logger.info('RUN_SCRAPER is false. Skipping daily/hourly scraper cron jobs.');
    return;
  }
  logger.info('Initializing cron jobs...');

  // 1. DAM and GDAM - Run once a day at 01:00 AM
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running Daily DAM and GDAM Scraper Cron Job');
    const today = getTodayDateString();
    
    try {
      await iexScraperService.fetchMarketData(MarketType.DAM, today);
      await iexScraperService.fetchMarketData(MarketType.GDAM, today);
      logger.info('Daily DAM and GDAM Scraper completed successfully');
    } catch (error) {
      logger.error('Error running daily DAM/GDAM scraper', error);
    }
  });

  // 2. RTM - Run every hour (e.g., at minute 15) to get latest data
  cron.schedule('15 * * * *', async () => {
    logger.info('Running Hourly RTM Scraper Cron Job');
    const today = getTodayDateString();
    
    try {
      await iexScraperService.fetchMarketData(MarketType.RTM, today);
      logger.info('Hourly RTM Scraper completed successfully');
    } catch (error) {
      logger.error('Error running hourly RTM scraper', error);
    }
  });

  logger.info('Cron jobs scheduled successfully');
}
