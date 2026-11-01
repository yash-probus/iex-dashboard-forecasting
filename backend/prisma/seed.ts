import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

const prisma = new PrismaClient();

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date();
}

async function seedStateCharges() {
  console.log('Seeding State Charges...');
  
  // Try multiple possible paths for the CSV file
  const possiblePaths = [
    path.join(__dirname, '../backend_tables_updated - state_charges.csv'),
    path.join(__dirname, '../../backend_tables_updated - state_charges.csv'),
    '/app/backend_tables_updated - state_charges.csv',
    './backend_tables_updated - state_charges.csv'
  ];
  
  let csvFilePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvFilePath = p;
      console.log(`Found state charges CSV at: ${csvFilePath}`);
      break;
    }
  }
  
  if (!csvFilePath) {
    console.log('State charges CSV file not found in any location, skipping...');
    console.log('Searched paths:', possiblePaths);
    return;
  }

  await prisma.stateCharges.deleteMany();

  const records: any[] = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (data) => records.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  for (const record of records) {
    const {
      state,
      discom,
      category,
      sub_category,
      supply_voltage_category,
      voltage_level,
      from_date,
      to_date,
      demand_fixed_charge_kva_per_month_Rs,
      cross_subsidy,
      distribution_wheeling_charges,
      stu_charges,
      stu_loss_percent,
      wheeling_loss_percent,
      additional_charge
    } = record;

    await prisma.stateCharges.create({
      data: {
        state: state || '',
        discom: discom || null,
        category: category || null,
        subCategory: sub_category || null,
        supplyVoltageCategory: supply_voltage_category || null,
        voltageLevel: voltage_level || null,
        fromDate: parseDate(from_date),
        toDate: parseDate(to_date),
        demandFixedChargeKvaPerMonthRs: demand_fixed_charge_kva_per_month_Rs ? parseFloat(demand_fixed_charge_kva_per_month_Rs) : null,
        crossSubsidy: cross_subsidy ? parseFloat(cross_subsidy) : null,
        distributionWheelingCharges: distribution_wheeling_charges ? parseFloat(distribution_wheeling_charges) : null,
        stuCharges: stu_charges ? parseFloat(stu_charges) : null,
        stuLossPercent: stu_loss_percent ? parseFloat(stu_loss_percent) : null,
        wheelingLossPercent: wheeling_loss_percent ? parseFloat(wheeling_loss_percent) : null,
        additionalCharge: additional_charge ? parseFloat(additional_charge) : null,
      }
    });
  }

  console.log(`Inserted ${records.length} State Charges records.`);
}

async function main() {
  console.log('Seeding database...');

  // Seed state charges first
  await seedStateCharges();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@iexdashboard.local';
  const password = process.env.ADMIN_PASSWORD || 'admin';

  // 1. Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username }
  });

  if (existingAdmin) {
    console.log(`Admin user '${username}' already exists. Skipping seed to prevent password overwrite.`);
  } else {
    // 2. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Create admin
    const admin = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: 'ADMIN'
      }
    });

    console.log('Admin user seeded successfully:', admin.username);
  }

  // Also seed a test client user
  const clientUsername = 'client';
  const existingClient = await prisma.user.findUnique({ where: { username: clientUsername } });
  
  if (!existingClient) {
    const passwordHash = await bcrypt.hash('client', 10);
    await prisma.user.create({
      data: {
        username: clientUsername,
        email: 'client@iexdashboard.local',
        passwordHash,
        role: 'CLIENT'
      }
    });
    console.log('Client user seeded successfully: client');
  }
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
