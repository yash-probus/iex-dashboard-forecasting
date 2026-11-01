import React from 'react';
import { Box, Typography, Paper, Divider, useTheme, Grid, Card, CardContent, Chip, CircularProgress } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import IndiaMap from '../../components/dashboard/IndiaMap';

interface StateData {
  name: string;
  demand: number;
  unit: string;
}

interface RegionData {
  name: string;
  price: number;
  states: StateData[];
}

const regionColors: Record<string, { color: string, bgColor: string }> = {
  'Northern States': { color: '#F59E0B', bgColor: '#FFFBEB' },
  'Western States': { color: '#F43F5E', bgColor: '#FFF1F2' },
  'Southern States': { color: '#8B5CF6', bgColor: '#F5F3FF' },
  'Eastern States': { color: '#EA580C', bgColor: '#FFF7ED' },
  'North-Eastern States': { color: '#0EA5E9', bgColor: '#F0F9FF' }
};

const HeaderMetric = ({ label, value, subLabel }: { label: string, value: string | React.ReactNode, subLabel?: string }) => (
  <Box sx={{ textAlign: 'center', p: 2, flex: 1 }}>
    <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, color: '#1F2937' }}>
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
      {label}
    </Typography>
    {subLabel && (
      <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mt: 0.5 }}>
        {subLabel}
      </Typography>
    )}
  </Box>
);

export default function StateWiseDemandView({ data }: { data?: { timestamp?: string, regions?: RegionData[] } }) {
  const theme = useTheme();

  if (!data || !data.regions) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.regions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
        <Typography variant="h6" color="text.secondary">No data available for the selected date and time.</Typography>
      </Box>
    );
  }

  const regions = data.regions;

  return (
    <Box>
      {/* Top Banner */}
      <Box sx={{ bgcolor: 'rgba(234, 88, 12, 0.1)', py: 2, textAlign: 'center', mb: 0, borderBottom: '1px solid rgba(234, 88, 12, 0.2)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Price from power exchange for time block {data.timestamp || 'Latest'}
        </Typography>
      </Box>

      {/* Metrics Row */}
      <Paper elevation={0} sx={{ borderBottom: '1px solid #E2E8F0', borderRadius: 0, mb: 4, bgcolor: '#FFFFFF', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.02)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <HeaderMetric 
            label="Surplus Power at Power Exchange" 
            value="16,786 MW" 
          />
          <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
          
          <HeaderMetric 
            label="Avg Market Clearing Price" 
            value={<span>6.12 <Typography component="span" variant="body1">₹/Unit</Typography></span>} 
          />
          <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
          
          <HeaderMetric 
            label="Demand Met" 
            subLabel="(CURRENT)"
            value="248 GW" 
          />
          <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
          
          <HeaderMetric 
            label="Demand Met" 
            subLabel="(YESTERDAY)"
            value="253 GW" 
          />
          <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 2 }}>
             <Typography variant="caption" sx={{ textAlign: 'center', pt: 1, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
               Shortage for Yesterday
             </Typography>
             <Box sx={{ display: 'flex', flex: 1 }}>
                <HeaderMetric label="During Peak" value="943 MW" subLabel="[0.50 %]" />
                <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
                <HeaderMetric label="Energy" value="45 MU" subLabel="[1.00 %]" />
             </Box>
          </Box>
          
          <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
          
          <HeaderMetric 
            label="% of Time Unconstrained Price" 
            value="[100.00 %]" 
          />
        </Box>
      </Paper>

      {/* Map and Details Area */}
      <Box sx={{ width: '100%', px: 4, mb: 6 }}>
        <Grid container spacing={4}>
          {/* Map Column */}
          <Grid item xs={12} lg={7} xl={8}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'text.primary' }}>
                Interactive Heatmap
              </Typography>
              <IndiaMap regionData={regions} />
            </Paper>
          </Grid>
          
          {/* Detailed Region Cards Column */}
          <Grid item xs={12} lg={5} xl={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%', maxHeight: '700px', overflowY: 'auto', pr: 1 }}>
              {regions.map((region, idx) => {
                const style = regionColors[region.name] || { color: '#6B7280', bgColor: '#F3F4F6' };
                return (
                  <Card 
                    key={idx}
                    elevation={0} 
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'divider',
                      bgcolor: style.bgColor,
                      borderRadius: 3,
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', color: style.color }}>
                          <LocationOnIcon sx={{ mr: 1, fontSize: 20 }} />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {region.name}
                          </Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#111827' }}>
                          {region.price.toFixed(2)} <Typography component="span" variant="caption" color="text.secondary">₹/Unit</Typography>
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {region.states.map((state, sIdx) => (
                          <Chip 
                            key={sIdx} 
                            label={`${state.name} (${state.demand.toLocaleString('en-IN')} ${state.unit})`} 
                            size="small" 
                            sx={{ 
                              bgcolor: 'white', 
                              color: '#4B5563',
                              border: '1px solid',
                              borderColor: 'divider',
                              fontSize: '0.7rem'
                            }} 
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ mt: 4, textAlign: 'center', pb: 4 }}>
         <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 1 }}>
           * Peak demand shortage and Total energy shortage data provided by individual states
         </Typography>
         <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 1 }}>
           * Market price data as provided by Power Exchange
         </Typography>
         <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 1 }}>
           * Transmission & Distribution charges apply
         </Typography>
         <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
           * 100MW for 24 Hrs = 2.4 MU (Million Units)
         </Typography>
      </Box>
    </Box>
  );
}
