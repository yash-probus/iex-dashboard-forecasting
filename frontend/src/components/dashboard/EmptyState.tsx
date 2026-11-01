import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      p: 6,
      textAlign: 'center',
      backgroundColor: 'surface.main',
      borderRadius: 2,
      border: '1px dashed',
      borderColor: 'divider',
      minHeight: 300
    }}>
      {icon && (
        <Box sx={{ color: 'text.disabled', mb: 2 }}>
          {icon}
        </Box>
      )}
      <Typography variant="h4" sx={{ color: 'text.primary', mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400, mb: 3 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
