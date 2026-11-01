import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Description as DescriptionIcon, Add as AddIcon } from '@mui/icons-material';

interface EmptyTableStateProps {
  title: string;
  description: string;
  onAddRecord?: () => void;
}

export default function EmptyTableState({ title, description, onAddRecord }: EmptyTableStateProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
      <Box sx={{ color: 'text.secondary', opacity: 0.3, mb: 2 }}>
        <DescriptionIcon sx={{ fontSize: 48 }} />
      </Box>
      <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', opacity: 0.8, mb: onAddRecord ? 3 : 0, maxWidth: 350, textAlign: 'center' }}>
        {description}
      </Typography>
      {onAddRecord && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddRecord} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Add Record
        </Button>
      )}
    </Box>
  );
}
