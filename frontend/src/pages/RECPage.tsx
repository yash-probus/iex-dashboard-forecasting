import React from 'react';
import { Box, Typography, Alert, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import { TrendingUp, BarChart, ElectricBolt, ShowChart, FileDownload as DownloadIcon, FileUpload as UploadIcon, Add as AddIcon, GetApp as TemplateIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import FilterContainer from '../components/dashboard/FilterContainer';
import ActionButton from '../components/common/ActionButton';
import SummaryGrid from '../components/dashboard/SummaryGrid';
import SummaryCard from '../components/dashboard/SummaryCard';
import MarketChart, { ChartMetric } from '../components/dashboard/MarketChart';
import TableContainer, { ColumnDefinition } from '../components/dashboard/TableContainer';
import { SummaryCardSkeleton, ChartSkeleton, TableSkeleton } from '../components/dashboard/Skeletons';
import EmptyState from '../components/dashboard/EmptyState';
import RECEntryDialog from '../components/dashboard/RECEntryDialog';
import { useMarketFilters } from '../hooks/useMarketFilters';
import { useMarketData } from '../hooks/useMarketData';
import { exportToCSV } from '../utils/export';
import { formatOverviewDate, formatTimeblock } from '../utils/date';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { uploadApi } from '../api/upload.api';

const REC_ACCENT = '#3B8FF3'; // Resolved from var(--color-market-dam) for alpha() support

const chartMetrics: ChartMetric[] = [
  { key: 'purchaseBid', name: 'Purchase Bid', color: '#3B8FF3', type: 'area', yAxisId: 'left', unit: 'Certificates' },
  { key: 'sellBid', name: 'Sell Bid', color: '#F29F67', type: 'area', yAxisId: 'left', unit: 'Certificates' },
  { key: 'mcv', name: 'MCV', color: '#34B1AA', type: 'area', yAxisId: 'left', unit: 'Certificates' },
  { key: 'fsv', name: 'FSV', color: '#8B5CF6', type: 'area', yAxisId: 'left', unit: 'Certificates' },
  { key: 'mcp', name: 'MCP', color: '#374151', type: 'line', yAxisId: 'right', unit: '₹/Certificate' },
];

export default function RECPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { filters, handleDateChange, handleIntervalChange } = useMarketFilters();
  const { data, summaryMetrics, isLoading, error } = useMarketData('REC', filters);
  const [marketView, setMarketView] = React.useState<'all-india' | 'state-wise'>('all-india');

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = React.useState(false);
  const { showNotification } = useNotification();

  const handleDownloadTemplate = () => {
    const headers = ['Date', 'Purchase Bid (MW)', 'Sell Bid (MW)', 'MCV (MW)', 'Final Scheduled Volume (MW)', 'MCP (Rs/MWh)'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'REC_Market_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualEntrySubmit = async (formData: any) => {
    setIsUploading(true);
    try {
      // Generate CSV content with exactly the required headers
      const headers = ['Date', 'Purchase Bid (MW)', 'Sell Bid (MW)', 'MCV (MW)', 'Final Scheduled Volume (MW)', 'MCP (Rs/MWh)'];
      const row = [
        formData.date,
        formData.purchaseBid,
        formData.sellBid,
        formData.mcv,
        formData.fsv,
        formData.mcp
      ];
      const csvContent = headers.join(',') + '\n' + row.join(',') + '\n';
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], `REC_Manual_${formData.date}.csv`, { type: 'text/csv' });
      
      try {
        await uploadApi.uploadDataset('REC', formData.date, file);
      } catch (uploadErr: any) {
        if (uploadErr.response?.status === 409) {
          // If dataset already exists, overwrite it
          await uploadApi.uploadDataset('REC', formData.date, file, 'replace');
        } else {
          throw uploadErr;
        }
      }
      showNotification("Entry added successfully. Refreshing...", 'success');
      setIsEntryDialogOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      showNotification(err.response?.data?.message || err.message || 'Failed to save entry', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      try {
        await uploadApi.uploadDataset('REC', filters.startDate, file);
      } catch (uploadErr: any) {
        if (uploadErr.response?.status === 409) {
          // If dataset already exists, overwrite it
          await uploadApi.uploadDataset('REC', filters.startDate, file, 'replace');
        } else {
          throw uploadErr;
        }
      }
      showNotification("Data uploaded successfully. Refreshing...", 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      showNotification(err.response?.data?.message || err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getColumns = (): ColumnDefinition[] => {
    const formatNum = (v: any) => typeof v === 'number' ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v;

    return [
      {
        field: 'year',
        headerName: 'Year',
        sticky: true,
        width: 100,
        align: 'center',
        renderCell: (row: any) => {
          const d = new Date(row.date);
          return isNaN(d.getTime()) ? '-' : d.getFullYear();
        }
      },
      {
        field: 'year',
        headerName: 'Year',
        sticky: true,
        width: 100,
        align: 'center',
        renderCell: (row: any) => {
          return (
            <Typography variant="body2" color="text.secondary">
              {row.year || '-'}
            </Typography>
          );
        }
      },
      {
        field: 'month',
        headerName: 'Month',
        sticky: true,
        width: 120,
        align: 'center',
        renderCell: (row: any) => {
          return (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {row.month || '-'}
            </Typography>
          );
        }
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 100,
        align: 'center',
        renderCell: (row: any) => row.type || 'REC'
      },
      { field: 'buyBids', headerName: 'Buy Bids (REC)', width: 140, align: 'center', valueFormatter: formatNum },
      { field: 'sellBids', headerName: 'Sell Bids (REC)', width: 140, align: 'center', valueFormatter: formatNum },
      { field: 'clearedVolume', headerName: 'Cleared Volume (REC)', width: 160, align: 'center', valueFormatter: formatNum },
      { field: 'clearedPrice', headerName: 'Cleared Price(Rs/REC)', width: 160, align: 'center', valueFormatter: formatNum },
      { field: 'noOfParticipants', headerName: 'No. Of Participants', width: 140, align: 'center', valueFormatter: (v: any) => v || '-' },
    ];
  };

  const columns = getColumns();

  const handleExport = () => exportToCSV(data, `REC_Data_${filters.startDate}_to_${filters.endDate}`, columns);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2.5,
        mb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{
            color: REC_ACCENT,
            backgroundColor: `${REC_ACCENT}15`,
            p: 2,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BarChart fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h1" sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '-0.5px', mb: 0.5 }}>
              REC Market
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Analyze REC market trends, volumes, and prices.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {marketView === 'all-india' && (
            <FilterContainer
              accentColor={REC_ACCENT}
              filters={filters}
              maxDays={36500}
              onSearch={(newFilters, selectedState) => {
                if (newFilters.startDate !== filters.startDate || newFilters.endDate !== filters.endDate) handleDateChange(newFilters.startDate, newFilters.endDate);
                if (newFilters.interval !== filters.interval) handleIntervalChange(newFilters.interval);
              }}
              onManageData={isAuthenticated ? () => navigate('/admin/market-data') : undefined}
              hideHourlyDaily={true}
            />
          )}
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.xlxs"
            hidden
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <ActionButton
            variant="secondary"
            startIcon={<TemplateIcon fontSize="small" />}
            onClick={handleDownloadTemplate}
            accentColor={REC_ACCENT}
          >
            Download Template
          </ActionButton>
          <ActionButton
            variant="secondary"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setIsEntryDialogOpen(true)}
            accentColor={REC_ACCENT}
          >
            Add Entry
          </ActionButton>
          <ActionButton
            variant="secondary"
            startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon fontSize="small" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            accentColor={REC_ACCENT}
          >
            {isUploading ? 'Uploading...' : 'Upload Data'}
          </ActionButton>
          <ActionButton
            variant="secondary"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={handleExport}
            accentColor={REC_ACCENT}
          >
            Export Data
          </ActionButton>
          <ToggleButtonGroup
            value={marketView}
            exclusive
            onChange={(e, value) => value && setMarketView(value)}
            size="small"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2.5,
              p: 0.5,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 2,
                px: 2.5,
                py: 0.75,
                textTransform: 'none',
                fontWeight: 600,
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: REC_ACCENT,
                  color: '#FFF',
                  '&:hover': {
                    bgcolor: REC_ACCENT,
                  }
                }
              }
            }}
          >
            <ToggleButton value="all-india">All India</ToggleButton>
            <ToggleButton value="state-wise">State Wise</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {marketView === 'state-wise' ? (
        <EmptyState
          title="State-wise Data Under Integration"
          description="State-wise REC Market data is not yet available in the system. We are working on integrating state-level market clearing volumes, purchase/sell bids, and prices."
        />
      ) : error ? (
        <EmptyState
          title="No Market Data Found"
          description={error}
        />
      ) : (
        <>
          <SummaryGrid>
            {isLoading ? <SummaryCardSkeleton /> : <SummaryCard title="Average MCP" value={`₹ ${Number(summaryMetrics.averageMcp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<TrendingUp fontSize="small" />} accentColor={REC_ACCENT} />}
            {isLoading ? <SummaryCardSkeleton /> : <SummaryCard title="Total Volume" value={`${Number(summaryMetrics.totalVolume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MW`} icon={<BarChart fontSize="small" />} accentColor={REC_ACCENT} />}
            {isLoading ? <SummaryCardSkeleton /> : <SummaryCard title="Max MCV" value={`${Number(summaryMetrics.maxMcv || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MW`} icon={<ElectricBolt fontSize="small" />} accentColor={REC_ACCENT} />}
            {isLoading ? <SummaryCardSkeleton /> : <SummaryCard title="Max FSV" value={`${Number(summaryMetrics.maxFsv || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MW`} icon={<ShowChart fontSize="small" />} accentColor={REC_ACCENT} />}
          </SummaryGrid>

          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <MarketChart
              title="REC Market Overview"
              data={data}
              metrics={chartMetrics}
              dateRangeLabel={`${filters.startDate} to ${filters.endDate}`}
              interval={filters.interval}
            />
          )}

          {isLoading ? (
            <TableSkeleton />
          ) : (
            <TableContainer
              title="REC Interval Data"
              data={data}
              columns={columns}
              onExport={handleExport}
            />
          )}
        </>
      )}

      {/* Manual Entry Dialog */}
      <RECEntryDialog 
        open={isEntryDialogOpen} 
        onClose={() => setIsEntryDialogOpen(false)}
        onSubmit={handleManualEntrySubmit}
        isSubmitting={isUploading}
      />
    </Box>
  );
}
