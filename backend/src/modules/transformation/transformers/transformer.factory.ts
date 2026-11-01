import { MarketType } from '../../upload/upload.types';
import { ITransformer } from '../transformation.types';
import { DamTransformer } from './dam.transformer';
import { GdamTransformer } from './gdam.transformer';
import { RtmTransformer } from './rtm.transformer';
import { RecTransformer } from './rec.transformer';

export class TransformerFactory {
  public static getTransformer(market: MarketType): ITransformer {
    switch (market) {
      case 'DAM':
        return new DamTransformer();
      case 'GDAM':
        return new GdamTransformer();
      case 'RTM':
        return new RtmTransformer();
      case 'REC':
        return new RecTransformer();
      default:
        throw new Error(`Unsupported market type for transformation: ${market}`);
    }
  }
}
