import { ColumnDefinition } from '../../../../components/dashboard/TableContainer';
import { INDIAN_STATES, DISCOMS, UP_DISCOMS, MAHARASHTRA_DISCOMS } from '../../../../lib/profileUtils';

const STATE_OPTIONS = INDIAN_STATES.map((s: string) => ({ label: s, value: s }));

const getDiscomOptions = (formData: any) => {
  const state = formData?.state;
  if (!state) return [];
  
  if (state === 'Uttar Pradesh') return UP_DISCOMS.map(d => ({ label: d, value: d }));
  if (state === 'Maharashtra') return MAHARASHTRA_DISCOMS.map(d => ({ label: d, value: d }));
  
  // Generic matching based on state name in parentheses
  // e.g. "BSES Rajdhani (Delhi)" for "Delhi"
  const matched = DISCOMS.filter(d => d.toUpperCase().includes(`(${state.toUpperCase()})`));
  
  if (matched.length > 0) return matched.map(d => ({ label: d, value: d }));
  return [{ label: 'Other', value: 'Other' }];
};

export type FieldType = 'text' | 'number' | 'dropdown' | 'dropdown-multi' | 'date' | 'image-multi' | 'rich-text';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  options?: { label: string; value: string }[] | ((formData: any) => { label: string; value: string }[]);
}

export interface ResourceConfig {
  title: string;
  subtitle: string;
  exportFilename: string;
  emptyMessage: string;
  searchPlaceholder: string;
  searchableFields: string[];
  columns: ColumnDefinition[];
  fields: FormField[];
}

const formatDate = (v: any) => v ? new Date(v).toLocaleDateString() : '-';

const formatNum = (v: unknown) => typeof v === 'number' ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : v;

