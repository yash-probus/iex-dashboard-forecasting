import { BaseTransformer } from './base.transformer';
import { MarketType } from '../../upload/upload.types';
import { RecMonthlyRecord, TransformationResult } from '../transformation.types';

export class RecTransformer extends BaseTransformer {
  protected market: MarketType = 'REC';

  public transform(rows: Record<string, string>[]): TransformationResult {
    const records: RecMonthlyRecord[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        records.push({
          year: parseInt(row['year'] || '0', 10),
          month: row['month']?.split('\n')[0]?.trim() || '',
          type: row['type'] || 'REC',
          buyBids: this.extractNumber(row, 'buy bids (rec)'),
          sellBids: this.extractNumber(row, 'sell bids (rec)'),
          clearedVolume: this.extractNumber(row, 'cleared volume (rec)'),
          clearedPrice: this.extractNumber(row, 'cleared price(rs/rec)'),
          noOfParticipants: parseInt(row['no. of participants'] || '0', 10) || 0
        });
      } catch (error: any) {
        warnings.push(`Row ${i + 1}: ${error.message}`);
        return { market: this.market, intervalCount: 0, records: [], warnings, isValid: false };
      }
    }

    return {
      market: this.market,
      intervalCount: records.length,
      records,
      warnings,
      isValid: true
    };
  }

  // Not used directly because transform is overridden, but required by BaseTransformer signature
  protected mapRow(row: Record<string, string>, intervalNumber: number, intervalTime: string): any {
    return {};
  }
}
