import puppeteer from 'puppeteer';
import { DamIntervalRecord, GdamNewIntervalRecord, RtmIntervalRecord, RecMonthlyRecord } from '../transformation/transformation.types';
import { logger } from '../../logger';

export class ScraperService {
  private static parseNumber(val: string): number {
    if (!val || val === '-') return 0;
    return parseFloat(val.replace(/,/g, ''));
  }

  public static async scrapeDam(): Promise<DamIntervalRecord[]> {
    logger.info('Starting Puppeteer for DAM Market Data Scrape...');
    const browser = await puppeteer.launch({ 
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
      const page = await browser.newPage();
      await page.emulateTimezone('Asia/Kolkata');
      await page.goto('https://www.iexindia.com/market-data/day-ahead-market/market-snapshot', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      await page.waitForSelector('table', { timeout: 15000 });

      const data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
          const columns = Array.from(row.querySelectorAll('td'));
          return columns.map(c => c.innerText.trim());
        });
      });

      const records: DamIntervalRecord[] = [];
      let currentHour = 1;
      let scrapedDate = '';

      for (const row of data) {
        let timeBlock, pb, sb, mcv, fsv, mcp;

        if (row.length === 8) {
          if (row[0] && row[0].match(/^\d{2}-\d{2}-\d{4}$/)) {
            scrapedDate = row[0];
          }
          currentHour = parseInt(row[1], 10);
          timeBlock = row[2];
          pb = row[3];
          sb = row[4];
          mcv = row[5];
          fsv = row[6];
          mcp = row[7];
        } else if (row.length === 7) {
          currentHour = parseInt(row[0], 10);
          timeBlock = row[1];
          pb = row[2];
          sb = row[3];
          mcv = row[4];
          fsv = row[5];
          mcp = row[6];
        } else if (row.length === 6) {
          timeBlock = row[0];
          pb = row[1];
          sb = row[2];
          mcv = row[3];
          fsv = row[4];
          mcp = row[5];
        } else {
          continue; 
        }

        if (!timeBlock || !timeBlock.includes(':')) continue;

        const [start] = timeBlock.split(' - ');
        if (!start) continue;
        const [hh, mm] = start.split(':').map(Number);
        
        const intervalNumber = (hh * 4) + (mm / 15) + 1;

        records.push({
          date: scrapedDate,
          intervalNumber,
          intervalTime: start.trim(),
          purchaseBid: this.parseNumber(pb),
          sellBid: this.parseNumber(sb),
          mcv: this.parseNumber(mcv),
          fsv: this.parseNumber(fsv),
          mcp: this.parseNumber(mcp),
        });
      }

