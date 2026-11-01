import { BaseTransformer } from './base.transformer';
import { MarketType } from '../../upload/upload.types';
import { DamIntervalRecord } from '../transformation.types';

export class DamTransformer extends BaseTransformer {
  protected market: MarketType = 'DAM';

  protected mapRow(row: Record<string, string>, intervalNumber: number, intervalTime: string): DamIntervalRecord {
    return {
      intervalNumber,
      intervalTime,
      purchaseBid: this.extractNumber(row, 'purchase bid (mw)'),
      sellBid: this.extractNumber(row, 'sell bid (mw)'),
      mcv: this.extractNumber(row, 'mcv (mw)'),
      fsv: this.extractNumber(row, 'final scheduled volume (mw)'),
      mcp: this.extractNumber(row, 'mcp (rs/mwh)'),
    };
  }
}
