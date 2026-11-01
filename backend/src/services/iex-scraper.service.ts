import puppeteer from 'puppeteer';
import { PrismaClient, MarketType } from '@prisma/client';
import { setTimeout } from 'timers/promises';

const prisma = new PrismaClient();

// Map DB State Names to IEX Area options
const IEX_STATE_MAPPING: Record<string, string> = {
  'Jammu and Kashmir': 'N1_J&K',
  'Himachal Pradesh': 'N1_Himachal Pradesh',
  'Chandigarh': 'N1_Chandigarh',
  'Haryana': 'N1_Haryana',
  'Uttar Pradesh': 'N2_Uttar Pradesh',
  'Uttarakhand': 'N2_Uttarakhand',
  'Rajasthan': 'N2_Rajasthan',
  'Delhi': 'N2_Delhi',
  'Punjab': 'N3_Punjab',
  'West Bengal': 'E1_West Bengal',
  'Sikkim': 'E1_Sikkim',
  'Bihar': 'E1_Bihar',
  'Jharkhand': 'E1_Jharkhand',
  'Odisha': 'E2_Odisha',
  'Madhya Pradesh': 'W1_MP',
  'Maharashtra': 'W2_Maharashtra',
  'Gujarat': 'W2_Gujarat',
  'Daman and Diu': 'W2_Daman and Diu',
  'Dadra and Nagar Haveli': 'W2_Dadar and Nagar Haveli',
  'Goa': 'W2_Goa (West)', // Assuming Goa is Goa (West)
  'Chhattisgarh': 'W3_Chhattisgarh',
  'Andhra Pradesh': 'S1_AP',
  'Telangana': 'S1_Telangana',
  'Karnataka': 'S1_Karnataka',
  'Tamil Nadu': 'S2_Tamil Nadu',
  'Puducherry': 'S2_Puducherry',
  'Tripura': 'A1_Tripura',
  'Meghalaya': 'A1_Meghalaya',
  'Manipur': 'A1_Manipur',
  'Mizoram': 'A1_Mizoram',
  'Nagaland': 'A1_Nagaland',
  'Assam': 'A2_Assam',
  'Arunachal Pradesh': 'A2_Arunachal Pradesh',
  'Kerala': 'S3_Kerala'
};

const MARKET_SEGMENT_MAPPING = {
  [MarketType.DAM]: '1',
  [MarketType.GDAM]: '2',
  [MarketType.RTM]: '3'
};

