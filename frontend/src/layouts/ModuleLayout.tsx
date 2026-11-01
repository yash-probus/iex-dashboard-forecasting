import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, alpha, useTheme, Collapse, Tooltip } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { MARKET_ITEMS, DATABASE_ITEMS, RESOURCE_CENTER_ITEMS, MARKET_OPERATIONS_ITEMS, OverviewItemConfig, FORECAST_ITEMS, MARKET_RECOMMENDATION_ITEMS, UP_MARKET_ITEMS } from '../constants/dashboardOverview';


export default function ModuleLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  // State to manage expanded lists and collapsed sidebar
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
  const [openSubStates, setOpenSubStates] = useState<Record<string, boolean>>({ 'price-rtm': true });
  const [collapsed, setCollapsed] = useState(false);

  let activeItems: OverviewItemConfig[] = [];
  let activeModuleTitle = '';
  let activeModuleColor = theme.palette.primary.main;

  if (location.pathname.startsWith('/database')) {
    activeItems = DATABASE_ITEMS;
    activeModuleTitle = 'Demand & Generation Data';
    activeModuleColor = theme.palette.primary.main;
  } else if (location.pathname.startsWith('/forecast/market-recommendation')) {
    activeItems = MARKET_RECOMMENDATION_ITEMS;
    activeModuleTitle = 'Market Recommendation';
    activeModuleColor = '#059669';
  } else if (location.pathname.startsWith('/forecast')) {
    activeItems = FORECAST_ITEMS;
    activeModuleTitle = 'Forecast Analytics';
    activeModuleColor = '#8B5CF6';
  } else if (location.pathname.startsWith('/dam') || location.pathname.startsWith('/gdam') || location.pathname.startsWith('/rtm') || location.pathname.startsWith('/rec') || location.pathname.startsWith('/markets') || location.pathname.startsWith('/up-market')) {
    activeItems = MARKET_ITEMS;
    activeModuleTitle = 'IEX Market';
    activeModuleColor = '#00BFA5';
  } else if (location.pathname.startsWith('/resource-center')) {
    activeItems = RESOURCE_CENTER_ITEMS;
    activeModuleTitle = 'Resource Center';
    activeModuleColor = '#03A9F4';
  } else if (location.pathname.startsWith('/market-operations')) {
    activeItems = MARKET_OPERATIONS_ITEMS;
    activeModuleTitle = 'Market Trend';
    activeModuleColor = '#FF7043';
  }

  // Automatically open parent if a child is active
  useEffect(() => {
    const newOpenStates = { ...openStates };
    let stateChanged = false;
    
    activeItems.forEach(item => {
      if (item.subItems) {
        const hasActiveChild = item.subItems.some((sub: any) => 
          location.pathname.includes(sub.path) || 
          (sub.subItems && sub.subItems.some((nested: any) => location.pathname.includes(nested.path)))
        );
        if (hasActiveChild && !openStates[item.key]) {
          newOpenStates[item.key] = true;
          stateChanged = true;
        }
      }
    });
    
    if (stateChanged) setOpenStates(newOpenStates);

    if (location.pathname.includes('/rtm')) {
      setOpenSubStates(prev => ({ ...prev, 'price-rtm': true }));
    }
  }, [location.pathname, activeItems]);

  const handleToggle = (key: string, defaultPath?: string) => {
    setOpenStates(prev => ({ ...prev, [key]: !prev[key] }));
    if (defaultPath) {
      navigate(defaultPath);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' }, 
      gap: 3, 
      flexGrow: 1,
      height: { xs: 'auto', md: '100%' },
      maxHeight: { xs: 'auto', md: '100%' },
      minHeight: 0,
      overflow: 'hidden',
      py: { xs: 1, md: 0 }
    }}>
      {/* Sidebar - Frozen on screen */}
      <Paper 
        elevation={0}
        sx={{ 
          width: { xs: '100%', md: collapsed ? 76 : 280 }, 
          flexShrink: 0, 
          height: { xs: 'auto', md: '100%' },
          maxHeight: { xs: 'auto', md: '100%' },
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <List sx={{ p: 1.5, flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {activeItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            // Check if current route is the parent path (only if it doesn't have subItems, otherwise we check children)
            const isActive = !hasSubItems && location.pathname.includes(item.path);
            const isOpen = openStates[item.key] || false;
            
            // Check if ANY child is active for parent styling
            const isParentActive = hasSubItems && item.subItems!.some((sub: any) => location.pathname.includes(sub.path));
            const buttonSelected = isActive || isParentActive;

            return (
              <React.Fragment key={item.key}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <Tooltip title={collapsed ? item.title : ''} placement="right" arrow>
                    <ListItemButton 
                      selected={buttonSelected}
                      onClick={() => {
                        if (collapsed) {
                          setCollapsed(false);
                          if (hasSubItems) {
                            setOpenStates(prev => ({ ...prev, [item.key]: true }));
                            navigate(item.subItems![0].path);
                          } else {
                            navigate(item.path);
                          }
                        } else {
                          hasSubItems ? handleToggle(item.key, item.path) : navigate(item.path);
                        }
                      }}
                      sx={{ 
                        borderRadius: 2,
                        py: 1.2,
                        px: collapsed ? 1.5 : 2,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        color: buttonSelected ? activeModuleColor : 'text.secondary',
                        '&.Mui-selected': {
                          bgcolor: alpha(activeModuleColor, 0.1),
                          color: activeModuleColor,
                          '&:hover': {
                            bgcolor: alpha(activeModuleColor, 0.15),
                          }
                        },
                        '&:hover': {
                          backgroundColor: '#1E293B !important',
                          color: '#FFFFFF !important',
                          '& .MuiListItemIcon-root, & .MuiListItemText-primary, & .MuiSvgIcon-root, & .MuiTypography-root': {
                            color: '#FFFFFF !important',
                          }
                        }
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: collapsed ? 'auto' : 40, 
                        justifyContent: 'center',
                        color: 'inherit',
                        transition: 'color 0.2s ease-in-out'
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      {!collapsed && (
                        <ListItemText 
                          primary={item.title} 
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            fontWeight: buttonSelected ? 600 : 500,
                            color: 'inherit',
                            sx: { transition: 'color 0.2s ease-in-out', whiteSpace: 'nowrap' }
                          }} 
                        />
                      )}
                      {!collapsed && hasSubItems && (
                        isOpen ? <ExpandLess sx={{ color: buttonSelected ? activeModuleColor : 'text.secondary' }} /> : <ExpandMore sx={{ color: buttonSelected ? activeModuleColor : 'text.secondary' }} />
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>

                {!collapsed && hasSubItems && (
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ ml: 4, mb: 1, borderLeft: `2px solid ${alpha(activeModuleColor, 0.2)}` }}>
                      {item.subItems!.map((sub: any) => {
                        const hasNestedItems = sub.subItems && sub.subItems.length > 0;
                        const isSubActive = !hasNestedItems
                          ? location.pathname.includes(sub.path)
                          : sub.subItems.some((nested: any) => location.pathname.includes(nested.path));
                        const isNestedOpen = openSubStates[sub.key] ?? false;

                        return (
                          <React.Fragment key={sub.key}>
                            <ListItem disablePadding sx={{ mt: 0.5 }}>
                              <ListItemButton
                                selected={isSubActive}
                                onClick={() => {
                                  if (hasNestedItems) {
                                    setOpenSubStates(prev => ({ ...prev, [sub.key]: !prev[sub.key] }));
                                    navigate(sub.subItems[0].path);
                                  } else {
                                    navigate(sub.path);
                                  }
                                }}
                                sx={{
                                  borderRadius: '0 8px 8px 0',
                                  py: 1,
                                  color: isSubActive ? activeModuleColor : 'text.secondary',
                                  '&.Mui-selected': {
                                    bgcolor: 'transparent',
                                    position: 'relative',
                                    color: activeModuleColor,
                                    '&::before': {
                                      content: '""',
                                      position: 'absolute',
                                      left: -2,
                                      top: 0,
                                      bottom: 0,
                                      width: 2,
                                      backgroundColor: activeModuleColor
                                    }
                                  },
                                  '&:hover': {
                                    backgroundColor: '#1E293B !important',
                                    borderRadius: 2,
                                    color: '#FFFFFF !important',
                                    '& .MuiListItemIcon-root, & .MuiListItemText-primary, & .MuiSvgIcon-root, & .MuiTypography-root': {
                                      color: '#FFFFFF !important',
                                    }
                                  }
                                }}
                              >
                                {sub.icon && (
                                  <ListItemIcon sx={{ 
                                    minWidth: 32, 
                                    color: 'inherit',
                                    transition: 'color 0.2s ease-in-out'
                                  }}>
                                    {sub.icon}
                                  </ListItemIcon>
                                )}
                                <ListItemText 
                                  primary={sub.title} 
                                  primaryTypographyProps={{
                                    variant: 'caption',
                                    fontWeight: isSubActive ? 600 : 500,
                                    color: 'inherit',
                                    sx: { transition: 'color 0.2s ease-in-out', whiteSpace: 'nowrap' }
                                  }} 
                                />
                                {hasNestedItems && (
                                  isNestedOpen ? (
                                    <ExpandLess sx={{ fontSize: 16, color: isSubActive ? activeModuleColor : 'text.secondary' }} />
                                  ) : (
                                    <ExpandMore sx={{ fontSize: 16, color: isSubActive ? activeModuleColor : 'text.secondary' }} />
                                  )
                                )}
                              </ListItemButton>
                            </ListItem>

                            {hasNestedItems && (
                              <Collapse in={isNestedOpen} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding sx={{ ml: 3.5, mt: 0.5, borderLeft: `1.5px dashed ${alpha(activeModuleColor, 0.35)}` }}>
                                  {sub.subItems.map((nested: any) => {
                                    const isNestedActive = location.pathname.includes(nested.path);
                                    return (
                                      <ListItem key={nested.key} disablePadding sx={{ mt: 0.25 }}>
                                        <ListItemButton
                                          selected={isNestedActive}
                                          onClick={() => navigate(nested.path)}
                                          sx={{
                                            borderRadius: '0 6px 6px 0',
                                            py: 0.6,
                                            pl: 1.5,
                                            color: isNestedActive ? activeModuleColor : 'text.secondary',
                                            bgcolor: isNestedActive ? alpha(activeModuleColor, 0.08) : 'transparent',
                                            '&.Mui-selected': {
                                              bgcolor: alpha(activeModuleColor, 0.12),
                                              color: activeModuleColor,
                                              fontWeight: 600,
                                              '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                left: -2,
                                                top: 2,
                                                bottom: 2,
                                                width: 2.5,
                                                borderRadius: 1,
                                                backgroundColor: activeModuleColor
                                              }
                                            },
                                            '&:hover': {
                                              backgroundColor: '#1E293B !important',
                                              borderRadius: 1.5,
                                              color: '#FFFFFF !important',
                                              '& .MuiListItemText-primary, & .MuiTypography-root': {
                                                color: '#FFFFFF !important',
                                              }
                                            }
                                          }}
                                        >
                                          <ListItemText
                                            primary={nested.title}
                                            primaryTypographyProps={{
                                              variant: 'caption',
                                              fontSize: '11px',
                                              fontWeight: isNestedActive ? 700 : 500,
                                              color: 'inherit',
                                              sx: { transition: 'color 0.2s ease-in-out', whiteSpace: 'nowrap' }
                                            }}
                                          />
                                        </ListItemButton>
                                      </ListItem>
                                    );
                                  })}
                                </List>
                              </Collapse>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          })}
        </List>

        {/* Collapse / Expand Toggle Button */}
        <Box sx={{ 
          borderTop: '1px solid', 
          borderColor: 'divider', 
          p: 1.5, 
          display: { xs: 'none', md: 'block' } 
        }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                <span className="font-medium">Collapse</span>
              </>
            )}
          </button>
        </Box>
      </Paper>

      {/* Main Content - Independent scrolling right portion */}
      <Box 
        id="module-content-wrapper" 
        sx={{ 
          flexGrow: 1, 
          minWidth: 0,
          height: { xs: 'auto', md: '100%' },
          maxHeight: { xs: 'auto', md: '100%' },
          overflowY: { xs: 'visible', md: 'auto' },
          overflowX: 'hidden',
          pr: { xs: 0, md: 1 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

