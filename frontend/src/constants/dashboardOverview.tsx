import React from 'react';
import { 
  BarChart as ChartIcon, 
  ElectricBolt as BoltIcon, 
  Timer as TimerIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
  ReceiptLong as ReceiptIcon,
  AccountBalanceWallet as WalletIcon,
  Hub as HubIcon,
  SettingsInputComponent as SettingsIcon,
  PriceCheck as PriceCheckIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  Cloud as CloudIcon,
  CalendarToday as CalendarIcon,
  ShowChart
} from '@mui/icons-material';

export type OverviewItemType = 'market' | 'resource' | 'database';

export interface OverviewItemConfig {
  key: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  subItems?: { 
    key: string; 
    title: string; 
    path: string; 
    icon?: React.ReactNode;
    subItems?: { key: string; title: string; path: string; icon?: React.ReactNode; }[];
  }[];
}

export const MARKET_ITEMS: OverviewItemConfig[] = [
  { 
    key: 'dam', 
    title: 'Day Ahead Market', 
    description: 'Day Ahead Market analytics and data.',
    path: '/dam', 
    icon: <ChartIcon fontSize="medium" />, 
    color: '#3B8FF3'
  },
  { 
    key: 'gdam', 
    title: 'Green Day Ahead Market', 
    description: 'Green Day Ahead Market analytics and data.',
    path: '/gdam', 
    icon: <BoltIcon fontSize="medium" />, 
    color: '#34B1AA'
  },
  { 
    key: 'rtm', 
    title: 'Real Time Market', 
    description: 'Real Time Market analytics and data.',
    path: '/rtm', 
    icon: <TimerIcon fontSize="medium" />, 
    color: '#E0B50F'
  },
  { 
    key: 'rec', 
    title: 'REC Market', 
    description: 'Renewable Energy Certificates market analytics and data.',
    path: '/rec', 
    icon: <ChartIcon fontSize="medium" />, 
    color: '#8B5CF6'
  },
  { 
    key: 'up-market', 
    title: 'IEX Market UP', 
    description: 'UP specific Day Ahead, Real Time, and Green Day Ahead Market analytics.',
    path: '/up-market/dam', 
    icon: <ShowChart sx={{ fontSize: 24, color: '#0284C7' }} />, 
    color: '#0284C7',
    subItems: [
      { key: 'dam-up', title: 'UP DAM', path: '/up-market/dam', icon: <ChartIcon fontSize="small" /> },
      { key: 'rtm-up', title: 'UP RTM', path: '/up-market/rtm', icon: <TimerIcon fontSize="small" /> },
      { key: 'gdam-up', title: 'UP GDAM', path: '/up-market/gdam', icon: <BoltIcon fontSize="small" /> },
    ]
  },
];

export const MARKET_OPERATIONS_ITEMS: OverviewItemConfig[] = [
  {
    key: 'market-operations',
    title: 'Market Operations',
    description: 'Compare and upload MCP data across DAM, RTM, and GDAM.',
    path: '/market-operations/trend',
    icon: <SettingsIcon fontSize="medium" />,
    color: '#FF7043',
    subItems: [
      { key: 'market-trend', title: 'Market Trend', path: '/market-operations/trend', icon: <SettingsIcon fontSize="small" /> },
      { key: 'mcp-analyst', title: 'MCP Analyst', path: '/market-operations/mcp-analyst', icon: <ChartIcon fontSize="small" /> },
      { key: 'bidding-strategy', title: 'Bidding Strategy', path: '/market-operations/bidding-strategy', icon: <PriceCheckIcon fontSize="small" /> }
    ]
  }
];

export const RESOURCE_CENTER_ITEMS: OverviewItemConfig[] = [
  {
    key: 'grid-utility',
    title: 'Grid & Utility',
    description: 'Grid & Utility master data.',
    path: '/resource-center/region-state',
    icon: <PublicIcon fontSize="medium" />,
    color: '#8E24AA',
    subItems: [
      { key: 'region-state', title: 'Region State', path: '/resource-center/region-state', icon: <PublicIcon fontSize="small" /> },
      { key: 'discom-list', title: 'Discom List', path: '/resource-center/discom-list', icon: <BusinessIcon fontSize="small" /> }
    ]
  },
  {
    key: 'transmission-charges',
    title: 'Transmission Charges',
    description: 'Transmission charges configurations.',
    path: '/resource-center/ists-charges',
    icon: <BoltIcon fontSize="medium" />,
    color: '#E53935',
    subItems: [
      { key: 'ists-charges', title: 'ISTS Losses', path: '/resource-center/ists-charges', icon: <BoltIcon fontSize="small" /> },
      { key: 'ctu-charges', title: 'CTU Charges', path: '/resource-center/ctu-charges', icon: <HubIcon fontSize="small" /> }
    ]
  },
  {
    key: 'utility-charges',
    title: 'Utility Charges',
    description: 'Utility charges and configurations.',
    path: '/resource-center/state-charges',
    icon: <SettingsIcon fontSize="medium" />,
    color: '#546E7A',
    subItems: [
      { key: 'state-charges', title: 'State Charges', path: '/resource-center/state-charges', icon: <SettingsIcon fontSize="small" /> },
      { key: 'state-tariff', title: 'State Tariff', path: '/resource-center/state-tariff', icon: <PriceCheckIcon fontSize="small" /> }
    ]
  },
  {
    key: 'exchange-margins',
    title: 'Exchange & Margins',
    description: 'Exchange fees and margins.',
    path: '/resource-center/iex-fees',
    icon: <ReceiptIcon fontSize="medium" />,
    color: '#FB8C00',
    subItems: [
      { key: 'iex-fees', title: 'IEX Fees', path: '/resource-center/iex-fees', icon: <ReceiptIcon fontSize="small" /> },

      { key: 'fppa-charges', title: 'FPPA Charges', path: '/resource-center/fppa-charges', icon: <ReceiptIcon fontSize="small" /> }
    ]
  }
];

