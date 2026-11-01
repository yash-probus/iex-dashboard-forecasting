import React, { useState } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DashboardSlabsGroupSummary } from './DashboardSlabsGroupSummary';
import { DashboardCheapestSlots } from './DashboardCheapestSlots';
import { DashboardMarketBuyDecision } from './DashboardMarketBuyDecision';
import { DashboardDetailedOASimulation } from './DashboardDetailedOASimulation';
import { DashboardUsageRecommendations } from './DashboardUsageRecommendations';
import { SlotWiseMarketHeatmap } from '../SlotWiseMarketHeatmap';
import { DynamicSlotWiseMarketHeatmap } from '../DynamicSlotWiseMarketHeatmap';

interface DashboardSimulationTabsProps {
  calcResult?: any;
  marketDecisionResult?: any;
  demandShiftInsights?: any;
}

export const DashboardSimulationTabs: React.FC<DashboardSimulationTabsProps> = ({ 
  calcResult, 
  marketDecisionResult, 
  demandShiftInsights 
}) => {
  // Handlers for dialogs and exports (mocked or handled internally if needed, or pass them in)
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const [demandShiftGraphOpen, setDemandShiftGraphOpen] = useState(true);
  const [dynamicDemandShiftGraphOpen, setDynamicDemandShiftGraphOpen] = useState(true);

  const handleExportDetailedOA = () => {
    // We can implement actual export here if needed, or just let it fail gracefully
    console.log('Export Detailed OA CSV');
  };

  const handleExportInsights = () => {
    console.log('Export Insights Excel');
  };

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper' }}>
        <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 'bold', color: 'text.primary' }}>Simulation Details</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '11px', mb: 2 }}>
          Detailed breakdown of market decisions, TOD shifting, and OA calculations
        </Typography>

        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {calcResult && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>Slabs Group Summary</Typography>
              <DashboardSlabsGroupSummary calcResult={calcResult} />
            </Box>
          )}
          {calcResult && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>Cheapest Slots</Typography>
              <DashboardCheapestSlots calcResult={calcResult} />
            </Box>
          )}
          {marketDecisionResult && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>Market Buy Decision</Typography>
              <DashboardMarketBuyDecision 
                marketDecisionResult={marketDecisionResult} 
                setGraphDialogOpen={setGraphDialogOpen} 
              />
            </Box>
          )}
          {marketDecisionResult?.oaDetailed && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>Detailed OA Simulation</Typography>
              <DashboardDetailedOASimulation 
                marketDecisionResult={marketDecisionResult} 
                exportDetailedOAToCSV={handleExportDetailedOA} 
              />
            </Box>
          )}
          {demandShiftInsights && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>Usage Recommendations</Typography>
              <DashboardUsageRecommendations 
                demandShiftInsights={demandShiftInsights}
                marketDecisionResult={marketDecisionResult}
                setDemandShiftGraphOpen={setDemandShiftGraphOpen}
                setDynamicDemandShiftGraphOpen={setDynamicDemandShiftGraphOpen}
                exportInsightsToExcel={handleExportInsights}
              />
              
              {demandShiftGraphOpen && (
                 <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>Usage Recommendations Heatmap</Typography>
                    <SlotWiseMarketHeatmap slotsData={demandShiftInsights.slotsData} />
                 </Box>
              )}
              {dynamicDemandShiftGraphOpen && (
                 <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>Dynamic Usage Recommendations Heatmap</Typography>
                    <DynamicSlotWiseMarketHeatmap slotsData={demandShiftInsights.slotsData} />
                 </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

