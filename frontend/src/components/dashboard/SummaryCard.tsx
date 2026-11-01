import React from 'react';
import { Paper, Box, Typography, alpha } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';

interface SummaryCardProps {
  title: string;
  value: string | number | React.ReactNode;
  change?: string;
  isPositive?: boolean;
  accentColor?: string;
  icon?: React.ReactNode;
  titleAction?: React.ReactNode;
  sx?: any;
}

export default function SummaryCard({ title, value, change, isPositive = true, accentColor = 'primary.main', icon, titleAction, sx }: SummaryCardProps) {
  // Try to use accentColor if it's a valid hex, or fallback to it directly. We assume accentColor is passed as hex.
  const isHex = accentColor.startsWith('#');
  const safeColor = isHex ? accentColor : '#3B8FF3';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: (theme: any) => `radial-gradient(circle at 100% 0%, ${alpha(safeColor, 0.15)} 0%, ${theme.palette.background.paper} 80%)`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        '&:hover': {
          borderColor: alpha(safeColor, 0.3),
          boxShadow: (theme: any) => `0 12px 24px -10px ${alpha(theme.palette.primary.main, 0.15)}`,
          transform: 'translateY(-2px)'
        },
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        {icon && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 2,
            backgroundColor: alpha(safeColor, 0.08),
            color: safeColor
          }}>
            {icon}
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </Typography>
          {titleAction && (
            <Box onClick={(e) => e.stopPropagation()} sx={{ cursor: 'pointer' }}>
              {titleAction}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 0.5, width: '100%' }}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Typography variant="h1" sx={{ color: 'text.primary', fontWeight: 800, letterSpacing: '-1px' }}>
            {value}
          </Typography>
        ) : (
          value
        )}
      </Box>

      {change && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            backgroundColor: isPositive ? 'rgba(52, 177, 170, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            px: 1,
            py: 0.25,
            borderRadius: 1
          }}>
            {isPositive ? <TrendingUpIcon sx={{ fontSize: 16, color: '#34B1AA' }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />}
            <Typography variant="caption" sx={{ color: isPositive ? '#34B1AA' : '#ef4444', fontWeight: 600 }}>
              {change}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            vs last period
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
