import { ScraperService } from '../modules/scraper/scraper.service';
import { PersistenceService } from '../modules/persistence/persistence.service';
import { PrismaClient } from '@prisma/client';
import { ApiLogService } from '../modules/api-log/api-log.service';

const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Starting manual RTM scraper script...');
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const dateStr = formatter.format(new Date());
    const [year, month, day] = dateStr.split('-').map(Number);
    const deliveryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    console.log('Persisting RTM data for date:', dateStr);

    try {
      const rtmRecords = await ScraperService.scrapeRtm();
      console.log(`Scraped ${rtmRecords.length} RTM records.`);
      if (rtmRecords.length > 0) {
        const existing = await prisma.dataset.findFirst({
          where: { market: 'RTM', deliveryDate, status: 'ACTIVE' }
        });
        await PersistenceService.persistDataset({
          market: 'RTM',
          deliveryDate,
          fileName: `scraped_rtm_${dateStr}.csv`,
          records: rtmRecords,
          action: existing ? 'replace' : undefined
        });
        console.log('Successfully saved RTM data!');
        await ApiLogService.createLog('IEX RTM Scraper', 'https://www.iexindia.com/market-data/real-time-market/market-snapshot', 'SUCCESS', `Successfully scraped and saved ${rtmRecords.length} RTM records (manual script)`);
      } else {
        await ApiLogService.createLog('IEX RTM Scraper', 'https://www.iexindia.com/market-data/real-time-market/market-snapshot', 'SUCCESS', 'Scraper returned 0 records (manual script)');
      }
    } catch (e: any) {
      console.error('RTM Scrape failed:', e);
      await ApiLogService.createLog('IEX RTM Scraper', 'https://www.iexindia.com/market-data/real-time-market/market-snapshot', 'ERROR', e.message || String(e));
    }

  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
