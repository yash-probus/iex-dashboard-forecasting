import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Cpu,
  Gauge,
  SlidersHorizontal,
  TrendingUp,
  Database,
  FileSpreadsheet,
  Users,
  Server,
  Activity,
  Layers,
  Zap,
  ShieldCheck,
  FolderUp,
  ArrowRight
} from 'lucide-react';

export interface SubRoute {
  label: string;
  path: string;
}

export type ModuleCategory = 'markets' | 'analytics' | 'economics' | 'governance';
export type ModuleVariant = 'sales' | 'forecasting' | 'both';

export interface ModuleItem {
  key: string;
  title: string;
  category: ModuleCategory;
  categoryLabel: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  accentColor: string;
  subRoutes: SubRoute[];
  badge?: string;
  isNew?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  variant?: ModuleVariant;
}

export interface UserManagementModuleConfig {
  id: string;
  label: string;
  category: 'Power Markets' | 'Arbitrage & Analytics' | 'AI & Forecast' | 'Data & Governance';
  description: string;
}

/**
 * Single Source of Truth for all Prolt Enterprise System Modules.
 * Whenever a new module is added, registering it here (or via registerModule)
 * automatically renders it across Dashboard, Navbar, Breadcrumbs, User Management, and Search.
 */
export const SYSTEM_MODULES: ModuleItem[] = [
  {
    key: 'database',
    title: 'Demand & Generation Data',
    category: 'analytics',
    categoryLabel: 'Intelligence',
    description: 'Access centralized repositories for nationwide and state-level power demand, plus historical weather data.',
    path: '/database/all-india-demand',
    icon: <Database className="w-5 h-5" />,
    accentColor: '#9333EA', // Purple
    adminOnly: true,
    variant: 'forecasting',
    subRoutes: [
      { label: 'All-India Demand', path: '/database/all-india-demand' },
      { label: 'Generation NPP', path: '/database/generation-data' },
      { label: 'State Demand', path: '/database/state-wise-demand' },
      { label: 'Weather Telemetry', path: '/database/weather/forecast' },
      { label: 'Holiday Calendar', path: '/database/holiday-calendar' },
    ],
  },
  {
    key: 'markets',
    title: 'IEX Market',
    category: 'markets',
    categoryLabel: 'Trading',
    description: 'Explore Day Ahead, Green Day Ahead, Real Time Market, and UP Market analytics with precise interval data.',
    path: '/dam',
    icon: <BarChart3 className="w-5 h-5" />,
    accentColor: '#0D9488', // Teal
    variant: 'both',
    subRoutes: [
      { label: 'DAM', path: '/dam' },
      { label: 'GDAM', path: '/gdam' },
      { label: 'RTM', path: '/rtm' },
      { label: 'REC', path: '/rec' },
      { label: 'UP Market', path: '/up-market/dam' },
      { label: 'UP DAM', path: '/up-market/dam' },
      { label: 'UP RTM', path: '/up-market/rtm' },
      { label: 'UP GDAM', path: '/up-market/gdam' },
    ],
  },
  {
    key: 'resource-center',
    title: 'Resource Center',
    category: 'economics',
    categoryLabel: 'Economics',
    description: 'Manage master configurations, tariffs, margins, and charge structures.',
    path: '/resource-center/region-state',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    accentColor: '#0284C7', // Blue
    variant: 'forecasting',
    subRoutes: [
      { label: 'State Tariffs', path: '/resource-center/state-tariff' },
      { label: 'ISTS Losses', path: '/resource-center/ists-charges' },
      { label: 'CTU Charges', path: '/resource-center/ctu-charges' },
      { label: 'Discoms', path: '/resource-center/discom-list' },
      { label: 'State Charges', path: '/resource-center/state-charges' },
      { label: 'IEX Fees', path: '/resource-center/iex-fees' },
      { label: 'FPPA Charges', path: '/resource-center/fppa-charges' },
    ],
  },
  {
    key: 'market-operations',
    title: 'Market Operations',
    category: 'markets',
    categoryLabel: 'Trading',
    description: 'Compare and upload MCP data across DAM, RTM, and GDAM.',
    path: '/market-operations/trend',
    icon: <SlidersHorizontal className="w-5 h-5" />,
    accentColor: '#EA580C', // Orange
    variant: 'forecasting',
    subRoutes: [
      { label: 'Market Trend', path: '/market-operations/trend' },
      { label: 'MCP Analyst', path: '/market-operations/mcp-analyst' },
      { label: 'Bidding Strategy', path: '/market-operations/bidding-strategy' },
    ],
  },
  {
    key: 'forecast',
    title: 'Forecast Analytics',
    category: 'analytics',
    categoryLabel: 'Intelligence',
    description: 'Forecast clearing prices for DAM, RTM, GDAM, and load curves for consumers and national grids.',
    path: '/forecast/price/dam',
    icon: <Cpu className="w-5 h-5" />,
    accentColor: '#8B5CF6', // Purple
    variant: 'forecasting',
    subRoutes: [
      { label: 'DAM Forecast', path: '/forecast/price/dam' },
      { label: 'RTM Day Ahead', path: '/forecast/price/rtm/dayahead' },
      { label: 'RTM Nowcast', path: '/forecast/price/rtm/nowcast' },
      { label: 'GDAM Forecast', path: '/forecast/price/gdam' },
      { label: 'Consumer Demand', path: '/forecast/demand/consumer' },
      { label: 'Grid Demand', path: '/forecast/demand/all-india' },
      { label: 'Generation NPP', path: '/forecast/generation/npp' },
    ],
  },
  {
    key: 'api-logs',
    title: 'API Logs',
    category: 'governance',
    categoryLabel: 'Governance',
    description: 'Monitor background operations and check API health logs (NPP, Weather, etc).',
    path: '/admin/api-logs',
    icon: <Server className="w-5 h-5" />,
    accentColor: '#10B981', // Emerald
    adminOnly: true,
    variant: 'both',
    subRoutes: [
      { label: 'Pipeline Sync', path: '/admin/api-logs' },
    ],
  },
  {
    key: 'user-management',
    title: 'User Management',
    category: 'governance',
    categoryLabel: 'Governance',
    description: 'Manage users, assign roles, and control access permissions.',
    path: '/admin/users',
    icon: <Users className="w-5 h-5" />,
    accentColor: '#3B82F6', // Blue
    adminOnly: true,
    superAdminOnly: true,
    variant: 'both',
    subRoutes: [
      { label: 'Directory', path: '/admin/users' },
    ],
  },
  {
    key: 'trader-performance',
    title: 'Trader Performance',
    category: 'analytics',
    categoryLabel: 'Trading',
    description: 'Track and analyze trader performance and metrics.',
    path: '/trader-performance',
    icon: <Activity className="w-5 h-5" />,
    accentColor: '#F59E0B', // Amber Gold
    variant: 'forecasting',
    subRoutes: [
      { label: 'Desk Overview', path: '/trader-performance' },
    ],
  },
  {
    key: 'trader-performance-daily',
    title: 'Trader Performance Daily',
    category: 'analytics',
    categoryLabel: 'Trading',
    description: 'Track and analyze day-by-day trader performance and daily metrics.',
    path: '/trader-performance',
    icon: <BarChart3 className="w-5 h-5" />,
    accentColor: '#EA580C', // Orange
    variant: 'forecasting',
    subRoutes: [
      { label: 'Daily Metrics', path: '/trader-performance' },
    ],
  },
];

