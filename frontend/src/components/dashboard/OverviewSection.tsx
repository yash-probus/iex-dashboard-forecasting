import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { OverviewItemConfig, OverviewItemType } from '../../constants/dashboardOverview';
import { OverviewCard } from './OverviewCard';
import { MarketOverviewSummary } from '../../types/overview';

interface OverviewSectionProps {
  title?: string;
  description?: string;
  type: OverviewItemType;
  items: OverviewItemConfig[];
  isLoading?: boolean;
  getMarketData?: (key: 'dam' | 'gdam' | 'rtm') => MarketOverviewSummary | null;
}

export const OverviewSection = React.memo(({ title, description, type, items, isLoading, getMarketData }: OverviewSectionProps) => {
  return (
    <Box sx={{ mb: 6 }}>
      {title && (
        <Box sx={{ 
          mb: 3, 
          pb: 2, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5
        }}>
          <Typography variant="h2" sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '-0.5px' }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600 }}>
              {description}
            </Typography>
          )}
        </Box>
      )}

      <Grid container spacing={3}>
        {items.map((item) => {
          const mktData = type === 'market' && getMarketData ? getMarketData(item.key as any) : undefined;
          return (
            <Grid item xs={12} md={6} lg={4} key={item.key}>
              <OverviewCard 
                type={type} 
                item={item} 
                isLoading={isLoading} 
                marketData={mktData} 
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
});

OverviewSection.displayName = 'OverviewSection';
