import React from 'react';
import { Box, Typography } from '@mui/material';

interface DashboardFlowProps {
  regionalBusOA: number | string;
  efficiency: number;
  consumerOA: number | string;
}

export const DashboardFlow: React.FC<DashboardFlowProps> = ({
  regionalBusOA,
  efficiency,
  consumerOA
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr auto 1fr' },
        gap: '10px',
        alignItems: 'center',
        margin: '19px 0',
      }}
    >
      <FlowBox value={regionalBusOA} label="Regional bus OA" />
      <Arrow />
      <FlowBox
        value={`${efficiency}%`}
        label="Efficiency"
        progress={efficiency}
      />
      <Arrow />
      <FlowBox value={consumerOA} label="Consumer OA" />
    </Box>
  );
};

const FlowBox: React.FC<{ value: string | number; label: string; progress?: number }> = ({ value, label, progress }) => (
  <Box
    sx={{
      border: '1px solid #dce5ef',
      background: '#fff',
      borderRadius: '13px',
      padding: '14px',
      textAlign: 'center',
    }}
  >
    <Typography sx={{ display: 'block', fontSize: '21px', margin: '4px 0', fontWeight: 'bold' }}>
      {value}
    </Typography>
    <Typography
      sx={{
        fontSize: '10px',
        color: '#65758b',
        fontWeight: 850,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
    {progress !== undefined && (
      <Box
        sx={{
          height: '8px',
          background: '#eaf0f5',
          borderRadius: '99px',
          overflow: 'hidden',
          marginTop: '9px',
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRadius: '99px',
            background: '#159765',
            width: `${progress}%`,
            transition: 'width 1s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />
      </Box>
    )}
  </Box>
);

const Arrow = () => (
  <Box
    sx={{
      fontSize: '20px',
      color: '#8da0b7',
      fontWeight: 950,
      textAlign: 'center',
      transform: { xs: 'rotate(90deg)', md: 'none' }
    }}
  >
    ➔
  </Box>
);
