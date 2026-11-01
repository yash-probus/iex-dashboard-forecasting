import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NppAdjustmentService {
  /**
   * Generates time slots like "00:00", "00:15", ..., "23:45"
   */
  private static generate15MinSlots(): string[] {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }

  /**
   * Helper to parse "HH:MM" into total minutes from midnight
   */
  private static timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Groups raw records by their 15-min bucket.
   * A raw record belongs to a 15-min bucket if its timestamp is >= bucketStart and < bucketEnd.
   * e.g., "00:03" belongs to "00:00". "00:15" belongs to "00:15".
   */
  private static getBucketKey(timeStr: string): string {
    const totalMinutes = this.timeToMinutes(timeStr);
    const bucketMinutes = Math.floor(totalMinutes / 15) * 15;
    const h = Math.floor(bucketMinutes / 60);
    const m = bucketMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Calculate adjusted demand for a specific date and upsert to NppAdjustedDemandData.
   * Formula: Average of all data points in that 15-minute window.
   */
  static async updateAdjustedDemandForDate(date: string): Promise<void> {
    const rawData = await prisma.nppRawDemandData.findMany({
      where: { date },
      orderBy: { timeStr: 'asc' }
    });

    if (rawData.length === 0) return;

    // Group by 15-min slots
    const buckets: Record<string, number[]> = {};
    const slots = this.generate15MinSlots();
    slots.forEach(slot => buckets[slot] = []);

    rawData.forEach(row => {
      const bucket = this.getBucketKey(row.timeStr);
      if (buckets[bucket]) {
        buckets[bucket].push(row.demandMet);
      }
    });

    // Calculate averages and upsert
    for (const slot of slots) {
      const values = buckets[slot];
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;

        await prisma.nppAdjustedDemandData.upsert({
          where: {
            date_timeStr: {
              date,
              timeStr: slot
            }
          },
          update: {
            demandMet: avg
          },
          create: {
            date,
            timeStr: slot,
            demandMet: avg
          }
        });
      }
    }
  }

  /**
   * Calculate adjusted generation for a specific date and upsert to NppAdjustedGenerationData.
   * Formula: Average of all data points in that 15-minute window.
   */
  static async updateAdjustedGenerationForDate(date: string): Promise<void> {
    const rawData = await prisma.nppRawGenerationData.findMany({
      where: { date },
      orderBy: { timeStr: 'asc' }
    });

    if (rawData.length === 0) return;

    // Group by 15-min slots
    type GenData = { thermal: number; gas: number; nuclear: number; hydro: number; wind: number; solar: number };
    const buckets: Record<string, GenData[]> = {};
    const slots = this.generate15MinSlots();
    slots.forEach(slot => buckets[slot] = []);

    rawData.forEach(row => {
      const bucket = this.getBucketKey(row.timeStr);
      if (buckets[bucket]) {
        buckets[bucket].push({
          thermal: row.thermal || 0,
          gas: row.gas || 0,
          nuclear: row.nuclear || 0,
          hydro: row.hydro || 0,
          wind: row.wind || 0,
          solar: row.solar || 0
        });
      }
    });

    // Calculate averages and upsert
    for (const slot of slots) {
      const values = buckets[slot];
      if (values.length > 0) {
        const avgData: GenData = { thermal: 0, gas: 0, nuclear: 0, hydro: 0, wind: 0, solar: 0 };
        
        values.forEach(v => {
          avgData.thermal += v.thermal;
          avgData.gas += v.gas;
          avgData.nuclear += v.nuclear;
          avgData.hydro += v.hydro;
          avgData.wind += v.wind;
          avgData.solar += v.solar;
        });

        const count = values.length;
        avgData.thermal /= count;
        avgData.gas /= count;
        avgData.nuclear /= count;
        avgData.hydro /= count;
        avgData.wind /= count;
        avgData.solar /= count;

        await prisma.nppAdjustedGenerationData.upsert({
          where: {
            date_timeStr: {
              date,
              timeStr: slot
            }
          },
          update: {
            thermal: avgData.thermal,
            gas: avgData.gas,
            nuclear: avgData.nuclear,
            hydro: avgData.hydro,
            wind: avgData.wind,
            solar: avgData.solar
          },
          create: {
            date,
            timeStr: slot,
            thermal: avgData.thermal,
            gas: avgData.gas,
            nuclear: avgData.nuclear,
            hydro: avgData.hydro,
            wind: avgData.wind,
            solar: avgData.solar
          }
        });
      }
    }
  }
}
