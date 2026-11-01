import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Typography, Box, Paper, MenuItem, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

export interface CommercialProposalModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  initialData?: {
    client_name?: string;
    industry_name?: string;
    sanctioned_load?: string | number;
    connectivity?: string;
    discom_name?: string;
    feeder_type?: string;
    traderMargin?: number;
    probusPlatformFee?: number;
    proltMargin?: number;
  };
}

const FEEDER_OPTIONS = [
  'Dedicated Feeder',
  'Mixed Feeder'
];

const VOLTAGE_OPTIONS = [
  '11 kV',
  '33 kV',
  '66 kV',
  '132 kV',
  '220 kV'
];

const DISCOM_OPTIONS = [
  'PVVNL',
  'DVVNL',
  'MVVNL',
  'PuVVNL',
  'KESCO',
  'NPCL'
];

export default function CommercialProposalModal({
  open,
  onClose,
  onSubmit,
  initialData
}: CommercialProposalModalProps) {
  const [loading, setLoading] = useState(false);

  // Section 1: Facility Info
  const [clientName, setClientName] = useState('');
  const [sanctionedLoad, setSanctionedLoad] = useState('');
  const [connectivity, setConnectivity] = useState('');
  const [discomName, setDiscomName] = useState('');
  const [feederType, setFeederType] = useState('Dedicated Feeder');

  // Section 2: Fixed One-Time Costs
  const [abtSupplyCost, setAbtSupplyCost] = useState('450000');
  const [abtServiceCost, setAbtServiceCost] = useState('350000');
  const [utilityLiaisoningCost, setUtilityLiaisoningCost] = useState('300000');
  const [bankGuaranteeCost, setBankGuaranteeCost] = useState('150000');

  // Section 3: Fixed Recurring Charges
  const [iexAnnualFee, setIexAnnualFee] = useState('100000');
  const [sldcMonthlyNoc, setSldcMonthlyNoc] = useState('7000');
  const [st11Settlement, setSt11Settlement] = useState('20000');

  // Section 4: Probus Fees
  const [tradingMargin, setTradingMargin] = useState('2p/kWh');
  const [platformFee, setPlatformFee] = useState('2p/kWh');
  const [valueShare, setValueShare] = useState('15%');
  const [smartMeteringInfra, setSmartMeteringInfra] = useState('125000');
  const [smartMeteringInfraPaymentTerm, setSmartMeteringInfraPaymentTerm] = useState('100% Advance against PO/PI');

  useEffect(() => {
    if (open) {
      const name = initialData?.industry_name || initialData?.client_name || '';
      setClientName(name);

      const sLoad = initialData?.sanctioned_load ? String(initialData.sanctioned_load) : '1000 kW';
      setSanctionedLoad(sLoad.includes('kW') || sLoad.includes('kVA') ? sLoad : `${sLoad} kW`);

      setConnectivity(initialData?.connectivity || '11 kV');
      setDiscomName(initialData?.discom_name || 'PVVNL');
      setFeederType(initialData?.feeder_type || 'Dedicated Feeder');

      setAbtSupplyCost('450000');
      setAbtServiceCost('350000');
      setUtilityLiaisoningCost('300000');
      setBankGuaranteeCost('150000');

      setIexAnnualFee('100000');
      setSldcMonthlyNoc('7000');
      setSt11Settlement('20000');

      const tm = initialData?.traderMargin ? `${initialData.traderMargin * 100}p/kWh` : '2p/kWh';
      const pf = initialData?.probusPlatformFee ? `${initialData.probusPlatformFee * 100}p/kWh` : '2p/kWh';
      const vs = initialData?.proltMargin ? `${initialData.proltMargin}%` : '15%';

      setTradingMargin(tm);
      setPlatformFee(pf);
      setValueShare(vs);
      setSmartMeteringInfra('125000');
      setSmartMeteringInfraPaymentTerm('100% Advance against PO/PI');
    }
  }, [open, initialData]);

  // Auto-update defaults based on parameters
  useEffect(() => {
    if (!open) return;
    
    let defaultSupply = 450000;
    let defaultService = 350000;
    let defaultLiaison = 300000;
    let defaultSmart = 125000;
    
    // For now assuming State is always UP based on context
    defaultLiaison = 395000;
    defaultSmart = 170000;
    
    const v = connectivity.toUpperCase();
    const d = discomName.toUpperCase();
    
    if (v.includes('33') && (v.includes('KV') || v.includes('K V'))) {
      if (d.includes('NPCL')) {
        defaultSupply = 845000;
        defaultService = 358000;
      } else {
        defaultSupply = 745000;
        defaultService = 358000;
      }
    } else { // 11kV
      defaultSupply = 565000;
      defaultService = 338000;
    }
    
    setAbtSupplyCost(String(defaultSupply));
    setAbtServiceCost(String(defaultService));
    setUtilityLiaisoningCost(String(defaultLiaison));
    setSmartMeteringInfra(String(defaultSmart));
  }, [discomName, connectivity, feederType, open]);

  const totalAbtSetup = (Number(abtSupplyCost) || 0) + (Number(abtServiceCost) || 0) + (Number(utilityLiaisoningCost) || 0);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        client_name: clientName,
        industry_name: clientName,
        sanctioned_load: sanctionedLoad,
        connectivity,
        discom_name: discomName,
        feeder_type: feederType,
        abt_supply_cost: Number(abtSupplyCost) || 450000,
        abt_service_cost: Number(abtServiceCost) || 350000,
        utility_liaisoning_cost: Number(utilityLiaisoningCost) || 300000,
        bank_guarantee_cost: Number(bankGuaranteeCost) || 150000,
        iex_annual_fee: Number(iexAnnualFee) || 100000,
        sldc_monthly_noc: Number(sldcMonthlyNoc) || 7000,
        st11_settlement: Number(st11Settlement) || 20000,
        trading_margin: tradingMargin,
        platform_fee: platformFee,
        value_share: valueShare,
        smart_metering_infra: Number(smartMeteringInfra) || 125000,
        smart_metering_infra_payment_term: smartMeteringInfraPaymentTerm
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Error submitting commercial proposal form:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth disableEnforceFocus>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon sx={{ color: '#D97706' }} />
          <Typography variant="h6" fontWeight={700} color="#1E293B">
            Download Commercial Proposal
          </Typography>
        </Box>
        <Button onClick={onClose} size="small" color="inherit">
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, bgcolor: '#F8FAFC' }}>
        {/* Section 1: Facility Parameters Table */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BusinessIcon sx={{ color: '#8B5CF6' }} />
            <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
              Client & Facility Details (Header Table)
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Client / Industry Name"
                fullWidth
                size="small"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sanctioned Load"
                fullWidth
                size="small"
                value={sanctionedLoad}
                onChange={(e) => setSanctionedLoad(e.target.value)}
                placeholder="e.g. 1000 kW"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Connectivity / Voltage"
                fullWidth
                size="small"
                value={connectivity}
                onChange={(e) => setConnectivity(e.target.value)}
              >
                {VOLTAGE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="DISCOM Name"
                fullWidth
                size="small"
                value={discomName}
                onChange={(e) => setDiscomName(e.target.value)}
              >
                {DISCOM_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Feeder Type"
                fullWidth
                size="small"
                value={feederType}
                onChange={(e) => setFeederType(e.target.value)}
              >
                {FEEDER_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* BOQ Heading */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DescriptionIcon sx={{ color: '#059669' }} />
          <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
            BOQ
          </Typography>
        </Box>

        {/* Pricing Table (Matching Word Document Layout) */}
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', mb: 3 }}>
          <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #E2E8F0', py: 1.5 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1E293B' }}>
                <TableCell sx={{ color: '#FFF', fontWeight: 700, width: '60px' }}>S. No.</TableCell>
                <TableCell sx={{ color: '#FFF', fontWeight: 700 }}>Item Description</TableCell>
                <TableCell sx={{ color: '#FFF', fontWeight: 700, width: '100px', textAlign: 'center' }}>UoM</TableCell>
                <TableCell sx={{ color: '#FFF', fontWeight: 700, width: '120px', textAlign: 'center' }}>Occurrence</TableCell>
                <TableCell sx={{ color: '#FFF', fontWeight: 700, width: '180px', textAlign: 'right' }}>Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Section 1: ABT Metering */}
              <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>1</TableCell>
                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>ABT Metering Setup</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right', pr: 3 }}>₹{totalAbtSetup.toLocaleString('en-IN')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>1.1</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ textDecoration: 'underline', mb: 0.5 }}>Supply:</Typography>
                  <Typography variant="body2" color="textSecondary">- ABT Meters Secure Make (0.2s Class Accuracy) - 3 Nos.</Typography>
                  <Typography variant="body2" color="textSecondary">- Indoor Meter Cubical with CT/PT (0.2s Class Accuracy) - {discomName.toUpperCase().includes('NPCL') && connectivity.includes('33') ? '2 Nos.' : '1 Nos.'}</Typography>
                  {!(discomName.toUpperCase().includes('NPCL') && connectivity.includes('33')) && (
                    <Typography variant="body2" color="textSecondary">- Outdoor CT/PT Unit (0.2s Class Accuracy) - 1 Nos.</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Lot</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>One Time</TableCell>
                <TableCell>
                  <TextField size="small" type="number" fullWidth InputProps={{ startAdornment: '₹' }} value={abtSupplyCost} onChange={(e) => setAbtSupplyCost(e.target.value)} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>1.2</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ textDecoration: 'underline', mb: 0.5 }}>Service: Installation, Commissioning, Testing & Sealing of Meters & Consultancy Charges thereof:</Typography>
                  <Typography variant="body2" color="textSecondary">- ABT Meters- 3 Nos.</Typography>
                  <Typography variant="body2" color="textSecondary">- Indoor CT/PT Unit- {discomName.toUpperCase().includes('NPCL') && connectivity.includes('33') ? '2 Nos.' : '1 Nos.'}</Typography>
                  {!(discomName.toUpperCase().includes('NPCL') && connectivity.includes('33')) && (
                    <Typography variant="body2" color="textSecondary">- Outdoor CT/PT Unit- 1 Nos.</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Lot</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>One Time</TableCell>
                <TableCell>
                  <TextField size="small" type="number" fullWidth InputProps={{ startAdornment: '₹' }} value={abtServiceCost} onChange={(e) => setAbtServiceCost(e.target.value)} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>1.3</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ textDecoration: 'underline', mb: 0.5 }}>Utility Liaisoning & Consultancy</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Lot</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>One Time</TableCell>
                <TableCell>
                  <TextField size="small" type="number" fullWidth InputProps={{ startAdornment: '₹' }} value={utilityLiaisoningCost} onChange={(e) => setUtilityLiaisoningCost(e.target.value)} />
                </TableCell>
              </TableRow>

              {/* Section 2: SLDC Security */}
              <TableRow sx={{ bgcolor: '#E0F2FE' }}>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>2</TableCell>
                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>SLDC Security Deposit (Refundable)</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right', pr: 3 }}>₹{Number(bankGuaranteeCost).toLocaleString('en-IN')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>2.1</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ textDecoration: 'underline' }}>UPSLDC Bank Guarantee / FDR</Typography>
                  <Typography variant="caption" color="textSecondary">(Payable to UPSLDC by customer @ Rs 1,50,000 / MW)</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Lot</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>One Time</TableCell>
                <TableCell>
                  <TextField size="small" type="number" fullWidth InputProps={{ startAdornment: '₹' }} value={bankGuaranteeCost} onChange={(e) => setBankGuaranteeCost(e.target.value)} />
                </TableCell>
              </TableRow>

              {/* Section 3: Fixed Recurring */}
              <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>3</TableCell>
                <TableCell colSpan={4} sx={{ fontWeight: 700 }}>Fixed Recurring Charges</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>3.1</TableCell>
                <TableCell><Typography variant="body2">IEX Annual Membership Fees</Typography></TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Lot</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Annual</TableCell>
                <TableCell><TextField size="small" type="number" fullWidth InputProps={{ startAdornment: '₹' }} value={iexAnnualFee} onChange={(e) => setIexAnnualFee(e.target.value)} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>3.2</TableCell>
                <TableCell><Typography variant="body2">UPSLDC Monthly NOC Charges</Typography></TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Lot</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Monthly</TableCell>
                <TableCell><TextField size="small" type="number" fullWidth InputProps={{ startAdornment: '₹' }} value={sldcMonthlyNoc} onChange={(e) => setSldcMonthlyNoc(e.target.value)} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>3.3</TableCell>
                <TableCell><Typography variant="body2">ST-11 & Bill Settlement</Typography></TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Lot</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Monthly</TableCell>
                <TableCell><TextField size="small" type="number" fullWidth InputProps={{ startAdornment: '₹' }} value={st11Settlement} onChange={(e) => setSt11Settlement(e.target.value)} /></TableCell>
              </TableRow>

              {/* Section 4: Probus Fees */}
              <TableRow sx={{ bgcolor: '#DBEAFE' }}>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>4</TableCell>
                <TableCell colSpan={4} sx={{ fontWeight: 700 }}>Probus Fees</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>4.1</TableCell>
                <TableCell><Typography variant="body2">Probus Trading Margin</Typography></TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Per kWh</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Monthly</TableCell>
                <TableCell><TextField size="small" fullWidth value={tradingMargin} onChange={(e) => setTradingMargin(e.target.value)} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>4.2</TableCell>
                <TableCell><Typography variant="body2">Probus Platform Fees for Prolt</Typography></TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Per kWh</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Monthly</TableCell>
                <TableCell><TextField size="small" fullWidth value={platformFee} onChange={(e) => setPlatformFee(e.target.value)} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>4.3</TableCell>
                <TableCell><Typography variant="body2">Probus Value Share for Prolt</Typography></TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Percent</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Monthly</TableCell>
                <TableCell><TextField size="small" fullWidth value={valueShare} onChange={(e) => setValueShare(e.target.value)} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ textAlign: 'center' }}>4.4</TableCell>
                <TableCell>
                  <Typography variant="body2">Prolt Energy Smart Metering Infra</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Lot</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>One Time</TableCell>
                <TableCell><TextField size="small" type="number" fullWidth InputProps={{ startAdornment: '₹' }} value={smartMeteringInfra} onChange={(e) => setSmartMeteringInfra(e.target.value)} /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} color="#1E293B" sx={{ mb: 2 }}>Terms & Conditions</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Prolt Energy Smart Metering Infra Payment Term</Typography>
              <TextField 
                size="small" 
                select 
                fullWidth 
                value={smartMeteringInfraPaymentTerm} 
                onChange={(e) => setSmartMeteringInfraPaymentTerm(e.target.value)}
              >
                <MenuItem value="75% Advance against PO/PI">75% Advance against PO/PI</MenuItem>
                <MenuItem value="50% Advance against PO/PI">50% Advance against PO/PI</MenuItem>
                <MenuItem value="100% Advance against PO/PI">100% Advance against PO/PI</MenuItem>
                <MenuItem value="FOC for minimum 3 years contract period">FOC for minimum 3 years contract period</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', bgcolor: '#FFFFFF' }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
          sx={{
            bgcolor: '#D97706',
            '&:hover': { bgcolor: '#B45309' },
            fontWeight: 700,
            textTransform: 'none',
            px: 3
          }}
        >
          {loading ? 'Generating...' : 'Download Commercial Proposal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
