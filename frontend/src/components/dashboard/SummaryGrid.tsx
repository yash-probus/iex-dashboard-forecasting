import React from 'react';
import { Box } from '@mui/material';

interface SummaryGridProps {
  children: React.ReactNode;
}

export default function SummaryGrid({ children }: SummaryGridProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flexShrink: 0, minHeight: 120 }}>
      {React.Children.map(children, (child) => (
        <Box sx={{ flex: '1 1 0', minWidth: 180, flexShrink: 0 }}>
          {child}
        </Box>
      ))}
    </Box>
  );
}
