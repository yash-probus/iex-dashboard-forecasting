import { BaseParser } from './base.parser';
import { MarketType } from '../../upload/upload.types';
import { normalizeHeader } from '../upload-processing.types';

export class GdamParser extends BaseParser {
  protected market: MarketType = 'GDAM';

  protected requiredHeaders = [
    'Purchase Bid (MW)',
    'Total Sell Bid (MW)',
    'Total MCV (MW)',
    'Total FSV (MW)',
    'MCP (Rs/MWh)'
  ];

  protected validateRow(row: any): boolean {
    const pBid = row[normalizeHeader('Purchase Bid (MW)')];
    const tSellBid = row[normalizeHeader('Total Sell Bid (MW)')];
    const tMcv = row[normalizeHeader('Total MCV (MW)')];
    const tFsv = row[normalizeHeader('Total FSV (MW)')];
    const mcp = row[normalizeHeader('MCP (Rs/MWh)')];

    // We only enforce that at least the core totals are valid numbers.
    // Individual fields like Solar/Non-Solar might theoretically be empty or missing in certain markets, 
    // but the spec said they must be parsable as numbers.
    // The requirement says: Purchase Bid, Sell Bid, MCV, FSV, MCP must be parsable.
    
    // Check all required numeric fields
    for (const rawHeader of this.requiredHeaders) {
      const val = row[normalizeHeader(rawHeader)];
      if (!this.parseNumberField(val)) {
        return false;
      }
    }

    return true;
  }
}
