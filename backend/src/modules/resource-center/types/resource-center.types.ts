export type ResourceType =
  | 'region-state'
  | 'discom-list'
  | 'ists-charges'
  | 'iex-fees'
  | 'prolt-margin'
  | 'ctu-charges'
  | 'state-charges'
  | 'state-tariff'
  | 'fppa-charges';

export const isValidResourceType = (type: any): type is ResourceType => {
  const validTypes: ResourceType[] = [
    'region-state',
    'discom-list',
    'ists-charges',
    'iex-fees',
    'prolt-margin',
    'ctu-charges',
    'state-charges',
    'state-tariff',
    'fppa-charges'
  ];
  return validTypes.includes(type as ResourceType);
};
