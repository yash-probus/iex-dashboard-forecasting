export interface BaseRecord {
  date: string;       // YYYY-MM-DD
  hour: number;       // 1-24
  timeBlock: number;  // 1-96
  purchaseBid: number; // MW
  mcp: number;        // Rs/kWh
}

export interface DAMRecord extends BaseRecord {
  sellBid: number;
  mcv: number;
  fsv: number; // Final Scheduled Volume
}

export interface GDAMRecord extends BaseRecord {
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
}

export interface RECRecord extends BaseRecord {
  // Uses the same base fields as DAM
}

export interface RTMRecord extends DAMRecord {
  sessionId: string; // e.g., "S-01"
}

export type MarketType = 'DAM' | 'GDAM' | 'RTM' | 'REC';
export type AnyMarketRecord = DAMRecord | GDAMRecord | RTMRecord | RECRecord;

export interface MarketSummary {
  averageMcp: number;
  totalVolume: number; // Sum of FSV or MCV
  averageMcv: number;
  totalPurchaseBid: number;
  maxMcp: number;
  minMcp: number;
}
