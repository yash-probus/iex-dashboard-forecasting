import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const possiblePaths = [
    '/Users/yashgupta/IEX-Dashboard/aayaya.csv',
    path.join(__dirname, '../../aayaya.csv'),
    path.join(__dirname, '../../../aayaya.csv'),
    path.join(process.cwd(), 'aayaya.csv'),
    path.join(process.cwd(), '../aayaya.csv')
  ];

  let csvPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.error(`File aayaya.csv not found in any of these paths:`, possiblePaths);
    process.exit(1);
  }

  console.log(`Reading CSV file from ${csvPath}...`);

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    console.error('CSV file has no data.');
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  console.log('Headers:', headers);

  // Clear existing stateTariff records
  console.log('Clearing all records from stateTariff table...');
  const deleteResult = await prisma.stateTariff.deleteMany({});
  console.log(`Deleted ${deleteResult.count} records.`);

  const recordsToInsert: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) {
      console.warn(`Skipping line ${i + 1} due to mismatch in column count.`);
      continue;
    }

    const row: any = {};
    headers.forEach((header, index) => {
      let val: any = values[index];
      // Normalize values
      if (val === '-' || val === '') {
        val = null;
      }
      row[header] = val;
    });

    // Map fields to stateTariff schema
    const tariffRecord = {
      state: row['state'],
      discom: row['discom'] || null,
      consumerCategory: row['consumer_category'],
      subCategory: row['sub-category'] || row['sub_category'] || '',
      supplyVoltageCategory: row['supply_voltage_category'],
      supplyVoltage: row['supply_voltage'] || '',
      month: parseInt(row['month'], 10),
      todStartTime: row['tod_start_time'] || '',
      todEndTime: row['tod_end_time'] || '',
      baseEnergyRate: Number(row['base_energy_rate'] || 0),
      baseEnergyUnit: row['base_energy_unit'] || 'kWh',
      todChargePercent: parseInt(row['tod_charge_percent'] || '0', 10),
      energyRate: Number(row['energy_rate'] || 0),
    };

    recordsToInsert.push(tariffRecord);
  }

  console.log(`Parsed ${recordsToInsert.length} records. Performing bulk insertion...`);

  // Insert in chunks of 500 records to prevent query payload limits
  const chunkSize = 500;
  for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
    const chunk = recordsToInsert.slice(i, i + chunkSize);
    await prisma.stateTariff.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(recordsToInsert.length / chunkSize)}`);
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
