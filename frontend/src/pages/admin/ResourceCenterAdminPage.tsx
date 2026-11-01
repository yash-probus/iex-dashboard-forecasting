import React from 'react';
import { Box, Typography } from '@mui/material';
import { OverviewSection } from '../../components/dashboard/OverviewSection';
import BreadcrumbNav from '../../components/dashboard/BreadcrumbNav';
import { RESOURCE_CENTER_ITEMS } from '../../constants/dashboardOverview';

export default function ResourceCenterAdminPage() {
  const adminItems = RESOURCE_CENTER_ITEMS.map(item => ({
    ...item,
    path: `/admin${item.path}`
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <BreadcrumbNav 
        items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Resource Center Management' }
        ]} 
      />

      <Box sx={{ 
        mb: 6, 
        pb: 3, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5
      }}>
        <Typography variant="h1" sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Resource Center Management
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Select a reference table to manage its underlying records.
        </Typography>
      </Box>

      <OverviewSection 
        type="resource"
        items={adminItems}
      />
    </Box>
  );
}
