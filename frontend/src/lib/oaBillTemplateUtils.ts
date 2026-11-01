// OA Bill Template Utilities for generating authentic DISCOM Open Access Adjustment Bills

export interface OABillTemplateData {
  // Consumer Details
  accountId: string;
  consumerName: string;
  address: string;
  mobileNo: string;
  
  // Meter Details
  meterNumber: string;
  mf: number;
  lineLoss: number;
  powerFactor: number;
  
  // Billing Information
  billMonth: string;
  billDate: string;
  billDueDate: string;
  disconnectionDate: string;
  oaPurchaseMonth: string;
  consumptionMonth: string;
  
  // Agreement Details
  agreementType: string;
  voltageLevel: string;
  feederType: string;
  
  // Connection Details
  sanctionedLoad: number;
  actualMD: number;
  billableDemand: number;
  supplyType: string;
  tariffType: string;
  
  // ToD Consumption Data
  todConsumption: {
    tod: string;
    prevMonthKVAH: number;
    currMonthKVAH: number;
    oaUnitsPeriphery: number;
    availableForConsumer: number;
    adjustableOAUnits: number;
    extraPurchasedOA: number;
    oaUnitsToBeAdjusted: number;
    actualAdjustedUnits: number;
    billableConsumption: number;
  }[];
  
  // Charges
  energyCharges: number;
  fixedCharges: number;
  minimumCharges: number;
  excessDemandCharges: number;
  electricityDuty: number;
  lpfSurcharge: number;
  latePaymentSurcharge: number;
  otherAdjustment: number;
  netPayableAmount: number;
  dueDateRebate: number;
  amountPayableBeforeDue: number;
  
  // Other Adjustments
  tcs: number;
  fppaSurcharge: number;
  securityDepositInterest: number;
  
  // Banked Energy
  bankedEnergy: {
    timeSlot: string;
    totalShareMwh: number;
    bankedEnergyAfterDeduction: number;
    finalShareAfterAdjustment: number;
  }[];
  
  // Arrears
  arrears: { category: string; amount: number }[];
  
  // Meter Readings (for Page 2)
  meterReadings: {
    readDate: string;
    zones: number[];
    totalKVAH: number;
    totalKWH: number;
  }[];
}

// Format date in Indian DD-MM-YYYY format
export function formatIndianDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Convert number to Indian words
export function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;
  
  let result = '';
  
  if (crore > 0) result += convertTwoDigit(crore, ones, teens, tens) + ' Crore ';
  if (lakh > 0) result += convertTwoDigit(lakh, ones, teens, tens) + ' Lakh ';
  if (thousand > 0) result += convertTwoDigit(thousand, ones, teens, tens) + ' Thousand ';
  if (hundred > 0) result += ones[hundred] + ' Hundred ';
  if (num > 0) result += convertTwoDigit(num, ones, teens, tens);
  
  return result.trim() + ' Only';
}

function convertTwoDigit(num: number, ones: string[], teens: string[], tens: string[]): string {
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  return tens[Math.floor(num / 10)] + (num % 10 > 0 ? ' ' + ones[num % 10] : '');
}

// Get DISCOM name based on selection
export function getDiscomName(discom: string): string {
  const discomMap: Record<string, string> = {
    'dvvnl': 'Dakshinanchal Vidyut Vitaran Nigam Limited',
    'mvvnl': 'Madhyanchal Vidyut Vitaran Nigam Limited',
    'pvvnl': 'Pashchimanchal Vidyut Vitaran Nigam Limited',
    'puvvnl': 'Purvanchal Vidyut Vitaran Nigam Limited',
    'kesco': 'Kanpur Electricity Supply Company',
  };
  return discomMap[discom?.toLowerCase()] || 'Uttar Pradesh Power Corporation Limited';
}