      logger.info(`Successfully scraped ${records.length} DAM records`);
      return records;

    } catch (error: any) {
      logger.error(`Error scraping DAM: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }

  public static async scrapeGdam(): Promise<GdamNewIntervalRecord[]> {
    logger.info('Starting Puppeteer for GDAM Market Data Scrape...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      await page.emulateTimezone('Asia/Kolkata');
      await page.goto('https://www.iexindia.com/market-data/green-day-ahead-market/market-snapshot', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await page.waitForSelector('table', { timeout: 15000 });

      const data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
          const columns = Array.from(row.querySelectorAll('td'));
          return columns.map(c => (c as HTMLElement).innerText.trim());
        });
      });

      const records: GdamNewIntervalRecord[] = [];
      let scrapedDate = '';
      for (const row of data) {
        // Find the index of the time block column dynamically
        const timeBlockIdx = row.findIndex(c => c && c.includes(':') && c.includes('-'));
        if (timeBlockIdx === -1) continue;

        if (timeBlockIdx >= 2 && row[0] && row[0].match(/^\d{2}-\d{2}-\d{4}$/)) {
          scrapedDate = row[0];
        }

        const timeBlock = row[timeBlockIdx];
        const [start] = timeBlock.split(' - ');
        if (!start) continue;
        const [hh, mm] = start.split(':').map(Number);
        const intervalNumber = (hh * 4) + (mm / 15) + 1;

        const offset = timeBlockIdx;

        records.push({
          date: scrapedDate,
          intervalNumber,
          intervalTime: start.trim(),
          purchaseBid:    this.parseNumber(row[offset + 1]  ?? '0'),
          sellBidTotal:   this.parseNumber(row[offset + 2]  ?? '0'),
          sellBidHydro:   this.parseNumber(row[offset + 3]  ?? '0'),
          sellBidWind:    this.parseNumber(row[offset + 4]  ?? '0'),
          sellBidOtherRE: this.parseNumber(row[offset + 5]  ?? '0'),
          sellBidDRE:     this.parseNumber(row[offset + 6]  ?? '0'),
          mcvTotal:       this.parseNumber(row[offset + 7]  ?? '0'),
          mcvHydro:       this.parseNumber(row[offset + 8]  ?? '0'),
          mcvWind:        this.parseNumber(row[offset + 9]  ?? '0'),
          mcvOtherRE:     this.parseNumber(row[offset + 10] ?? '0'),
          mcvDRE:         this.parseNumber(row[offset + 11] ?? '0'),
          fsvTotal:       this.parseNumber(row[offset + 12] ?? '0'),
          fsvHydro:       this.parseNumber(row[offset + 13] ?? '0'),
          fsvWind:        this.parseNumber(row[offset + 14] ?? '0'),
          fsvOtherRE:     this.parseNumber(row[offset + 15] ?? '0'),
          fsvDRE:         this.parseNumber(row[offset + 16] ?? '0'),
          mcp:            this.parseNumber(row[offset + 17] ?? '0'),
        });
      }

      logger.info(`Successfully scraped ${records.length} GDAM records`);
      return records;

    } catch (error: any) {
      logger.error(`Error scraping GDAM: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }

  public static async scrapeRtm(maxRetries = 3): Promise<RtmIntervalRecord[]> {
    logger.info('Starting Puppeteer for RTM Market Data Scrape...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      try {
        const page = await browser.newPage();
        await page.emulateTimezone('Asia/Kolkata');
        await page.goto('https://www.iexindia.com/market-data/real-time-market/market-snapshot', {
          waitUntil: 'networkidle2',
          timeout: 60000
        });

        // Increased timeout to 30 seconds to be safer
        await page.waitForSelector('table', { timeout: 30000 });

        const data = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('table tbody tr'));
          return rows.map(row => {
            const columns = Array.from(row.querySelectorAll('td'));
            return columns.map(c => (c as HTMLElement).innerText.trim());
          });
        });

        const records: RtmIntervalRecord[] = [];
        let scrapedDate = '';
        for (const row of data) {
          const timeBlockIdx = row.findIndex(c => c && c.includes(':') && c.includes('-'));
          if (timeBlockIdx === -1) continue;

          if (timeBlockIdx >= 2 && row[0] && row[0].match(/^\d{2}-\d{2}-\d{4}$/)) {
            scrapedDate = row[0];
          }

          const timeBlock = row[timeBlockIdx];
          const [start] = timeBlock.split('-');
          if (!start) continue;
          const [hh, mm] = start.split(':').map(Number);
          const intervalNumber = (hh * 4) + (mm / 15) + 1;

          const offset = timeBlockIdx;

          // Check if this is a future block (all data columns are empty or '-')
          const isRowEmpty = [1, 2, 3, 4, 5].every(i => {
            const val = row[offset + i];
            return !val || val === '-' || val.trim() === '';
          });

          if (isRowEmpty) {
            continue; // Skip future/unpopulated blocks
          }

          records.push({
            date: scrapedDate,
            intervalNumber,
            intervalTime: start.trim(),
            sessionId: '1',
            purchaseBid: this.parseNumber(row[offset + 1] ?? '0'),
            sellBid:     this.parseNumber(row[offset + 2] ?? '0'),
            mcv:         this.parseNumber(row[offset + 3] ?? '0'),
            fsv:         this.parseNumber(row[offset + 4] ?? '0'),
            mcp:         this.parseNumber(row[offset + 5] ?? '0'),
          });
        }

        logger.info(`Successfully scraped ${records.length} RTM records on attempt ${attempt}`);
        return records;

      } catch (error: any) {
        logger.error(`Error scraping RTM on attempt ${attempt}: ${error.message}`);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retrying (exponential backoff or just static delay)
        await new Promise(resolve => setTimeout(resolve, 5000));
      } finally {
        await browser.close();
      }
    }
    return [];
  }

  public static async scrapeRec(): Promise<RecMonthlyRecord[]> {
    logger.info('Starting Puppeteer for REC Market Data Scrape...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      await page.emulateTimezone('Asia/Kolkata');
      await page.goto('https://www.iexindia.com/market-data/REC-market-from-dec22', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await page.waitForSelector('table', { timeout: 15000 });

      const data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
          const columns = Array.from(row.querySelectorAll('td'));
          return columns.map(c => (c as HTMLElement).innerText.trim());
        });
      });

      const records: RecMonthlyRecord[] = [];
      for (const row of data) {
        if (row.length < 8) continue; // Basic validation
        
        const yearStr = row[0];
        const monthRaw = row[1]; // 'January\n10-01-2024' or similar
        const type = row[2];
        const buyBids = row[3];
        const sellBids = row[4];
        const clearedVolume = row[5];
        const clearedPrice = row[6];
        const noOfParticipants = row[7];
        
        if (!yearStr || !monthRaw || !type) continue;
        
        const year = parseInt(yearStr, 10);
        const month = monthRaw.split('\n')[0].trim(); // Extract 'January' from 'January\n...'
        
        records.push({
          year,
          month,
          type,
          buyBids: this.parseNumber(buyBids),
          sellBids: this.parseNumber(sellBids),
          clearedVolume: this.parseNumber(clearedVolume),
          clearedPrice: this.parseNumber(clearedPrice),
          noOfParticipants: parseInt(noOfParticipants, 10) || 0
        });
      }

      logger.info(`Successfully scraped ${records.length} REC records`);
      return records;

    } catch (error: any) {
      logger.error(`Error scraping REC: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
