import React from 'react';
import { Box, Typography, Paper, Chip, LinearProgress, alpha } from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Sparkles,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useTheme } from '../ThemeProvider';

interface ForecastSummaryCardsProps {
  metrics: {
    averageMcpForecasted?: number;
    averageMcpActual?: number | string;
    averageMcp?: number;
    minMcpForecasted?: number;
    minMcpActual?: number | string;
    minMcp?: number;
    maxMcpForecasted?: number;
    maxMcpActual?: number | string;
    maxMcp?: number;
    mae?: number | string;
    wmape?: string;
    mape?: string;
    confidence?: string | number;
    averageDemand?: number;
    minDemand?: number;
    maxDemand?: number;
    averageGenerationForecasted?: number;
    averageGenerationActual?: number | string;
    averageGeneration?: number;
    minGenerationForecasted?: number;
    minGenerationActual?: number | string;
    minGeneration?: number;
  };
  accentColor?: string;
  isPrice?: boolean;
  isDemand?: boolean;
  isGeneration?: boolean;
  subType?: string;
}

export default function ForecastSummaryCards({
  metrics,
  accentColor = '#8B5CF6',
  isPrice = true,
  isDemand = false,
  isGeneration = false,
  subType = 'dam'
}: ForecastSummaryCardsProps) {
  const { isDark } = useTheme();

  // Unit string
  const unitStr = isGeneration ? 'MW' : isDemand ? (subType === 'consumer' ? 'kVA' : 'MW') : '₹/kWh';

  // Format price helper
  const fmtP = (v: any) => {
    if (v === 'N/A' || v === undefined || v === null) return 'N/A';
    const num = Number(v);
    if (isNaN(num)) return v;
    return isPrice ? `₹${num.toFixed(2)}` : `${num.toLocaleString('en-IN')} ${unitStr}`;
  };

  // Card wrapper style
  const cardStyle = {
    p: 2.25,
    borderRadius: 3,
    border: '1px solid',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
    bgcolor: isDark ? 'rgba(14, 20, 34, 0.8)' : '#FFFFFF',
    backdropFilter: 'blur(16px)',
    boxShadow: isDark
      ? '0 10px 25px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      : '0 8px 20px -6px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 145,
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: isDark
        ? '0 16px 30px -10px rgba(0, 0, 0, 0.7), 0 0 20px rgba(139, 92, 246, 0.15)'
        : '0 14px 28px -8px rgba(139, 92, 246, 0.15)'
    }
  };

  // Price forecast summary metrics
  const avgF = metrics.averageMcpForecasted ?? metrics.averageMcp ?? 0;
  const avgA = metrics.averageMcpActual;
  const minF = metrics.minMcpForecasted ?? metrics.minMcp ?? 0;
  const minA = metrics.minMcpActual;
  const maeVal = metrics.mae;
  const wmapeVal = metrics.wmape;
  const confVal = metrics.confidence;

  // Calculate delta percentage for average MCP
  let avgDeltaPct = null;
  if (typeof avgA === 'number' && avgF > 0) {
    avgDeltaPct = (((avgA - avgF) / avgF) * 100).toFixed(1);
  }

  // Parse confidence for bar
  const confNumber = confVal !== 'N/A' && confVal !== undefined ? parseFloat(String(confVal)) : null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(5, 1fr)'
        },
        gap: 2,
        width: '100%',
        mb: 1.5,
        flexShrink: 0
      }}
    >
      {/* 1. Average MCP Card */}
      <Paper elevation={0} sx={cardStyle}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' }}>
            {isDemand ? 'Average Demand' : isGeneration ? 'Average Generation' : 'Average MCP'}
          </Typography>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(accentColor, isDark ? 0.2 : 0.1),
              color: accentColor
            }}
          >
            <TrendingUp size={16} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* Forecasted */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', display: 'block', mb: 0.25 }}>
              Forecasted
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', fontFamily: 'var(--font-mono, monospace)', fontSize: '22px', lineHeight: 1.1 }}>
              {isDemand ? `${(metrics.averageDemand || 0).toLocaleString('en-IN')} ${unitStr}` : isGeneration ? `${(metrics.averageGenerationForecasted || metrics.averageGeneration || 0).toLocaleString('en-IN')} MW` : fmtP(avgF)}
            </Typography>
          </Box>

          {/* Actual Realized */}
          <Box sx={{ flex: 1, borderLeft: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)', pl: 2 }}>
            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', display: 'block', mb: 0.25 }}>
              Actual Realized
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono, monospace)', fontSize: '22px', lineHeight: 1.1 }}>
              {isDemand ? '—' : isGeneration ? (avgA === 'N/A' || avgA === undefined ? 'N/A' : `${Number(avgA).toLocaleString('en-IN')} MW`) : fmtP(avgA)}
            </Typography>
          </Box>
        </Box>

        {/* Micro Subtext or Delta */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1, borderTop: '1px dashed', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '10px' }}>
            Daily Mean Resolution
          </Typography>
          {avgDeltaPct !== null && (
            <Chip
              label={`${Number(avgDeltaPct) >= 0 ? '+' : ''}${avgDeltaPct}% delta`}
              size="small"
              sx={{
                height: 18,
                fontSize: '10px',
                fontWeight: 700,
                bgcolor: Math.abs(Number(avgDeltaPct)) <= 5 ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'),
                color: Math.abs(Number(avgDeltaPct)) <= 5 ? '#10B981' : '#F59E0B'
              }}
            />
          )}
        </Box>
      </Paper>

      {/* 2. Minimum MCP Card */}
      <Paper elevation={0} sx={cardStyle}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' }}>
            {isDemand ? 'Minimum Demand' : isGeneration ? 'Minimum Generation' : 'Minimum MCP'}
          </Typography>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)',
              color: '#06B6D4'
            }}
          >
            <TrendingDown size={16} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* Forecasted */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', display: 'block', mb: 0.25 }}>
              Forecasted
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', fontFamily: 'var(--font-mono, monospace)', fontSize: '22px', lineHeight: 1.1 }}>
              {isDemand ? `${(metrics.minDemand || 0).toLocaleString('en-IN')} ${unitStr}` : isGeneration ? `${(metrics.minGenerationForecasted || metrics.minGeneration || 0).toLocaleString('en-IN')} MW` : fmtP(minF)}
            </Typography>
          </Box>

          {/* Actual Realized */}
          <Box sx={{ flex: 1, borderLeft: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)', pl: 2 }}>
            <Typography variant="caption" sx={{ color: '#06B6D4', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', display: 'block', mb: 0.25 }}>
              Actual Realized
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#06B6D4', fontFamily: 'var(--font-mono, monospace)', fontSize: '22px', lineHeight: 1.1 }}>
              {isDemand ? '—' : isGeneration ? (minA === 'N/A' || minA === undefined ? 'N/A' : `${Number(minA).toLocaleString('en-IN')} MW`) : fmtP(minA)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1, borderTop: '1px dashed', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '10px' }}>
            Baseload Off-Peak Trough
          </Typography>
          <Chip
            label="Off-Peak Low"
            size="small"
            sx={{
              height: 18,
              fontSize: '10px',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)',
              color: '#06B6D4'
            }}
          />
        </Box>
      </Paper>

      {/* 3. MAE (Mean Absolute Error) Card */}
      <Paper elevation={0} sx={cardStyle}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' }}>
            Mean Absolute Error (MAE)
          </Typography>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444'
            }}
          >
            <Target size={16} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', fontFamily: 'var(--font-mono, monospace)', fontSize: '24px' }}>
            {maeVal !== undefined && maeVal !== null && maeVal !== 'N/A'
              ? (isDemand || isGeneration ? `${Number(maeVal).toFixed(2)} ${unitStr}` : `₹${Number(maeVal).toFixed(2)}`)
              : 'N/A'}
          </Typography>
          <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontWeight: 600 }}>
            {isPrice ? '/kWh' : ''}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1, borderTop: '1px dashed', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '10px' }}>
            Mean Discrepancy
          </Typography>
          <Chip
            label={Number(maeVal) < 0.5 ? 'High Accuracy' : 'Normal Variance'}
            size="small"
            sx={{
              height: 18,
              fontSize: '10px',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
              color: '#10B981'
            }}
          />
        </Box>
      </Paper>

      {/* 4. WMAPE (Weighted Mean Absolute Percentage Error) Card */}
      <Paper elevation={0} sx={cardStyle}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' }}>
            WMAPE (Weighted Error)
          </Typography>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: '#3B82F6'
            }}
          >
            <Activity size={16} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#3B82F6', fontFamily: 'var(--font-mono, monospace)', fontSize: '24px' }}>
            {wmapeVal || 'N/A'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1, borderTop: '1px dashed', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '10px' }}>
            Industry Standard Benchmark
          </Typography>
          <Chip
            label="Grade A+"
            size="small"
            sx={{
              height: 18,
              fontSize: '10px',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
              color: '#3B82F6'
            }}
          />
        </Box>
      </Paper>

      {/* 5. Confidence Score Card (Price Only) */}
      {!isDemand && (
        <Paper elevation={0} sx={cardStyle}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isDark ? '#94A3B8' : '#64748B', fontSize: '11px' }}>
              Model Confidence
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(accentColor, isDark ? 0.2 : 0.1),
                color: accentColor
              }}
            >
              <Sparkles size={16} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', fontFamily: 'var(--font-mono, monospace)', fontSize: '24px' }}>
              {confVal || 'N/A'}
            </Typography>
            {confVal !== 'N/A' && (
              <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontWeight: 600 }}>
                % Certainty
              </Typography>
            )}
          </Box>

          {/* Mini Linear Progress Bar */}
          <Box sx={{ mt: 1.25 }}>
            <LinearProgress
              variant="determinate"
              value={confNumber ? Math.min(100, Math.max(0, confNumber)) : 50}
              sx={{
                height: 5,
                borderRadius: 2,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  bgcolor: accentColor,
                  background: `linear-gradient(90deg, ${accentColor}, #10B981)`
                }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, pt: 0.5 }}>
            <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '10px' }}>
              Ensemble Model Weight
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: accentColor, fontSize: '10px' }}>
              {confNumber && confNumber >= 50 ? 'High Confidence' : 'Standard'}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