// Generate default template data from user inputs
export function generateTemplateData(params: {
  monthLabel: string;
  monthISO: string;
  consumerName?: string;
  accountId?: string;
  meterNumber?: string;
  sanctionedLoad?: number;
  voltageLevel?: string;
  category?: string;
  address?: string;
  mobileNo?: string;
  todBreakdown?: { tod1: number; tod2: number; tod3: number; tod4: number };
  totalUnits?: number;
  totalBill?: number;
  oaUnits?: number;
  discomUnits?: number;
  savings?: number;
}): OABillTemplateData {
  const now = new Date();
  const billDate = formatIndianDate(now);
  const dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const disconnectionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const totalUnits = params.totalUnits || 0;
  const oaUnits = params.oaUnits || 0;
  const discomUnits = params.discomUnits || totalUnits;
  const totalBill = params.totalBill || 0;
  const lineLoss = 3.5;
  
  // Calculate ToD breakdown with 5% line loss adjustment
  const tod1 = params.todBreakdown?.tod1 || totalUnits * 0.35;
  const tod2 = params.todBreakdown?.tod2 || totalUnits * 0.15;
  const tod3 = params.todBreakdown?.tod3 || totalUnits * 0.30;
  const tod4 = params.todBreakdown?.tod4 || totalUnits * 0.20;
  
  const oaShare = oaUnits / totalUnits;
  
  return {
    accountId: params.accountId || '—',
    consumerName: params.consumerName || '—',
    address: params.address || '—',
    mobileNo: params.mobileNo || '—',
    
    meterNumber: params.meterNumber || '—',
    mf: 1,
    lineLoss: lineLoss,
    powerFactor: 0.95,
    
    billMonth: params.monthLabel,
    billDate: billDate,
    billDueDate: formatIndianDate(dueDate),
    disconnectionDate: formatIndianDate(disconnectionDate),
    oaPurchaseMonth: params.monthLabel,
    consumptionMonth: params.monthLabel,
    
    agreementType: 'LTOA',
    voltageLevel: params.voltageLevel || '33 kV',
    feederType: 'Mixed',
    
    sanctionedLoad: params.sanctionedLoad || 0,
    actualMD: (params.sanctionedLoad || 0) * 0.75,
    billableDemand: (params.sanctionedLoad || 0) * 0.8,
    supplyType: 'HT Supply',
    tariffType: params.category || 'Industrial',
    
    todConsumption: [
      {
        tod: 'TOD1 (06:00-10:00)',
        prevMonthKVAH: tod1 * 0.95,
        currMonthKVAH: tod1,
        oaUnitsPeriphery: tod1 * oaShare,
        availableForConsumer: tod1 * oaShare * (1 - lineLoss / 100),
        adjustableOAUnits: tod1 * oaShare * (1 - lineLoss / 100),
        extraPurchasedOA: 0,
        oaUnitsToBeAdjusted: tod1 * oaShare * (1 - lineLoss / 100),
        actualAdjustedUnits: tod1 * oaShare * (1 - lineLoss / 100),
        billableConsumption: tod1 * (1 - oaShare),
      },
      {
        tod: 'TOD2 (10:00-18:00)',
        prevMonthKVAH: tod2 * 0.95,
        currMonthKVAH: tod2,
        oaUnitsPeriphery: tod2 * oaShare,
        availableForConsumer: tod2 * oaShare * (1 - lineLoss / 100),
        adjustableOAUnits: tod2 * oaShare * (1 - lineLoss / 100),
        extraPurchasedOA: 0,
        oaUnitsToBeAdjusted: tod2 * oaShare * (1 - lineLoss / 100),
        actualAdjustedUnits: tod2 * oaShare * (1 - lineLoss / 100),
        billableConsumption: tod2 * (1 - oaShare),
      },
      {
        tod: 'TOD3 (18:00-22:00)',
        prevMonthKVAH: tod3 * 0.95,
        currMonthKVAH: tod3,
        oaUnitsPeriphery: tod3 * oaShare,
        availableForConsumer: tod3 * oaShare * (1 - lineLoss / 100),
        adjustableOAUnits: tod3 * oaShare * (1 - lineLoss / 100),
        extraPurchasedOA: 0,
        oaUnitsToBeAdjusted: tod3 * oaShare * (1 - lineLoss / 100),
        actualAdjustedUnits: tod3 * oaShare * (1 - lineLoss / 100),
        billableConsumption: tod3 * (1 - oaShare),
      },
      {
        tod: 'TOD4 (22:00-06:00)',
        prevMonthKVAH: tod4 * 0.95,
        currMonthKVAH: tod4,
        oaUnitsPeriphery: tod4 * oaShare,
        availableForConsumer: tod4 * oaShare * (1 - lineLoss / 100),
        adjustableOAUnits: tod4 * oaShare * (1 - lineLoss / 100),
        extraPurchasedOA: 0,
        oaUnitsToBeAdjusted: tod4 * oaShare * (1 - lineLoss / 100),
        actualAdjustedUnits: tod4 * oaShare * (1 - lineLoss / 100),
        billableConsumption: tod4 * (1 - oaShare),
      },
    ],
    
    energyCharges: totalBill * 0.55,
    fixedCharges: totalBill * 0.15,
    minimumCharges: 0,
    excessDemandCharges: 0,
    electricityDuty: totalBill * 0.08,
    lpfSurcharge: 0,
    latePaymentSurcharge: 0,
    otherAdjustment: totalBill * 0.02,
    netPayableAmount: totalBill,
    dueDateRebate: totalBill * 0.01,
    amountPayableBeforeDue: totalBill * 0.99,
    
    tcs: totalBill * 0.001,
    fppaSurcharge: totalBill * 0.05,
    securityDepositInterest: totalBill * 0.02,
    
    bankedEnergy: [
      { timeSlot: 'TOD1', totalShareMwh: (tod1 * oaShare) / 1000, bankedEnergyAfterDeduction: 0, finalShareAfterAdjustment: (tod1 * oaShare) / 1000 },
      { timeSlot: 'TOD2', totalShareMwh: (tod2 * oaShare) / 1000, bankedEnergyAfterDeduction: 0, finalShareAfterAdjustment: (tod2 * oaShare) / 1000 },
      { timeSlot: 'TOD3', totalShareMwh: (tod3 * oaShare) / 1000, bankedEnergyAfterDeduction: 0, finalShareAfterAdjustment: (tod3 * oaShare) / 1000 },
      { timeSlot: 'TOD4', totalShareMwh: (tod4 * oaShare) / 1000, bankedEnergyAfterDeduction: 0, finalShareAfterAdjustment: (tod4 * oaShare) / 1000 },
    ],
    
    arrears: [
      { category: 'Previous Dues', amount: 0 },
      { category: 'Interest on Arrears', amount: 0 },
    ],
    
    meterReadings: [
      {
        readDate: billDate,
        zones: [tod1 * 0.12, tod1 * 0.13, tod2 * 0.5, tod2 * 0.5, tod3 * 0.5, tod3 * 0.5, tod4 * 0.5, tod4 * 0.5],
        totalKVAH: totalUnits,
        totalKWH: totalUnits * 0.95,
      },
    ],
  };
}
