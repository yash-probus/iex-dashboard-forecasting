import React from 'react';
import { Box, Typography } from '@mui/material';

interface DashboardHeroProps {
  clientName: string;
  industryName?: string;
  location: string;
  connectivity: string;
  overallPeriod: string;
  detailedCycle: string;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  clientName,
  industryName,
  location,
  connectivity,
  overallPeriod,
  detailedCycle
}) => {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(118deg, #061d37, #0b3a65 58%, #086254)',
        color: 'white',
        borderRadius: '24px',
        padding: '26px 28px',
        boxShadow: '0 13px 35px rgba(13, 38, 72, .075)',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.6fr) minmax(290px, .8fr)' },
        gap: '24px',
        alignItems: 'end',
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, .065)',
          right: '-170px',
          top: '-250px',
          zIndex: 0,
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          sx={{
            fontSize: '11px',
            fontWeight: 900,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            color: '#abd9ff',
          }}
        >
          Energy procurement intelligence
        </Typography>
        <Typography
          variant="h1"
          sx={{
            fontSize: 'clamp(28px, 4vw, 45px)',
            lineHeight: 1.07,
            margin: '7px 0 9px',
            fontWeight: 'bold',
          }}
        >
          {industryName || clientName}
        </Typography>
        {industryName && (
          <Typography
            sx={{
              fontSize: '18px',
              fontWeight: 500,
              color: '#d7e7f6',
              margin: '0 0 12px 0',
            }}
          >
            {clientName}
          </Typography>
        )}
        <Typography
          sx={{
            margin: 0,
            color: '#d7e7f6',
            lineHeight: 1.55,
            fontSize: '14px',
          }}
        >
          Linked overall and monthly insight reports covering Open Access utilization, market procurement,
          bill economics, TOD performance and customer savings.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: '10px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <MetaItem label="Location" value={location} />
        <MetaItem label="Connectivity" value={connectivity} />
        <MetaItem label="Overall period" value={overallPeriod} />
        <MetaItem label="Detailed cycle loaded" value={detailedCycle} />
      </Box>
    </Box>
  );
};

const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box
    sx={{
      background: 'rgba(255, 255, 255, .09)',
      border: '1px solid rgba(255, 255, 255, .14)',
      padding: '11px 12px',
      borderRadius: '13px',
    }}
  >
    <Typography
      component="b"
      sx={{
        display: 'block',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '.09em',
        color: '#a8c8df',
        marginBottom: '4px',
        fontWeight: 'bold',
      }}
    >
      {label}
    </Typography>
    <Typography
      component="span"
      sx={{
        fontWeight: 800,
        fontSize: '13px',
      }}
    >
      {value}
    </Typography>
  </Box>
);
