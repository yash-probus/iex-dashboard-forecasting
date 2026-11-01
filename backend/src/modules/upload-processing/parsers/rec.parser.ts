import { BaseParser } from './base.parser';
import { MarketType } from '../../upload/upload.types';
import { normalizeHeader } from '../upload-processing.types';

export class RecParser extends BaseParser {
  protected market: MarketType = 'REC';
  protected maxRows: number = 2000; // REC files can have many more rows than daily DAM/RTM

  protected requiredHeaders = [
    'Month',
    'Buy Bids (REC)',
    'Sell Bids (REC)',
    'Cleared Volume (REC)',
    'Cleared Price(Rs/REC)'
  ];

  protected validateRow(row: any): boolean {
    const pBid = row[normalizeHeader('Buy Bids (REC)')];
    const sBid = row[normalizeHeader('Sell Bids (REC)')];
    const cv = row[normalizeHeader('Cleared Volume (REC)')];
    const cp = row[normalizeHeader('Cleared Price(Rs/REC)')];

    if (!this.parseNumberField(pBid) || 
        !this.parseNumberField(sBid) || 
        !this.parseNumberField(cv) || 
        !this.parseNumberField(cp)) {
      return false;
    }

    return true;
  }
}
