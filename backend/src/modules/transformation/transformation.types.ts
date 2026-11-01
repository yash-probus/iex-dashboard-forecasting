import { MarketType } from '../upload/upload.types';

export interface DamIntervalRecord {
  date?: string;
  intervalNumber: number;
  intervalTime: string;
  purchaseBid: number;
  sellBid: number;
  mcv: number;
  fsv: number;
  mcp: number;
}

export interface GdamIntervalRecord {
  intervalNumber: number;
  intervalTime: string;
  purchaseBid: number;
  sellBidTotal: number;
  sellBidSolar?: number;
  sellBidNonSolar?: number;
  sellBidHydro: number;
  sellBidWind: number;
  sellBidOtherRE: number;
  sellBidORE: number;
  mcvTotal: number;
  mcvSolar?: number;
  mcvNonSolar?: number;
  mcvHydro: number;
  mcvWind: number;
  mcvOtherRE: number;
  mcvORE: number;
  fsvTotal: number;
  fsvSolar?: number;
  fsvNonSolar?: number;
  fsvHydro: number;
  fsvWind: number;
  fsvOtherRE: number;
  fsvORE: number;
  mcp: number;
}

export interface GdamNewIntervalRecord {
  date?: string;
  intervalNumber: number;
  intervalTime: string;
  purchaseBid: number;
  sellBidTotal: number;
  sellBidHydro: number;
  sellBidWind: number;
  sellBidOtherRE: number;
  sellBidDRE: number;
  mcvTotal: number;
  mcvHydro: number;
  mcvWind: number;
  mcvOtherRE: number;
  mcvDRE: number;
  fsvTotal: number;
  fsvHydro: number;
  fsvWind: number;
  fsvOtherRE: number;
  fsvDRE: number;
  mcp: number;
}

export interface RtmIntervalRecord {
  date?: string;
  intervalNumber: number;
  intervalTime: string;
  sessionId: string;
  purchaseBid: number;
  sellBid: number;
  mcv: number;
  fsv: number;
  mcp: number;
}

export interface RecMonthlyRecord {
  year: number;
  month: string;
  type: string;
  buyBids: number;
  sellBids: number;
  clearedVolume: number;
  clearedPrice: number;
  noOfParticipants: number;
}

export interface TransformationResult {
  market: MarketType;
  intervalCount: number;
  records: unknown[]; // Contains DamIntervalRecord[] | GdamIntervalRecord[] | RtmIntervalRecord[]
  warnings: string[];
  isValid: boolean;
}

export interface ITransformer {
  transform(rows: Record<string, string>[]): TransformationResult;
}
