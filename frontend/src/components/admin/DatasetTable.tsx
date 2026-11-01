import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, IconButton, CircularProgress, Dialog, 
  DialogTitle, DialogContent, DialogActions, Button, TablePagination, alpha
} from '@mui/material';
import { Delete as DeleteIcon, Warning as WarningIcon, Error as ErrorIcon, Dataset as DatasetIcon } from '@mui/icons-material';
import { datasetsApi, Dataset } from '../../api/datasets.api';
import { formatOverviewDate } from '../../utils/date';
import { useNotification } from '../../contexts/NotificationContext';
import EmptyState from '../dashboard/EmptyState';

interface DatasetTableProps {
  refreshTrigger: number;
  onRefreshTriggered: () => void;
}

export default function DatasetTable({ refreshTrigger, onRefreshTriggered }: DatasetTableProps) {
  const { showNotification } = useNotification();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  // Delete Flow
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchDatasets = async () => {
      try {
        setLoading(true);
        setError(null);
        // backend expects 1-indexed page
        const res = await datasetsApi.getDatasets(page + 1, rowsPerPage, 'ACTIVE');
        setDatasets(res.data);
        setTotalRows(res.meta.total);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError(err.message || 'Failed to load datasets');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDatasets();

    return () => {
      abortController.abort();
    };
  }, [refreshTrigger, page, rowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await datasetsApi.deleteDataset(deleteTarget.id);
      showNotification(`Dataset ${deleteTarget.fileName} deleted successfully.`, 'success');
      setDeleteTarget(null);
      // Trigger full UI refresh
      onRefreshTriggered();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete dataset', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Chip label="ACTIVE" size="small" color="success" sx={{ height: 20, fontSize: '11px', fontWeight: 600 }} />;
      case 'REPLACED':
        return <Chip label="REPLACED" size="small" color="warning" sx={{ height: 20, fontSize: '11px', fontWeight: 600 }} />;
      case 'DELETED':
        return <Chip label="DELETED" size="small" color="error" sx={{ height: 20, fontSize: '11px', fontWeight: 600 }} />;
      default:
        return <Chip label={status} size="small" sx={{ height: 20, fontSize: '11px', fontWeight: 600 }} />;
    }
  };

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'error.main', bgcolor: 'error.50', display: 'flex', alignItems: 'center', gap: 2 }}>
        <ErrorIcon color="error" />
        <Typography color="error.main">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.default' }}>
        <Typography variant="h4">Current Datasets</Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : datasets.length === 0 ? (
        <EmptyState 
          icon={<DatasetIcon sx={{ fontSize: 48 }} />}
          title="No Active Datasets Found"
          description="Upload a dataset to begin analysis."
        />
      ) : (
        <>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} size="small">
              <TableHead>
                <TableRow sx={{ background: (theme) => `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)` }}>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Market</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Delivery Date</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Uploaded At</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datasets.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>{row.market}</TableCell>
                    <TableCell align="center">{formatOverviewDate(row.deliveryDate)}</TableCell>
                    <TableCell align="center" sx={{ color: 'text.secondary' }}>{formatOverviewDate(row.uploadedAt)}</TableCell>
                    <TableCell align="center">{getStatusChip(row.status)}</TableCell>
                    <TableCell align="center">
                      {row.status === 'ACTIVE' && (
                        <IconButton 
                          size="small" 
                          title="Delete Dataset" 
                          onClick={() => setDeleteTarget(row)} 
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalRows}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onClose={isDeleting ? undefined : () => setDeleteTarget(null)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningIcon />
          Delete Dataset?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete the following dataset? This action cannot be undone and will immediately remove the data from the public dashboard.
          </Typography>
          {deleteTarget && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Dataset Details:</Typography>
              <Typography variant="body2"><strong>Market:</strong> {deleteTarget.market}</Typography>
              <Typography variant="body2"><strong>Delivery Date:</strong> {formatOverviewDate(deleteTarget.deliveryDate)}</Typography>
              <Typography variant="body2"><strong>File Name:</strong> {deleteTarget.fileName}</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit" disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={isDeleting} startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
