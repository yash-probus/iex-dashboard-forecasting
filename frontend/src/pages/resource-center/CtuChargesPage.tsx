import React, { useState } from 'react';
import { Box, Typography, FormControl, Select, MenuItem, InputLabel, Tooltip, IconButton, Snackbar, Alert } from '@mui/material';
import { AccountTree as AccountTreeIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ResourcePageLayout from '../../components/dashboard/ResourcePageLayout';
import EmptyTableState from '../../components/dashboard/EmptyTableState';
import TableContainer, { ColumnDefinition } from '../../components/dashboard/TableContainer';
import { exportToCSV } from '../../utils/export';
import { useResourceData } from '../../hooks/useResourceData';
import { RESOURCE_CENTER_PAGES } from './constants/resourceCenter.constants';
import { CtuCharges } from './types/resourceCenter.types';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdateResourceRecord, useDeleteResourceRecord } from '../../hooks/useResourceMutations';
import ResourceFormModal from '../../components/admin/ResourceFormModal';
import ResourceDeleteDialog from '../../components/admin/ResourceDeleteDialog';
import { RESOURCE_CONFIG } from '../admin/resource-center/config/resourceConfig';

import { formatYYYYMM as formatMonth } from '../../utils/common';

export default function CtuChargesPage() {
  const { data, loading, error, refresh, bulkUpload } = useResourceData<CtuCharges>('ctu-charges');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const config = RESOURCE_CENTER_PAGES.CTU_CHARGES;
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

  const updateMutation = useUpdateResourceRecord({ resourceType: 'ctu-charges', onSuccess: handleSuccess, onError: handleError });
  const deleteMutation = useDeleteResourceRecord({ resourceType: 'ctu-charges', onSuccess: handleSuccess, onError: handleError });

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

  // Extract unique states for the filter
  const uniqueStates = Array.from(new Set(data.map((r: CtuCharges) => r.state))).sort();
  // Generate some years for the filter (CTU charges typically have 2026, 2025, etc.)
  // If month is just 1-12, the system currently formats it as 2026.
  const uniqueYears = ['2026', '2025', '2024'];

  const filteredData = data.filter((row: CtuCharges) => {
    // Search query filter
    const lowerQuery = searchQuery.toLowerCase();
    const monthStr = formatMonth(row.month).toLowerCase();
    const stateStr = String(row.state).toLowerCase();
    const matchesSearch = !searchQuery || monthStr.includes(lowerQuery) || stateStr.includes(lowerQuery);

    // State filter
    const matchesState = selectedState === 'all' || row.state === selectedState;
    
    // Year filter (since we format month as 2026, we check the formatted string)
    const matchesYear = selectedYear === 'all' || monthStr.includes(selectedYear);

    return matchesSearch && matchesState && matchesYear;
  });

  const formatNum = (v: any) => v != null ? Number(v).toFixed(2) : '-';

  const baseColumns: ColumnDefinition[] = [
    { field: 'id', headerName: 'ID', align: 'center', width: 100 },
    { field: 'state', headerName: 'State', align: 'center', width: 200 },
    { field: 'month', headerName: 'Billing Month', align: 'center', width: 150, valueFormatter: formatMonth },
    { field: 'ctu_charges_rs_per_kwh', headerName: 'CTU Charges (Rs/kWh)', align: 'center', width: 250, valueFormatter: formatNum },
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
      'ID': row.id,
      'State': row.state,
      'Billing Month': formatMonth(row.month),
      'CTU Charges (Rs/kWh)': row.ctu_charges_rs_per_kwh
    }));
    exportToCSV(exportData, config.exportFilename);
  };

  return (
    <ResourcePageLayout lastUpdated={data.length > 0 ? data.reduce((latest: any, r: any) => !r.updatedAt || (latest && latest > r.updatedAt) ? latest : r.updatedAt, null) : null} resourceType="ctu-charges"
      title={config.title}
      subtitle={config.subtitle}
      icon={<AccountTreeIcon fontSize="large" />}
      iconColor="#EC4899"
      iconBgColor="#EC489915"
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
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
                <MenuItem key={year} value={year}>{year}</MenuItem>
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

      {RESOURCE_CONFIG['ctu-charges'] && (
        <ResourceFormModal
          open={formModalOpen}
          title={RESOURCE_CONFIG['ctu-charges'].title}
          fields={RESOURCE_CONFIG['ctu-charges'].fields}
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
