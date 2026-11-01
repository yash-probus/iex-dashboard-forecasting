import { BaseTransformer } from './base.transformer';
import { MarketType } from '../../upload/upload.types';
import { RtmIntervalRecord } from '../transformation.types';

export class RtmTransformer extends BaseTransformer {
  protected market: MarketType = 'RTM';

  protected mapRow(row: Record<string, string>, intervalNumber: number, intervalTime: string): RtmIntervalRecord {
    const sessionId = row['session id'];
    
    if (!sessionId || sessionId.trim() === '') {
      throw new Error(`Missing Session ID`);
    }

    return {
      intervalNumber,
      intervalTime,
      sessionId: sessionId.trim(),
      purchaseBid: this.extractNumber(row, 'purchase bid (mw)'),
      sellBid: this.extractNumber(row, 'sell bid (mw)'),
      mcv: this.extractNumber(row, 'mcv (mw)'),
      fsv: this.extractNumber(row, 'final scheduled volume (mw)'),
      mcp: this.extractNumber(row, 'mcp (rs/mwh)'),
    };
  }
}
