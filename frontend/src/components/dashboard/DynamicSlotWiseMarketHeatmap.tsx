import React, { useMemo } from 'react';
import { Box, Typography, Paper, Tooltip, useTheme } from '@mui/material';

interface SlotData {
  date: string;
  timeblock: number;
  marketSource: string;
  shouldBuyFromMarket: boolean;
  marketEnergy?: number;
  discomEnergy?: number;
  tod?: string;
}

interface DynamicSlotWiseMarketHeatmapProps {
  slotsData: SlotData[];
}

export const DynamicSlotWiseMarketHeatmap: React.FC<DynamicSlotWiseMarketHeatmapProps> = ({ slotsData }) => {
  const theme = useTheme();

  // Find the maximum energy value across all slots to scale opacity
  const maxEnergy = useMemo(() => {
    let max = 0;
    slotsData?.forEach((slot: any) => {
      const volume = slot.maxEnergyPerSlot ?? (slot.shouldBuyFromMarket ? (slot.marketEnergy || 0) : (slot.discomEnergy || 0));
      if (volume > max) max = volume;
    });
    return max > 0 ? max : 1;
  }, [slotsData]);

  // Group data by date
  const heatmapData = useMemo(() => {
    if (!slotsData || slotsData.length === 0) return [];

    const grouped: Record<string, SlotData[]> = {};
    slotsData.forEach((slot: any) => {
      if (!grouped[slot.date]) {
        grouped[slot.date] = Array(96).fill(null);
      }
      const tb = Number(slot.timeblock ?? slot.slot ?? 1);
      const index = tb - 1;
      if (index >= 0 && index < 96) {
        grouped[slot.date][index] = { ...slot, timeblock: tb };
      }
    });

    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slotsData]);

  if (heatmapData.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="textSecondary">No data available to display heatmap.</Typography>
      </Box>
    );
  }

  const getCellColor = (slot: any | null) => {
    if (!slot) return 'rgba(241, 245, 249, 1)'; // Missing data (#f1f5f9)
    
    const isMarket = slot.shouldBuyFromMarket ?? (slot.selectedSource && slot.selectedSource !== 'DISCOM');
    const source = slot.selectedSource ?? slot.marketSource ?? 'DISCOM';
    const volume = slot.maxEnergyPerSlot ?? (isMarket ? (slot.marketEnergy || 0) : (slot.discomEnergy || 0));

    let opacity = volume > 0 ? 0.1 + (0.9 * (volume / maxEnergy)) : 0;
    if (opacity > 1) opacity = 1;

    if (!isMarket) return `rgba(148, 163, 184, ${opacity})`; // DISCOM (Gray)
    if (source === 'DAM') return `rgba(59, 130, 246, ${opacity})`; // DAM (Blue)
    if (source === 'GDAM') return `rgba(16, 185, 129, ${opacity})`; // GDAM (Green)
    if (source === 'RTM') return `rgba(139, 92, 246, ${opacity})`; // RTM (Purple)
    return `rgba(226, 232, 240, 1)`;
  };

  const getTooltipContent = (slot: any | null) => {
    if (!slot) return 'No data';
    const isMarket = slot.shouldBuyFromMarket ?? (slot.selectedSource && slot.selectedSource !== 'DISCOM');
    const source = slot.selectedSource ?? slot.marketSource ?? 'DISCOM';
    const volume = slot.maxEnergyPerSlot ?? (isMarket ? slot.marketEnergy : slot.discomEnergy) ?? 0;
    
    const tb = Number(slot.timeblock ?? slot.slot ?? 1);
    const startMinutes = (tb - 1) * 15;
    const hour = Math.floor(startMinutes / 60);
    const min = startMinutes % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    return (
      <Box sx={{ p: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{slot.date} at {timeStr}</Typography>
        <Typography variant="body2">Source: {source}</Typography>
        <Typography variant="body2">Volume: {volume ? volume.toFixed(2) : 0} kWh</Typography>
      </Box>
    );
  };

  const xAxisLabels = [0, 16, 32, 48, 64, 80].map(tbIndex => {
    const hour = Math.floor((tbIndex * 15) / 60);
    return `${String(hour).padStart(2, '0')}:00`;
  });

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflowX: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Dynamic Volume-based Heatmap
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#94a3b8', borderRadius: 0.5 }} />
          <Typography variant="body2">DISCOM</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#3b82f6', borderRadius: 0.5 }} />
          <Typography variant="body2">DAM</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#10b981', borderRadius: 0.5 }} />
          <Typography variant="body2">GDAM</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#8b5cf6', borderRadius: 0.5 }} />
          <Typography variant="body2">RTM</Typography>
        </Box>
      </Box>

      <Box sx={{ minWidth: 800 }}>
        <Box sx={{ display: 'flex', ml: '60px', mb: 1, position: 'relative' }}>
          {xAxisLabels.map((label, i) => (
            <Typography 
              key={i} 
              variant="caption" 
              sx={{ 
                position: 'absolute', 
                left: `${(i * 16) / 96 * 100}%`,
                transform: 'translateX(-50%)',
                color: 'text.secondary'
              }}
            >
              {label}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {heatmapData.map(([dateStr, slots]) => {
            const dateObj = new Date(dateStr);
            const dateLabel = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;
            
            return (
              <Box key={dateStr} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ width: '50px', textAlign: 'right', mr: '10px', color: 'text.secondary' }}>
                  {dateLabel}
                </Typography>
                <Box sx={{ display: 'flex', flex: 1, gap: '1px' }}>
                  {slots.map((slot, idx) => (
                    <Tooltip key={idx} title={getTooltipContent(slot)} arrow placement="top">
                      <Box
                        sx={{
                          flex: 1,
                          height: 12,
                          bgcolor: getCellColor(slot),
                          cursor: 'pointer',
                          borderLeft: (idx > 0 && slot?.tod && slots[idx-1]?.tod && slot.tod !== slots[idx-1]?.tod) 
                            ? '2px solid #334155' 
                            : 'none',
                          '&:hover': {
                            opacity: 1,
                            transform: 'scale(1.1)',
                            zIndex: 1,
                            boxShadow: theme.shadows[2]
                          }
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
};
