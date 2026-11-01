export const RESOURCE_REGISTRY = {
  'region-state': {
    id: 'region-state',
    table: 'region_state',
    schema: 'prolt_energy',
    displayName: 'Region State',
    modelName: 'regionState'
  },
  'discom-list': {
    id: 'discom-list',
    table: 'discom_list',
    schema: 'prolt_energy',
    displayName: 'Discom List',
    modelName: 'discomList'
  },
  'ists-charges': {
    id: 'ists-charges',
    table: 'ists_charges',
    schema: 'prolt_energy',
    displayName: 'ISTS Charges',
    modelName: 'istsCharges'
  },
  'iex-fees': {
    id: 'iex-fees',
    table: 'iex_fees',
    schema: 'prolt_energy',
    displayName: 'IEX Fees',
    modelName: 'iexFees'
  },
  'prolt-margin': {
    id: 'prolt-margin',
    table: 'prolt_margin',
    schema: 'prolt_energy',
    displayName: 'ProLT Margin',
    modelName: 'proltMargin'
  },
  'ctu-charges': {
    id: 'ctu-charges',
    table: 'ctu_charges',
    schema: 'prolt_energy',
    displayName: 'CTU Charges',
    modelName: 'ctuCharges'
  },
  'state-charges': {
    id: 'state-charges',
    table: 'state_charges',
    schema: 'prolt_energy',
    displayName: 'State Charges',
    modelName: 'stateCharges'
  },
  'state-tariff': {
    id: 'state-tariff',
    table: 'state_tariff',
    schema: 'prolt_energy',
    displayName: 'State Tariff',
    modelName: 'stateTariff'
  },
  'fppa-charges': {
    id: 'fppa-charges',
    table: 'fppa_charges',
    schema: 'prolt_energy',
    displayName: 'FPPA Charges',
    modelName: 'fppaCharges'
  }
} as const;
