import React, { useState } from 'react';
import { Box, Typography, Tooltip, IconButton, Snackbar, Alert } from '@mui/material';
import { Map as MapIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ResourcePageLayout from '../../components/dashboard/ResourcePageLayout';
import EmptyTableState from '../../components/dashboard/EmptyTableState';
import TableContainer, { ColumnDefinition } from '../../components/dashboard/TableContainer';
import { exportToCSV } from '../../utils/export';
import { useResourceData } from '../../hooks/useResourceData';
import { RegionState } from './types/resourceCenter.types';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdateResourceRecord, useDeleteResourceRecord } from '../../hooks/useResourceMutations';
import ResourceFormModal from '../../components/admin/ResourceFormModal';
import ResourceDeleteDialog from '../../components/admin/ResourceDeleteDialog';
import { RESOURCE_CONFIG } from '../admin/resource-center/config/resourceConfig';

export default function RegionStatePage() {
  const { data, loading, error, refresh, bulkUpload } = useResourceData<RegionState>('region-state');
  const [searchQuery, setSearchQuery] = useState('');
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

  const updateMutation = useUpdateResourceRecord({ resourceType: 'region-state', onSuccess: handleSuccess, onError: handleError });
  const deleteMutation = useDeleteResourceRecord({ resourceType: 'region-state', onSuccess: handleSuccess, onError: handleError });

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

  const config = {
    title: 'REGION STATE',
    subtitle: 'Reference data for regions, states, and union territories.',
    searchPlaceholder: 'Search by state, region code, region name...',
    emptyMessage: 'No Region State data available.'
  };

  // 1. Search Logic
  const filteredData = data.filter((row: RegionState) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      String(row.regionalGrid || '').toLowerCase().includes(lowerQuery) ||
      String(row.regionCode || '').toLowerCase().includes(lowerQuery) ||
      String(row.regionName || '').toLowerCase().includes(lowerQuery) ||
      String(row.stateName || '').toLowerCase().includes(lowerQuery) ||
      String(row.stateCode || '').toLowerCase().includes(lowerQuery) ||
      String(row.stateOrUt || '').toLowerCase().includes(lowerQuery)
    );
  });

  // 2. Column Configuration
  const baseColumns: ColumnDefinition[] = [
    { field: 'regionalGrid', headerName: 'Regional Grid', align: 'center', width: 200 },
    { field: 'regionCode', headerName: 'Region Code', align: 'center', width: 150 },
    { field: 'regionName', headerName: 'Region Name', align: 'center', width: 250 },
    { field: 'stateName', headerName: 'State Name', align: 'center', width: 250 },
    { field: 'stateCode', headerName: 'State Code', align: 'center', width: 150 },
    { field: 'stateOrUt', headerName: 'State / UT', align: 'center', width: 150 },
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

  // 3. Export Logic
  const handleExport = () => {
    const exportData = filteredData.map((row: any) => ({
      'Regional Grid': row.regionalGrid,
      'Region Code': row.regionCode,
      'Region Name': row.regionName,
      'State Name': row.stateName,
      'State Code': row.stateCode,
      'State / UT': row.stateOrUt
    }));
    exportToCSV(exportData, 'region-state');
  };

  return (
    <ResourcePageLayout lastUpdated={data.length > 0 ? data.reduce((latest: any, r: any) => !r.updatedAt || (latest && latest > r.updatedAt) ? latest : r.updatedAt, null) : null} resourceType="region-state"
      title={config.title}
      subtitle={config.subtitle}
      icon={<MapIcon fontSize="large" />}
      iconColor="#F29F67"
      iconBgColor="#F29F6715"
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
    >
      <TableContainer 
        data={filteredData}
        columns={columns}
        loading={loading}
        emptyStateMessage={
          error ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : (
            <EmptyTableState 
              title="No records available" 
              description={config.emptyMessage}
            />
          )
        }
      />

      {RESOURCE_CONFIG['region-state'] && (
        <ResourceFormModal
          open={formModalOpen}
          title={RESOURCE_CONFIG['region-state'].title}
          fields={RESOURCE_CONFIG['region-state'].fields}
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
