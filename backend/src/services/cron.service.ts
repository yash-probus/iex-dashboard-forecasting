import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { VidyutPravahScraper } from './scraper.service';
import { WeatherEngine } from './weather.service';
import { seedCtuCharges } from '../scripts/seed-ctu';
import { checkAndSendDailyChargeAlerts } from './email-alert.service';

import { ApiLogService } from '../modules/api-log/api-log.service';
import { NppAdjustmentService } from '../modules/dataset/npp-adjustment.service';

import config from '../config';

const prisma = new PrismaClient();

export class CronService {
  public static init() {
    if (!config.runScraper) {
      console.log('[CronService] RUN_SCRAPER is false. Skipping cron jobs initialization.');
      return;
    }
    console.log('[CronService] Initializing background cron jobs...');

    // Run every day at 10:00 AM for Resource Center Daily Charge Alerts (Asia/Kolkata)
    cron.schedule('0 10 * * *', async () => {
      if (config.env === 'development' || config.env === 'dev') {
        console.log('[Cron] Skipping daily Resource Center missing charges check in dev environment');
        return;
      }
      
      console.log('[Cron] Running daily Resource Center missing charges check');
      try {
        await checkAndSendDailyChargeAlerts();
      } catch (error) {
        console.error('[Cron] Error in daily Resource Center check:', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });
    
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      console.log('[Cron] Running 5-minute scheduled tasks');
      try {

        await VidyutPravahScraper.scrapeStateDemand();
      } catch (error) {
        console.error('[Cron] Error in 5-minute schedule:', error);
      }
    });

    // Run every hour for Weather Forecast (Hourly)
    cron.schedule('0 * * * *', async () => {
      console.log('[Cron] Running hourly weather forecast tasks');
      try {
        await WeatherEngine.updateHourlyForecast();
      } catch (error) {
        console.error('[Cron] Error in hourly weather forecast schedule:', error);
      }
    });

    // Run every 30 minutes for RTM Scraper
    cron.schedule('*/30 * * * *', async () => {
      console.log('[Cron] Running half-hourly RTM scraper');
      try {
        const { ScraperService } = await import('../modules/scraper/scraper.service');
        const { PersistenceService } = await import('../modules/persistence/persistence.service');
        
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const dateStr = formatter.format(new Date());
        const [year, month, day] = dateStr.split('-').map(Number);
        const deliveryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        // Scrape and persist RTM
        try {
          const rtmRecords = await ScraperService.scrapeRtm();
          if (rtmRecords.length > 0) {
            let actualDeliveryDate = deliveryDate;
            let actualFileName = `scraped_rtm_${dateStr}.csv`;
            
            if (rtmRecords[0].date) {
                const [d, m, y] = rtmRecords[0].date.split('-').map(Number);
                actualDeliveryDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
                actualFileName = `scraped_rtm_${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}.csv`;
            }

            const existing = await prisma.dataset.findFirst({
              where: { market: 'RTM', deliveryDate: actualDeliveryDate, status: 'ACTIVE' }
            });
            await PersistenceService.persistDataset({
              market: 'RTM',
              deliveryDate: actualDeliveryDate,
              fileName: actualFileName,
              records: rtmRecords,
              action: existing ? 'replace' : undefined
            });
            console.log(`[Cron] Successfully scraped and saved ${rtmRecords.length} RTM records`);
            await ApiLogService.createLog('IEX RTM Scraper', 'https://www.iexindia.com/market-data/real-time-market/market-snapshot', 'SUCCESS', `Successfully scraped and saved ${rtmRecords.length} RTM records`);
          } else {
            await ApiLogService.createLog('IEX RTM Scraper', 'https://www.iexindia.com/market-data/real-time-market/market-snapshot', 'SUCCESS', 'Scraper returned 0 records');
          }
        } catch (e: any) {
          console.error('[Cron] RTM scrape failed:', e);
          await ApiLogService.createLog('IEX RTM Scraper', 'https://www.iexindia.com/market-data/real-time-market/market-snapshot', 'ERROR', e.message || String(e));
        }
      } catch (error) {
        console.error('[Cron] Error in hourly RTM scraper schedule:', error);
      }
    });

    // Run every day at midnight for Weather Historical and Forecast Summaries
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Running daily midnight tasks');
      try {
        await WeatherEngine.updateDailyHistorical();
        await WeatherEngine.updateDailyForecastSummary();
      } catch (error) {
        console.error('[Cron] Error in daily schedule:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });
    

    // Run on the 1st of every month at 2:00 AM for CTU Charges
    cron.schedule('0 2 1 * *', async () => {
      console.log('[Cron] Running monthly CTU charges schedule');
      try {
        await seedCtuCharges();
      } catch (error) {
        console.error('[Cron] Error in monthly CTU schedule:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Run every day at 7:00 AM for Forecasting Sync (Demand and Generation)
    cron.schedule('0 7 * * *', async () => {
      console.log('[Cron] Running daily Forecasting (Demand & Generation) sync at 7 AM');
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        // Ensure demand and generation data is up to date for the day
        await VidyutPravahScraper.getNppDemandData(dateStr);
        await VidyutPravahScraper.getNppGenerationData(dateStr);
        await NppAdjustmentService.updateAdjustedDemandForDate(dateStr);
        await NppAdjustmentService.updateAdjustedGenerationForDate(dateStr);
        
        // Also ensure hourly forecast is updated
        await WeatherEngine.updateHourlyForecast();
        console.log('[Cron] Forecasting sync completed successfully');
      } catch (error) {
        console.error('[Cron] Error in daily forecasting sync:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Run every day at 7:00 AM for Market Data (DAM, GDAM, RTM) Scrapers
    cron.schedule('0 7 * * *', async () => {
      console.log('[Cron] Running daily Market Data scrapers at 7 AM');
      try {
        const { ScraperService } = await import('../modules/scraper/scraper.service');
        const { PersistenceService } = await import('../modules/persistence/persistence.service');
        
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const dateStr = formatter.format(new Date());
        const [year, month, day] = dateStr.split('-').map(Number);
        const deliveryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDateStr = formatter.format(tomorrow);
        const [tYear, tMonth, tDay] = tomorrowDateStr.split('-').map(Number);
        const damGdamDeliveryDate = new Date(Date.UTC(tYear, tMonth - 1, tDay, 0, 0, 0, 0));

        // Scrape and persist DAM
        try {
          const damRecords = await ScraperService.scrapeDam();
          if (damRecords.length > 0) {
            let actualDeliveryDate = damGdamDeliveryDate;
            let actualFileName = `scraped_dam_${tomorrowDateStr}.csv`;
            
            if (damRecords[0].date) {
                const [d, m, y] = damRecords[0].date.split('-').map(Number);
                actualDeliveryDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
                actualFileName = `scraped_dam_${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}.csv`;
            }

            const existing = await prisma.dataset.findFirst({
              where: { market: 'DAM', deliveryDate: actualDeliveryDate, status: 'ACTIVE' }
            });
            await PersistenceService.persistDataset({
              market: 'DAM',
              deliveryDate: actualDeliveryDate,
              fileName: actualFileName,
              records: damRecords,
              action: existing ? 'replace' : undefined
            });
            console.log(`[Cron] Successfully scraped and saved ${damRecords.length} DAM records`);
            await ApiLogService.createLog('IEX DAM Scraper', 'https://www.iexindia.com/market-data/day-ahead-market/market-snapshot', 'SUCCESS', `Successfully scraped and saved ${damRecords.length} DAM records`);
          } else {
            await ApiLogService.createLog('IEX DAM Scraper', 'https://www.iexindia.com/market-data/day-ahead-market/market-snapshot', 'SUCCESS', 'Scraper returned 0 records');
          }
        } catch (e: any) {
          console.error('[Cron] DAM scrape failed:', e);
          await ApiLogService.createLog('IEX DAM Scraper', 'https://www.iexindia.com/market-data/day-ahead-market/market-snapshot', 'ERROR', e.message || String(e));
        }

        // Scrape and persist GDAM
        try {
          const gdamRecords = await ScraperService.scrapeGdam();
          if (gdamRecords.length > 0) {
            let actualDeliveryDate = damGdamDeliveryDate;
            let actualFileName = `scraped_gdam_${tomorrowDateStr}.csv`;
            
            if (gdamRecords[0].date) {
                const [d, m, y] = gdamRecords[0].date.split('-').map(Number);
                actualDeliveryDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
                actualFileName = `scraped_gdam_${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}.csv`;
            }

            const existing = await prisma.dataset.findFirst({
              where: { market: 'GDAM', deliveryDate: actualDeliveryDate, status: 'ACTIVE' }
            });
            await PersistenceService.persistDataset({
              market: 'GDAM',
              deliveryDate: actualDeliveryDate,
              fileName: actualFileName,
              records: gdamRecords,
              action: existing ? 'replace' : undefined
            });
            console.log(`[Cron] Successfully scraped and saved ${gdamRecords.length} GDAM records`);
            await ApiLogService.createLog('IEX GDAM Scraper', 'https://www.iexindia.com/market-data/green-day-ahead-market/market-snapshot', 'SUCCESS', `Successfully scraped and saved ${gdamRecords.length} GDAM records`);
          } else {
            await ApiLogService.createLog('IEX GDAM Scraper', 'https://www.iexindia.com/market-data/green-day-ahead-market/market-snapshot', 'SUCCESS', 'Scraper returned 0 records');
          }
        } catch (e: any) {
          console.error('[Cron] GDAM scrape failed:', e);
          await ApiLogService.createLog('IEX GDAM Scraper', 'https://www.iexindia.com/market-data/green-day-ahead-market/market-snapshot', 'ERROR', e.message || String(e));
        }

        // RTM scraper has been moved to an hourly cron job

      } catch (error) {
        console.error('[Cron] Error in Market Data scraper schedule:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Run every 4 minutes for NPP Data (polls today & yesterday to ensure no missing slots)
    cron.schedule('*/4 * * * *', async () => {
      console.log('[Cron] Running 4-minute scheduled tasks');
      try {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const targetDates = [
          today.toISOString().split('T')[0],
          yesterday.toISOString().split('T')[0]
        ];

        for (const dateStr of targetDates) {
          // Real time NPP demand
          const data = await VidyutPravahScraper.getNppDemandData(dateStr);
          if (data && data.length > 0) {
            await prisma.nppRawDemandData.createMany({
              data: data.map(d => ({
                date: d.date,
                timeStr: d.timeStr,
                demandMet: d.demandMet,
                dataUpdatedAt: d.dataUpdatedAt,
                fetchedAt: new Date(),
              })),
              skipDuplicates: true
            });
            console.log(`[CronService] Polled NPP Demand for ${dateStr} -> ${data.length} records`);
            await NppAdjustmentService.updateAdjustedDemandForDate(dateStr);
          }
          
          // Real time NPP generation
          const genData = await VidyutPravahScraper.getNppGenerationData(dateStr);
          if (genData && genData.length > 0) {
            await prisma.nppRawGenerationData.createMany({
              data: genData.map(g => ({
                date: g.date,
                timeStr: g.timeStr,
                thermal: g.thermal,
                gas: g.gas,
                nuclear: g.nuclear,
                hydro: g.hydro,
                wind: g.wind,
                solar: g.solar,
                dataUpdatedAt: g.dataUpdatedAt,
                fetchedAt: new Date(),
              })),
              skipDuplicates: true
            });
            console.log(`[CronService] Polled NPP Generation for ${dateStr} -> ${genData.length} records`);
            await NppAdjustmentService.updateAdjustedGenerationForDate(dateStr);
          }
        }
      } catch (error) {
        console.error('[Cron] Error in 4-minute schedule:', error);
      }
    });

    // Run every day at 12:05 AM for Market Selection Recommendation Forecast
    cron.schedule('5 0 * * *', async () => {
      console.log('[Cron] Running daily Market Selection Forecast at 12:05 AM');
      try {
        const { ForecastService } = await import('../modules/forecast/forecast.service');
        const today = new Date();
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 7);
        
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        
        const tomorrowStr = formatter.format(tomorrow);
        const endDateStr = formatter.format(endDate);
        
        console.log(`[Cron] Fetching market selection forecast from ${tomorrowStr} to ${endDateStr}`);
        await ForecastService.getMarketSelectionForecast(tomorrowStr, endDateStr);
        console.log('[Cron] Market selection forecast updated successfully');
      } catch (error) {
        console.error('[Cron] Error in daily market selection forecast update:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    // ----------------------------------------------------------------------
    // External Scripts Cron Jobs
    // ----------------------------------------------------------------------
    
    // 1. UP Market Python Scraper (RTM) - Runs every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      console.log('[Cron] Running half-hourly UP Market Python scraper for RTM');
      const scriptPath = path.resolve(__dirname, '../../scripts/up_market_sync.py');
      const pythonBin = [
        path.resolve(__dirname, '../../../venv/bin/python3'),
        path.resolve(__dirname, '../../venv/bin/python3'),
      ].find(p => require('fs').existsSync(p)) || 'python3';
      
      exec(`${pythonBin} ${scriptPath} --market RTM`, { cwd: path.resolve(__dirname, '../..') }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Cron] UP Market Scraper Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`[Cron] UP Market Scraper Stderr: ${stderr}`);
        }
        console.log(`[Cron] UP Market Scraper Output:\n${stdout}`);
      });
    }, {
      timezone: 'Asia/Kolkata'
    });

    // 2. UP Market Python Scraper (DAM) - Runs once a day at 7:00 AM
    cron.schedule('0 7 * * *', () => {
      console.log('[Cron] Running daily UP Market Python scraper for DAM');
      const scriptPath = path.resolve(__dirname, '../../scripts/up_market_sync.py');
      const pythonBin = [
        path.resolve(__dirname, '../../../venv/bin/python3'),
        path.resolve(__dirname, '../../venv/bin/python3'),
      ].find(p => require('fs').existsSync(p)) || 'python3';
      
      exec(`${pythonBin} ${scriptPath} --market DAM`, { cwd: path.resolve(__dirname, '../..') }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Cron] UP Market Scraper DAM Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`[Cron] UP Market Scraper DAM Stderr: ${stderr}`);
        }
        console.log(`[Cron] UP Market Scraper DAM Output:\n${stdout}`);
      });
    }, {
      timezone: 'Asia/Kolkata'
    });

    // 2b. UP Market Python Scraper (GDAM) - Runs once a day at 7:15 AM
    cron.schedule('15 7 * * *', () => {
      console.log('[Cron] Running daily UP Market Python scraper for GDAM');
      const scriptPath = path.resolve(__dirname, '../../scripts/up_market_sync.py');
      const pythonBin = [
        path.resolve(__dirname, '../../../venv/bin/python3'),
        path.resolve(__dirname, '../../venv/bin/python3'),
      ].find(p => require('fs').existsSync(p)) || 'python3';
      
      exec(`${pythonBin} ${scriptPath} --market GDAM`, { cwd: path.resolve(__dirname, '../..') }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Cron] UP Market Scraper GDAM Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`[Cron] UP Market Scraper GDAM Stderr: ${stderr}`);
        }
        console.log(`[Cron] UP Market Scraper GDAM Output:\n${stdout}`);
      });
    }, {
      timezone: 'Asia/Kolkata'
    });

    // 3. Database Backup - Runs daily at 2:00 AM
    cron.schedule('0 2 * * *', () => {
      console.log('[Cron] Running daily database backup script');
      const scriptPath = path.resolve(__dirname, '../../scripts/db_backup.sh');
      
      exec(`bash ${scriptPath}`, { cwd: path.resolve(__dirname, '../..') }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Cron] DB Backup Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`[Cron] DB Backup Stderr: ${stderr}`);
        }
        console.log(`[Cron] DB Backup Output:\n${stdout}`);
      });
    }, {
      timezone: 'Asia/Kolkata'
    });

    console.log('[CronService] Cron jobs initialized successfully.');
  }
}