export const DATABASE_ITEMS: OverviewItemConfig[] = [
  {
    key: 'demand-generation',
    title: 'Demand & Generation',
    description: 'National power demand met and generation data across India.',
    path: '/database/all-india-demand', // fallback path
    icon: <TimelineIcon fontSize="medium" />,
    color: '#3B8FF3',
    subItems: [
      { key: 'all-india-demand', title: 'All India Demand', path: '/database/all-india-demand', icon: <TimelineIcon fontSize="small" /> },
      { key: 'generation-data', title: 'Generation Data', path: '/database/generation-data', icon: <BoltIcon fontSize="small" /> },
      { key: 'state-wise-demand', title: 'State Wise Demand', path: '/database/state-wise-demand', icon: <MapIcon fontSize="small" /> }
    ]
  },
  {
    key: 'city-state-data',
    title: 'State & City Data',
    description: 'Geographical coordinates and population database.',
    path: '/database/city-state-data',
    icon: <PublicIcon fontSize="medium" />,
    color: '#9C27B0'
  },
  {
    key: 'weather',
    title: 'Weather Data',
    description: 'Historical weather data from Open-Meteo.',
    path: '/database/weather/forecast',
    icon: <CloudIcon fontSize="medium" />,
    color: '#E0B50F',
    subItems: [
      { key: 'weather-forecast', title: 'Forecasted Data', path: '/database/weather/forecast', icon: <CloudIcon fontSize="small" /> },
      { key: 'weather-historical', title: 'Historical Data', path: '/database/weather/historical', icon: <CloudIcon fontSize="small" /> }
    ]
  },
  {
    key: 'holiday-calendar',
    title: 'Holiday Calendar',
    description: 'Trading and settlement holidays for power exchanges.',
    path: '/database/holiday-calendar',
    icon: <CalendarIcon fontSize="medium" />,
    color: '#E91E63'
  }
];

export const FORECAST_ITEMS: OverviewItemConfig[] = [
  {
    key: 'price-forecast',
    title: 'Price Forecast',
    description: 'Forecasted clearing prices for DAM, RTM, and GDAM markets.',
    path: '/forecast/price/dam',
    icon: <TimelineIcon fontSize="medium" />,
    color: '#8B5CF6',
    subItems: [
      { key: 'price-dam', title: 'DAM', path: '/forecast/price/dam', icon: <ChartIcon fontSize="small" /> },
      { 
        key: 'price-rtm', 
        title: 'RTM', 
        path: '/forecast/price/rtm/dayahead', 
        icon: <TimerIcon fontSize="small" />,
        subItems: [
          { key: 'price-rtm-dayahead', title: 'Day Ahead', path: '/forecast/price/rtm/dayahead' },
          { key: 'price-rtm-nowcast', title: 'Nowcast', path: '/forecast/price/rtm/nowcast' },
        ]
      },
      { key: 'price-gdam', title: 'GDAM', path: '/forecast/price/gdam', icon: <BoltIcon fontSize="small" /> },
    ]
  },
  {
    key: 'demand-forecast',
    title: 'Demand Forecast',
    description: 'Forecasted load curves for consumers and national grids.',
    path: '/forecast/demand/consumer',
    icon: <TimelineIcon fontSize="medium" />,
    color: '#00BFA5',
    subItems: [
      { key: 'demand-consumer', title: 'Consumer', path: '/forecast/demand/consumer', icon: <BusinessIcon fontSize="small" /> },
      { key: 'demand-all-india', title: 'All India', path: '/forecast/demand/all-india', icon: <TimelineIcon fontSize="small" /> },
    ]
  },
  {
    key: 'generation-forecast',
    title: 'Generation Forecast',
    description: 'Forecasted solar, wind, and NPP generation data.',
    path: '/forecast/generation/npp',
    icon: <BoltIcon fontSize="medium" />,
    color: '#FF7043',
    subItems: [
      { key: 'gen-npp', title: 'NPP Generation', path: '/forecast/generation/npp', icon: <BoltIcon fontSize="small" /> },
    ]
  }
];

export const MARKET_RECOMMENDATION_ITEMS: OverviewItemConfig[] = [
  {
    key: 'market-recommendation',
    title: 'Market Recommendation',
    description: 'Best market recommendations across DAM, RTM, and GDAM to maximize savings.',
    path: '/forecast/market-recommendation',
    icon: <PriceCheckIcon fontSize="medium" />,
    color: '#10B981',
  }
];

export const UP_MARKET_ITEMS: OverviewItemConfig[] = [
  { 
    key: 'dam-up', 
    title: 'Day Ahead Market', 
    description: 'UP specific DAM data from API.',
    path: '/up-market/dam', 
    icon: <ShowChart sx={{ fontSize: 24, color: '#3B8FF3' }} />,
    color: '#3B8FF3'
  },
  { 
    key: 'rtm-up', 
    title: 'Real Time Market', 
    description: 'UP specific RTM data from API.',
    path: '/up-market/rtm', 
    icon: <TimerIcon sx={{ fontSize: 24, color: '#E0B50F' }} />,
    color: '#E0B50F'
  },
  { 
    key: 'gdam-up', 
    title: 'Green Day Ahead Market', 
    description: 'UP specific GDAM data from API.',
    path: '/up-market/gdam', 
    icon: <PublicIcon sx={{ fontSize: 24, color: '#10B981' }} />,
    color: '#10B981'
  }
];
