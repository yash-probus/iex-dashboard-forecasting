import { BaseTransformer } from './base.transformer';
import { MarketType } from '../../upload/upload.types';
import { GdamIntervalRecord, GdamNewIntervalRecord } from '../transformation.types';

export class GdamTransformer extends BaseTransformer {
  protected market: MarketType = 'GDAM';

  protected mapRow(row: Record<string, string>, intervalNumber: number, intervalTime: string): any {
    return {
      intervalNumber,
      intervalTime,
      purchaseBid: this.extractNumber(row, 'purchase bid (mw)'),
      sellBidTotal: this.extractNumber(row, 'total sell bid (mw)'),
      sellBidSolar: this.extractNumber(row, 'solar bid (mw)'),
      sellBidNonSolar: this.extractNumber(row, 'non-solar sell bid (mw)'),
      sellBidHydro: this.extractNumber(row, 'hydro sell bid (mw)') || this.extractNumber(row, 'hydro (mw)'),
      sellBidWind: this.extractNumber(row, 'wind sell bid (mw)') || this.extractNumber(row, 'wind (mw)'),
      sellBidOtherRE: this.extractNumber(row, 'other re sell bid (mw)') || this.extractNumber(row, 'other re (mw)') || this.extractNumber(row, 'other-re (mw)'),
      sellBidORE: this.extractNumber(row, 'ore sell bid (mw)') || this.extractNumber(row, 'ore (mw)'),
      sellBidDRE: this.extractNumber(row, 'dre sell bid (mw)') || this.extractNumber(row, 'dre (mw)'),
      
      mcvTotal: this.extractNumber(row, 'total mcv (mw)'),
      mcvSolar: this.extractNumber(row, 'solar mcv (mw)'),
      mcvNonSolar: this.extractNumber(row, 'non-solar mcv (mw)'),
      mcvHydro: this.extractNumber(row, 'hydro mcv (mw)') || this.extractNumber(row, 'hydro (mw)'),
      mcvWind: this.extractNumber(row, 'wind mcv (mw)') || this.extractNumber(row, 'wind (mw)'),
      mcvOtherRE: this.extractNumber(row, 'other re mcv (mw)') || this.extractNumber(row, 'other re (mw)') || this.extractNumber(row, 'other-re (mw)'),
      mcvORE: this.extractNumber(row, 'ore mcv (mw)') || this.extractNumber(row, 'ore (mw)'),
      mcvDRE: this.extractNumber(row, 'dre mcv (mw)') || this.extractNumber(row, 'dre (mw)'),
      
      fsvTotal: this.extractNumber(row, 'total fsv (mw)'),
      fsvSolar: this.extractNumber(row, 'solar fsv (mw)'),
      fsvNonSolar: this.extractNumber(row, 'non-solar fsv (mw)'),
      fsvHydro: this.extractNumber(row, 'hydro fsv (mw)') || this.extractNumber(row, 'hydro (mw)'),
      fsvWind: this.extractNumber(row, 'wind fsv (mw)') || this.extractNumber(row, 'wind (mw)'),
      fsvOtherRE: this.extractNumber(row, 'other re fsv (mw)') || this.extractNumber(row, 'other re (mw)') || this.extractNumber(row, 'other-re (mw)'),
      fsvORE: this.extractNumber(row, 'ore fsv (mw)') || this.extractNumber(row, 'ore (mw)'),
      fsvDRE: this.extractNumber(row, 'dre fsv (mw)') || this.extractNumber(row, 'dre (mw)'),
      
      mcp: this.extractNumber(row, 'mcp (rs/mwh)'),
    };
  }
}
