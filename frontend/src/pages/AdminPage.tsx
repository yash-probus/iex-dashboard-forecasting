import React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart as BarChartIcon, SettingsSuggest as SettingsSuggestIcon } from '@mui/icons-material';
import { OverviewSection } from '../components/dashboard/OverviewSection';
import { OverviewItemConfig } from '../constants/dashboardOverview';

export default function AdminPage() {
  const adminItems: OverviewItemConfig[] = [
    {
      key: 'market-data',
      title: 'Market Data',
      description: 'Upload, replace, delete and manage DAM, GDAM and RTM datasets.',
      icon: <BarChartIcon fontSize="medium" />,
      color: '#3B8FF3',
      path: '/admin/market-data'
    },
    {
      key: 'resource-center',
      title: 'Resource Center Management',
      description: 'Manage master tables, tariffs, margins and operational reference data.',
      icon: <SettingsSuggestIcon fontSize="medium" />,
      color: '#F29F67',
      path: '/admin/resource-center'
    },
    {
      key: 'api-logs',
      title: 'API Health Logs',
      description: 'Monitor background fetch operations for external APIs.',
      icon: <SettingsSuggestIcon fontSize="medium" />,
      color: '#10B981',
      path: '/admin/api-logs'
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* <Box sx={{ 
        mb: 6, 
        pb: 3, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5
      }}>
        <Typography variant="h1" sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Manage administrative modules and system configuration.
        </Typography>
      </Box> */}

      <OverviewSection
        title="Administration Dashboard"
        description="Manage market datasets and resource center master data."
        type="resource"
        items={adminItems}
      />
    </Box>
  );
}
