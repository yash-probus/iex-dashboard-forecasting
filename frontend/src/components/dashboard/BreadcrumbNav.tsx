import React from 'react';
import { Breadcrumbs, Link, Box, useTheme } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export default function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const accentColor = '#3B8FF3';

  return (
    <Box sx={{ mb: 4 }}>
      <Breadcrumbs 
        separator={<NavigateNextIcon sx={{ fontSize: 18, color: 'text.disabled', opacity: 0.8 }} />} 
        aria-label="breadcrumb"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          if (isLast || !item.path) {
            return (
              <Box 
                key={item.label}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.75,
                  px: 2,
                  py: 0.5,
                  borderRadius: 1.5,
                  backgroundColor: 'transparent',
                  border: '1.5px solid',
                  borderColor: accentColor,
                  color: accentColor,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  letterSpacing: '0.2px',
                }}
              >
                {item.icon && <Box sx={{ display: 'flex', '& > svg': { fontSize: 18 } }}>{item.icon}</Box>}
                {item.label}
              </Box>
            );
          }

          return (
            <Link
              key={item.label}
              underline="none"
              onClick={() => navigate(item.path!)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 0.5,
                borderRadius: 1.5,
                backgroundColor: 'transparent',
                border: '1.5px solid',
                borderColor: 'transparent',
                color: accentColor,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                letterSpacing: '0.2px',
                transition: 'color 0.2s ease-in-out',
                '&:hover': {
                  color: theme.palette.mode === 'dark' ? '#60A5FA' : '#1D4ED8', // Darker/Lighter blue on hover
                },
                '&:focus-visible': {
                  outline: `2px solid ${accentColor}`,
                  outlineOffset: '2px',
                }
              }}
            >
              {item.icon && <Box sx={{ display: 'flex', '& > svg': { fontSize: 18 } }}>{item.icon}</Box>}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
