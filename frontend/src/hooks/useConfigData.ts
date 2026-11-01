// @ts-nocheck

import { lookupServices } from "@/api/lookupServices";
import { useQuery } from "@tanstack/react-query";

export const useConfigData = () => {
  return useQuery({
    queryKey: ["config-data"],
    queryFn: lookupServices.getStateAndDiscomLookup,
    staleTime: Infinity,
  });
};

export const useConsumerCategoryData = () => {
  return useQuery({
    queryKey: ["consumer-category-data"],
    queryFn: lookupServices.getConsumerCategoryLookup,
    staleTime: Infinity,
  });
};

export const useVoltageLevelData = () => {
  return useQuery({
    queryKey: ["voltage-level-data"],
    queryFn: lookupServices.getVoltageLevelLookup,
    staleTime: Infinity,
  });
};

export const useHvCategoryLevelData = () => {
  return useQuery({
    queryKey: ["hv-category-data"],
    queryFn: lookupServices.getHvCategoryLevelLookup,
    staleTime: Infinity,
  });
};
