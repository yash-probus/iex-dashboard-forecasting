import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

const monthMap: Record<string, number> = {
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
};

async function main() {
  const csvPath = '/Users/yashgupta/IEX-Dashboard/state-tariff-correct.csv';
  console.log(`Reading CSV file from ${csvPath}...`);

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  // Clean BOM if present
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xFEFF) {
    headerLine = headerLine.slice(1);
  }

  const headersRaw = headerLine.split(',').map(s => s.trim());
  const headers = headersRaw.map(h => h.toLowerCase().trim().replace(/ /g, '_').replace(/\(₹\)/g, '').trim().replace(/_+/g, '_'));
  console.log('Normalized Headers:', headers);

  console.log('Clearing all records from stateTariff table...');
  const deleteResult = await prisma.stateTariff.deleteMany({});
  console.log(`Deleted ${deleteResult.count} records.`);

  const recordsToInsert: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(s => s.trim());
    if (values.length < headers.length) {
      continue;
    }

    const row: any = {};
    headers.forEach((header, index) => {
      let val: any = values[index];
      if (val === '-' || val === '') {
        val = null;
      }
      row[header] = val;
    });

    let monthInt = 1;
    if (row['month']) {
      const parts = row['month'].split('-');
      if (parts.length > 0) {
        const m = monthMap[parts[0].toLowerCase()];
        if (m) {
          monthInt = m;
        }
      }
    }

    let unit = row['base_energy_unit'] || 'kWh';
    if (unit.toLowerCase().includes('kvah')) {
       unit = 'kVAh';
    } else if (unit.toLowerCase().includes('kwh')) {
       unit = 'kWh';
    }

    const tariffRecord = {
      state: row['state'],
      discom: row['discom'] || null,
      consumerCategory: row['consumer_category'],
      subCategory: row['sub_category'] || '',
      supplyVoltageCategory: row['supply_voltage_category'] || '',
      supplyVoltage: row['supply_voltage'] || '',
      month: monthInt,
      todStartTime: row['tod_start_time'] || '',
      todEndTime: row['tod_end_time'] || '',
      baseEnergyRate: Number(row['base_energy_rate'] || 0),
      baseEnergyUnit: unit,
      todChargePercent: parseInt(row['tod_charge_%'] || row['tod_charge_percent'] || '0', 10),
      energyRate: Number(row['energy_rate'] || 0),
    };

    recordsToInsert.push(tariffRecord);
  }

  const chunkSize = 500;
  for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
    const chunk = recordsToInsert.slice(i, i + chunkSize);
    await prisma.stateTariff.createMany({
      data: chunk,
      skipDuplicates: true,
    });
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
