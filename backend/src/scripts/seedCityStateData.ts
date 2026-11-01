import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

function parseCoordinate(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).trim();
  const match = str.match(/([-+]?[0-9]*\.?[0-9]+)/);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  if (str.toUpperCase().includes('S') || str.toUpperCase().includes('W')) {
    num = -num;
  }
  return num;
}

function parsePopulation(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleanStr = String(val).replace(/,/g, '').trim();
  const parsed = parseInt(cleanStr, 10);
  return isNaN(parsed) ? 0 : parsed;
}

async function main() {
  const filePath = path.join(__dirname, '../../../Untitled spreadsheet (3).xlsx');
  console.log('Reading spreadsheet from:', filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
  console.log(`Loaded ${jsonData.length} rows from Excel.`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of jsonData) {
    const cityName = row['__EMPTY'] ? String(row['__EMPTY']).trim() : '';
    const stateName = row['__EMPTY_1'] ? String(row['__EMPTY_1']).trim() : '';
    
    if (!cityName || cityName === 'Name' || stateName === 'State or Union territory') {
      skippedCount++;
      continue;
    }

    const population = parsePopulation(row['__EMPTY_2']);
    const latitude = parseCoordinate(row['__EMPTY_3']);
    const longitude = parseCoordinate(row['__EMPTY_4']);

    try {
      await prisma.cityStateData.upsert({
        where: {
          cityName_stateName: {
            cityName,
            stateName
          }
        },
        update: {
          population,
          latitude,
          longitude
        },
        create: {
          cityName,
          stateName,
          population,
          latitude,
          longitude
        }
      });
      insertedCount++;
    } catch (err) {
      console.error(`Failed to upsert row ${cityName}, ${stateName}:`, err);
    }
  }

  console.log(`Upserted ${insertedCount} city records. Skipped ${skippedCount} rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
