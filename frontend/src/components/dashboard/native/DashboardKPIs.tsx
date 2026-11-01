import React from 'react';
import { Box, Typography } from '@mui/material';

export interface KPI {
  label: string;
  value: string | number;
  sub: string;
  color?: 'default' | 'green' | 'amber';
}

interface DashboardKPIsProps {
  kpis: KPI[];
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ kpis }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: '13px',
      }}
    >
      {kpis.map((kpi, idx) => {
        let bg = '#fff';
        let borderColor = '#dce5ef';
        let valueColor = '#11233d';

        if (kpi.color === 'green') {
          bg = 'linear-gradient(145deg, #effbf6, #fff)';
          borderColor = '#bce6d3';
          valueColor = '#11734b';
        } else if (kpi.color === 'amber') {
          bg = 'linear-gradient(145deg, #fff8e8, #fff)';
          borderColor = '#f2d38f';
          valueColor = '#9b5b00';
        }

        return (
          <Box
            key={idx}
            sx={{
              background: bg,
              border: `1px solid ${borderColor}`,
              borderRadius: '17px',
              padding: '17px',
              boxShadow: '0 13px 35px rgba(13, 38, 72, .075)',
              minHeight: '135px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              sx={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '.065em',
                color: '#65758b',
                fontWeight: 900,
              }}
            >
              {kpi.label}
            </Typography>
            <Typography
              sx={{
                fontSize: 'clamp(24px, 2.3vw, 34px)',
                fontWeight: 950,
                letterSpacing: '-.035em',
                margin: '11px 0 5px',
                whiteSpace: 'nowrap',
                color: valueColor,
              }}
            >
              {kpi.value}
            </Typography>
            <Typography
              sx={{
                fontSize: '11px',
                color: '#65758b',
                lineHeight: 1.45,
              }}
            >
              {kpi.sub}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

