import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, alpha } from '@mui/material';
import { 
  Storage as StorageIcon, 
  CheckCircleOutline as ActiveIcon, 
  Update as ReplaceIcon, 
  History as HistoryIcon,
  Warning as ErrorIcon
} from '@mui/icons-material';
import { datasetsApi, DatasetSummary } from '../../api/datasets.api';

interface SummaryCardsProps {
  refreshTrigger: number;
}

export default function SummaryCards({ refreshTrigger }: SummaryCardsProps) {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await datasetsApi.getSummary();
        setSummary(res.data);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError(err.message || 'Failed to load summary');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    return () => {
      abortController.abort();
    };
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 2, height: 100, alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'error.main', bgcolor: 'error.50', display: 'flex', alignItems: 'center', gap: 2 }}>
        <ErrorIcon color="error" />
        <Typography color="error.main">{error}</Typography>
      </Paper>
    );
  }

  if (!summary) return null;

  const cards = [
    { title: 'Total Datasets', value: summary.totalDatasets, icon: <StorageIcon color="primary" sx={{ fontSize: 32 }} />, color: 'primary.main', bgcolor: 'rgba(59, 143, 243, 0.1)' },
    { title: 'Active Datasets', value: summary.activeDatasets, icon: <ActiveIcon color="success" sx={{ fontSize: 32 }} />, color: 'success.main', bgcolor: 'rgba(46, 204, 113, 0.1)' },
    { title: 'Replaced Datasets', value: summary.replacedDatasets, icon: <ReplaceIcon color="warning" sx={{ fontSize: 32 }} />, color: 'warning.main', bgcolor: 'rgba(241, 196, 15, 0.1)' },
    { title: 'Total Actions', value: summary.totalUploadHistoryRecords, icon: <HistoryIcon color="info" sx={{ fontSize: 32 }} />, color: 'info.main', bgcolor: 'rgba(52, 152, 219, 0.1)' },
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card, idx) => (
        <Grid item xs={12} sm={6} md={3} key={idx}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', background: (theme) => `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`, display: 'flex', alignItems: 'center', gap: 2, transition: 'all 0.2s', '&:hover': { borderColor: card.color, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: card.bgcolor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.icon}
            </Box>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                {card.value}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {card.title}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
