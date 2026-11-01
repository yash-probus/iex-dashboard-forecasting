import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

function parseNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/,/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

async function seedRtmSnapshot(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Reading file: ${filePath}`);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  // Try to find the date in row 2 (e.g. "Date: 01-08-2026") or from the data rows
  let targetDate = '';
  for (let i = 0; i < 10; i++) {
    if (data[i] && data[i][0] && typeof data[i][0] === 'string' && data[i][0].includes('Date:')) {
      targetDate = data[i][0].replace('Date:', '').trim();
      break;
    }
  }

  const recordsToInsert: any[] = [];
  
  // Start parsing from row 5 (index 4 is headers)
  let headerFound = false;
  let dateStr = '';
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;

    if (String(row[0]).toLowerCase() === 'date' && String(row[1]).toLowerCase() === 'hour') {
      headerFound = true;
      continue;
    }

    if (headerFound) {
      const dateVal = row[0];
      const timeBlock = row[3];
      if (!timeBlock || !timeBlock.includes('-')) continue;

      if (!dateStr) {
        dateStr = dateVal;
      }
      
      const [start] = timeBlock.split('-');
      const [hh, mm] = start.split(':').map(Number);
      const intervalNumber = (hh * 4) + (mm / 15) + 1;

      recordsToInsert.push({
        intervalNumber,
        intervalTime: start.trim(),
        sessionId: String(row[2] || '1'),
        purchaseBid: parseNumber(row[4]),
        sellBid: parseNumber(row[5]),
        mcv: parseNumber(row[6]),
        fsv: parseNumber(row[7]),
        mcp: parseNumber(row[8]),
      });
    }
  }

  if (recordsToInsert.length === 0) {
    console.log('No valid data rows found in the file.');
    return;
  }

  if (!targetDate) targetDate = dateStr;
  
  // Parse date into deliveryDate
  const [dd, mm, yyyy] = targetDate.split('-');
  const deliveryDate = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0));

  console.log(`Found ${recordsToInsert.length} records for delivery date: ${deliveryDate.toISOString().split('T')[0]}`);

  // Check if dataset exists
  let dataset = await prisma.dataset.findFirst({
    where: { market: 'RTM', deliveryDate }
  });

  if (dataset) {
    console.log('Existing dataset found. Updating...');
    // We update by wiping the existing records and inserting the new ones
    await prisma.rtmRecord.deleteMany({
      where: { datasetId: dataset.id }
    });
  } else {
    console.log('Creating new dataset...');
    dataset = await prisma.dataset.create({
      data: {
        market: 'RTM',
        deliveryDate,
        fileName: `seeded_rtm_${targetDate}.xlsx`,
        status: 'ACTIVE'
      }
    });
  }

  console.log('Inserting records...');
  const recordsWithDatasetId = recordsToInsert.map(r => ({ ...r, datasetId: dataset!.id }));
  await prisma.rtmRecord.createMany({
    data: recordsWithDatasetId
  });

  console.log('Done seeding RTM Snapshot!');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npx ts-node seedRtmSnapshot.ts <path-to-excel-file>');
} else {
  seedRtmSnapshot(args[0]).catch(console.error);
}
