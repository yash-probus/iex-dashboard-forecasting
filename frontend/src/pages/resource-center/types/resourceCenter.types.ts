export interface RegionState {
  id?: number;
  regionalGrid: string;
  regionCode: string;
  regionName: string;
  stateName: string;
  stateCode: string;
  stateOrUt: string;
  updatedAt?: string;
}

export interface DiscomList {
  id?: number;
  code: string;
  legalName: string;
  stateCode: string;
  discomType: string;
  updatedAt?: string;
}

export interface IstsCharges {
  id?: string;
  startDate: string;
  endDate: string;
  istsLossPercent: number;
  updatedAt?: string;
}

export interface IexFees {
  id?: number;
  month: number;
  exchangeFees: number;
  exchangeFeesGst: number;
  nldcApplicationFees: number;
  nldcSchedulingFees: number;
  sldcSchedulingFees: number;
  otherFixCharges: number;
  updatedAt?: string;
}

export interface ProltMargin {
  id?: number;
  month: number;
  customerId: string;
  tradingMargin: number;
  tradingMarginGst: number;
  proltMargin: number;
  proltMarginGst: number;
  updatedAt?: string;
}

export interface CtuCharges {
  id?: string;
  state: string;
  month: number;
  ctu_charges_rs_per_kwh: number;
  updatedAt?: string;
}

export interface StateCharges {
  id?: number;
  state: string;
  category: string;
  subCategory: string;
  supplyVoltageCategory: string;
  voltageLevel: string;
  fromDate: string;
  toDate: string;
  demandFixedChargeKvaPerMonthRs: number;
  crossSubsidy: number;
  distributionWheelingCharges: number;
  stuCharges: number;
  stuLossPercent: number;
  wheelingLossPercent: number;
  additionalCharge: number;
  updatedAt?: string;
}

export interface StateTariff {
  id?: number;
  state: string;
  consumerCategory: string;
  subCategory: string;
  supplyVoltageCategory: string;
  supplyVoltage: string;
  month: number;
  todStartTime: string;
  todEndTime: string;
  baseEnergyRate: number;
  baseEnergyUnit: string;
  todChargePercent: number;
  energyRate: number;
  updatedAt?: string;
}

export interface FppaCharges {
  id: number;
  state: string;
  discom?: string;
  month: number;
  billingMonth?: number;
  fppaChargePercent: number;
  updatedAt?: string;
}
