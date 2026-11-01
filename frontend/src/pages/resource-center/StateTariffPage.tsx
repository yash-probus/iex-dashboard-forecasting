import React, { useState } from 'react';
import { FormControl, Select, MenuItem, InputLabel, Box, Typography, Tooltip, IconButton, Snackbar, Alert } from '@mui/material';
import { PriceCheck as PriceCheckIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ResourcePageLayout from '../../components/dashboard/ResourcePageLayout';
import EmptyTableState from '../../components/dashboard/EmptyTableState';
import TableContainer, { ColumnDefinition } from '../../components/dashboard/TableContainer';
import { exportToCSV } from '../../utils/export';
import { useResourceData } from '../../hooks/useResourceData';
import { RESOURCE_CENTER_PAGES } from './constants/resourceCenter.constants';
import { StateTariff } from './types/resourceCenter.types';
import { formatYYYYMM as formatMonth } from '../../utils/common';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdateResourceRecord, useDeleteResourceRecord } from '../../hooks/useResourceMutations';
import ResourceFormModal from '../../components/admin/ResourceFormModal';
import ResourceDeleteDialog from '../../components/admin/ResourceDeleteDialog';
import { RESOURCE_CONFIG } from '../admin/resource-center/config/resourceConfig';

export default function StateTariffPage() {
  const { data, loading, error, refresh, bulkUpload } = useResourceData<StateTariff>('state-tariff');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const config = RESOURCE_CENTER_PAGES.STATE_TARIFF;
  const { isAdmin } = useAuth();

  // Modals & mutations state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSuccess = (msg: string) => {
    showSnackbar(msg, 'success');
    setFormModalOpen(false);
    setDeleteDialogOpen(false);
    refresh();
  };

  const handleError = (err: Error) => {
    showSnackbar(err.message || 'Something went wrong. Please try again.', 'error');
  };

  const updateMutation = useUpdateResourceRecord({ resourceType: 'state-tariff', onSuccess: handleSuccess, onError: handleError });
  const deleteMutation = useDeleteResourceRecord({ resourceType: 'state-tariff', onSuccess: handleSuccess, onError: handleError });

  const isSubmitting = updateMutation.isSubmitting || deleteMutation.isSubmitting;

  const handleEditClick = (record: any) => {
    setEditingRecord(record);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (record: any) => {
    setDeletingId(record.id);
    setDeleteDialogOpen(true);
  };

  const handleSaveRecord = async (formData: any) => {
    if (editingRecord && editingRecord.id) {
      await updateMutation.mutate(editingRecord.id, formData);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    await deleteMutation.mutate(deletingId);
  };

  const uniqueStates = Array.from(new Set(data.map((r: StateTariff) => r.state).filter(Boolean))).sort();
  const filteredForCat = selectedState === 'all' ? data : data.filter((r: StateTariff) => r.state === selectedState);
  const uniqueCategories = Array.from(new Set(filteredForCat.map((r: StateTariff) => r.consumerCategory).filter(Boolean))).sort();
  const filteredForSubCat = filteredForCat.filter((r: StateTariff) => selectedCategory === 'all' || r.consumerCategory === selectedCategory);
  const uniqueSubCategories = Array.from(new Set(filteredForSubCat.map((r: StateTariff) => r.subCategory).filter(Boolean))).sort();
  const filteredForYears = filteredForSubCat.filter((r: StateTariff) => selectedSubCategory === 'all' || r.subCategory === selectedSubCategory);
  const uniqueYears = Array.from(new Set(filteredForYears.map((r: StateTariff) => {
    const s = String(r.month);
    return s.length === 6 ? s.slice(0, 4) : '';
  }).filter(Boolean))).sort();

  const filteredData = data.filter((row: StateTariff) => {
    // Text search
    const lowerQuery = searchQuery.toLowerCase();
    const monthStr = formatMonth(row.month).toLowerCase();
    
    const matchesSearch = !searchQuery || 
      monthStr.includes(lowerQuery) ||
      String(row.state || '').toLowerCase().includes(lowerQuery) ||
      String(row.consumerCategory || '').toLowerCase().includes(lowerQuery) ||
      String(row.subCategory || '').toLowerCase().includes(lowerQuery) ||
      String(row.supplyVoltageCategory || '').toLowerCase().includes(lowerQuery) ||
      String(row.supplyVoltage || '').toLowerCase().includes(lowerQuery) ||
      String(row.baseEnergyUnit || '').toLowerCase().includes(lowerQuery) ||
      String(row.energyRate).includes(lowerQuery);

    // Dropdown filters
    const matchesState = selectedState === 'all' || row.state === selectedState;
    const matchesCategory = selectedCategory === 'all' || row.consumerCategory === selectedCategory;
    const matchesSubCategory = selectedSubCategory === 'all' || row.subCategory === selectedSubCategory;
    
    const rowYear = String(row.month).length === 6 ? String(row.month).slice(0, 4) : '';
    const matchesYear = selectedYear === 'all' || rowYear === selectedYear;

    return matchesSearch && matchesState && matchesCategory && matchesSubCategory && matchesYear;
  });

  const formatNum = (v: unknown) => typeof v === 'number' ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 5 }) : v;

  const baseColumns: ColumnDefinition[] = [
    { field: 'state', headerName: 'State', align: 'center', width: 180, sticky: true },
    { field: 'consumerCategory', headerName: 'Consumer Category', align: 'center', width: 160 },
    { field: 'subCategory', headerName: 'Sub Category', align: 'center', width: 260 },
    { field: 'supplyVoltageCategory', headerName: 'Supply Voltage Category', align: 'center', width: 220 },
    { field: 'supplyVoltage', headerName: 'Supply Voltage', align: 'center', width: 150 },
    { field: 'month', headerName: 'Month', align: 'center', width: 120, valueFormatter: formatMonth },
    { field: 'todStartTime', headerName: 'TOD Start Time', align: 'center', width: 150 },
    { field: 'todEndTime', headerName: 'TOD End Time', align: 'center', width: 150 },
    { field: 'baseEnergyRate', headerName: 'Base Energy Rate (₹)', align: 'center', width: 180, valueFormatter: formatNum },
    { field: 'baseEnergyUnit', headerName: 'Unit', align: 'center', width: 100 },
    { field: 'todChargePercent', headerName: 'TOD Charge %', align: 'center', width: 150 },
    { field: 'energyRate', headerName: 'Energy Rate (₹)', align: 'center', width: 150, valueFormatter: formatNum },
  ];

  const columns = [
    ...baseColumns,
    ...(isAdmin ? [{
      field: 'actions',
      headerName: 'Actions',
      align: 'center' as const,
      width: 120,
      sticky: false,
      renderCell: (row: any) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleEditClick(row)} sx={{ color: 'primary.main' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => handleDeleteClick(row)} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }] : [])
  ];

  const handleExport = () => {
    const exportData = filteredData.map((row: any) => ({
      'State': row.state,
      'Consumer Category': row.consumerCategory,
      'Sub Category': row.subCategory,
      'Supply Voltage Category': row.supplyVoltageCategory,
      'Supply Voltage': row.supplyVoltage,
      'Month': formatMonth(row.month),
      'TOD Start Time': row.todStartTime,
      'TOD End Time': row.todEndTime,
      'Base Energy Rate (₹)': row.baseEnergyRate,
      'Base Energy Unit': row.baseEnergyUnit,
      'TOD Charge %': row.todChargePercent,
      'Energy Rate (₹)': row.energyRate,
    }));
    exportToCSV(exportData, config.exportFilename);
  };

  return (
    <ResourcePageLayout lastUpdated={data.length > 0 ? data.reduce((latest: any, r: any) => !r.updatedAt || (latest && latest > r.updatedAt) ? latest : r.updatedAt, null) : null} resourceType="state-tariff"
      title={config.title}
      subtitle={config.subtitle}
      icon={<PriceCheckIcon fontSize="large" />}
      iconColor="#EF4444"
      iconBgColor="#EF444415"
      totalRecords={filteredData.length}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={config.searchPlaceholder}
      onUpload={async (parsedData) => {
        try {
          await bulkUpload(parsedData);
          refresh();
          alert('Upload successful!');
        } catch (err: any) {
          alert('Upload failed: ' + err.message);
          return false;
        }
      }}
      onExport={handleExport}
      isExportDisabled={filteredData.length === 0}
      customFilters={
        <>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>State</InputLabel>
            <Select
              value={selectedState}
              label="State"
              onChange={(e) => setSelectedState(e.target.value)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <MenuItem value="all">All States</MenuItem>
              {uniqueStates.map((state) => (
                <MenuItem key={state as string} value={state as string}>{state as string}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Category"
              onChange={(e) => setSelectedCategory(e.target.value)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {uniqueCategories.map((cat) => (
                <MenuItem key={cat as string} value={cat as string}>{cat as string}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sub Category</InputLabel>
            <Select
              value={selectedSubCategory}
              label="Sub Category"
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <MenuItem value="all">All Sub Categories</MenuItem>
              {uniqueSubCategories.map((subCat) => (
                <MenuItem key={subCat as string} value={subCat as string}>{subCat as string}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{ bgcolor: 'background.paper' }}
            >
              <MenuItem value="all">All Years</MenuItem>
              {uniqueYears.map((year) => (
                <MenuItem key={year as string} value={year as string}>{year as string}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      }
    >
      <TableContainer 
        data={filteredData}
        columns={columns}
        loading={loading}
        emptyStateMessage={
          <EmptyTableState 
            title="No records available" 
            description={config.emptyMessage}
          />
        }
      />

      {RESOURCE_CONFIG['state-tariff'] && (
        <ResourceFormModal
          open={formModalOpen}
          title={RESOURCE_CONFIG['state-tariff'].title}
          fields={RESOURCE_CONFIG['state-tariff'].fields}
          initialData={editingRecord}
          isSubmitting={isSubmitting}
          onClose={() => setFormModalOpen(false)}
          onSave={handleSaveRecord}
        />
      )}

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        isSubmitting={isSubmitting}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity} 
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ResourcePageLayout>
  );
}

