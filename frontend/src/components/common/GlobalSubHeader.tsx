import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { NavigateNext } from '@mui/icons-material';
import { findModuleByPath } from '../../config/modules.config';

export default function GlobalSubHeader() {
  const location = useLocation();
  
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  if (isDashboard) {
    return null;
  }

  const { module: activeModule, subRoute } = findModuleByPath(location.pathname);

  const activeCategory = activeModule?.categoryLabel || (location.pathname.startsWith('/admin') ? 'Governance' : 'Terminal');
  const parentTitle = activeModule?.title || (location.pathname.startsWith('/admin') ? 'Administration' : '');
  const childTitle = subRoute?.label || '';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
      <Breadcrumbs 
        separator={<NavigateNext fontSize="small" />} 
        aria-label="breadcrumb"
      >
        <MuiLink component={Link} to="/" underline="hover" color="inherit">
          Home
        </MuiLink>
        <Typography color="inherit">
          {activeCategory}
        </Typography>
        {parentTitle && (
          childTitle ? (
            <MuiLink component={Link} to={activeModule?.path || '/'} underline="hover" color="inherit">
              {parentTitle}
            </MuiLink>
          ) : (
            <Typography color="text.primary" fontWeight={600}>
              {parentTitle}
            </Typography>
          )
        )}
        {childTitle && (
          <Typography color="text.primary" fontWeight={600}>
            {childTitle}
          </Typography>
        )}
      </Breadcrumbs>
    </Box>
  );
}
