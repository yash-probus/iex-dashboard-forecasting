import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMarketPaisaStats,
  generateFourMarketSummaryLines,
  calculateSevenDayRollingTrend,
  MARKETS_CONFIG,
  MARKET_KEYS,
  type MarketKey,
} from './multiMarketPaisaCalculations.js';
import type { ForecastRow } from '../mockData.js';

test('MARKETS_CONFIG contains all 4 markets', () => {
  assert.equal(MARKET_KEYS.length, 4);
  assert.deepEqual(MARKET_KEYS, ['DAM', 'RTM_DAYAHEAD', 'RTM_NOWCAST', 'GDAM']);
  assert.equal(MARKETS_CONFIG.DAM.marketParam, 'dam');
  assert.equal(MARKETS_CONFIG.GDAM.marketParam, 'gdam');
  assert.equal(MARKETS_CONFIG.RTM_DAYAHEAD.rtmType, 'dayahead');
  assert.equal(MARKETS_CONFIG.RTM_NOWCAST.rtmType, 'nowcast');
});

test('calculateMarketPaisaStats calculates exact counts for custom 20p threshold and dual kWh/MWh', () => {
  const rows: ForecastRow[] = [
    // Slot 1: Delta = 0.10 (10 paise) -> <= 20p
    {
      date: '2026-10-19',
      hour: '01',
      timeBlock: '00:00 - 00:15',
      forecastedMcp: 3.00,
      actualMcp: 3.10,
      priceMin: 2.8,
      priceMax: 3.2,
      confidence: 85,
    },
    // Slot 2: Delta = 0.22 (22 paise) -> > 20p
    {
      date: '2026-10-19',
      hour: '01',
      timeBlock: '00:15 - 00:30',
      forecastedMcp: 3.00,
      actualMcp: 3.22,
      priceMin: 2.8,
      priceMax: 3.2,
      confidence: 85,
    },
    // Slot 3: Delta = 0.18 (18 paise) -> <= 20p
    {
      date: '2026-10-19',
      hour: '01',
      timeBlock: '00:30 - 00:45',
      forecastedMcp: 3.00,
      actualMcp: 3.18,
      priceMin: 2.8,
      priceMax: 3.2,
      confidence: 85,
    },
    // Slot 4: Delta = 0.50 (50 paise) -> > 20p
    {
      date: '2026-10-19',
      hour: '01',
      timeBlock: '00:45 - 01:00',
      forecastedMcp: 3.00,
      actualMcp: 3.50,
      priceMin: 2.8,
      priceMax: 3.2,
      confidence: 85,
    },
    // Slot 5: Pending slot (actual is null)
    {
      date: '2026-10-19',
      hour: '02',
      timeBlock: '01:00 - 01:15',
      forecastedMcp: 3.00,
      actualMcp: null,
      priceMin: 2.8,
      priceMax: 3.2,
      confidence: 85,
    },
  ];

  const stats = calculateMarketPaisaStats(rows, 'DAM', '2026-10-19', 1.0, 20);

  assert.equal(stats.totalSlots, 5);
  assert.equal(stats.slotsWithActual, 4);
  assert.equal(stats.slotsPending, 1);
  assert.equal(stats.thresholdPaisa, 20);
  assert.equal(stats.thresholdRs, 0.20);
  assert.equal(stats.thresholdMwhRs, 200);

  // <= 20p: slots 1 and 3 = 2
  assert.equal(stats.withinCustomCount, 2);
  assert.equal(stats.withinCustomPct, 50.0);
  // > 20p: slots 2 and 4 = 2
  assert.equal(stats.exceedingCustomCount, 2);
  assert.equal(stats.exceedingCustomPct, 50.0);

  // kWh and MWh: 1 MW = 250 kWh per block
  // 4 blocks = 1000 kWh = 1.0 MWh
  assert.equal(stats.totalEnergyKwh, 1000);
  assert.equal(stats.totalEnergyMwh, 1.0);
  assert.equal(stats.withinEnergyKwh, 500);
  assert.equal(stats.withinEnergyMwh, 0.5);

  // MAE = (|0.10| + |0.22| + |0.18| + |0.50|) / 4 = 1.00 / 4 = 0.25 Rs = 25.0 paise = 250 Rs/MWh
  assert.equal(stats.avgAbsDeltaRs, 0.25);
  assert.equal(stats.avgAbsDeltaPaisa, 25.0);
  assert.equal(stats.maeMwhRs, 250.0);
});

test('generateFourMarketSummaryLines generates readable lines and full text', () => {
  const dummyStats = (key: MarketKey) =>
    calculateMarketPaisaStats([], key, '2026-10-19', 1.0, 20);

  const analyses: Record<MarketKey, any> = {
    DAM: dummyStats('DAM'),
    RTM_DAYAHEAD: dummyStats('RTM_DAYAHEAD'),
    RTM_NOWCAST: dummyStats('RTM_NOWCAST'),
    GDAM: dummyStats('GDAM'),
  };

  const res = generateFourMarketSummaryLines(analyses);
  assert.equal(res.lines.length, 4);
  assert.ok(res.fullSummaryText.includes('4-Market Price & Error Impact Summary'));
  assert.ok(res.fullSummaryText.includes('Prolt Operations'));
});

test('calculateSevenDayRollingTrend generates 7 consecutive rolling days with stacked green/red counts', () => {
  const trend = calculateSevenDayRollingTrend([], '2026-10-19', 'DAM', 1.0, 20);

  assert.equal(trend.days.length, 7);
  assert.equal(trend.days[6].date, '2026-10-19');
  assert.equal(trend.days[6].isTargetDay, true);
  assert.equal(trend.days[0].date, '2026-10-13');
  assert.equal(trend.days[0].isTargetDay, false);

  trend.days.forEach((day) => {
    assert.equal(day.totalSlots, 96);
    // Green (within) + Red (exceeding) = clearedSlots
    assert.equal(day.withinCount + day.exceedingCount, day.clearedSlots);
  });
});
