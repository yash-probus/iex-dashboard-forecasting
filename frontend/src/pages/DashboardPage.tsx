import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Command,
  Activity,
  BarChart3,
  Database,
  Cpu,
  Calculator,
  SlidersHorizontal,
  ArrowRight,
  Server,
  Users,
  TrendingUp,
  X,
  FileSpreadsheet,
  Gauge,
  Pin,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

import {
  ModuleItem,
  SubRoute,
  ModuleCategory,
  getAllModules,
  getVisibleModules,
  registerModule,
  useModules
} from '../config/modules.config';


type CategoryFilter = 'all' | 'pinned' | 'markets' | 'analytics' | 'economics' | 'governance';

interface FrostedGlassCardProps {
  mod: ModuleItem;
  navigate: (path: string) => void;
  isPinned: boolean;
  onTogglePin: (e: React.MouseEvent) => void;
  onQuickPeek: (mod: ModuleItem) => void;
  onHoverStateChange?: (mod: ModuleItem | null) => void;
}

function FrostedGlassCard({
  mod,
  navigate,
  isPinned,
  onTogglePin,
  onQuickPeek,
  onHoverStateChange,
}: FrostedGlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Apple Vision Pro & Linear style 3D Gyro Tilt (max 7.5 deg for weighted physical glass feel)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const normX = (x - centerX) / centerX;
    const normY = (y - centerY) / centerY;

    setTilt({
      x: -normY * 7.5, // Tilts towards cursor on vertical axis
      y: normX * 7.5,  // Tilts towards cursor on horizontal axis
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div style={{ perspective: '1200px' }} className="w-full h-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => {
          setIsHovered(true);
          onHoverStateChange?.(mod);
        }}
        onMouseLeave={() => {
          handleMouseLeave();
          onHoverStateChange?.(null);
        }}
        onClick={() => navigate(mod.path)}
        className="group relative h-full rounded-xl active:scale-[0.98] cursor-pointer select-none"
        style={{
          transformStyle: 'preserve-3d',
          transform: isHovered
            ? `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) translateY(-4px)`
            : 'rotateX(0deg) rotateY(0deg) translateY(0px)',
          transition: isHovered
            ? 'transform 100ms ease-out, box-shadow 150ms ease'
            : 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease',
        }}
      >
        {/* 1. Dynamic Cursor-Following Radiant Border Highlight (Thin & Subtle) */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-200"
          style={{
            opacity: isHovered ? 0.45 : 0,
            background: `radial-gradient(260px circle at ${mousePos.x}px ${mousePos.y}px, ${mod.accentColor}, transparent 70%)`,
          }}
        />

        {/* 2. Card Container with Precision Ultra-Thin 1px Hairline Border */}
        <div
          className={`relative h-full w-full rounded-xl p-3 sm:p-3.5 xl:p-4 flex flex-col justify-between overflow-hidden min-h-[135px]
            bg-white dark:bg-[#0B0F19]
            border ${isPinned ? 'border-amber-500/80 dark:border-amber-400/70' : 'border-slate-200 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/[0.18]'}
            shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]
            hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.1),0_2px_6px_-1px_rgba(15,23,42,0.05)]
            dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]
            dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.85),0_0_20px_-6px_rgba(37,99,235,0.25)]
            transition-all duration-200
          `}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Ultra-Thin 1px Hairline Accent for Each Terminal */}
          <div
            className="absolute top-0 inset-x-0 h-[1px] pointer-events-none transition-all duration-200"
            style={{
              backgroundColor: isPinned ? '#F59E0B' : mod.accentColor,
              opacity: isPinned ? 0.9 : 0.7,
            }}
          />

          {/* 3. Cursor-following Internal Ambient Wash (Subtle) */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, ${mod.accentColor}10, transparent 75%)`,
            }}
          />

          {/* Top Content Area */}
          <div
            className="relative z-10"
            style={{
              transform: isHovered ? 'translateZ(14px)' : 'translateZ(0px)',
              transformStyle: 'preserve-3d',
              transition: 'transform 200ms ease-out',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5 xl:mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Luminous Icon Pod with translateZ(20px) Parallax Lift */}
                <div
                  className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-md shadow-2xs"
                  style={{
                    backgroundColor: `${mod.accentColor}18`,
                    color: mod.accentColor,
                    border: `1px solid ${mod.accentColor}30`,
                    transform: isHovered ? 'translateZ(20px) scale(1.06)' : 'translateZ(0px) scale(1)',
                    transition: 'transform 200ms ease-out',
                  }}
                >
                  {React.isValidElement(mod.icon)
                    ? React.cloneElement(mod.icon as React.ReactElement<any>, { className: 'w-3.5 h-3.5 xl:w-4 xl:h-4' })
                    : mod.icon}
                </div>

                <div
                  className="min-w-0"
                  style={{
                    transform: isHovered ? 'translateZ(10px)' : 'translateZ(0px)',
                    transition: 'transform 200ms ease-out',
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="text-xs xl:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate leading-tight">
                      {mod.title}
                    </h3>
                    {mod.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                        {mod.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-semibold leading-tight mt-0.5">
                    {mod.categoryLabel}
                  </span>
                </div>
              </div>

              {/* Action Area: Quick Peek + Pin Button + Direct Launch Indicator */}
              <div
                className="flex items-center gap-1 shrink-0"
                style={{
                  transform: isHovered ? 'translateZ(16px)' : 'translateZ(0px)',
                  transition: 'transform 200ms ease-out',
                }}
              >
                <button
                  type="button"
                  onClick={onTogglePin}
                  title={isPinned ? 'Unpin from My Desk' : 'Pin to My Desk'}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 active:scale-75 cursor-pointer ${
                    isPinned
                      ? 'text-amber-500 bg-amber-500/15 dark:bg-amber-500/20 hover:bg-amber-500/30'
                      : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 transition-transform ${isPinned ? 'fill-amber-500 rotate-45' : ''}`} />
                </button>

                <div className="w-5 h-5 flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Clean Description */}
            <p
              className="text-[11px] xl:text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mt-1 mb-2 font-normal"
              style={{
                transform: isHovered ? 'translateZ(8px)' : 'translateZ(0px)',
                transition: 'transform 200ms ease-out',
              }}
            >
              {mod.description}
            </p>
          </div>

          {/* Minimal Quick Shortcut Tags */}
          {mod.subRoutes && mod.subRoutes.length > 0 && (
            <div
              className="relative z-10 pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-1.5 mt-auto"
              style={{
                transform: isHovered ? 'translateZ(12px)' : 'translateZ(0px)',
                transformStyle: 'preserve-3d',
                transition: 'transform 200ms ease-out',
              }}
            >
              {mod.subRoutes.slice(0, 5).map((sub) => (
                <span
                  key={sub.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(sub.path);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] xl:text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-blue-50 dark:bg-white/[0.05] dark:hover:bg-blue-950/70 border border-slate-300/80 hover:border-blue-400 dark:border-white/10 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 transition-all duration-150 ease-out cursor-pointer shadow-2xs"
                >
                  {sub.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PinnedTerminalCardProps {
  mod: ModuleItem;
  navigate: (path: string) => void;
  onUnpin: (e: React.MouseEvent) => void;
  onQuickPeek: (mod: ModuleItem) => void;
}

function PinnedTerminalCard({ mod, navigate, onUnpin, onQuickPeek }: PinnedTerminalCardProps) {
  return (
    <div
      onClick={() => navigate(mod.path)}
      className="group relative rounded-xl p-3.5 flex items-center justify-between cursor-pointer select-none active:scale-[0.98] transition-all duration-150 ease-out
        bg-white dark:bg-[#0E1422]
        border border-amber-500/50 dark:border-amber-400/40
        hover:border-amber-500 dark:hover:border-amber-400
        shadow-[0_1px_4px_rgba(245,158,11,0.08),0_1px_2px_rgba(0,0,0,0.04)]
        dark:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)]
        hover:shadow-md hover:shadow-amber-500/15"
    >
      {/* Ambient Left Edge Accent Bar (Thin) */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
        style={{ backgroundColor: mod.accentColor }}
      />

      <div className="flex items-center gap-3 pl-1.5 min-w-0">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-md shadow-2xs group-hover:scale-105 transition-transform"
          style={{
            backgroundColor: `${mod.accentColor}18`,
            color: mod.accentColor,
            border: `1px solid ${mod.accentColor}30`,
          }}
        >
          {mod.icon}
        </div>

        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {mod.title}
            </h4>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase font-semibold shrink-0">
              {mod.categoryLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {mod.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onUnpin}
          title="Unpin from My Desk"
          className="w-7 h-7 rounded-full flex items-center justify-center text-amber-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-80 cursor-pointer"
        >
          <Pin className="w-3.5 h-3.5 fill-amber-500 rotate-45" />
        </button>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 👁️ QUICK-PEEK SLIDE-OVER DRAWER (Instant Real-time Telemetry & Simulation)
// ============================================================================
interface QuickPeekDrawerProps {
  mod: ModuleItem | null;
  onClose: () => void;
  navigate: (path: string) => void;
  isPinned: boolean;
  onTogglePin: (e: React.MouseEvent) => void;
}

function QuickPeekDrawer({ mod, onClose, navigate, isPinned, onTogglePin }: QuickPeekDrawerProps) {
  if (!mod) return null;

  const isMarket = mod.category === 'markets';
  const isCalculator = mod.key.includes('savings');
  const isAnalytics = mod.category === 'analytics';
  const isGovernance = mod.category === 'governance';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-md animate-fade-in-up select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-white dark:bg-[#0B0F19] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '-10px 0 50px -10px rgba(0,0,0,0.5)',
        }}
      >
        {/* Top Glowing Perimeter Accent Bar */}
        <div
          className="w-full h-1"
          style={{
            background: `linear-gradient(90deg, ${mod.accentColor}, #EF4444, ${mod.accentColor})`,
          }}
        />

        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{
                backgroundColor: `${mod.accentColor}18`,
                color: mod.accentColor,
                border: `1px solid ${mod.accentColor}30`,
              }}
            >
              {mod.icon}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider border border-blue-200/50 dark:border-blue-800/50">
                  {mod.categoryLabel}
                </span>
                <span className="text-xs text-slate-400 font-mono">Terminal Telemetry</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">
                {mod.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? 'Unpin from My Desk' : 'Pin to My Desk'}
              className={`p-2 rounded-lg transition-all active:scale-90 cursor-pointer ${
                isPinned
                  ? 'text-amber-500 bg-amber-500/15 dark:bg-amber-500/20'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500 rotate-45' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>ESC</span>
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-grow overflow-y-auto">
          {/* 1. Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Operational Scope
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/[0.02] p-3.5 rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
              {mod.description}
            </p>
          </div>

          {/* 2. Live Dynamic Visual Telemetry */}
          {isMarket && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Live Clearing Telemetry
                </h4>
                <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Synced via Port 5002
                </span>
              </div>

              {/* Sparkline Curve Simulation */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono font-bold text-blue-500">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      DAM: ₹7.77
                    </span>
                    <span className="flex items-center gap-1 font-mono font-bold text-rose-500">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      RTM: ₹6.34
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Intraday 24h</span>
                </div>

                {/* SVG Curve */}
                <div className="w-full h-24 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 80" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="damGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="rtmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <line x1="0" y1="40" x2="300" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

                    <path
                      d="M0,50 Q40,30 80,45 T160,25 T240,35 T300,20 L300,80 L0,80 Z"
                      fill="url(#damGrad)"
                    />
                    <path
                      d="M0,50 Q40,30 80,45 T160,25 T240,35 T300,20"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    <path
                      d="M0,65 Q50,45 100,60 T200,40 T260,50 T300,35 L300,80 L0,80 Z"
                      fill="url(#rtmGrad)"
                    />
                    <path
                      d="M0,65 Q50,45 100,60 T200,40 T260,50 T300,35"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Min MCP</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">₹3.40</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Max MCP</span>
                    <span className="font-bold text-rose-500">₹10.00</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Spread</span>
                    <span className="font-bold text-blue-500">+₹1.43</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCalculator && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                Simulated Open Access Arbitrage
              </h4>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400">State Discom Tariff</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹8.65 / kWh</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400">IEX Open Access Landed</span>
                  <span className="font-bold text-blue-500">₹5.24 / kWh</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Net Estimated Savings</span>
                  <span className="text-sm">₹3.41 / kWh (39.4%)</span>
                </div>
              </div>
            </div>
          )}

          {isAnalytics && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                Grid Intelligence Snapshot
              </h4>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase block">All-India Demand</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">242.8 GW</span>
                  <span className="text-[10px] text-emerald-500">Normal Band</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase block">NPP Generation</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">1,482 MW</span>
                  <span className="text-[10px] text-blue-500">Telemetry Active</span>
                </div>
              </div>
            </div>
          )}

          {isGovernance && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                Service Telemetry Status
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Microservice Latency</span>
                  <span className="font-bold text-emerald-500">18ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ingest Pipeline</span>
                  <span className="font-bold text-blue-500">100% Healthy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Swagger API Port</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">5002</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Quick Sub-Routes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
              Available Workspaces & Reports
            </h4>
            <div className="space-y-1.5">
              {mod.subRoutes.map((sub) => (
                <div
                  key={sub.label}
                  onClick={() => {
                    navigate(sub.path);
                    onClose();
                  }}
                  className="p-3 rounded-xl flex items-center justify-between bg-slate-50 dark:bg-white/[0.02] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200/50 dark:border-white/5 hover:border-blue-400/40 text-xs font-medium cursor-pointer transition-all group"
                >
                  <span className="text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {sub.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#070A12]/80 space-y-3">
          <button
            type="button"
            onClick={() => {
              navigate(mod.path);
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Launch Full Terminal</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-center text-slate-400 font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">ESC</kbd> to dismiss preview
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { allModules, visibleModules, registerModule } = useModules(user);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandSelectedIndex, setCommandSelectedIndex] = useState(0);

  // Auto-discover any new modules exposed by the backend
  useEffect(() => {
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5001/api`;
    fetch(`${baseUrl}/modules`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.modules)) {
          data.modules.forEach((backendMod: any) => {
            const exists = allModules.some((m) => m.key === backendMod.key);
            if (!exists) {
              registerModule({
                key: backendMod.key,
                title: backendMod.title || backendMod.key,
                category: backendMod.category || 'analytics',
                categoryLabel: backendMod.categoryLabel || 'Intelligence',
                description: backendMod.description || 'Enterprise system terminal',
                path: backendMod.path || `/${backendMod.key}`,
                icon: <Activity className="w-5 h-5" />,
                accentColor: backendMod.accentColor || '#3B8FF3',
                subRoutes: backendMod.subRoutes || [],
                badge: 'AUTO',
                isNew: true,
              });
            }
          });
        }
      })
      .catch(() => {});
  }, [allModules, registerModule]);

  // Persistent Pinned Keys (Variant-aware isolation)
  const currentVariant = import.meta.env.VITE_APP_VARIANT || 'forecasting';
  const STORAGE_KEY = `prolt_pinned_terminals_${currentVariant}`;
  const defaultPins = currentVariant === 'forecasting'
    ? ['markets', 'forecast', 'database']
    : ['markets', 'savings-calculator-new', 'savings-calculator'];

  const [pinnedKeys, setPinnedKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultPins;
  });

  const togglePin = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  // Pinned modules filtered from active visible modules
  const pinnedModules = useMemo(() => {
    return visibleModules.filter((mod) => pinnedKeys.includes(mod.key));
  }, [visibleModules, pinnedKeys]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Filter modules based on user permissions, category, and search query
  const filteredModules = useMemo(() => {
    return visibleModules.filter((mod) => {
      // Check category tab
      if (selectedCategory === 'pinned') {
        if (!pinnedKeys.includes(mod.key)) return false;
      } else if (selectedCategory !== 'all') {
        // Allow trader-performance to be accessible under both Power Markets and Analytics tabs
        const isCategoryMatch =
          mod.category === selectedCategory ||
          ((mod.key === 'trader-performance' || mod.key === 'trader-performance-daily') && (selectedCategory === 'markets' || selectedCategory === 'analytics'));
        if (!isCategoryMatch) {
          return false;
        }
      }
      // Check search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = mod.title.toLowerCase().includes(query);
        const matchesDesc = mod.description.toLowerCase().includes(query);
        const matchesCategory = mod.categoryLabel.toLowerCase().includes(query);
        const matchesSubRoutes = mod.subRoutes.some((sr) => sr.label.toLowerCase().includes(query));
        return matchesTitle || matchesDesc || matchesCategory || matchesSubRoutes;
      }
      return true;
    });
  }, [visibleModules, selectedCategory, searchQuery, pinnedKeys]);

  const [hoveredMod, setHoveredMod] = useState<ModuleItem | null>(null);
  const [peekMod, setPeekMod] = useState<ModuleItem | null>(null);

  // Global Keyboard Listener for Spacebar (Quick Peek) and ESC (Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      if (e.code === 'Space' && !isCommandOpen && !isInputFocused) {
        e.preventDefault(); // Prevent page scrolling
        if (peekMod) {
          setPeekMod(null);
        } else if (hoveredMod) {
          setPeekMod(hoveredMod);
        }
      } else if (e.key === 'Escape' && peekMod) {
        setPeekMod(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredMod, peekMod, isCommandOpen]);

  // Global Keyboard Listener for [Ctrl + K] / [Cmd + K] Command Spotlight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isCommandOpen) {
        setIsCommandOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen]);

  // Auto-focus command palette input when opened
  useEffect(() => {
    if (isCommandOpen) {
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 50);
    }
  }, [isCommandOpen]);



  // Clean category tabs with My Desk pinned workspace (dynamically matches active modules)
  const categoryTabs: { id: CategoryFilter; label: string; count?: number }[] = useMemo(() => {
    const tabs: { id: CategoryFilter; label: string; count?: number }[] = [
      { id: 'all', label: 'All Modules' },
      { id: 'pinned', label: '⭐ My Desk', count: pinnedModules.length },
    ];

    const hasMarkets = visibleModules.some((m) => m.category === 'markets');
    const hasAnalytics = visibleModules.some((m) => m.category === 'analytics');
    const hasEconomics = visibleModules.some((m) => m.category === 'economics');
    const hasGovernance = visibleModules.some((m) => m.category === 'governance');

    if (hasMarkets) tabs.push({ id: 'markets', label: 'Power Markets' });
    if (hasAnalytics) tabs.push({ id: 'analytics', label: 'Analytics & Data' });
    if (hasEconomics) tabs.push({ id: 'economics', label: 'Tariffs & Economics' });
    if (hasGovernance) tabs.push({ id: 'governance', label: 'Governance' });

    return tabs;
  }, [visibleModules, pinnedModules.length]);

  return (
    <div className="w-full flex-1 flex flex-col font-sans select-none pb-6 transition-colors min-h-0">
      
      {/* ========================================================================= */}
      {/* 1. COMPACT EXECUTIVE HEADER                                               */}
      {/* ========================================================================= */}
      <div className="w-full mb-2 flex-shrink-0">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
          
          {/* Left Title */}
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Select Modules
            </h1>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. COMPACT CATEGORY TABS & SEARCH                                         */}
        {/* ========================================================================= */}
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 shadow-xs">
            {categoryTabs.map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id as CategoryFilter)}
                  className={`group relative px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ease-out cursor-pointer active:scale-95 select-none ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-600/30'
                      : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-2xs'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clean Integrated Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terminals... (Ctrl + K)"
              className="w-full pl-7 pr-8 py-1.5 text-[11px] rounded-lg bg-white dark:bg-[#0E1422] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BALANCED, CLEAN CARD GRID (4 Columns x 3 Rows = Fills Available Screen)*/}
      {/* ========================================================================= */}
      {filteredModules.length === 0 ? (
        <div className="w-full py-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-[#0B0F19]/50 text-center">
          <Search className="w-6 h-6 text-slate-400 mb-2" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            {selectedCategory === 'pinned' ? 'No Pinned Terminals' : 'No modules found'}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm">
            {selectedCategory === 'pinned'
              ? 'Click the pin icon on any operational terminal to add it to your desk.'
              : `No active terminals match "${searchQuery}".`}
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-2.5 px-3 py-1 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            {selectedCategory === 'pinned' ? 'View All Terminals' : 'Clear Filters'}
          </button>
        </div>
      ) : (
        <div 
          className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 xl:gap-3"
        >
          {filteredModules.map((mod) => (
            <FrostedGlassCard
              key={mod.key}
              mod={mod}
              navigate={navigate}
              isPinned={pinnedKeys.includes(mod.key)}
              onTogglePin={(e) => togglePin(mod.key, e)}
              onQuickPeek={(m) => setPeekMod(m)}
              onHoverStateChange={setHoveredMod}
            />
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. COMMAND SPOTLIGHT MODAL ([Ctrl + K] RAPID LAUNCHER)                    */}
      {/* ========================================================================= */}
      {isCommandOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in-up"
          onClick={() => setIsCommandOpen(false)}
        >
          <div 
            className="w-full max-w-xl bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="relative border-b border-slate-200 dark:border-white/10 p-4 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/60">
              <Command className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <input
                ref={commandInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a module name or keyword..."
                className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => setIsCommandOpen(false)}
                className="text-xs font-mono text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded border border-slate-200 dark:border-white/10 cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Quick List Results */}
            <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              {filteredModules.map((item, index) => (
                <div
                  key={item.key}
                  onClick={() => {
                    navigate(item.path);
                    setIsCommandOpen(false);
                  }}
                  className={`p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    index === commandSelectedIndex 
                      ? 'bg-blue-50/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' 
                      : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${item.accentColor}18`, color: item.accentColor }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.categoryLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</p>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-2">
                <span>Select engine with Click or Enter</span>
              </div>
              <span>Prolt Energy Portal</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. 👁️ QUICK-PEEK SLIDE-OVER DRAWER MODAL                                   */}
      {/* ========================================================================= */}
      <QuickPeekDrawer
        mod={peekMod}
        onClose={() => setPeekMod(null)}
        navigate={navigate}
        isPinned={peekMod ? pinnedKeys.includes(peekMod.key) : false}
        onTogglePin={(e) => {
          if (peekMod) togglePin(peekMod.key, e);
        }}
      />
    </div>
  );
}
