import React from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Grid } from '@mui/material';

interface DashboardSlabsGroupSummaryProps {
  calcResult: any;
}

export const DashboardSlabsGroupSummary: React.FC<DashboardSlabsGroupSummaryProps> = ({ calcResult }) => {
  if (!calcResult || !calcResult.todGroups) return null;

  return (
    <Grid container spacing={2}>
      {Object.entries(calcResult.todGroups).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, list]: any) => {
        return (
          <Grid item xs={12} sm={6} md={6} lg={6} key={groupName}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1.5, height: '100%', bgcolor: 'background.paper' }}>
              <Typography variant="h4" sx={{ textTransform: 'uppercase', fontWeight: 700, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span>{groupName}</span>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {list.length} slots
                </Typography>
              </Typography>
              
              <Box sx={{ overflowX: 'hidden' }}>
                <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '40%', fontSize: '10px', fontWeight: 700, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', whiteSpace: 'nowrap' }}>Date/Time</TableCell>
                      <TableCell align="right" sx={{ width: '40%', fontSize: '10px', fontWeight: 700, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', whiteSpace: 'nowrap' }}>Lowest Price</TableCell>
                      <TableCell align="right" sx={{ width: '20%', fontSize: '10px', fontWeight: 700, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', whiteSpace: 'nowrap' }}>DISCOM</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.slice(0, 50).map((row: any, idx: number) => (
                      <TableRow key={idx} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0,0,0,0.01)' } }}>
                        <TableCell sx={{ fontSize: '11px', py: 0.75 }}>
                          {row.date.substring(5)} {row.timeStr}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', py: 0.75 }}>
                          ₹{Number(row.comparedLowestPrice ?? row.bestMarketLanding ?? 0).toFixed(2)}
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: 800, 
                            color: (row.selectedSource || row.marketSource) === 'DISCOM' ? '#64748B' : '#7C3AED',
                            backgroundColor: (row.selectedSource || row.marketSource) === 'DISCOM' ? '#F1F5F9' : '#F5F3FF',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            marginLeft: '4px'
                          }}>
                            {row.selectedSource || row.marketSource}
                          </span>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '11px', color: 'text.secondary', py: 0.75 }}>
                          ₹{Number(row.discomLandingPrice ?? row.discomLanding ?? 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
};
