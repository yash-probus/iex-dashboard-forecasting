import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMwImpactBlocks,
  summarizeMwImpact,
  UNITS_PER_MW_PER_BLOCK,
  UNITS_PER_MW_PER_DAY,
  parseTimeBlockMinutes,
  isBlockInTimeWindow,
  filterRowsByTimeWindow,
} from './mwImpactCalculations.js';
import type { ForecastRow } from '../mockData.js';

test('1 MW energy conversion constants', () => {
  assert.equal(UNITS_PER_MW_PER_BLOCK, 250);
  assert.equal(UNITS_PER_MW_PER_DAY, 24000);
});

test('calculateMwImpactBlocks calculates correct units and cost impact for 1 MW', () => {
  const rows: ForecastRow[] = [
    {
      date: '2026-10-15',
      hour: '12',
      timeBlock: '12:00 - 12:15',
      forecastedMcp: 2.00,
      actualMcp: 2.50, // +₹0.50 delta (20% error, exactly 50 paise delta)
      priceMin: 1.80,
      priceMax: 2.20,
      confidence: 85,
    },
    {
      date: '2026-10-15',
      hour: '12',
      timeBlock: '12:15 - 12:30',
      forecastedMcp: 2.00,
      actualMcp: 2.05, // +₹0.05 delta (5 paise delta, 2.44% error < 5%)
      priceMin: 1.90,
      priceMax: 2.10,
      confidence: 90,
    },
    {
      date: '2026-10-15',
      hour: '12',
      timeBlock: '12:30 - 12:45',
      forecastedMcp: 3.00,
      actualMcp: null, // pending actual
      priceMin: 2.80,
      priceMax: 3.20,
      confidence: 80,
    },
  ];

  const blocks = calculateMwImpactBlocks(rows, 1.0, 0.50, 'price_delta');
  assert.equal(blocks.length, 3);

  // Block 1: 12:00 - 12:15 (Delta = 0.50 <= 0.50 -> compliant)
  assert.equal(blocks[0].blockKwh, 250);
  assert.equal(blocks[0].priceDelta, 0.50);
  assert.equal(blocks[0].absPriceDelta, 0.50);
  assert.equal(blocks[0].isCompliant, true); // <= 50 paise
  assert.equal(blocks[0].costImpactRs, 125.0); // 0.50 * 250 = ₹125
  assert.equal(blocks[0].absCostDeviationRs, 125.0);

  // Block 2: 12:15 - 12:30 (Delta = 0.05 <= 0.50 -> compliant)
  assert.equal(blocks[1].blockKwh, 250);
  assert.equal(blocks[1].priceDelta, 0.05);
  assert.equal(blocks[1].absPriceDelta, 0.05);
  assert.equal(blocks[1].isCompliant, true); // <= 50 paise
  assert.equal(blocks[1].isLowError, true);
  assert.equal(blocks[1].costImpactRs, 12.50); // 0.05 * 250 = ₹12.50
  assert.equal(blocks[1].absCostDeviationRs, 12.50);

  // Block 3: pending actual
  assert.equal(blocks[2].actualMcp, null);
  assert.equal(blocks[2].costImpactRs, null);
  assert.equal(blocks[2].isCompliant, null);

  // Test with tighter threshold: 25 paise (₹0.25)
  const blocks25p = calculateMwImpactBlocks(rows, 1.0, 0.25, 'price_delta');
  assert.equal(blocks25p[0].isCompliant, false); // 0.50 > 0.25
  assert.equal(blocks25p[1].isCompliant, true);  // 0.05 <= 0.25
});

