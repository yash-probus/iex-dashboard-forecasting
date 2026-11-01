import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCtuCharges() {
  console.log('seedCtuCharges is disabled due to schema changes.');
}

if (require.main === module) {
  seedCtuCharges().catch(console.error).finally(() => prisma.$disconnect());
}
