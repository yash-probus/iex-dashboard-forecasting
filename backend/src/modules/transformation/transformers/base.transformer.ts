import { MarketType } from '../../upload/upload.types';
import { ITransformer, TransformationResult } from '../transformation.types';
import { logger } from '../../../logger';

export abstract class BaseTransformer implements ITransformer {
  protected abstract market: MarketType;

  // Subclasses implement this to map a single row
  protected abstract mapRow(row: Record<string, string>, intervalNumber: number, intervalTime: string): unknown;

  public transform(rows: Record<string, string>[]): TransformationResult {
    logger.info(`Transformation Started for ${this.market}`);

    // 1. Expected Row Count Validation
    if (rows.length !== 96) {
      logger.warn(`Transformation Failed: Expected exactly 96 rows, but got ${rows.length}`);
      return {
        market: this.market,
        intervalCount: rows.length,
        records: [],
        warnings: [],
        isValid: false
      };
    }

    const records: unknown[] = [];
    const warnings: string[] = [];

    // 2. Interval Generation & Mapping
    for (let i = 0; i < rows.length; i++) {
      const intervalNumber = i + 1;
      const intervalTime = this.calculateIntervalTime(intervalNumber);
      
      try {
        const mappedRecord = this.mapRow(rows[i], intervalNumber, intervalTime);
        records.push(mappedRecord);
      } catch (error: any) {
        logger.error(`Transformation Error at interval ${intervalNumber}: ${error.message}`);
        warnings.push(`Interval ${intervalNumber}: ${error.message}`);
        return {
          market: this.market,
          intervalCount: 0,
          records: [],
          warnings,
          isValid: false
        };
      }
    }

    logger.info(`Transformation Completed: 96 interval objects generated`);

    return {
      market: this.market,
      intervalCount: records.length,
      records,
      warnings,
      isValid: true
    };
  }

  // Calculate "HH:MM" for interval 1..96
  private calculateIntervalTime(intervalNumber: number): string {
    // interval 1 -> 00:00
    // interval 2 -> 00:15
    const totalMinutes = (intervalNumber - 1) * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');

    return `${hh}:${mm}`;
  }

  // Utility to safely extract a number
  protected extractNumber(row: Record<string, string>, key: string): number {
    const val = row[key];
    if (val === undefined) {
      throw new Error(`Missing expected column '${key}' during transformation`);
    }
    if (val === null || String(val).trim() === '') {
      // In some fields (like Solar/Hydro), it might legitimately be empty.
      return 0; 
    }
    const num = Number(val);
    if (isNaN(num)) {
      throw new Error(`Corrupt numeric value '${val}' in column '${key}'`);
    }
    return num;
  }
}
