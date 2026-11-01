export interface MarketOverviewSummary {
  coverageStart: string | null;
  coverageEnd: string | null;
  activeDatasetCount: number;
}

export interface DashboardOverviewResponse {
  success: boolean;
  data: {
    dam: MarketOverviewSummary;
    gdam: MarketOverviewSummary;
    rtm: MarketOverviewSummary;
  };
}
