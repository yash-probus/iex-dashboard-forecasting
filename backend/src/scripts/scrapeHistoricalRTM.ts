import { PrismaClient } from '@prisma/client';
import puppeteer, { Page } from 'puppeteer';

const prisma = new PrismaClient();

function parseNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/,/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatDateToDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function scrapeDay(page: Page, dateStr: string) {
  console.log(`\n--- Scraping ${dateStr} ---`);
  
  const targetUrl = `https://www.iexindia.com/market-data/real-time-market/market-snapshot?interval=ONE_FOURTH_HOUR&dp=SELECT_RANGE&showGraph=false&toDate=${dateStr}&fromDate=${dateStr}`;
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });
  
  // Zoom out the page to force the virtualized table to render all rows instantly
  await page.evaluate(() => {
    (document.body.style as any).zoom = '0.1';
  });
  
  console.log(`Waiting for table to load...`);
    
    // Wait until at least 90 rows are present in the table, or timeout after 15 seconds
    try {
      await page.waitForFunction(
        () => {
          const rows = document.querySelectorAll('table tbody tr');
          return rows.length >= 90;
        },
        { timeout: 15000 }
      );
      // Extra wait just in case it's still rendering the last few rows
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.log('Timeout waiting for 90+ rows. Scraping whatever loaded...');
    }
    
    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const columns = Array.from(row.querySelectorAll('td'));
        return columns.map(c => (c as HTMLElement).innerText.trim());
      });
    });

    return data;
}

async function runChunkedScraper(startDateStr: string, endDateStr: string) {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 5000 });

  let currentDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  while (currentDate <= endDate) {
    const formattedDate = formatDateToDDMMYYYY(currentDate);
    const deliveryDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0));
    
    try {
      const data = await scrapeDay(page, formattedDate);
      
      const recordsToInsert: any[] = [];
      for (const row of data) {
        if (!row || row.length < 5) continue;
        const timeBlockIdx = row.findIndex((c: string) => c && c.includes(':') && c.includes('-'));
        if (timeBlockIdx === -1) continue;

        const timeBlock = row[timeBlockIdx];
        const [start] = timeBlock.split('-');
        if (!start) continue;
        const [hh, mm] = start.split(':').map(Number);
        const intervalNumber = (hh * 4) + (mm / 15) + 1;
        const offset = timeBlockIdx;

        recordsToInsert.push({
          date: formattedDate,
          intervalNumber,
          intervalTime: start.trim(),
          sessionId: String(row[offset - 1] || '1'),
          purchaseBid: parseNumber(row[offset + 1] ?? '0'),
          sellBid: parseNumber(row[offset + 2] ?? '0'),
          mcv: parseNumber(row[offset + 3] ?? '0'),
          fsv: parseNumber(row[offset + 4] ?? '0'),
          mcp: parseNumber(row[offset + 5] ?? '0'),
        });
      }
      
      if (recordsToInsert.length > 0) {
        let dataset = await prisma.dataset.findFirst({
          where: { market: 'RTM', deliveryDate }
        });

        if (dataset) {
          console.log(`[${formattedDate}] Updating existing dataset with ${recordsToInsert.length} records...`);
          await prisma.rtmRecord.deleteMany({ where: { datasetId: dataset.id } });
        } else {
          console.log(`[${formattedDate}] Creating new dataset with ${recordsToInsert.length} records...`);
          dataset = await prisma.dataset.create({
            data: {
              market: 'RTM',
              deliveryDate,
              fileName: `scraped_rtm_historical_${formattedDate}.csv`,
              status: 'ACTIVE'
            }
          });
        }

        const recordsWithDatasetId = recordsToInsert.map(r => ({ ...r, datasetId: dataset!.id }));
        await prisma.rtmRecord.createMany({ data: recordsWithDatasetId });
        console.log(`[${formattedDate}] Successfully saved ${recordsToInsert.length} records!`);
      } else {
        console.log(`[${formattedDate}] No data found on IEX.`);
      }
    } catch (e: any) {
      console.error(`[${formattedDate}] Error scraping: ${e.message}`);
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Add random delay between 2-5 seconds to evade anti-bot detection
    const delay = Math.floor(Math.random() * 3000) + 2000;
    await new Promise(r => setTimeout(r, delay));
  }

  await browser.close();
  console.log('\n--- Historical Scraping Complete ---');
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx ts-node scrapeHistoricalRTM.ts <start-date-YYYY-MM-DD> <end-date-YYYY-MM-DD>');
  process.exit(1);
} else {
  runChunkedScraper(args[0], args[1]).catch(console.error);
}
