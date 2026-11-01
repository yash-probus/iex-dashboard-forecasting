import { BaseParser } from './base.parser';
import { MarketType } from '../../upload/upload.types';
import { normalizeHeader } from '../upload-processing.types';

export class DamParser extends BaseParser {
  protected market: MarketType = 'DAM';

  protected requiredHeaders = [
    'Purchase Bid (MW)',
    'Sell Bid (MW)',
    'MCV (MW)',
    'Final Scheduled Volume (MW)',
    'MCP (Rs/MWh)'
  ];

  protected validateRow(row: any): boolean {
    // Row keys are normalized headers
    const pBid = row[normalizeHeader('Purchase Bid (MW)')];
    const sBid = row[normalizeHeader('Sell Bid (MW)')];
    const mcv = row[normalizeHeader('MCV (MW)')];
    const fsv = row[normalizeHeader('Final Scheduled Volume (MW)')];
    const mcp = row[normalizeHeader('MCP (Rs/MWh)')];

    // If any of the essential fields are un-parsable, the row is corrupt
    if (!this.parseNumberField(pBid) || 
        !this.parseNumberField(sBid) || 
        !this.parseNumberField(mcv) || 
        !this.parseNumberField(fsv) || 
        !this.parseNumberField(mcp)) {
      return false;
    }

    return true;
  }
}
