import React, { useState } from 'react';
import { Box, Typography, Tooltip, IconButton, Snackbar, Alert } from '@mui/material';
import { Receipt as ReceiptIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ResourcePageLayout from '../../components/dashboard/ResourcePageLayout';
import EmptyTableState from '../../components/dashboard/EmptyTableState';
import TableContainer, { ColumnDefinition } from '../../components/dashboard/TableContainer';
import { exportToCSV } from '../../utils/export';
import { useResourceData } from '../../hooks/useResourceData';
import { RESOURCE_CENTER_PAGES } from './constants/resourceCenter.constants';
import { FppaCharges } from './types/resourceCenter.types';
import { formatYYYYMM as formatMonth, getBillingMonthStr } from '../../utils/common';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdateResourceRecord, useDeleteResourceRecord } from '../../hooks/useResourceMutations';
import ResourceFormModal from '../../components/admin/ResourceFormModal';
import ResourceDeleteDialog from '../../components/admin/ResourceDeleteDialog';
import { RESOURCE_CONFIG } from '../admin/resource-center/config/resourceConfig';

export default function FppaChargesPage() {
  const { data, loading, error, refresh, bulkUpload } = useResourceData<FppaCharges>('fppa-charges');
  const [searchQuery, setSearchQuery] = useState('');
  const config = RESOURCE_CENTER_PAGES.FPPA_CHARGES;
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

  const updateMutation = useUpdateResourceRecord({ resourceType: 'fppa-charges', onSuccess: handleSuccess, onError: handleError });
  const deleteMutation = useDeleteResourceRecord({ resourceType: 'fppa-charges', onSuccess: handleSuccess, onError: handleError });

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

  const filteredData = data.filter((row: FppaCharges) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    const monthStr = formatMonth(row.month).toLowerCase();
    const billingMonthStr = row.billingMonth ? formatMonth(row.billingMonth).toLowerCase() : getBillingMonthStr(row.month).toLowerCase();
    return (
      String(row.state).toLowerCase().includes(lowerQuery) ||
      (row.discom && String(row.discom).toLowerCase().includes(lowerQuery)) ||
      monthStr.includes(lowerQuery) ||
      billingMonthStr.includes(lowerQuery) ||
      String(row.fppaChargePercent).toLowerCase().includes(lowerQuery)
    );
  });

  const formatNum = (v: unknown) => typeof v === 'number' ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : v;

  const baseColumns: ColumnDefinition[] = [
    { field: 'id', headerName: 'ID', align: 'center', width: 100 },
    { field: 'state', headerName: 'State', align: 'center', width: 250 },
    { field: 'discom', headerName: 'Discom', align: 'center', width: 250 },
    { field: 'month', headerName: 'Billing Month', align: 'center', width: 150, valueFormatter: formatMonth },
    { field: 'billingMonth', headerName: 'Calendar Month', align: 'center', width: 150, renderCell: (row: any) => row.billingMonth ? formatMonth(row.billingMonth) : getBillingMonthStr(row.month) },
    { field: 'fppaChargePercent', headerName: 'FPPA Charge %', align: 'center', width: 250, valueFormatter: formatNum },
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
      'Discom': row.discom || '-',
      'Calendar Month': formatMonth(row.month),
      'Billing Month': row.billingMonth ? formatMonth(row.billingMonth) : getBillingMonthStr(row.month),
      'FPPA Charge %': row.fppaChargePercent
    }));
    exportToCSV(exportData, config.exportFilename);
  };

  return (
    <ResourcePageLayout lastUpdated={data.length > 0 ? data.reduce((latest: any, r: any) => !r.updatedAt || (latest && latest > r.updatedAt) ? latest : r.updatedAt, null) : null} resourceType="fppa-charges"
      title={config.title}
      subtitle={config.subtitle}
      icon={<ReceiptIcon fontSize="large" />}
      iconColor="#E0B50F"
      iconBgColor="#E0B50F15"
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
          <EmptyTableState 
            title="No records available" 
            description={config.emptyMessage}
          />
        }
      />

      {RESOURCE_CONFIG['fppa-charges'] && (
        <ResourceFormModal
          open={formModalOpen}
          title={RESOURCE_CONFIG['fppa-charges'].title}
          fields={RESOURCE_CONFIG['fppa-charges'].fields}
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
