import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer,
  List, ListItem, ListItemButton, ListItemText, useTheme as useMuiTheme, useMediaQuery, alpha,
  Collapse, Paper, Container, Grid
} from '@mui/material';
import {
  Login as LoginIcon, Settings as SettingsIcon, Menu as MenuIcon, Close as CloseIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon, ExpandLess, ExpandMore,
  BarChart, ElectricBolt, Timer as TimerIcon, Map as MapIcon,
  Business as BusinessIcon, EvStation as EvStationIcon, Receipt as ReceiptIcon,
  ShowChart as ShowChartIcon, AccountTree as AccountTreeIcon, DeviceHub as DeviceHubIcon,
  PriceCheck as PriceCheckIcon, Timeline as TimelineIcon, Cloud as CloudIcon,
  CalendarToday as CalendarIcon, ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import GlobalSubHeader from './common/GlobalSubHeader';
import { useTheme } from './ThemeProvider';
import ThemeToggle from './ThemeToggle';
import { useModules } from '../config/modules.config';

const MARKET_ITEMS = [
  { label: 'DAM', path: '/dam', icon: <BarChart fontSize="small" sx={{ color: '#3B8FF3' }} /> },
  { label: 'GDAM', path: '/gdam', icon: <ElectricBolt fontSize="small" sx={{ color: '#34B1AA' }} /> },
  { label: 'RTM', path: '/rtm', icon: <TimerIcon fontSize="small" sx={{ color: '#E0B50F' }} /> },
  { label: 'REC', path: '/rec', icon: <BarChart fontSize="small" sx={{ color: '#8B5CF6' }} /> },
];

const RESOURCE_ROUTES = [
  { label: 'Region State', path: '/resource-center/region-state', icon: <MapIcon fontSize="small" sx={{ color: '#F29F67' }} /> },
  { label: 'Discom List', path: '/resource-center/discom-list', icon: <BusinessIcon fontSize="small" sx={{ color: '#3B8FF3' }} /> },
  { label: 'ISTS Losses', path: '/resource-center/ists-charges', icon: <EvStationIcon fontSize="small" sx={{ color: '#34B1AA' }} /> },
  { label: 'IEX Fees', path: '/resource-center/iex-fees', icon: <ReceiptIcon fontSize="small" sx={{ color: '#E0B50F' }} /> },

  { label: 'CTU Charges', path: '/resource-center/ctu-charges', icon: <AccountTreeIcon fontSize="small" sx={{ color: '#EC4899' }} /> },
  { label: 'State Charges', path: '/resource-center/state-charges', icon: <DeviceHubIcon fontSize="small" sx={{ color: '#10B981' }} /> },
  { label: 'State Tariff', path: '/resource-center/state-tariff', icon: <PriceCheckIcon fontSize="small" sx={{ color: '#EF4444' }} /> },
  { label: 'FPPA Charges', path: '/resource-center/fppa-charges', icon: <ReceiptIcon fontSize="small" sx={{ color: '#E0B50F' }} /> },
];

const RESOURCE_GROUPS = [
  {
    title: 'Grid & Utility',
    items: [
      { label: 'Region State', path: '/resource-center/region-state', icon: <MapIcon fontSize="small" sx={{ color: '#F29F67' }} /> },
      { label: 'Discom List', path: '/resource-center/discom-list', icon: <BusinessIcon fontSize="small" sx={{ color: '#3B8FF3' }} /> },
    ]
  },
  {
    title: 'Transmission Charges',
    items: [
      { label: 'ISTS Losses', path: '/resource-center/ists-charges', icon: <EvStationIcon fontSize="small" sx={{ color: '#34B1AA' }} /> },
      { label: 'CTU Charges', path: '/resource-center/ctu-charges', icon: <AccountTreeIcon fontSize="small" sx={{ color: '#EC4899' }} /> },
    ]
  },
  {
    title: 'Utility Charges',
    items: [
      { label: 'State Charges', path: '/resource-center/state-charges', icon: <DeviceHubIcon fontSize="small" sx={{ color: '#10B981' }} /> },
      { label: 'State Tariff', path: '/resource-center/state-tariff', icon: <PriceCheckIcon fontSize="small" sx={{ color: '#EF4444' }} /> },
    ]
  },
  {
    title: 'Exchange & Margins',
    items: [
      { label: 'IEX Fees', path: '/resource-center/iex-fees', icon: <ReceiptIcon fontSize="small" sx={{ color: '#E0B50F' }} /> },

      { label: 'FPPA Charges', path: '/resource-center/fppa-charges', icon: <ReceiptIcon fontSize="small" sx={{ color: '#E0B50F' }} /> },
    ]
  }
];

const DATABASE_ROUTES = [
  { label: 'All India Demand (NPP)', path: '/database/all-india-demand', icon: <TimelineIcon fontSize="small" sx={{ color: '#3B8FF3' }} /> },
  { label: 'Generation Data (NPP)', path: '/database/generation-data', icon: <ElectricBolt fontSize="small" sx={{ color: '#FF7043' }} /> },
  { label: 'State Wise Demand (Vidyut Pravah & IEX)', path: '/database/state-wise-demand', icon: <MapIcon fontSize="small" sx={{ color: '#34B1AA' }} /> },
  { label: 'Weather Data (Open-Meteo)', path: '/database/weather', icon: <CloudIcon fontSize="small" sx={{ color: '#E0B50F' }} /> },
  { label: 'Holiday Calendar', path: '/database/holiday-calendar', icon: <CalendarIcon fontSize="small" sx={{ color: '#E91E63' }} /> },
];

const FORECAST_ROUTES = [
  { label: 'DAM Forecast', path: '/forecast/price/dam', icon: <TimelineIcon fontSize="small" sx={{ color: '#8B5CF6' }} /> },
  { label: 'RTM Day Ahead', path: '/forecast/price/rtm/dayahead', icon: <TimelineIcon fontSize="small" sx={{ color: '#8B5CF6' }} /> },
  { label: 'RTM Nowcast', path: '/forecast/price/rtm/nowcast', icon: <TimelineIcon fontSize="small" sx={{ color: '#8B5CF6' }} /> },
  { label: 'GDAM Forecast', path: '/forecast/price/gdam', icon: <TimelineIcon fontSize="small" sx={{ color: '#8B5CF6' }} /> },
  { label: 'Consumer Demand', path: '/forecast/demand/consumer', icon: <TimelineIcon fontSize="small" sx={{ color: '#00BFA5' }} /> },
  { label: 'All India Demand', path: '/forecast/demand/all-india', icon: <TimelineIcon fontSize="small" sx={{ color: '#00BFA5' }} /> },
  { label: 'NPP Generation Forecast', path: '/forecast/generation/npp', icon: <ElectricBolt fontSize="small" sx={{ color: '#FF7043' }} /> },
];



export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, isSuperAdmin, logout } = useAuth();
  const { visibleModules } = useModules(user);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    markets: true,
  });
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const theme = useMuiTheme();
  const { isDark } = useTheme();
  const isMobile = useMediaQuery('(max-width:767px)');

  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [desktopMarketsOpen, setDesktopMarketsOpen] = useState(false);
  const [mobileMarketsOpen, setMobileMarketsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [desktopResourceOpen, setDesktopResourceOpen] = useState(false);
  const [mobileResourceOpen, setMobileResourceOpen] = useState(false);
  const resourceDropdownRef = useRef<HTMLDivElement>(null);

  const [desktopDatabaseOpen, setDesktopDatabaseOpen] = useState(false);
  const [mobileDatabaseOpen, setMobileDatabaseOpen] = useState(false);
  const databaseDropdownRef = useRef<HTMLDivElement>(null);

  const [mobileForecastOpen, setMobileForecastOpen] = useState(false);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDesktopMarketsOpen(false);
      }
      if (resourceDropdownRef.current && !resourceDropdownRef.current.contains(event.target as Node)) {
        setDesktopResourceOpen(false);
      }
      if (databaseDropdownRef.current && !databaseDropdownRef.current.contains(event.target as Node)) {
        setDesktopDatabaseOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    if (location.pathname === path) return true;
    return location.pathname.startsWith(path.endsWith('/') ? path : path + '/');
  };

  const isMarketsActive = MARKET_ITEMS.some(item => location.pathname.startsWith(item.path));
  const isResourceActive = RESOURCE_ROUTES.some(item => location.pathname.startsWith(item.path));
  const isDatabaseActive = DATABASE_ROUTES.some(item => location.pathname.startsWith(item.path));
  const isForecastActive = location.pathname.startsWith('/forecast');


  const isAdminActive = location.pathname.startsWith('/admin');

  // Drawer Content for Mobile
  const drawer = (
    <Box sx={{ width: 280, bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="500">Menu</Typography>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <List sx={{ py: 1 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}
              selected={isActive('/dashboard')}
              sx={{
                mx: 1,
                mb: 1,
                borderRadius: 1.5,
                bgcolor: isActive('/dashboard') ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              }}
            >
              <ListItemText
                primary="Dashboard Overview"
                primaryTypographyProps={{
                  fontWeight: isActive('/dashboard') ? 600 : 400,
                  color: isActive('/dashboard') ? 'primary.main' : 'text.primary',
                  fontSize: '13.5px'
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* Dynamic Categories & Terminals */}
          {(['markets', 'analytics', 'economics', 'governance'] as const).map((catKey) => {
            const catModules = visibleModules.filter(m => m.category === catKey);
            if (catModules.length === 0) return null;

            const catLabel =
              catKey === 'markets' ? 'Power Markets'
              : catKey === 'analytics' ? 'Intelligence & Analytics'
              : catKey === 'economics' ? 'Tariffs & Economics'
              : 'Governance & Admin';

            const isCatOpen = openCategories[catKey] ?? false;
            const isCatActive = catModules.some(m => isActive(m.path) || m.subRoutes.some(s => isActive(s.path)));

            return (
              <React.Fragment key={catKey}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => setOpenCategories(prev => ({ ...prev, [catKey]: !isCatOpen }))}
                    sx={{
                      mx: 1,
                      mb: 0.5,
                      borderRadius: 1.5,
                      bgcolor: isCatActive ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                    }}
                  >
                    <ListItemText
                      primary={catLabel}
                      primaryTypographyProps={{
                        fontWeight: isCatActive ? 600 : 500,
                        fontSize: '13px',
                        color: isCatActive ? 'primary.main' : 'text.primary',
                      }}
                    />
                    {isCatOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </ListItemButton>
                </ListItem>

                <Collapse in={isCatOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2, pr: 1 }}>
                    {catModules.map((mod) => {
                      const isModActive = isActive(mod.path) || mod.subRoutes.some(s => isActive(s.path));
                      return (
                        <React.Fragment key={mod.key}>
                          <ListItemButton
                            onClick={() => {
                              if (mod.subRoutes.length > 0) {
                                setOpenModules(prev => ({ ...prev, [mod.key]: !prev[mod.key] }));
                              } else {
                                navigate(mod.path);
                                setMobileOpen(false);
                              }
                            }}
                            sx={{
                              mb: 0.5,
                              borderRadius: 1,
                              bgcolor: isModActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                              py: 0.75,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, color: mod.accentColor }}>
                              {mod.icon}
                            </Box>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span>{mod.title}</span>
                                  {mod.badge && (
                                    <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '999px', background: `${mod.accentColor}20`, color: mod.accentColor, fontWeight: 700 }}>
                                      {mod.badge}
                                    </span>
                                  )}
                                </Box>
                              }
                              primaryTypographyProps={{
                                fontWeight: isModActive ? 600 : 400,
                                fontSize: '12.5px',
                                color: isModActive ? 'primary.main' : 'text.primary',
                              }}
                            />
                            {mod.subRoutes.length > 0 && (openModules[mod.key] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
                          </ListItemButton>

                          {/* SubRoutes */}
                          {mod.subRoutes.length > 0 && (
                            <Collapse in={openModules[mod.key] ?? false} timeout="auto" unmountOnExit>
                              <List component="div" disablePadding sx={{ pl: 4 }}>
                                {mod.subRoutes.map((sub) => (
                                  <ListItemButton
                                    key={sub.path}
                                    onClick={() => { navigate(sub.path); setMobileOpen(false); }}
                                    sx={{
                                      py: 0.5,
                                      mb: 0.25,
                                      borderRadius: 1,
                                      bgcolor: isActive(sub.path) ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                                    }}
                                  >
                                    <ListItemText
                                      primary={sub.label}
                                      primaryTypographyProps={{
                                        fontSize: '11.5px',
                                        fontWeight: isActive(sub.path) ? 600 : 400,
                                        color: isActive(sub.path) ? 'primary.main' : 'text.secondary',
                                      }}
                                    />
                                  </ListItemButton>
                                ))}
                              </List>
                            </Collapse>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          })}
        </List>
      </Box>
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '13px' }}>
            Theme
          </Typography>
          <ThemeToggle showLabel />
        </Box>
        {isAuthenticated ? (
          <>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => { logout(); navigate('/dashboard'); setMobileOpen(false); }}
              sx={{ borderRadius: '999px', fontWeight: 500, fontSize: '14px' }}
            >
              Logout
            </Button>
          </>
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={() => { setLoginModalOpen(true); setMobileOpen(false); }}
            startIcon={<LoginIcon />}
            sx={{
              borderRadius: '999px',
              fontWeight: 500,
              fontSize: '14px',
              backgroundColor: '#2E51FF',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: '#1B3CC7',
              }
            }}
          >
            Admin Login
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: { xs: '58px', sm: '64px' },
          display: 'flex',
          justifyContent: 'center',
          backgroundColor: isDark ? '#0E1422' : '#FFFFFF',
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
          boxShadow: scrolled ? (isDark ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 14px rgba(15, 23, 42, 0.05)') : 'none',
          zIndex: (theme) => theme.zIndex.appBar,
          transition: 'all 250ms ease',
        }}
        color="inherit"
      >
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4 } }}>
          <Toolbar disableGutters sx={{ position: 'relative', height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* Left: Logo */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
            aria-label="Home"
          >
            <Box
              component="img"
              src={isDark ? "/assets/prolt_by_probus_dark.png" : "/assets/prolt_by_probus_light.png"}
              onError={(e: any) => { e.currentTarget.src = '/assets/logo.png'; }}
              alt="Prolt Energy by Probus"
              onClick={() => navigate('/dashboard')}
              sx={{
                cursor: 'pointer',
                maxHeight: { xs: '32px', sm: '38px', md: '42px' },
                height: 'auto',
                width: 'auto',
                objectFit: 'contain',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.02)'
                }
              }}
            />
          </Box>


          {/* Middle: Breadcrumb / GlobalSubHeader */}
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <GlobalSubHeader />
          </Box>


          {/* Right: Actions */}
          {isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ThemeToggle />
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="end"
                onClick={handleDrawerToggle}
                sx={{ color: isDark ? '#F8FAFC' : 'text.primary' }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, gap: 1.5, alignItems: 'center' }}>
              <ThemeToggle />
              {isAuthenticated ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      logout();
                      navigate('/dashboard');
                    }}
                    sx={{
                      borderRadius: '999px',
                      textTransform: 'none',
                      px: 3,
                      py: 0.5,
                      minHeight: '36px',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                      color: isDark ? '#E2E8F0' : '#475569',
                      fontWeight: 600,
                      fontSize: '13px',
                      transition: 'all 200ms ease',
                      '&:hover': {
                        borderColor: '#EF4444',
                        color: '#DC2626',
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2'
                      }
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => setLoginModalOpen(true)}
                  startIcon={<LoginIcon fontSize="small" />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '14px',
                    borderRadius: '999px',
                    px: 3,
                    py: 0.75,
                    minHeight: '40px',
                    backgroundColor: '#2E51FF',
                    color: '#FFFFFF',
                    boxShadow: 'none',
                    transition: 'all 250ms ease',
                    border: '1px solid transparent',
                    '&:hover': {
                      backgroundColor: '#1B3CC7',
                      borderColor: '#1B3CC7',
                      boxShadow: 'none',
                    }
                  }}
                >
                  Admin Login
                </Button>
              )}
            </Box>
          )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
          zIndex: (theme) => theme.zIndex.modal + 1,
        }}
      >
        {drawer}
      </Drawer>

      <LoginModal 
        open={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
      />
    </>
  );
}
