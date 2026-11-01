import prisma from '../../config/prisma';
import { StarrocksService } from '../../services/starrocks.service';
import fs from 'fs';
import path from 'path';

export interface TodSlotConfig {
  id: string;
  name: string;
  startTime: string; // "05:00"
  endTime: string;   // "08:00"
  effectivePrice?: number;
}

export interface DailyConsumerConfig {
  id: string;
  name: string;
  discom: string;
  stateCode: string;
  consumerCategory: string;
  voltageLevel: string;
  meterNo?: string;
  sanctionedLoadKw: number;
  powerFactor: number;
  proltMargin: number;
  traderMargin: number;
  applyElectricityDuty: boolean;
  electricityDutyPercent: number;
  fppaPercent?: number;
  discomBaseTariff?: number;
  customTodSlots?: TodSlotConfig[];
  tradeReports?: any; // Stored parsed PDF trade data
}

// Default initial consumer for Poorvanchal (PUVVNL, Uttar Pradesh)
const DEFAULT_POORVANCHAL_CONSUMER: DailyConsumerConfig = {
  id: 'poorvanchal-default',
  name: 'Poorvanchal Vidyut Vitran (PUVVNL)',
  discom: 'PUVVNL',
  stateCode: 'UP',
  consumerCategory: 'HV-2 | Urban Schedule (Large & Heavy Power)',
  voltageLevel: '11 kV',
  meterNo: 'X2521837', // Default default meter
  sanctionedLoadKw: 1000,
  powerFactor: 0.99,
  proltMargin: 15,
  traderMargin: 0.02,
  applyElectricityDuty: true,
  electricityDutyPercent: 5.0,
  customTodSlots: [
    { id: 'tod-1', name: 'Off-Peak Night', startTime: '22:00', endTime: '06:00' },
    { id: 'tod-2', name: 'Normal Hours', startTime: '06:00', endTime: '17:00' },
    { id: 'tod-3', name: 'Peak Evening', startTime: '17:00', endTime: '22:00' }
  ],
  tradeReports: { data: {} }
};

const STORE_DIR = path.join(__dirname, '../../../uploads/trader-performance-daily');
const STORE_FILE = path.join(STORE_DIR, 'consumers_store.json');

// File-backed persistence for onboarded consumers and their extracted trade report data
function loadConsumersFromDisk(): Map<string, DailyConsumerConfig> {
  const store = new Map<string, DailyConsumerConfig>();
  store.set(DEFAULT_POORVANCHAL_CONSUMER.id, { ...DEFAULT_POORVANCHAL_CONSUMER });

  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        data.forEach((c: DailyConsumerConfig) => {
          if (c && c.id) store.set(c.id, c);
        });
      }
    }
  } catch (err) {
    console.warn('Could not read consumers_store.json, using default:', err);
  }

  return store;
}

function saveConsumersToDisk(store: Map<string, DailyConsumerConfig>) {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    const arr = Array.from(store.values());
    fs.writeFileSync(STORE_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist consumers_store.json:', err);
  }
}

const consumerStore = loadConsumersFromDisk();

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function normalizeDeliveryDate(rawDate: string): string | null {
  if (!rawDate) return null;
  const str = rawDate.trim();

  // Pattern: DD-MMM-YY or DD-MMM-YYYY (e.g. 01-Apr-26 or 01-Apr-2026)
  const mmmMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const mon = MONTH_MAP[mmmMatch[2].toLowerCase()] || '01';
    let yr = mmmMatch[3];
    if (yr.length === 2) yr = `20${yr}`;
    return `${yr}-${mon}-${day}`;
  }

  // Pattern: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Pattern: DD-MM-YYYY or DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}

  return str;
}

function parseHourLocal(val: string | null | undefined): number {
  if (!val) return 0;
  let [time, modifier] = val.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (modifier && modifier.toUpperCase().startsWith('P') && h < 12) h += 12;
  if (modifier && modifier.toUpperCase().startsWith('A') && h === 12) h = 0;
  return (h || 0) + ((m || 0) / 60);
}

export class TraderPerformanceDailyService {
  static async getAvailableMeters(): Promise<string[]> {
    return await StarrocksService.getAvailableMeters();
  }

  static async getConsumers(): Promise<DailyConsumerConfig[]> {
    return Array.from(consumerStore.values());
  }