// Runtime dynamic module registry store
let dynamicRegisteredModules: ModuleItem[] = [];
const moduleListeners: Array<() => void> = [];

/**
 * Register a new module dynamically at runtime.
 * Automatically notifies all subscribers and updates Dashboard, Navbar, etc.
 */
export function registerModule(newModule: ModuleItem) {
  const existingIdx = dynamicRegisteredModules.findIndex(m => m.key === newModule.key) !== -1
    ? dynamicRegisteredModules.findIndex(m => m.key === newModule.key)
    : SYSTEM_MODULES.findIndex(m => m.key === newModule.key);

  if (existingIdx !== -1) {
    if (dynamicRegisteredModules.some(m => m.key === newModule.key)) {
      dynamicRegisteredModules = dynamicRegisteredModules.map(m => m.key === newModule.key ? newModule : m);
    } else {
      dynamicRegisteredModules.push(newModule);
    }
  } else {
    dynamicRegisteredModules.push(newModule);
  }
  moduleListeners.forEach(listener => listener());
}

/**
 * Checks if a module is allowed in the currently running application variant.
 * VITE_APP_VARIANT can be 'sales' or 'forecasting'.
 * Defaults to 'sales' if not explicitly defined.
 */
export function isModuleAllowedInVariant(modVariant?: ModuleVariant): boolean {
  const currentVariant = (import.meta.env.VITE_APP_VARIANT as ModuleVariant) || 'forecasting';
  if (!modVariant || modVariant === 'both') {
    return true;
  }
  return modVariant === currentVariant;
}

/**
 * Get all active modules combining base system modules and dynamically registered modules,
 * filtered by the active build/app variant (VITE_APP_VARIANT: 'sales' | 'forecasting').
 */
export function getAllModules(): ModuleItem[] {
  const dynamicKeys = new Set(dynamicRegisteredModules.map(m => m.key));
  const baseFiltered = SYSTEM_MODULES
    .filter(m => isModuleAllowedInVariant(m.variant))
    .filter(m => !dynamicKeys.has(m.key));
  const dynamicFiltered = dynamicRegisteredModules.filter(m => isModuleAllowedInVariant(m.variant));
  return [...baseFiltered, ...dynamicFiltered];
}

