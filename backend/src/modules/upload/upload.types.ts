export type MarketType = 'DAM' | 'GDAM' | 'RTM' | 'REC';

export interface UploadRequest {
  market: MarketType;
  date: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    fileName: string;
    market: MarketType;
    size: number;
  };
}
