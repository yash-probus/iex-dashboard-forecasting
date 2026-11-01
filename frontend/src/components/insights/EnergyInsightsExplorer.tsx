import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Tabs, Tab, Avatar, Chip, AppBar, Toolbar, Divider, CircularProgress } from '@mui/material';
import { ArrowBack, LightbulbOutlined, ChevronLeft, ChevronRight, Notifications, Settings, Person } from '@mui/icons-material';
import WithoutProltTab from './WithoutProltTab';
import WithProltTab from './WithProltTab';
import { SavingsCalculatorEntry, ClientOverviewResult, fetchClientOverview } from '../../api/savingsCalculator.api';

interface EnergyInsightsExplorerProps {
  entry: SavingsCalculatorEntry;
  onBack: () => void;
}

export default function EnergyInsightsExplorer({ entry, onBack }: EnergyInsightsExplorerProps) {
  const [onboardState, setOnboardState] = useState<'not_onboarded' | 'onboarded' | 'industry'>('not_onboarded');
  const [connectionState, setConnectionState] = useState<'HV-1' | 'HV-2'>('HV-1');
  const [currentMonth, setCurrentMonth] = useState('Jul 2026');

  const [overview, setOverview] = useState<ClientOverviewResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchClientOverview(entry.id)
      .then(res => {
        if (isMounted) {
          setOverview(res);
          setLoading(false);
          // Set currentMonth to the most recent month if available
          if (res.months && res.months.length > 0) {
            setCurrentMonth(res.months[res.months.length - 1].month);
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch client overview for insights', err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [entry.id]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F0FDF4' }}>
        <CircularProgress color="success" />
      </Box>
    );
  }

  if (!overview) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F0FDF4', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" color="text.secondary">Failed to load insights data.</Typography>
        <Button variant="outlined" onClick={onBack}>Go Back</Button>
      </Box>
    );
  }

  // Format currency helpers for the banner
  const formatCurrency = (val: number) => `₹${(val / 100000).toFixed(2)}L`; // Convert to Lakhs for banner
  const formatFullCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F0FDF4', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px' }}>
          
          {/* Left Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Button 
              startIcon={<ArrowBack />} 
              onClick={onBack}
              sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 600 }}
            >
              Back to Calculator
            </Button>
            
            <Typography variant="h6" color="primary" fontWeight={800} sx={{ fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#EF4444' }}>Prolt</span>
              <span style={{ color: '#111827', marginLeft: '4px' }}>Energy</span>
            </Typography>

            <Box sx={{ display: 'flex', bgcolor: '#F3F4F6', p: 0.5, borderRadius: 2 }}>
              <Button 
                onClick={() => setOnboardState('not_onboarded')}
                sx={{ 
                  bgcolor: onboardState === 'not_onboarded' ? 'white' : 'transparent',
                  color: onboardState === 'not_onboarded' ? 'text.primary' : 'text.secondary',
                  boxShadow: onboardState === 'not_onboarded' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  textTransform: 'none', fontWeight: 600, px: 2, borderRadius: 1.5,
                  '&:hover': { bgcolor: onboardState === 'not_onboarded' ? 'white' : 'rgba(0,0,0,0.04)' }
                }}
              >
                Not Onboarded
              </Button>
              <Button 
                onClick={() => setOnboardState('onboarded')}
                sx={{ 
                  bgcolor: onboardState === 'onboarded' ? 'white' : 'transparent',
                  color: onboardState === 'onboarded' ? 'text.primary' : 'text.secondary',
                  boxShadow: onboardState === 'onboarded' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  textTransform: 'none', fontWeight: 600, px: 2, borderRadius: 1.5,
                  '&:hover': { bgcolor: onboardState === 'onboarded' ? 'white' : 'rgba(0,0,0,0.04)' }
                }}
              >
                Onboarded
              </Button>
              <Button 
                onClick={() => setOnboardState('industry')}
                sx={{ 
                  bgcolor: onboardState === 'industry' ? 'white' : 'transparent',
                  color: onboardState === 'industry' ? 'text.primary' : 'text.secondary',
                  boxShadow: onboardState === 'industry' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  textTransform: 'none', fontWeight: 600, px: 2, borderRadius: 1.5,
                  '&:hover': { bgcolor: onboardState === 'industry' ? 'white' : 'rgba(0,0,0,0.04)' }
                }}
              >
                Industry Insights
              </Button>
            </Box>

            <Box sx={{ display: 'flex', bgcolor: '#F3F4F6', p: 0.5, borderRadius: 2 }}>
              <Button 
                onClick={() => setConnectionState('HV-1')}
                sx={{ 
                  bgcolor: connectionState === 'HV-1' ? 'white' : 'transparent',
                  color: connectionState === 'HV-1' ? 'text.primary' : 'text.secondary',
                  boxShadow: connectionState === 'HV-1' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  textTransform: 'none', fontWeight: 600, px: 2, borderRadius: 1.5,
                  minWidth: 'auto',
                  '&:hover': { bgcolor: connectionState === 'HV-1' ? 'white' : 'rgba(0,0,0,0.04)' }
                }}
              >
                HV-1
              </Button>
              <Button 
                onClick={() => setConnectionState('HV-2')}
                sx={{ 
                  bgcolor: connectionState === 'HV-2' ? 'white' : 'transparent',
                  color: connectionState === 'HV-2' ? 'text.primary' : 'text.secondary',
                  boxShadow: connectionState === 'HV-2' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  textTransform: 'none', fontWeight: 600, px: 2, borderRadius: 1.5,
                  minWidth: 'auto',
                  '&:hover': { bgcolor: connectionState === 'HV-2' ? 'white' : 'rgba(0,0,0,0.04)' }
                }}
              >
                HV-2
              </Button>
            </Box>
          </Box>

          {/* Right Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F1F5F9', px: 2, py: 0.5, borderRadius: 5, gap: 1 }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">Onboarding: Document Collection</Typography>
              <Chip size="small" label="3/8" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#94A3B8', color: 'white' }} />
            </Box>
            
            <IconButton size="small">
              <Notifications fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <Settings fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <Person fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Content Area */}
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>


          {onboardState === 'not_onboarded' && <WithoutProltTab entry={entry} overview={overview} currentMonth={currentMonth} />}
          {onboardState === 'onboarded' && <WithProltTab entry={entry} overview={overview} currentMonth={currentMonth} />}
          {onboardState === 'industry' && (
             <Box sx={{ textAlign: 'center', py: 10 }}>
               <Typography variant="h5" color="text.secondary" fontWeight={600}>Industry Insights coming soon...</Typography>
             </Box>
          )}

        </Box>
      </Box>

      {/* Bottom bar for "Back to Calculator" if needed, though top header has it */}
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={onBack} sx={{ borderRadius: 2, fontWeight: 600, px: 3, py: 1 }}>
          Back to Calculator
        </Button>
      </Box>

    </Box>
  );
}