test('summarizeMwImpact supports price delta thresholds and day summaries', () => {
  const rows: ForecastRow[] = [
    {
      date: '2026-10-14',
      hour: '12',
      timeBlock: '12:00 - 12:15',
      forecastedMcp: 2.00,
      actualMcp: 2.70, // 70 paise delta (> 50 paise)
      priceMin: 1.80,
      priceMax: 2.20,
      confidence: 85,
    },
    {
      date: '2026-10-15',
      hour: '12',
      timeBlock: '12:15 - 12:30',
      forecastedMcp: 2.00,
      actualMcp: 2.10, // 10 paise delta (<= 50 paise)
      priceMin: 1.90,
      priceMax: 2.10,
      confidence: 90,
    },
  ];

  // At 50 paise threshold (0.50)
  const blocks = calculateMwImpactBlocks(rows, 1.0, 0.50, 'price_delta');
  const summary = summarizeMwImpact(blocks, 1.0, 0.50, 'price_delta');

  assert.equal(summary.totalBlocks, 2);
  assert.equal(summary.blocksWithActual, 2);

  // Compliant slots (<= 50 paise)
  assert.equal(summary.compliantSlots.count, 1);
  assert.equal(summary.compliantSlots.avgPriceDeltaRs, 0.10);
  assert.equal(summary.compliantSlots.netCostImpactRs, 25.0); // 0.10 * 250 = ₹25

  // Exceeding slots (> 50 paise)
  assert.equal(summary.exceedingSlots.count, 1);
  assert.equal(summary.exceedingSlots.avgPriceDeltaRs, 0.70);
  assert.equal(summary.exceedingSlots.netCostImpactRs, 175.0); // 0.70 * 250 = ₹175

  // Multi-day daySummaries
  assert.equal(summary.daySummaries.length, 2);
  assert.equal(summary.daySummaries[0].date, '2026-10-14');
  assert.equal(summary.daySummaries[0].compliantCount, 0); // 70p > 50p
  assert.equal(summary.daySummaries[1].date, '2026-10-15');
  assert.equal(summary.daySummaries[1].compliantCount, 1); // 10p <= 50p
});

test('parseTimeBlockMinutes and isBlockInTimeWindow for solar hours (07:00 - 19:00)', () => {
  // Check parsing
  assert.deepEqual(parseTimeBlockMinutes('07:00 - 07:15'), { startMinutes: 420, endMinutes: 435 });
  assert.deepEqual(parseTimeBlockMinutes('18:45 - 19:00'), { startMinutes: 1125, endMinutes: 1140 });
  assert.deepEqual(parseTimeBlockMinutes('23:45 - 24:00'), { startMinutes: 1425, endMinutes: 1440 });

  // Solar hours (07:00 - 19:00)
  assert.equal(isBlockInTimeWindow('06:45 - 07:00', '07:00', '19:00'), false); // Night / early morning
  assert.equal(isBlockInTimeWindow('07:00 - 07:15', '07:00', '19:00'), true); // First solar block
  assert.equal(isBlockInTimeWindow('12:00 - 12:15', '07:00', '19:00'), true); // Midday solar
  assert.equal(isBlockInTimeWindow('18:45 - 19:00', '07:00', '19:00'), true); // Last solar block
  assert.equal(isBlockInTimeWindow('19:00 - 19:15', '07:00', '19:00'), false); // Evening outside window
  assert.equal(isBlockInTimeWindow('01:00 - 01:15', '07:00', '19:00'), false); // Night 1 AM outside window
});

test('filterRowsByTimeWindow filters full 96-slot day to exactly 48 solar slots', () => {
  const fullDayRows: ForecastRow[] = Array.from({ length: 96 }, (_, idx) => {
    const sH = String(Math.floor((idx * 15) / 60)).padStart(2, '0');
    const sM = String((idx * 15) % 60).padStart(2, '0');
    const eH = String(Math.floor(((idx + 1) * 15) / 60)).padStart(2, '0');
    const eM = String(((idx + 1) * 15) % 60).padStart(2, '0');
    return {
      date: '2026-10-19',
      hour: String(Math.floor(idx / 4) + 1).padStart(2, '0'),
      timeBlock: `${sH}:${sM} - ${eH}:${eM}`,
      forecastedMcp: 3.50,
      actualMcp: 3.60,
      priceMin: 3.0,
      priceMax: 4.0,
      confidence: 85,
    };
  });

  assert.equal(fullDayRows.length, 96);

  // Filter 07:00 - 19:00 (Solar hours requested by user)
  const solarRows = filterRowsByTimeWindow(fullDayRows, '07:00', '19:00');
  assert.equal(solarRows.length, 48); // Exactly 48 blocks = 12 hours * 4 blocks/hr
  assert.equal(solarRows[0].timeBlock, '07:00 - 07:15');
  assert.equal(solarRows[solarRows.length - 1].timeBlock, '18:45 - 19:00');

  // Filter 09:00 - 17:00 (Solar Core)
  const coreRows = filterRowsByTimeWindow(fullDayRows, '09:00', '17:00');
  assert.equal(coreRows.length, 32); // 8 hours * 4 = 32 blocks
  assert.equal(coreRows[0].timeBlock, '09:00 - 09:15');
  assert.equal(coreRows[coreRows.length - 1].timeBlock, '16:45 - 17:00');
});