export const RESOURCE_CONFIG: Record<string, ResourceConfig> = {
  'region-state': {
    title: 'REGION STATE',
    subtitle: 'Manage Region State records.',
    exportFilename: 'region-state',
    emptyMessage: 'No Region State data available.',
    searchPlaceholder: 'Search by state, region code, region name...',
    searchableFields: ['regionalGrid', 'regionCode', 'regionName', 'stateName', 'stateCode', 'stateOrUt'],
    columns: [
      { field: 'regionalGrid', headerName: 'Regional Grid', align: 'center', width: 200 },
      { field: 'regionCode', headerName: 'Region Code', align: 'center', width: 150 },
      { field: 'regionName', headerName: 'Region Name', align: 'center', width: 250 },
      { field: 'stateName', headerName: 'State Name', align: 'center', width: 250 },
      { field: 'stateCode', headerName: 'State Code', align: 'center', width: 150 },
      { field: 'stateOrUt', headerName: 'State / UT', align: 'center', width: 150 },
    ],
    fields: [
      { name: 'regionalGrid', label: 'Regional Grid', type: 'text' },
      { name: 'regionCode', label: 'Region Code', type: 'text' },
      { name: 'regionName', label: 'Region Name', type: 'text' },
      { name: 'stateName', label: 'State Name', type: 'text' },
      { name: 'stateCode', label: 'State Code', type: 'text' },
      { name: 'stateOrUt', label: 'State / UT', type: 'dropdown', options: [{ label: 'State', value: 'State' }, { label: 'UT', value: 'UT' }] },
    ]
  },
  'discom-list': {
    title: 'DISCOM LIST',
    subtitle: 'Manage Discom List records.',
    exportFilename: 'discom-list',
    emptyMessage: 'No Discom List data available.',
    searchPlaceholder: 'Search by code, discom name, state code...',
    searchableFields: ['code', 'legalName', 'stateCode', 'discomType'],
    columns: [
      { field: 'code', headerName: 'Code', align: 'center', width: 150 },
      { field: 'legalName', headerName: 'Discom Name', align: 'center', width: 400 },
      { field: 'stateCode', headerName: 'State Code', align: 'center', width: 150 },
      { field: 'discomType', headerName: 'Discom Type', align: 'center', width: 200 },
    ],
    fields: [
      { name: 'code', label: 'Code', type: 'text' },
      { name: 'legalName', label: 'Discom Name', type: 'text' },
      { name: 'stateCode', label: 'State Code', type: 'text' },
      { name: 'discomType', label: 'Discom Type', type: 'text' },
    ]
  },
  'ists-charges': {
    title: 'ISTS LOSSES',
    subtitle: 'Manage ISTS Losses records.',
    exportFilename: 'ists-charges',
    emptyMessage: 'No ISTS Losses data available.',
    searchPlaceholder: 'Search by date, ISTS loss...',
    searchableFields: ['id', 'startDate', 'endDate', 'istsLossPercent'],
    columns: [
      { field: 'id', headerName: 'ID', align: 'center', width: 150 },
      { field: 'startDate', headerName: 'Start Date', align: 'center', width: 200 },
      { field: 'endDate', headerName: 'End Date', align: 'center', width: 200 },
      { field: 'istsLossPercent', headerName: 'ISTS Loss %', align: 'center', width: 200, valueFormatter: formatNum },
    ],
    fields: [
      { name: 'id', label: 'ID', type: 'text' },
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'endDate', label: 'End Date', type: 'date' },
      { name: 'istsLossPercent', label: 'ISTS Loss %', type: 'number' },
    ]
  },
  'iex-fees': {
    title: 'IEX FEES',
    subtitle: 'Manage IEX Fees records.',
    exportFilename: 'iex-fees',
    emptyMessage: 'No IEX Fees data available.',
    searchPlaceholder: 'Search by month, fees, charges...',
    searchableFields: ['month', 'exchangeFees', 'nldcApplicationFees'],
    columns: [
      { field: 'month', headerName: 'Month', align: 'center', width: 150 },
      { field: 'exchangeFees', headerName: 'Exchange Fees', align: 'center', width: 200, valueFormatter: formatNum },
      { field: 'exchangeFeesGst', headerName: 'Exchange Fees GST', align: 'center', width: 200, valueFormatter: formatNum },
      { field: 'nldcApplicationFees', headerName: 'NLDC Application Fees', align: 'center', width: 200, valueFormatter: formatNum },
      { field: 'nldcSchedulingFees', headerName: 'NLDC Scheduling Fees', align: 'center', width: 200, valueFormatter: formatNum },
      { field: 'sldcSchedulingFees', headerName: 'SLDC Scheduling Fees', align: 'center', width: 200, valueFormatter: formatNum },
      { field: 'otherFixCharges', headerName: 'Other Fixed Charges', align: 'center', width: 200, valueFormatter: formatNum },
    ],
    fields: [
      { name: 'month', label: 'Month (YYYYMM)', type: 'number' },
      { name: 'exchangeFees', label: 'Exchange Fees', type: 'number' },
      { name: 'exchangeFeesGst', label: 'Exchange Fees GST', type: 'number' },
      { name: 'nldcApplicationFees', label: 'NLDC Application Fees', type: 'number' },
      { name: 'nldcSchedulingFees', label: 'NLDC Scheduling Fees', type: 'number' },
      { name: 'sldcSchedulingFees', label: 'SLDC Scheduling Fees', type: 'number' },
      { name: 'otherFixCharges', label: 'Other Fixed Charges', type: 'number' },
    ]
  },

  'ctu-charges': {
    title: 'CTU CHARGES',
    subtitle: 'Manage CTU Charges records.',
    exportFilename: 'ctu-charges',
    emptyMessage: 'No CTU Charges data available.',
    searchPlaceholder: 'Search by state, month...',
    searchableFields: ['state', 'month'],
    columns: [
      { field: 'id', headerName: 'ID', align: 'center', width: 100 },
      { field: 'state', headerName: 'State', align: 'center', width: 200 },
      { field: 'month', headerName: 'Month', align: 'center', width: 150 },
      { field: 'ctu_charges_rs_per_kwh', headerName: 'CTU Charges (Rs/kWh)', align: 'center', width: 250, valueFormatter: formatNum },
    ],
    fields: [
      { name: 'state', label: 'State', type: 'dropdown', options: STATE_OPTIONS },
      { name: 'month', label: 'Month (YYYYMM)', type: 'number' },
      { name: 'ctu_charges_rs_per_kwh', label: 'CTU Charges (Rs/kWh)', type: 'number' },
    ]
  },
  'state-charges': {
    title: 'STATE CHARGES',
    subtitle: 'Manage State Charges records.',
    exportFilename: 'state-charges',
    emptyMessage: 'No State Charges data available.',
    searchPlaceholder: 'Search by state, category, sub category...',
    searchableFields: ['state', 'category', 'subCategory', 'supplyVoltageCategory', 'voltageLevel'],
    columns: [
      { field: 'state', headerName: 'State', align: 'center', width: 180, sticky: true },
      { field: 'category', headerName: 'Category', align: 'center', width: 180 },
      { field: 'subCategory', headerName: 'Sub Category', align: 'center', width: 180 },
      { field: 'supplyVoltageCategory', headerName: 'Supply Voltage Category', align: 'center', width: 200 },
      { field: 'voltageLevel', headerName: 'Voltage Level', align: 'center', width: 150 },
      { field: 'fromDate', headerName: 'From Date', align: 'center', width: 120, valueFormatter: formatDate },
      { field: 'toDate', headerName: 'To Date', align: 'center', width: 120, valueFormatter: formatDate },
      { field: 'demandFixedChargeKvaPerMonthRs', headerName: 'Demand Fixed Charge', align: 'center', width: 180, valueFormatter: formatNum },
      { field: 'crossSubsidy', headerName: 'Cross Subsidy', align: 'center', width: 180, valueFormatter: formatNum },
      { field: 'distributionWheelingCharges', headerName: 'Dist Wheeling Charges', align: 'center', width: 180, valueFormatter: formatNum },
      { field: 'stuCharges', headerName: 'STU Charges', align: 'center', width: 180, valueFormatter: formatNum },
      { field: 'stuLossPercent', headerName: 'STU Loss (%)', align: 'center', width: 150, valueFormatter: formatNum },
      { field: 'wheelingLossPercent', headerName: 'Wheeling Loss (%)', align: 'center', width: 150, valueFormatter: formatNum },
      { field: 'additionalCharge', headerName: 'Additional Charge', align: 'center', width: 180, valueFormatter: formatNum },
    ],
    fields: [
      { name: 'state', label: 'State', type: 'text' },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'subCategory', label: 'Sub Category', type: 'text' },
      { name: 'supplyVoltageCategory', label: 'Supply Voltage Category', type: 'text' },
      { name: 'voltageLevel', label: 'Voltage Level', type: 'text' },
      { name: 'fromDate', label: 'From Date', type: 'date' },
      { name: 'toDate', label: 'To Date', type: 'date' },
      { name: 'demandFixedChargeKvaPerMonthRs', label: 'Demand Fixed Charge', type: 'number' },
      { name: 'crossSubsidy', label: 'Cross Subsidy', type: 'number' },
      { name: 'distributionWheelingCharges', label: 'Dist Wheeling Charges', type: 'number' },
      { name: 'stuCharges', label: 'STU Charges', type: 'number' },
      { name: 'stuLossPercent', label: 'STU Loss (%)', type: 'number' },
      { name: 'wheelingLossPercent', label: 'Wheeling Loss (%)', type: 'number' },
      { name: 'additionalCharge', label: 'Additional Charge', type: 'number' },
    ]
  },
  'state-tariff': {
    title: 'STATE TARIFF',
    subtitle: 'Manage State Tariff records.',
    exportFilename: 'state-tariff',
    emptyMessage: 'No State Tariff data available.',
    searchPlaceholder: 'Search by state, category, voltage, month...',
    searchableFields: ['state', 'consumerCategory', 'subCategory', 'supplyVoltageCategory', 'supplyVoltage', 'month', 'baseEnergyUnit'],
    columns: [
      { field: 'state', headerName: 'State', align: 'center', width: 180, sticky: true },
      { field: 'consumerCategory', headerName: 'Consumer Category', align: 'center', width: 160 },
      { field: 'subCategory', headerName: 'Sub Category', align: 'center', width: 260 },
      { field: 'supplyVoltageCategory', headerName: 'Supply Voltage Category', align: 'center', width: 220 },
      { field: 'supplyVoltage', headerName: 'Supply Voltage', align: 'center', width: 150 },
      { field: 'month', headerName: 'Month', align: 'center', width: 120 },
      { field: 'todStartTime', headerName: 'TOD Start Time', align: 'center', width: 150 },
      { field: 'todEndTime', headerName: 'TOD End Time', align: 'center', width: 150 },
      { field: 'baseEnergyRate', headerName: 'Base Energy Rate', align: 'center', width: 180, valueFormatter: formatNum },
      { field: 'baseEnergyUnit', headerName: 'Unit', align: 'center', width: 100 },
      { field: 'todChargePercent', headerName: 'TOD Charge %', align: 'center', width: 150 },
      { field: 'energyRate', headerName: 'Energy Rate', align: 'center', width: 150, valueFormatter: formatNum },
    ],
    fields: [
      { name: 'state', label: 'State', type: 'text' },
      { name: 'consumerCategory', label: 'Consumer Category', type: 'text' },
      { name: 'subCategory', label: 'Sub Category', type: 'text' },
      { name: 'supplyVoltageCategory', label: 'Supply Voltage Category', type: 'text' },
      { name: 'supplyVoltage', label: 'Supply Voltage', type: 'text' },
      { name: 'month', label: 'Month (YYYYMM)', type: 'number' },
      { name: 'todStartTime', label: 'TOD Start Time', type: 'text' },
      { name: 'todEndTime', label: 'TOD End Time', type: 'text' },
      { name: 'baseEnergyRate', label: 'Base Energy Rate', type: 'number' },
      { name: 'baseEnergyUnit', label: 'Base Energy Unit', type: 'text' },
      { name: 'todChargePercent', label: 'TOD Charge %', type: 'number' },
      { name: 'energyRate', label: 'Energy Rate', type: 'number' },
    ]
  },
  'fppa-charges': {
    title: 'FPPA CHARGES',
    subtitle: 'Manage FPPA Charges records.',
    exportFilename: 'fppa-charges',
    emptyMessage: 'No FPPA Charges data available.',
    searchPlaceholder: 'Search by state, month, billing month...',
    searchableFields: ['state', 'month', 'billingMonth'],
    columns: [
      { field: 'id', headerName: 'ID', align: 'center', width: 100 },
      { field: 'state', headerName: 'State', align: 'center', width: 250 },
      { field: 'discom', headerName: 'Discom', align: 'center', width: 250 },
      { field: 'month', headerName: 'Billing Month', align: 'center', width: 150 },
      { field: 'billingMonth', headerName: 'Month', align: 'center', width: 150 },
      { field: 'fppaChargePercent', headerName: 'FPPA Charge %', align: 'center', width: 200, valueFormatter: formatNum },
    ],
    fields: [
      { name: 'state', label: 'State', type: 'dropdown', options: STATE_OPTIONS },
      { name: 'discom', label: 'Discom', type: 'dropdown-multi', options: getDiscomOptions },
      { name: 'month', label: 'Billing Month (YYYYMM)', type: 'number' },
      { name: 'billingMonth', label: 'Month (YYYYMM)', type: 'number' },
      { name: 'fppaChargePercent', label: 'FPPA Charge %', type: 'number' },
    ]
  }
};
