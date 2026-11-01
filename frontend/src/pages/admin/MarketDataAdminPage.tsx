import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import SummaryCards from '../../components/admin/SummaryCards';
import DatasetTable from '../../components/admin/DatasetTable';
import UploadHistoryTable from '../../components/admin/UploadHistoryTable';
import UploadHub from '../../components/admin/UploadHub';

export default function MarketDataAdminPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefreshTriggered = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h1" sx={{ color: 'text.primary', mb: 0.5 }}>
          Data Management
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Upload, replace, and manage market datasets seamlessly.
        </Typography>
      </Box>

      {/* New robust Upload Hub replacing the old modal */}
      <UploadHub onUploadSuccess={handleRefreshTriggered} />

      <SummaryCards refreshTrigger={refreshTrigger} />
      
      <DatasetTable 
        refreshTrigger={refreshTrigger} 
        onRefreshTriggered={handleRefreshTriggered} 
      />

      <UploadHistoryTable refreshTrigger={refreshTrigger} />
    </Box>
  );
}