const ZONE_TO_STATES: Record<string, { representativeOption: string; states: string[] }> = {
  'N1': { representativeOption: 'N1_J&K', states: ['Jammu and Kashmir', 'Himachal Pradesh', 'Chandigarh'] },
  'N1_HR': { representativeOption: 'N1_Haryana', states: ['Haryana'] },
  'N2': { representativeOption: 'N2_Delhi', states: ['Delhi', 'Uttar Pradesh', 'Rajasthan'] },
  'N2_UK': { representativeOption: 'N2_Uttarakhand', states: ['Uttarakhand'] },
  'N3': { representativeOption: 'N3_Punjab', states: ['Punjab'] },
  'E1': { representativeOption: 'E1_West Bengal', states: ['West Bengal', 'Sikkim', 'Bihar', 'Jharkhand'] },
  'E2': { representativeOption: 'E2_Odisha', states: ['Odisha'] },
  'W1': { representativeOption: 'W1_MP', states: ['Madhya Pradesh'] },
  'W2': { representativeOption: 'W2_Maharashtra', states: ['Maharashtra', 'Gujarat', 'Daman and Diu', 'Dadra and Nagar Haveli', 'Goa'] },
  'W3': { representativeOption: 'W3_Chhattisgarh', states: ['Chhattisgarh'] },
  'S1': { representativeOption: 'S1_AP', states: ['Andhra Pradesh', 'Telangana', 'Karnataka'] },
  'S2': { representativeOption: 'S2_Tamil Nadu', states: ['Tamil Nadu', 'Puducherry'] },
  'S3': { representativeOption: 'S3_Kerala', states: ['Kerala'] },
  'A1': { representativeOption: 'A1_Tripura', states: ['Tripura', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland'] },
  'A2': { representativeOption: 'A2_Assam', states: ['Assam', 'Arunachal Pradesh'] }
};

export class IexScraperService {
  
  async fetchMarketData(market: MarketType, dateString: string) {
    console.log(`[IEX Scraper] Starting scrape for ${market} on ${dateString}`);
    
    // Fetch unique states from DB
    const cityStates = await prisma.cityStateData.findMany({
      select: { stateName: true },
      distinct: ['stateName']
    });
    const dbStates = cityStates.map(s => s.stateName);

    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
      await page.goto('https://iexrtmprice.com/DSM_Data/', { waitUntil: 'networkidle2' });
      await page.select('select[name="segment"]', MARKET_SEGMENT_MAPPING[market as keyof typeof MARKET_SEGMENT_MAPPING]);
      
      for (const [zone, config] of Object.entries(ZONE_TO_STATES)) {
        const activeStates = config.states.filter(s => dbStates.includes(s));
        if (activeStates.length === 0) continue;

        console.log(`[IEX Scraper] Scraping zone ${zone} using option ${config.representativeOption} for: ${activeStates.join(', ')}`);
        
        // Select Area
        await page.select('#mySelect', config.representativeOption);
        
        // Set dates
        await page.$eval('#fromDate', (el: any, d) => el.value = d, dateString);
        await page.$eval('#toDate', (el: any, d) => el.value = d, dateString);
        
        // Submit and wait for the page reload to complete
        await Promise.all([
          page.click('#submit_btn'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
        ]);
        
        // Wait for actual table rows to render (skip if empty)
        await page.waitForSelector('#example tbody tr td:not(.dataTables_empty)', { timeout: 10000 }).catch(() => {});
        
        // Extract table
        const tableData = await page.$$eval('#example tbody tr', rows => {
          return rows.map(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length < 8) return null;
            return {
              deliveryDate: tds[0].innerText.trim(),
              timePeriod: tds[1].innerText.trim(),
              purchaseBid: parseFloat(tds[3].innerText.trim() || '0'),
              sellBid: parseFloat(tds[4].innerText.trim() || '0'),
              mcv: parseFloat(tds[5].innerText.trim() || '0'),
              mcp: parseFloat(tds[7].innerText.trim() || '0'),
            };
          }).filter(r => r !== null);
        });

        if (tableData.length === 0) {
          console.log(`[IEX Scraper] No data found for zone ${zone} on ${dateString}`);
          continue;
        }

        // Save and dispatch for each state mapped to this zone
        for (const stateName of activeStates) {
          let successCount = 0;
          const upsertedRecords = [];
          for (let i = 0; i < tableData.length; i++) {
            const row = tableData[i];
            if (!row) continue;
            
            const isoDate = new Date(dateString.split('-').reverse().join('-') + 'T00:00:00Z');
            
            await prisma.stateMarketRecord.upsert({
              where: {
                market_area_deliveryDate_intervalNumber: {
                  market,
                  area: stateName,
                  deliveryDate: isoDate,
                  intervalNumber: i + 1
                }
              },
              update: {
                purchaseBid: row.purchaseBid,
                sellBid: row.sellBid,
                clearedVolume: row.mcv,
                price: row.mcp,
                intervalTime: row.timePeriod.split(' - ')[0]?.trim() || row.timePeriod.split('-')[0]?.trim() || row.timePeriod
              },
              create: {
                market,
                area: stateName,
                deliveryDate: isoDate,
                intervalNumber: i + 1,
                intervalTime: row.timePeriod.split(' - ')[0]?.trim() || row.timePeriod.split('-')[0]?.trim() || row.timePeriod,
                purchaseBid: row.purchaseBid,
                sellBid: row.sellBid,
                clearedVolume: row.mcv,
                price: row.mcp
              }
            });
            successCount++;
            upsertedRecords.push(row);
          }
          console.log(`[IEX Scraper] Saved ${successCount} records for ${stateName}`);

          // Dispatch to webhook receivers
          if (upsertedRecords.length > 0) {
            const isoDate = new Date(dateString.split('-').reverse().join('-') + 'T00:00:00Z');
            const { WebhookDispatcher } = require('../utils/webhook-dispatcher');
            await WebhookDispatcher.dispatch('state-market-records', {
              market,
              area: stateName,
              deliveryDate: isoDate,
              records: upsertedRecords
            });
          }
        }
      }
    } catch (error) {
      console.error(`[IEX Scraper] Error scraping ${market}:`, error);
    } finally {
      await browser.close();
    }
  }
}

export const iexScraperService = new IexScraperService();
