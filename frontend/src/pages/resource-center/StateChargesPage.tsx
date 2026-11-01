import React, { useState } from 'react';
import { FormControl, Select, MenuItem, InputLabel, Box, Tooltip, IconButton, Snackbar, Alert } from '@mui/material';
import { AccountTree as AccountTreeIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ResourcePageLayout from '../../components/dashboard/ResourcePageLayout';
import EmptyTableState from '../../components/dashboard/EmptyTableState';
import TableContainer, { ColumnDefinition } from '../../components/dashboard/TableContainer';
import { exportToCSV } from '../../utils/export';
import { useResourceData } from '../../hooks/useResourceData';
import { RESOURCE_CENTER_PAGES } from './constants/resourceCenter.constants';
import { StateCharges } from './types/resourceCenter.types';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdateResourceRecord, useDeleteResourceRecord } from '../../hooks/useResourceMutations';
import ResourceFormModal from '../../components/admin/ResourceFormModal';
import ResourceDeleteDialog from '../../components/admin/ResourceDeleteDialog';
import { RESOURCE_CONFIG } from '../admin/resource-center/config/resourceConfig';

export default function StateChargesPage() {
  const { data, loading, error, refresh, bulkUpload } = useResourceData<StateCharges>('state-charges');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const config = RESOURCE_CENTER_PAGES.STATE_CHARGES;
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

  const updateMutation = useUpdateResourceRecord({ resourceType: 'state-charges', onSuccess: handleSuccess, onError: handleError });
  const deleteMutation = useDeleteResourceRecord({ resourceType: 'state-charges', onSuccess: handleSuccess, onError: handleError });

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

  const uniqueStates = Array.from(new Set(data.map((r: StateCharges) => r.state).filter(Boolean))).sort();
  const filteredForCat = selectedState === 'all' ? data : data.filter((r: StateCharges) => r.state === selectedState);
  const uniqueCategories = Array.from(new Set(filteredForCat.map((r: StateCharges) => r.category).filter(Boolean))).sort();
  const filteredForSubCat = filteredForCat.filter((r: StateCharges) => selectedCategory === 'all' || r.category === selectedCategory);
  const uniqueSubCategories = Array.from(new Set(filteredForSubCat.map((r: StateCharges) => r.subCategory).filter(Boolean))).sort();

  const filteredData = data.filter((row: StateCharges) => {
    // Text search
    const lowerQuery = searchQuery.toLowerCase();
    const stateStr = String(row.state || '').toLowerCase();
    const catStr = String(row.category || '').toLowerCase();
    const subCatStr = String(row.subCategory || '').toLowerCase();
    
    const matchesSearch = !searchQuery || 
      stateStr.includes(lowerQuery) ||
      catStr.includes(lowerQuery) ||
      subCatStr.includes(lowerQuery);

    // Dropdown filters
    const matchesState = selectedState === 'all' || row.state === selectedState;
    const matchesCategory = selectedCategory === 'all' || row.category === selectedCategory;
    const matchesSubCategory = selectedSubCategory === 'all' || row.subCategory === selectedSubCategory;

    return matchesSearch && matchesState && matchesCategory && matchesSubCategory;
  });

  const formatNum = (v: any) => v != null ? Number(v).toFixed(3) : '-';
  const formatDate = (v: any) => v ? new Date(v).toLocaleDateString('en-GB') : '-';

  const baseColumns: ColumnDefinition[] = [
    { field: 'id', headerName: 'ID', align: 'center', width: 80 },
    { field: 'state', headerName: 'State', align: 'center', width: 150 },
    { field: 'category', headerName: 'Category', align: 'center', width: 150 },
    { field: 'subCategory', headerName: 'Sub Category', align: 'center', width: 250 },
    { field: 'supplyVoltageCategory', headerName: 'Supply Voltage Category', align: 'center', width: 200 },
    { field: 'voltageLevel', headerName: 'Voltage Level (kV)', align: 'center', width: 150 },
    { field: 'fromDate', headerName: 'From Date', align: 'center', width: 120, valueFormatter: formatDate },
    { field: 'toDate', headerName: 'To Date', align: 'center', width: 120, valueFormatter: formatDate },
    { field: 'demandFixedChargeKvaPerMonthRs', headerName: 'Demand Fixed Charge (Rs/kVA/mo)', align: 'center', width: 200, valueFormatter: formatNum },
    { field: 'crossSubsidy', headerName: 'Cross Subsidy', align: 'center', width: 150, valueFormatter: formatNum },
    { field: 'distributionWheelingCharges', headerName: 'Dist/Wheeling Charges', align: 'center', width: 200, valueFormatter: formatNum },
    { field: 'stuCharges', headerName: 'STU Charges', align: 'center', width: 150, valueFormatter: formatNum },
    { field: 'stuLossPercent', headerName: 'STU Loss (%)', align: 'center', width: 150, valueFormatter: formatNum },
    { field: 'wheelingLossPercent', headerName: 'Wheeling Loss (%)', align: 'center', width: 150, valueFormatter: formatNum },
    { field: 'additionalCharge', headerName: 'Additional Charge', align: 'center', width: 150, valueFormatter: formatNum },
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
      'Category': row.category,
      'Sub Category': row.subCategory,
      'Supply Voltage Category': row.supplyVoltageCategory,
      'Voltage Level (kV)': row.voltageLevel,
      'From Date': formatDate(row.fromDate),
      'To Date': formatDate(row.toDate),
      'Demand Fixed Charge (Rs/kVA/mo)': row.demandFixedChargeKvaPerMonthRs,
      'Cross Subsidy': row.crossSubsidy,
      'Dist/Wheeling Charges': row.distributionWheelingCharges,
      'STU Charges': row.stuCharges,
      'STU Loss (%)': row.stuLossPercent,
      'Wheeling Loss (%)': row.wheelingLossPercent,
      'Additional Charge': row.additionalCharge
    }));
    exportToCSV(exportData, config.exportFilename);
  };

  return (
    <ResourcePageLayout lastUpdated={data.length > 0 ? data.reduce((latest: any, r: any) => !r.updatedAt || (latest && latest > r.updatedAt) ? latest : r.updatedAt, null) : null} resourceType="state-charges"
      title={config.title}
      subtitle={config.subtitle}
      icon={<AccountTreeIcon fontSize="large" />}
      iconColor="#8B5CF6"
      iconBgColor="#8B5CF615"
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

      {RESOURCE_CONFIG['state-charges'] && (
        <ResourceFormModal
          open={formModalOpen}
          title={RESOURCE_CONFIG['state-charges'].title}
          fields={RESOURCE_CONFIG['state-charges'].fields}
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