  static async getConsumerById(id: string): Promise<DailyConsumerConfig> {
    return consumerStore.get(id) || { ...DEFAULT_POORVANCHAL_CONSUMER };
  }

  static async saveConsumer(consumer: Partial<DailyConsumerConfig>): Promise<DailyConsumerConfig> {
    if (consumer.meterNo) {
      // One meter, one client validation
      for (const existing of consumerStore.values()) {
        if (existing.id !== consumer.id && existing.meterNo === consumer.meterNo) {
          throw new Error(`Meter number ${consumer.meterNo} is already connected to another client (${existing.name}). One meter cannot be connected to multiple clients.`);
        }
      }
    }

    const id = consumer.id || `consumer-${Date.now()}`;
    const existing = consumerStore.get(id) || { ...DEFAULT_POORVANCHAL_CONSUMER, id };
    const updated: DailyConsumerConfig = {
      ...existing,
      ...consumer,
      id
    };
    consumerStore.set(id, updated);
    saveConsumersToDisk(consumerStore);
    return updated;
  }

  /**
   * Helper to format timeblock strings (e.g. 1 -> "00:00 - 00:15")
   */
  private static getTimeBlock(slotNum: number): string {
    const startMins = (slotNum - 1) * 15;
    const endMins = slotNum * 15;
    const pad = (n: number) => String(n).padStart(2, '0');
    const startH = pad(Math.floor(startMins / 60) % 24);
    const startM = pad(startMins % 60);
    const endH = pad(Math.floor(endMins / 60) % 24);
    const endM = pad(endMins % 60);
    return `${startH}:${startM} - ${endH}:${endM}`;
  }

