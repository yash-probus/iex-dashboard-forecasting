import { AppError } from '../../../utils/AppError';
import { ResourceType } from '../types/resource-center.types';

const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12
};

const parseMonth = (val: any): number => {
  if (typeof val === 'number') return val;
  const str = String(val).toLowerCase().trim();
  if (str === '') return NaN;

  // Try direct parse as integer (handles 1-12 or YYYYMM)
  const num = parseInt(str, 10);
  if (!isNaN(num) && String(num) === str) {
    return num;
  }

  // Check pattern YYYY-MM
  const dashMatch = str.match(/^(\d{4})-(\d{2})$/);
  if (dashMatch) {
    const y = parseInt(dashMatch[1], 10);
    const m = parseInt(dashMatch[2], 10);
    return y * 100 + m;
  }
  
  // Check pattern MM/YYYY
  const slashMatch = str.match(/^(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10);
    const y = parseInt(slashMatch[2], 10);
    return y * 100 + m;
  }

  // Extract a 4-digit year if present (e.g. 2025 or 2026)
  const yearMatch = str.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  // Check if it matches a month name directly or as substring (e.g. "Jun 2026", "June 2026")
  for (const [key, mNum] of Object.entries(MONTH_MAP)) {
    if (str.includes(key)) {
      if (year) {
        return year * 100 + mNum;
      }
      return mNum;
    }
  }

  return NaN;
};

// Map of mandatory fields for each resource type based on the DB schema
const REQUIRED_FIELDS: Record<ResourceType, string[]> = {
  'region-state': ['stateName'],
  'discom-list': ['legalName'],
  'ists-charges': ['startDate', 'endDate', 'istsLossPercent'],
  'iex-fees': ['month'],
  'prolt-margin': ['month', 'customerId'],
  'ctu-charges': ['state', 'month'],
  'state-charges': ['state', 'fromDate', 'toDate'],
  'state-tariff': ['stateCode', 'month', 'state', 'tod'],
  'fppa-charges': ['state', 'month']
};

// Map of allowed fields for each resource type to filter out unknown keys from raw payloads
const VALID_FIELDS: Record<ResourceType, string[]> = {
  'region-state': ['regionalGrid', 'regionCode', 'regionName', 'stateName', 'stateCode', 'stateOrUt'],
  'discom-list': ['code', 'legalName', 'stateCode', 'discomType'],
  'ists-charges': ['startDate', 'endDate', 'istsLossPercent'],
  'iex-fees': ['month', 'exchangeFees', 'exchangeFeesGst', 'nldcApplicationFees', 'nldcSchedulingFees', 'sldcSchedulingFees', 'otherFixCharges'],
  'prolt-margin': ['month', 'customerId', 'tradingMargin', 'tradingMarginGst', 'proltMargin', 'proltMarginGst'],
  'ctu-charges': ['state', 'month', 'ctu_charges_rs_per_kwh'],
  'state-charges': ['state', 'category', 'subCategory', 'supplyVoltageCategory', 'voltageLevel', 'fromDate', 'toDate', 'demandFixedChargeKvaPerMonthRs', 'crossSubsidy', 'distributionWheelingCharges', 'stuCharges', 'stuLossPercent', 'wheelingLossPercent', 'additionalCharge'],
  'state-tariff': ['stateCode', 'month', 'state', 'category', 'subCategory', 'voltageLevel', 'tod', 'todName', 'season', 'todStartHour', 'todEndHour', 'baseEnergyCharges', 'todRate', 'energyCharges'],
  'fppa-charges': ['state', 'discom', 'month', 'billingMonth', 'fppaChargePercent']
};

/**
 * Normalizes empty strings and whitespace to undefined.
 * Throws AppError if required fields are missing.
 * Normalizes state_or_ut to lowercase.
 * Checks for Number.isFinite on all decimal/number fields.
 */