/**
 * Filter modules based on user authorization and hiddenModules permissions.
 */
export function getVisibleModules(user: any): ModuleItem[] {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'super_admin';
  const isAdmin = isSuperAdmin || user?.role === 'ADMIN' || user?.role === 'admin';
  const all = getAllModules();

  return all.filter((mod) => {
    // SuperAdmin only restriction
    if (mod.superAdminOnly && !isSuperAdmin) {
      return false;
    }
    // Admin only restriction
    if (mod.adminOnly && !isAdmin) {
      return false;
    }
    // Hidden modules permission (Regular users obey hiddenModules array)
    if (!isAdmin && user?.hiddenModules?.includes(mod.key)) {
      return false;
    }
    return true;
  });
}

/**
 * Find module and matched subroute by current browser URL pathname.
 * Used for dynamic Breadcrumbs and Navigation active state.
 */
export function findModuleByPath(pathname: string): {
  module: ModuleItem | null;
  subRoute: SubRoute | null;
} {
  const all = getAllModules();

  const isPathMatch = (current: string, target: string) => {
    if (current === target) return true;
    if (target === '/') return false;
    const prefix = target.endsWith('/') ? target : target + '/';
    return current.startsWith(prefix);
  };

  // 1. Direct exact match on subroutes across all modules
  for (const mod of all) {
    for (const sub of mod.subRoutes) {
      if (pathname === sub.path) {
        return { module: mod, subRoute: sub };
      }
    }
  }

  // 2. Direct exact match on module paths
  for (const mod of all) {
    if (pathname === mod.path) {
      const defaultSub = mod.subRoutes.find(s => s.path === mod.path) || null;
      return { module: mod, subRoute: defaultSub };
    }
  }

  // 3. Child/prefix subroute matches (longest path first for maximum specificity)
  const allSubRoutesWithMod: { mod: ModuleItem; sub: SubRoute }[] = [];
  for (const mod of all) {
    for (const sub of mod.subRoutes) {
      allSubRoutesWithMod.push({ mod, sub });
    }
  }
  allSubRoutesWithMod.sort((a, b) => b.sub.path.length - a.sub.path.length);

  for (const item of allSubRoutesWithMod) {
    if (isPathMatch(pathname, item.sub.path)) {
      return { module: item.mod, subRoute: item.sub };
    }
  }

  // 4. Child/prefix module path matches (longest path first)
  const sortedModules = [...all].sort((a, b) => b.path.length - a.path.length);
  for (const mod of sortedModules) {
    if (isPathMatch(pathname, mod.path)) {
      return { module: mod, subRoute: null };
    }
  }

  // 5. Fallbacks for related paths
  if (pathname.startsWith('/dam') || pathname.startsWith('/gdam') || pathname.startsWith('/rtm') || pathname.startsWith('/rec') || pathname.startsWith('/up-market')) {
    const marketsMod = all.find(m => m.key === 'markets') || null;
    const sub = marketsMod?.subRoutes.find(s => isPathMatch(pathname, s.path)) || null;
    return { module: marketsMod, subRoute: sub };
  }
  if (isPathMatch(pathname, '/trader-performance')) {
    return { module: all.find(m => m.key === 'trader-performance') || null, subRoute: null };
  }

  return { module: null, subRoute: null };
}

/**
 * Generates user management config format dynamically from the single source of truth.
 */
export function getAvailableModulesForAdmin(): UserManagementModuleConfig[] {
  return getAllModules().map((mod) => {
    let cat: UserManagementModuleConfig['category'] = 'Data & Governance';
    if (mod.category === 'markets') cat = 'Power Markets';
    else if (mod.category === 'analytics') cat = mod.key === 'forecast' ? 'AI & Forecast' : 'Arbitrage & Analytics';
    else if (mod.category === 'economics') cat = 'Arbitrage & Analytics';
    else if (mod.category === 'governance') cat = 'Data & Governance';

    return {
      id: mod.key,
      label: mod.title,
      category: cat,
      description: mod.description,
    };
  });
}

/**
 * React Hook that subscribes to the dynamic module registry and automatically syncs modules.
 */
export function useModules(user: any) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion(v => v + 1);
    moduleListeners.push(listener);
    return () => {
      const idx = moduleListeners.indexOf(listener);
      if (idx !== -1) moduleListeners.splice(idx, 1);
    };
  }, []);

  const allModules = getAllModules();
  const visibleModules = getVisibleModules(user);

  return {
    allModules,
    visibleModules,
    registerModule,
    findByPath: findModuleByPath,
  };
}
