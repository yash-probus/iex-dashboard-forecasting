import React from 'react';
import { Button, ButtonProps, alpha } from '@mui/material';

export interface ActionButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary';
  accentColor?: string;
}

export default function ActionButton({ 
  variant = 'secondary', 
  accentColor = '#3B8FF3', // Default Primary Blue
  sx,
  children,
  ...props 
}: ActionButtonProps) {
  
  const isPrimary = variant === 'primary';

  return (
    <Button
      variant={isPrimary ? 'contained' : 'outlined'}
      {...props}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: 1.5,
        px: 3,
        height: '40px', // standardize height explicitly across all variants
        borderWidth: isPrimary ? 0 : '1.5px',
        borderColor: accentColor,
        borderStyle: 'solid',
        color: isPrimary ? '#FFFFFF' : accentColor,
        backgroundColor: isPrimary ? accentColor : 'transparent',
        boxShadow: isPrimary ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderWidth: '1.5px',
          borderColor: accentColor,
          borderStyle: 'solid',
          backgroundColor: isPrimary ? alpha(accentColor, 0.9) : alpha(accentColor, 0.1),
          boxShadow: isPrimary ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
        },
        '&.Mui-disabled': {
          borderWidth: isPrimary ? 0 : '1.5px',
          borderColor: isPrimary ? 'transparent' : 'action.disabled',
          color: 'action.disabled',
          backgroundColor: isPrimary ? 'action.disabledBackground' : 'transparent',
        },
        '& .MuiButton-startIcon': {
          mr: 1 // benchmark gap between icon and text
        },
        ...sx
      }}
    >
      {children}
    </Button>
  );
}