  /**
   * Fetch actual 15-minute consumption from StarRocks / forecasting table, or fall back to consumer profile
   */
  private static async getActualConsumptionMap(dates: string[], sanctionedLoadKw: number, powerFactor: number, meterNo?: string): Promise<Map<string, number>> {
    const consumptionMap = new Map<string, number>();
    const pf = powerFactor || 0.99;
    const maxSlotCapacityKwh = (sanctionedLoadKw / pf) * 0.25; // 15-min energy in kWh

    try {
      // 1. Try StarRocks actual consumer load data
      const starrocksMap = await StarrocksService.getConsumerActualDemandMap(dates, meterNo);
      if (starrocksMap && starrocksMap.size > 0) {
        starrocksMap.forEach((val, key) => {
          if (val > 0) consumptionMap.set(key, val);
        });
      }

      // 2. Query forecast / actuals from database if StarRocks didn't cover all dates
      if (dates.some(d => !consumptionMap.has(`${d}_1`))) {
        const queryParams: any[] = [dates];
        let meterCondition = '';
        if (meterNo) {
          meterCondition = 'AND meter_id = $2';
          queryParams.push(meterNo);
        }
        
        const records: any[] = await prisma.$queryRawUnsafe(
          `SELECT (timestamp::date)::text as date_str, slot_number, actual_energy
           FROM "forecasting"."consumer_demand_forecasting"
           WHERE (timestamp::date)::text = ANY($1::text[])
             ${meterCondition}
             AND actual_energy IS NOT NULL
           ORDER BY timestamp ASC`,
          ...queryParams
        );

        if (Array.isArray(records)) {
          records.forEach(r => {
            const key = `${r.date_str}_${r.slot_number}`;
            if (!consumptionMap.has(key) && Number(r.actual_energy) > 0) {
              consumptionMap.set(key, Number(r.actual_energy));
            }
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch external consumer demand, generating profile:', err);
    }

    // Default realistic diurnal load profile fallback for any unrecorded slot
    dates.forEach(d => {
      for (let slot = 1; slot <= 96; slot++) {
        const slotKey = `${d}_${slot}`;
        const startMins = (slot - 1) * 15;
        const timeKey = `${d}_${String(Math.floor(startMins / 60) % 24).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`;

        const existingVal = consumptionMap.get(slotKey) ?? consumptionMap.get(timeKey);
        if (existingVal !== undefined && existingVal > 0) {
          consumptionMap.set(slotKey, existingVal);
        } else {
          const hour = Math.floor((slot - 1) / 4);
          let factor = 0.70;
          if (hour >= 9 && hour <= 12) factor = 0.92;
          else if (hour >= 18 && hour <= 22) factor = 0.95;
          else if (hour >= 13 && hour <= 17) factor = 0.85;
          else if (hour >= 0 && hour <= 5) factor = 0.55;

          const estimatedKwh = Math.round(maxSlotCapacityKwh * factor * 10) / 10;
          consumptionMap.set(slotKey, estimatedKwh);
        }
      }
    });

    return consumptionMap;
  }

  /**
   * Main calculation engine for Daily Trader Performance with Full TOD Breakdown
   */
  static async calculateDailyAnalysis(params: {
    consumerId: string;
    monthStr?: string; // YYYY-MM
    targetDate?: string; // YYYY-MM-DD
    uploadedReports?: any;
  }) {
    const consumer = await this.getConsumerById(params.consumerId);

    // Merge uploaded reports into consumer store and persist to disk
    if (params.uploadedReports && params.uploadedReports.data) {
      consumer.tradeReports = {
        data: {
          ...(consumer.tradeReports?.data || {}),
          ...params.uploadedReports.data
        }
      };
      consumerStore.set(consumer.id, consumer);
      saveConsumersToDisk(consumerStore);
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const targetMonthStr = params.monthStr || `${currentYear}-${currentMonth}`;

    const [yearNumStr, monthNumStr] = targetMonthStr.split('-');
    const yearNum = parseInt(yearNumStr, 10) || currentYear;
    const monthNum = parseInt(monthNumStr, 10) || (today.getMonth() + 1);

    // Determine days in month up to today (Month-till-date)
    const isCurrentMonth = yearNum === currentYear && monthNum === (today.getMonth() + 1);
    const maxDay = isCurrentMonth ? today.getDate() : new Date(yearNum, monthNum, 0).getDate();

    const datesInMonth: string[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const dayStr = String(d).padStart(2, '0');
      datesInMonth.push(`${targetMonthStr}-${dayStr}`);
    }

    const selectedTargetDate = params.targetDate && datesInMonth.includes(params.targetDate)
      ? params.targetDate
      : datesInMonth[datesInMonth.length - 1];

    // 1. Fetch consumption map for all dates
    const consumptionMap = await this.getActualConsumptionMap(
      datesInMonth,
      consumer.sanctionedLoadKw,
      consumer.powerFactor,
      consumer.meterNo
    );

    // 2. Load TOD Tariffs, State Charges, FPPA, CTU, ISTS from DB (matching Trader Performance logic)
    const stateCode = consumer.stateCode || 'UP';
    let parsedCategory = consumer.consumerCategory || 'HV-2';
    let parsedSubCategory = '';
    if (parsedCategory.includes(' | ')) {
      const parts = parsedCategory.split(' | ');
      parsedCategory = parts[0];
      parsedSubCategory = parts[1];
    }

    let parsedSupplyVoltageCategory = '11 kV';
    if (consumer.voltageLevel?.includes('33')) parsedSupplyVoltageCategory = '33 kV';
    else if (consumer.voltageLevel?.includes('66')) parsedSupplyVoltageCategory = '66 kV';
    else if (consumer.voltageLevel?.includes('132')) parsedSupplyVoltageCategory = '132 kV';

    const stateFormats = [stateCode, 'Uttar Pradesh', 'UTTAR PRADESH', 'UP'];

    const yyyymmMonth = yearNum * 100 + monthNum;

    const [tariffsFromDb, stateCharges, ctuCharges, istsCharges, fppaDataList, iexFees] = await Promise.all([
      prisma.stateTariff.findMany({
        where: {
          state: { in: stateFormats },
          consumerCategory: { contains: parsedCategory },
          supplyVoltageCategory: { contains: parsedSupplyVoltageCategory }
        },
        orderBy: { month: 'desc' }
      }),
      prisma.stateCharges.findFirst({
        where: {
          state: { in: stateFormats },
          category: { contains: parsedCategory }
        },
        orderBy: { fromDate: 'desc' }
      }),
      prisma.ctuCharges.findFirst({
        where: { state: { in: stateFormats } },
        orderBy: { month: 'desc' }
      }),
      prisma.istsCharges.findMany({
        orderBy: { startDate: 'desc' },
        take: 10
      }),
      prisma.fppaCharges.findMany({
        where: { state: { in: stateFormats }, month: yyyymmMonth }
      }),
      prisma.iexFees.findFirst({ orderBy: { id: 'desc' } })
    ]);

    // Calculate FPPA & Electricity Duty
    let fppaPercent = consumer.fppaPercent ?? 10.0;
    if (fppaDataList && fppaDataList.length > 0) {
      const match = fppaDataList.find(f => f.discom === consumer.discom) || fppaDataList[0];
      if (match && match.fppaChargePercent) {
        fppaPercent = Number(match.fppaChargePercent);
      }
    }

    const electricityDutyPercent = consumer.applyElectricityDuty ? (consumer.electricityDutyPercent ?? 5.0) : 0;

    // Open Access Charges & Loss Coefficients (from Master Data / Trader Performance)
    const ctuCharge = Number(ctuCharges?.ctu_charges_rs_per_kwh || 0.45);
    const stuCharge = Number(stateCharges?.stuCharges || 0.35);
    const wheelingCharge = Number(stateCharges?.distributionWheelingCharges || 0.50);
    const crossSubsidy = Number(stateCharges?.crossSubsidy || 1.20);
    const additionalSurcharge = Number(stateCharges?.additionalCharge || 0.0);
    const stuLoss = Number(stateCharges?.stuLossPercent || 3.5);
    const wheelingLoss = Number(stateCharges?.wheelingLossPercent || 3.5);

    const EXCHANGE_FEES = 0.02;
    const GST_RATE = 0.18;
    const GST_EXCHANGE = EXCHANGE_FEES * GST_RATE;
    const OTHER_CHARGES = 0.10;
    const TRADER_MARGIN = consumer.traderMargin || 0.02;
    const GST_TRADER_MARGIN = TRADER_MARGIN * GST_RATE;

    // 3. Fetch DAM / GDAM / RTM Market MCPs for dates
    const [damRecords, rtmRecords, gdamRecords] = await Promise.all([
      prisma.damRecord.findMany({ where: { date: { in: datesInMonth } } }),
      prisma.rtmRecord.findMany({ where: { date: { in: datesInMonth } } }),
      prisma.gdamRecord.findMany({ where: { date: { in: datesInMonth } } })
    ]);

    const damMap = new Map<string, number>();
    damRecords.forEach(r => {
      if (r.date) damMap.set(`${r.date}_${r.intervalNumber}`, Number(r.mcp));
    });

    const rtmMap = new Map<string, number>();
    rtmRecords.forEach(r => {
      if (r.date) rtmMap.set(`${r.date}_${r.intervalNumber}`, Number(r.mcp));
    });

    const gdamMap = new Map<string, number>();
    gdamRecords.forEach(r => {
      if (r.date) gdamMap.set(`${r.date}_${r.intervalNumber}`, Number(r.mcp));
    });

    // 4. Process Trade Reports (Actual Trader trades)
    // Structure: traderTradesLookup[YYYY-MM-DD][slotNumber] = { qtyMw, rateMwh, amount, market }
    const traderTradesLookup: Record<string, Record<number, any>> = {};
    const tradeReportsData = consumer.tradeReports?.data || {};

    Object.values<any>(tradeReportsData).forEach(report => {
      const rawDate = report.delivery_date || report.trading_date;
      if (!rawDate || !Array.isArray(report.trades)) return;

      const formattedDate = normalizeDeliveryDate(rawDate);

      if (formattedDate) {
        if (!traderTradesLookup[formattedDate]) {
          traderTradesLookup[formattedDate] = {};
        }

        report.trades.forEach((trade: any) => {
          if (trade.period && typeof trade.period === 'string') {
            const startStr = trade.period.split('-')[0].trim();
            const [hStr, mStr] = startStr.split(':');
            const h = parseInt(hStr, 10) || 0;
            const m = parseInt(mStr, 10) || 0;
            const slot = h * 4 + (m / 15) + 1;

            traderTradesLookup[formattedDate][slot] = {
              qtyMw: Number(trade.qty_mw || 0),
              rateMwh: Number(trade.rate_mwh || 0),
              rateKwh: Number(trade.rate_mwh || 0) / 1000,
              amount: Number(trade.amount || 0),
              market: report.oa_market_type || 'RTM'
            };
          }
        });
      }
    });

    let mtdTotalConsumptionKwh = 0;
    let mtdBaselineDiscomCost = 0;
    let mtdProbusOptimizedCost = 0;
    let mtdActualTraderCost = 0;
    let mtdTradedVolumeKwh = 0;

    const dailyBreakdown: any[] = [];
    const intervalBreakdown: any[] = [];

    // Helper: Compute TOD Discom Rate for a given slot & hour (identical to Trader Performance)
    const getSlotDiscomRate = (dateStr: string, slot: number): { discomLandedRate: number; todSlotName: string } => {
      const startMinutes = (slot - 1) * 15;
      const hour = Math.floor(startMinutes / 60);
      const timeStrHour = hour + (startMinutes % 60) / 60;

      let discomBase = consumer.discomBaseTariff || 7.65;
      let matchedTodName = 'Normal';

      // 1. Check custom TOD slots if configured
      if (consumer.customTodSlots && Array.isArray(consumer.customTodSlots) && consumer.customTodSlots.length > 0) {
        const matched = consumer.customTodSlots.find(cs => {
          if (!cs.startTime || !cs.endTime) return false;
          const s = parseHourLocal(cs.startTime);
          const e = parseHourLocal(cs.endTime);
          if (e < s) return timeStrHour >= s || timeStrHour < e;
          return timeStrHour >= s && timeStrHour < e;
        });
        if (matched) {
          matchedTodName = matched.name || `${matched.startTime}-${matched.endTime}`;
          if (matched.effectivePrice && Number(matched.effectivePrice) > 0) {
            discomBase = Number(matched.effectivePrice);
          }
        }
      }

      // 2. Check State Tariffs from DB if no custom price
      if (tariffsFromDb.length > 0) {
        const matchedTariff = tariffsFromDb.find(t => {
          if (!t.todStartTime || t.todStartTime === '—' || !t.todEndTime || t.todEndTime === '—') return false;
          const s = parseHourLocal(t.todStartTime);
          const e = parseHourLocal(t.todEndTime);
          if (s <= e) return hour >= s && hour < e;
          return hour >= s || hour < e;
        });

        if (matchedTariff) {
          discomBase = Number(matchedTariff.energyRate || matchedTariff.baseEnergyRate || discomBase);
          if (String(matchedTariff.baseEnergyUnit || '').toLowerCase() === 'kvah') {
            discomBase = discomBase / (consumer.powerFactor || 0.99);
          }
          matchedTodName = `${matchedTariff.todStartTime}-${matchedTariff.todEndTime}`;
        } else {
          // Standard UP HV-2 TOD Schedule (-15% Night rebate 22:00-06:00, +15% Evening Peak 17:00-22:00)
          if (hour >= 22 || hour < 6) {
            matchedTodName = 'Off-Peak Night (-15%)';
            discomBase = (consumer.discomBaseTariff || 7.65) * 0.85;
          } else if (hour >= 17 && hour < 22) {
            matchedTodName = 'Peak Evening (+15%)';
            discomBase = (consumer.discomBaseTariff || 7.65) * 1.15;
          } else {
            matchedTodName = 'Normal (06:00-17:00)';
            discomBase = consumer.discomBaseTariff || 7.65;
          }
        }
      } else {
        // Fallback TOD schedule for UP
        if (hour >= 22 || hour < 6) {
          matchedTodName = 'Off-Peak Night (-15%)';
          discomBase = 6.50;
        } else if (hour >= 17 && hour < 22) {
          matchedTodName = 'Peak Evening (+15%)';
          discomBase = 8.80;
        } else {
          matchedTodName = 'Normal (06:00-17:00)';
          discomBase = 7.65;
        }
      }

      // Add FPPA & Electricity Duty to calculate fully landed Discom rate
      const withFppa = discomBase * (1 + fppaPercent / 100);
      const discomLandedRate = consumer.applyElectricityDuty
        ? withFppa * (1 + electricityDutyPercent / 100)
        : withFppa;

      return { discomLandedRate, todSlotName: matchedTodName };
    };

    // Helper: Compute Open Access landed rate from MCP
    const calcOpenAccessLanding = (mcpPerKwh: number, deliveryDate: Date): number => {
      let istsLoss = 3.5;
      const matchingIsts = istsCharges.find(i => deliveryDate >= i.startDate && deliveryDate <= i.endDate);
      if (matchingIsts) istsLoss = Number(matchingIsts.istsLossPercent || 3.5);

      const lossCoefficient = (1 - (istsLoss / 100)) * (1 - (stuLoss / 100)) * (1 - (wheelingLoss / 100));
      const regionalCharges = mcpPerKwh + ctuCharge + stuCharge + wheelingCharge + OTHER_CHARGES + EXCHANGE_FEES + GST_EXCHANGE + TRADER_MARGIN + GST_TRADER_MARGIN + crossSubsidy + additionalSurcharge;
      return regionalCharges / lossCoefficient;
    };

    // 5. Compute daily metrics for each date in month
    datesInMonth.forEach(dateStr => {
      let dayConsumptionKwh = 0;
      let dayBaselineDiscomCost = 0;
      let dayProbusCost = 0;
      let dayActualTraderCost = 0;
      let dayTradedKwh = 0;

      const isTargetDate = dateStr === selectedTargetDate;
      const deliveryDateObj = new Date(dateStr);

      for (let slot = 1; slot <= 96; slot++) {
        const consKey = `${dateStr}_${slot}`;
        const slotKwh = consumptionMap.get(consKey) || 0;
        dayConsumptionKwh += slotKwh;

        // TOD-wise Baseline Discom Tariff
        const { discomLandedRate, todSlotName } = getSlotDiscomRate(dateStr, slot);
        const slotDiscomCost = slotKwh * discomLandedRate;
        dayBaselineDiscomCost += slotDiscomCost;

        // Available market rates (MCP in ₹/kWh)
        const damMcp = (damMap.get(consKey) || 4250) / 1000;
        const rtmMcp = (rtmMap.get(consKey) || 4100) / 1000;
        const gdamMcp = (gdamMap.get(consKey) || 4300) / 1000;

        // Landed costs across markets with full loss & charges
        const damLanded = calcOpenAccessLanding(damMcp, deliveryDateObj);
        const rtmLanded = calcOpenAccessLanding(rtmMcp, deliveryDateObj);
        const gdamLanded = calcOpenAccessLanding(gdamMcp, deliveryDateObj);

        // Probus Optimal Decision
        const minLanded = Math.min(damLanded, rtmLanded, gdamLanded);
        let probusSelectedSource = 'DISCOM';
        let probusRate = discomLandedRate;

        if (minLanded < discomLandedRate) {
          probusRate = minLanded;
          if (minLanded === rtmLanded) probusSelectedSource = 'RTM';
          else if (minLanded === damLanded) probusSelectedSource = 'DAM';
          else probusSelectedSource = 'GDAM';
        }

        const slotProbusCost = slotKwh * probusRate;
        dayProbusCost += slotProbusCost;

        // Actual Trader Execution
        const traderTrade = traderTradesLookup[dateStr]?.[slot];
        let actualSlotCost = slotDiscomCost;
        let traderTradedMw = 0;
        let traderClearedRate = 0;
        let traderLandedRate = 0;
        let traderStatus = 'NO_TRADE';

        if (traderTrade && traderTrade.qtyMw > 0) {
          traderTradedMw = traderTrade.qtyMw;
          traderClearedRate = traderTrade.rateKwh;
          const tradedKwh = traderTradedMw * 1000 * 0.25;
          const effectiveTradedKwh = Math.min(slotKwh, tradedKwh);
          const leftoverDiscomKwh = Math.max(0, slotKwh - effectiveTradedKwh);

          traderLandedRate = calcOpenAccessLanding(traderClearedRate, deliveryDateObj);
          actualSlotCost = (effectiveTradedKwh * traderLandedRate) + (leftoverDiscomKwh * discomLandedRate);
          dayTradedKwh += effectiveTradedKwh;
          traderStatus = 'CLEARED';
        } else {
          actualSlotCost = slotDiscomCost;
        }

        dayActualTraderCost += actualSlotCost;

        // Record slot details if target date
        if (isTargetDate) {
          intervalBreakdown.push({
            intervalNumber: slot,
            timeBlock: this.getTimeBlock(slot),
            todSlotName,
            consumptionKwh: Math.round(slotKwh * 10) / 10,
            discomRate: Math.round(discomLandedRate * 100) / 100,
            damMcp: Math.round(damMcp * 100) / 100,
            rtmMcp: Math.round(rtmMcp * 100) / 100,
            gdamMcp: Math.round(gdamMcp * 100) / 100,
            probusSource: probusSelectedSource,
            probusRate: Math.round(probusRate * 100) / 100,
            probusCost: Math.round(slotProbusCost),
            traderTradedMw,
            traderClearedPrice: traderClearedRate > 0 ? Math.round(traderClearedRate * 100) / 100 : null,
            traderLandedRate: traderLandedRate > 0 ? Math.round(traderLandedRate * 100) / 100 : null,
            traderStatus,
            traderCost: Math.round(actualSlotCost),
            probusSavingsVsDiscom: Math.round(slotDiscomCost - slotProbusCost),
            traderSavingsVsDiscom: Math.round(slotDiscomCost - actualSlotCost),
            extraSavingsPossible: Math.round(actualSlotCost - slotProbusCost)
          });
        }
      }

      const dayProbusSavings = Math.round(dayBaselineDiscomCost - dayProbusCost);
      const dayTraderSavings = Math.round(Math.max(0, dayBaselineDiscomCost - dayActualTraderCost));
      const dayOpportunityLoss = Math.round(Math.max(0, dayProbusSavings - dayTraderSavings));

      mtdTotalConsumptionKwh += dayConsumptionKwh;
      mtdBaselineDiscomCost += dayBaselineDiscomCost;
      mtdProbusOptimizedCost += dayProbusCost;
      mtdActualTraderCost += dayActualTraderCost;
      mtdTradedVolumeKwh += dayTradedKwh;

      dailyBreakdown.push({
        date: dateStr,
        consumptionKwh: Math.round(dayConsumptionKwh),
        baselineDiscomCost: Math.round(dayBaselineDiscomCost),
        probusCost: Math.round(dayProbusCost),
        probusSavings: dayProbusSavings,
        actualTraderCost: Math.round(dayActualTraderCost),
        actualTraderSavings: dayTraderSavings,
        opportunityLoss: dayOpportunityLoss,
        tradedVolumeKwh: Math.round(dayTradedKwh),
        avgProbusPrice: dayConsumptionKwh > 0 ? Math.round((dayProbusCost / dayConsumptionKwh) * 100) / 100 : 0,
        avgTraderPrice: dayConsumptionKwh > 0 ? Math.round((dayActualTraderCost / dayConsumptionKwh) * 100) / 100 : 0
      });
    });

    const mtdProbusSavings = Math.round(mtdBaselineDiscomCost - mtdProbusOptimizedCost);
    const mtdActualTraderSavings = Math.round(Math.max(0, mtdBaselineDiscomCost - mtdActualTraderCost));
    const mtdOpportunityLoss = Math.round(Math.max(0, mtdProbusSavings - mtdActualTraderSavings));

    return {
      consumer: {
        id: consumer.id,
        name: consumer.name,
        discom: consumer.discom,
        stateCode: consumer.stateCode,
        category: consumer.consumerCategory,
        sanctionedLoadKw: consumer.sanctionedLoadKw,
        discomBaseTariff: consumer.discomBaseTariff,
        meterNo: consumer.meterNo,
        customTodSlots: consumer.customTodSlots
      },
      monthStr: targetMonthStr,
      targetDate: selectedTargetDate,
      totalDaysAnalyzed: datesInMonth.length,
      summary: {
        mtdConsumptionKwh: Math.round(mtdTotalConsumptionKwh),
        mtdBaselineDiscomCost: Math.round(mtdBaselineDiscomCost),
        mtdProbusSavings,
        mtdActualTraderSavings,
        mtdOpportunityLoss,
        mtdTradedVolumeKwh: Math.round(mtdTradedVolumeKwh),
        avgBaselineTariff: mtdTotalConsumptionKwh > 0 ? Math.round((mtdBaselineDiscomCost / mtdTotalConsumptionKwh) * 100) / 100 : 7.65,
        avgProbusEffectiveRate: mtdTotalConsumptionKwh > 0 ? Math.round((mtdProbusOptimizedCost / mtdTotalConsumptionKwh) * 100) / 100 : 0,
        avgActualTraderRate: mtdTotalConsumptionKwh > 0 ? Math.round((mtdActualTraderCost / mtdTotalConsumptionKwh) * 100) / 100 : 0,
        uploadedReportsCount: Object.keys(tradeReportsData).length
      },
      dailyBreakdown,
      intervalBreakdown
    };
  }
}
