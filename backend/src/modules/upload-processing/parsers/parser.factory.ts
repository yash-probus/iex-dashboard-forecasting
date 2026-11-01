import { MarketType } from '../../upload/upload.types';
import { IParser } from '../upload-processing.types';
import { DamParser } from './dam.parser';
import { GdamParser } from './gdam.parser';
import { RtmParser } from './rtm.parser';
import { RecParser } from './rec.parser';

export class ParserFactory {
  public static getParser(market: MarketType): IParser {
    switch (market) {
      case 'DAM':
        return new DamParser();
      case 'GDAM':
        return new GdamParser();
      case 'RTM':
        return new RtmParser();
      case 'REC':
        return new RecParser();
      default:
        throw new Error(`Unsupported market type: ${market}`);
    }
  }
}
