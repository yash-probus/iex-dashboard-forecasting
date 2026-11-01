import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

function parseNumber(val: any): number {
  if (!val || val === '-') return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

async function run() {
  try {
    const filePath = path.join(__dirname, '../../../GDAM_Market Snapshot (2).xlsx');
    console.log(`Reading file: ${filePath}`);
    
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    let headerRowIndex = -1;
    for (let i = 0; i < 20; i++) {
      const row = data[i] as any[];
      if (row && row.includes('Date') && row.includes('Time Block')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Header row not found');
    }

    const headers = data[headerRowIndex] as string[];
    const rows = data.slice(headerRowIndex + 1).filter((r: any) => r && r.length > 0 && r[0]);

    console.log(`Found ${rows.length} rows to process.`);

    const recordsByDate: Record<string, any[]> = {};
    const dateIntervalCounters: Record<string, number> = {};

    for (const row of rows) {
      const rowArr = row as any[];
      const dateStr = String(rowArr[headers.indexOf('Date')]);
      
      const timeBlock = String(rowArr[headers.indexOf('Time Block')]);
      
      if (!timeBlock || !timeBlock.includes('-') || timeBlock.toLowerCase().includes('max') || timeBlock.toLowerCase().includes('min') || timeBlock.toLowerCase().includes('avg') || timeBlock.toLowerCase().includes('total')) {
        continue;
      }
      
      if (!recordsByDate[dateStr]) {
        recordsByDate[dateStr] = [];
        dateIntervalCounters[dateStr] = 1;
      }

      const intervalNumber = dateIntervalCounters[dateStr]++;
      const intervalTime = String(rowArr[headers.indexOf('Time Block')]);

      recordsByDate[dateStr].push({
        intervalNumber,
        intervalTime,
        purchaseBid: parseNumber(rowArr[headers.indexOf('Purchase Bid (MW)')]),
        sellBidTotal: parseNumber(rowArr[headers.indexOf('Total Sell Bid (MW)')]),
        sellBidSolar: parseNumber(rowArr[headers.indexOf('Solar Sell Bid (MW)')] || rowArr[headers.indexOf('Solar Bid (MW)')]),
        sellBidNonSolar: parseNumber(rowArr[headers.indexOf('Non-Solar Sell Bid (MW)')]),
        sellBidHydro: parseNumber(rowArr[headers.indexOf('Hydro Sell Bid (MW)')] || rowArr[headers.indexOf('Hydro (MW)')]),
        sellBidWind: parseNumber(rowArr[headers.indexOf('Wind Sell Bid (MW)')]),
        sellBidOtherRE: parseNumber(rowArr[headers.indexOf('Other RE Sell Bid (MW)')]),
        sellBidORE: parseNumber(rowArr[headers.indexOf('ORE Sell Bid (MW)')]),
        sellBidDRE: parseNumber(rowArr[headers.indexOf('DRE Sell Bid (MW)')]),
        
        mcvTotal: parseNumber(rowArr[headers.indexOf('Total MCV (MW)')]),
        mcvSolar: parseNumber(rowArr[headers.indexOf('Solar MCV (MW)')]),
        mcvNonSolar: parseNumber(rowArr[headers.indexOf('Non-Solar MCV (MW)')]),
        mcvHydro: parseNumber(rowArr[headers.indexOf('Hydro MCV (MW)')]),
        mcvWind: parseNumber(rowArr[headers.indexOf('Wind MCV (MW)')]),
        mcvOtherRE: parseNumber(rowArr[headers.indexOf('Other RE MCV (MW)')]),
        mcvORE: parseNumber(rowArr[headers.indexOf('ORE MCV (MW)')]),
        mcvDRE: parseNumber(rowArr[headers.indexOf('DRE MCV (MW)')]),
        
        fsvTotal: parseNumber(rowArr[headers.indexOf('Total FSV (MW)')]),
        fsvSolar: parseNumber(rowArr[headers.indexOf('Solar FSV (MW)')]),
        fsvNonSolar: parseNumber(rowArr[headers.indexOf('Non-Solar FSV (MW)')]),
        fsvHydro: parseNumber(rowArr[headers.indexOf('Hydro FSV (MW)')]),
        fsvWind: parseNumber(rowArr[headers.indexOf('Wind FSV (MW)')]),
        fsvOtherRE: parseNumber(rowArr[headers.indexOf('Other RE FSV (MW)')]),
        fsvORE: parseNumber(rowArr[headers.indexOf('ORE FSV (MW)')]),
        fsvDRE: parseNumber(rowArr[headers.indexOf('DRE FSV (MW)')]),
        
        mcp: parseNumber(rowArr[headers.indexOf('MCP (Rs/MWh)')]),
      });
    }

    const { PersistenceService } = require('../modules/persistence/persistence.service');

    for (const [dateStr, records] of Object.entries(recordsByDate)) {
      console.log(`Processing date ${dateStr} with ${records.length} records...`);
      const [day, month, year] = dateStr.split('-').map(Number);
      const deliveryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      const existing = await prisma.dataset.findFirst({
        where: { market: 'GDAM', deliveryDate, status: 'ACTIVE' }
      });

      await PersistenceService.persistDataset({
        market: 'GDAM',
        deliveryDate,
        fileName: `seeded_multi_day_${dateStr}.xlsx`,
        records,
        action: existing ? 'replace' : undefined
      });
      console.log(`Saved ${dateStr} successfully!`);
    }

    console.log("All done!");

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