export const validatePayload = (resourceType: ResourceType, payload: any): any => {
  if (!payload || typeof payload !== 'object') {
    throw new AppError('Invalid payload format', 400);
  }

  // Check if the payload is completely blank (all values are empty/whitespace)
  let isBlank = true;
  for (const key in payload) {
    const val = payload[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      isBlank = false;
      break;
    }
  }
  if (isBlank) {
    return null;
  }

  // Clone payload to mutate
  const data = { ...payload };

  // Map month key variations (e.g. Bill Month, bill_month, Month) to "month"
  if (data.month === undefined || data.month === null) {
    for (const key in data) {
      const lowerKey = key.toLowerCase().replace(/[\s_-]/g, '');
      if (lowerKey === 'billmonth' || lowerKey === 'month') {
        data.month = data[key];
        break;
      }
    }
  }

  // Remove ID if present to avoid updating/creating primary keys
  delete data.id;

  // 1. Normalize Empty Strings and Trim Whitespace
  // Except for specific enum values, we preserve exact casing.
  for (const key in data) {
    if (typeof data[key] === 'string') {
      const trimmed = data[key].trim();
      data[key] = trimmed === '' ? null : trimmed;
    }
  }

  // 2. Required Fields Validation
  const required = REQUIRED_FIELDS[resourceType] || [];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      throw new AppError(`Validation error: ${field} is required`, 400);
    }
  }

  // 3. Month Validation (1-12 or YYYYMM)
  const monthFields = ['month', 'billingMonth'];
  for (const field of monthFields) {
    if (data[field] !== undefined && data[field] !== null) {
      const val = parseMonth(data[field]);
      if (isNaN(val)) {
        throw new AppError(`Validation error: ${field} must be a number or a valid month name`, 400);
      }
      
      const isCyclic = val >= 1 && val <= 12;
      const isYyyyMm = String(val).length === 6 && val >= 200001 && val <= 210012;
      
      if (!isCyclic && !isYyyyMm) {
        throw new AppError(`Validation error: ${field} must be between 1 and 12, or in YYYYMM format`, 400);
      }
      data[field] = val; // Store as integer for DB
    }
  }

  // Date Validation (YYYY-MM-DD from frontend, stored as YYYYMMDD in DB)
  if (data.date !== undefined && data.date !== null) {
    const val = String(data.date);
    // Frontend sends '2026-06-24' or similar
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val) && !/^\d{8}$/.test(val)) {
      throw new AppError(`Validation error: date must be in YYYY-MM-DD or YYYYMMDD format`, 400);
    }
  }

  // Convert DateTime fields into Date objects for Prisma
  const dateObjFields = ['startDate', 'endDate', 'fromDate', 'toDate'];
  for (const dateField of dateObjFields) {
    if (data[dateField] !== undefined && data[dateField] !== null) {
      const val = String(data[dateField]);
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        data[dateField] = new Date(`${val}T00:00:00.000Z`);
      } else if (!isNaN(Date.parse(val))) {
        data[dateField] = new Date(val);
      } else {
        throw new AppError(`Validation error: ${dateField} must be a valid date string (e.g. YYYY-MM-DD)`, 400);
      }
    }
  }

  // 4. Decimal/Number Validation
  const numericFields = [
    'istsLossPercent', 'exchangeFees', 'exchangeFeesGst',
    'nldcApplicationFees', 'nldcSchedulingFees', 'sldcSchedulingFees', 'otherFixCharges',
    'tradingMargin', 'tradingMarginGst', 'proltMargin', 'proltMarginGst',
    'ctuChargesRsPerKwh', 'dsmChargesRsPerKwh', 'demandFixedChargeKvaPerMonthRs',
    'additionalCharge', 'crossSubsidy', 'distributionWheelingCharges', 'stuCharges',
    'stuLossPercent', 'wheelingLossPercent', 'baseEnergyCharges', 'todRate', 'energyCharges',
    'fppaChargePercent'
  ];

  const percentageFields = ['istsLossPercent', 'stuLossPercent', 'wheelingLossPercent'];

  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] !== null) {
      let rawVal = data[field];
      if (typeof rawVal === 'string') {
        // Clean formatting characters: %, currency symbols (₹, rs), commas, and whitespace
        rawVal = rawVal.replace(/[%₹,\s]|rs\.?/gi, '');
        if (rawVal === '') {
          data[field] = null;
          continue;
        }
      }
      const val = Number(rawVal);
      if (!Number.isFinite(val)) {
        throw new AppError(`Validation error: ${field} must be a finite number`, 400);
      }
      if (val < 0 && field !== 'fppaChargePercent') {
        throw new AppError(`Validation error: ${field} cannot be negative`, 400);
      }
      if (percentageFields.includes(field) && val > 100) {
        throw new AppError(`Validation error: ${field} cannot exceed 100`, 400);
      }
      data[field] = val; // Store back as number for Prisma
    }
  }

  // 5. Enum Normalization
  if (data.stateOrUt !== undefined && data.stateOrUt !== null) {
    const val = String(data.stateOrUt).toLowerCase();
    if (val !== 'state' && val !== 'ut') {
      throw new AppError(`Validation error: stateOrUt must be 'state' or 'ut'`, 400);
    }
    data.stateOrUt = val; // PostgreSQL expects 'state' or 'ut'
  }

  // 6. Strip Unknown Fields to avoid Prisma query errors on bulk upload
  const allowed = VALID_FIELDS[resourceType] || [];
  const cleaned: any = {};
  for (const field of allowed) {
    if (data[field] !== undefined) {
      cleaned[field] = data[field];
    }
  }

  return cleaned;
};
