import { StateCharges } from '../types/resourceCenter.types';

export const STATE_CHARGES_MOCK_DATA: StateCharges[] = [
  {
    id: 1,
    state: 'UTTAR_PRADESH',
    category: 'LMV-11',
    subCategory: 'Multistoried Buildings (Common Usage)',
    supplyVoltageCategory: 'Low Tension (LT)',
    voltageLevel: '0.433',
    fromDate: '2024-04-01',
    toDate: '2025-03-31',
    demandFixedChargeKvaPerMonthRs: 0,
    crossSubsidy: 0.65,
    distributionWheelingCharges: 0.88,
    stuCharges: 0.2631,
    stuLossPercent: 3.22,
    wheelingLossPercent: 8,
    additionalCharge: 0,
    updatedAt: new Date().toISOString()
  }
];
