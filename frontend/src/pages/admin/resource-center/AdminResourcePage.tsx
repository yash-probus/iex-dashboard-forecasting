import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, InputAdornment, Button, IconButton, Tooltip, Breadcrumbs, Link } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  NavigateNext as NavigateNextIcon,
  FileDownload as DownloadIcon
} from '@mui/icons-material';
import TableContainer from '../../../components/dashboard/TableContainer';
import BreadcrumbNav from '../../../components/dashboard/BreadcrumbNav';
import ActionButton from '../../../components/common/ActionButton';
import ResourceFormModal from '../../../components/admin/ResourceFormModal';
import ResourceDeleteDialog from '../../../components/admin/ResourceDeleteDialog';
import { exportToCSV } from '../../../utils/export';
import { RESOURCE_CONFIG } from './config/resourceConfig';
import { useResourceData } from '../../../hooks/useResourceData';
import { useCreateResourceRecord, useUpdateResourceRecord, useDeleteResourceRecord } from '../../../hooks/useResourceMutations';
import { CircularProgress, Snackbar, Alert } from '@mui/material';
import { formatYYYYMM } from '../../../utils/common';

export default function AdminResourcePage() {
  const { resourceType } = useParams<{ resourceType: string }>();
  const navigate = useNavigate();
  const config = resourceType ? RESOURCE_CONFIG[resourceType] : null;

  const [searchQuery, setSearchQuery] = useState('');
  
  // Use generic API instead of mock store
  const { data, loading, error, refresh } = useResourceData<any>(resourceType || '');
  
  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
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

  const createMutation = useCreateResourceRecord({ resourceType: resourceType || '', onSuccess: handleSuccess, onError: handleError });
  const updateMutation = useUpdateResourceRecord({ resourceType: resourceType || '', onSuccess: handleSuccess, onError: handleError });
  const deleteMutation = useDeleteResourceRecord({ resourceType: resourceType || '', onSuccess: handleSuccess, onError: handleError });

  const isSubmitting = createMutation.isSubmitting || updateMutation.isSubmitting || deleteMutation.isSubmitting;

  // Auto refresh disabled because we stripped out mockStore subscription
  useEffect(() => {
    if (!resourceType || !config) return;
    refresh();
  }, [resourceType, config, refresh]);

  if (!config || !resourceType) {
    return <Typography>Resource configuration not found.</Typography>;
  }

  // Search Logic
  const filteredData = data.filter((row: any) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return config.searchableFields.some(field => {
      const val = row[field];
      if (val === null || val === undefined) return false;
      if (field === 'month' && typeof val === 'number') {
        const monthStr = formatYYYYMM(val);
        return monthStr.toLowerCase().includes(lowerQuery);
      }
      return String(val).toLowerCase().includes(lowerQuery);
    });
  });

  // Action Handlers
  const handleAddClick = () => {
    setEditingRecord(null);
    setFormModalOpen(true);
  };

  const handleEditClick = (record: any) => {
    setEditingRecord(record);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (record: any) => {
    setDeletingId(record.id);
    setDeleteDialogOpen(true);
  };

  const handleSaveRecord = async (formData: any) => {
    if (!resourceType) return;
    if (editingRecord && editingRecord.id) {
      await updateMutation.mutate(editingRecord.id, formData);
    } else {
      await createMutation.mutate(formData);
    }
  };

  const handleConfirmDelete = async () => {
    if (!resourceType || !deletingId) return;
    await deleteMutation.mutate(deletingId);
  };

  const handleExport = () => {
    // Generate export data by mapping visible columns except actions
    const exportData = filteredData.map(row => {
      const rowData: Record<string, any> = {};
      config.columns.forEach(col => {
        const value = row[col.field];
        // Apply formatter if exists
        rowData[col.headerName] = col.valueFormatter ? col.valueFormatter(value) : value;
      });
      return rowData;
    });
    exportToCSV(exportData, config.exportFilename);
  };

  // Inject Actions Column
  const columnsWithActions = [
    ...config.columns,
    {
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
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <BreadcrumbNav 
        items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Resource Center', path: '/admin/resource-center' },
          { label: config.title }
        ]} 
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 3 }}>
          <Typography variant="h1" sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '-0.5px', mb: 0.5 }}>
            {config.title} MANAGEMENT
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {config.subtitle}
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: -2 }}>
          Total Records: {filteredData.length}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            size="small"
            placeholder={config.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 380 }, backgroundColor: 'background.paper', borderRadius: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }}
          />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <ActionButton 
              variant="secondary" 
              startIcon={<DownloadIcon fontSize="small" />} 
              onClick={handleExport} 
              disabled={filteredData.length === 0} 
            >
              Export Data
            </ActionButton>
            <ActionButton 
              variant="primary" 
              startIcon={<AddIcon />} 
              onClick={handleAddClick}
            >
              Add Record
            </ActionButton>
          </Box>
        </Box>

        <TableContainer 
          data={filteredData}
          columns={columnsWithActions}
          emptyStateMessage={
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              {loading ? (
                <CircularProgress size={32} sx={{ mb: 2 }} />
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : (
                <>
                  <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500, mb: 0.5 }}>
                    {config.emptyMessage}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', opacity: 0.8 }}>
                    Data will appear here once records are added.
                  </Typography>
                </>
              )}
            </Box>
          }
        />
      </Box>

      <ResourceFormModal
        open={formModalOpen}
        title={config.title}
        fields={config.fields}
        initialData={editingRecord}
        isSubmitting={isSubmitting}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSaveRecord}
      />

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        isSubmitting={isSubmitting}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
