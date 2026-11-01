import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface DashboardHeatmapProps {
  detail: any;
}

export const DashboardHeatmap: React.FC<DashboardHeatmapProps> = ({ detail }) => {
  if (!detail || !detail.heatmapRecords || !detail.daily) return null;

  const records = detail.heatmapRecords;
  const days = detail.daily.map((d: any) => d.date);

  // Timeblocks: 1 to 96
  const blocks = Array.from({ length: 96 }, (_, i) => i + 1);

  const getCellData = (date: string, block: number) => {
    return records.find((r: any) => r.date === date && r.timeblock === block);
  };

  const xAxisLabels = [0, 16, 32, 48, 64, 80].map(tbIndex => {
    const hour = Math.floor((tbIndex * 15) / 60);
    return `${String(hour).padStart(2, '0')}:00`;
  });

  const mktColor = (m: string) => m === 'DAM' ? '#eab308' : m === 'GDAM' ? '#10b981' : m === 'RTM' ? '#f43f5e' : '#fef08a';

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', width: '100%', bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold', color: 'text.primary' }}>Blockwise market activity heatmap</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '11px', mb: 3 }}>
        {days.length} days x 96 time blocks. Hover any colored cell for market, quantity and rate.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, bgcolor: '#eab308', borderRadius: '1px' }}/><Typography sx={{ fontSize: '9px' }}>DAM</Typography></Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, bgcolor: '#10b981', borderRadius: '1px' }}/><Typography sx={{ fontSize: '9px' }}>GDAM</Typography></Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, bgcolor: '#f43f5e', borderRadius: '1px' }}/><Typography sx={{ fontSize: '9px' }}>RTM</Typography></Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, bgcolor: '#fef08a', borderRadius: '1px' }}/><Typography sx={{ fontSize: '9px' }}>Light cell = zero scheduled quantity</Typography></Box>
      </Box>

      <Box sx={{ width: '100%', overflowX: 'auto', pb: 2 }}>
        <Box sx={{ minWidth: 800 }}>
          {/* X-axis labels (Time) */}
          <Box sx={{ display: 'flex', ml: '60px', mb: 1, position: 'relative', height: 20 }}>
            {xAxisLabels.map((label, i) => (
              <Typography 
                key={i} 
                variant="caption" 
                sx={{ 
                  position: 'absolute', 
                  left: `${(i * 16) / 96 * 100}%`,
                  transform: 'translateX(-50%)',
                  color: '#64748b',
                  fontSize: '9px'
                }}
              >
                {label}
              </Typography>
            ))}
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {days.map((day: string) => {
              const dateObj = new Date(day);
              // Handle invalid dates gracefully or fallback to original string
              let dateLabel = day;
              if (!isNaN(dateObj.getTime())) {
                dateLabel = `${dateObj.getDate()} ${dateObj.toLocaleString('en-US', { month: 'short' })}`;
              } else {
                // If the day is just a string like "19-Mar", try parsing it or use it as is.
                const parts = day.split('-');
                if (parts.length >= 2) {
                  dateLabel = `${parts[2] || parts[0]} ${parts[1]}`;
                }
              }

              return (
                <Box key={day} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ width: '50px', textAlign: 'right', mr: '10px', color: '#64748b', fontSize: '9px', whiteSpace: 'nowrap' }}>
                    {dateLabel}
                  </Typography>
                  <Box sx={{ display: 'flex', flex: 1, gap: '1px' }}>
                    {blocks.map(block => {
                      const cell = getCellData(day, block);
                      return (
                        <Box 
                          key={`${day}-${block}`} 
                          title={cell ? `Block ${block} | ${cell.market} | ${cell.qty.toFixed(2)} MWh | ₹${cell.rate.toFixed(2)}` : ''}
                          sx={{ 
                            flex: 1,
                            bgcolor: cell ? mktColor(cell.market) : 'transparent',
                            border: cell ? 'none' : '1px solid #f1f5f9',
                            height: '10px',
                            opacity: cell && cell.qty === 0 ? 0.3 : 1,
                            cursor: cell ? 'pointer' : 'default',
                            '&:hover': cell ? {
                              opacity: 0.8,
                              boxShadow: '0 0 0 1px rgba(0,0,0,0.2) inset'
                            } : {}
                          }} 
                        />
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};
