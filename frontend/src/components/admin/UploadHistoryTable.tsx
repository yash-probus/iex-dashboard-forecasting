import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, CircularProgress, TablePagination, alpha
} from '@mui/material';
import { formatOverviewDate } from '../../utils/date';
import { History as HistoryIcon, Error as ErrorIcon } from '@mui/icons-material';
import { uploadApi, UploadHistoryRecord } from '../../api/upload.api';
import EmptyState from '../dashboard/EmptyState';

interface UploadHistoryTableProps {
  refreshTrigger: number;
}

export default function UploadHistoryTable({ refreshTrigger }: UploadHistoryTableProps) {
  const [history, setHistory] = useState<UploadHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        // backend expects 1-indexed page
        const res = await uploadApi.getUploadHistory(page + 1, rowsPerPage);
        setHistory(res.data);
        setTotalRows(res.meta.total);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError(err.message || 'Failed to load upload history');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

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

  const getActionChip = (action: string) => {
    switch (action) {
      case 'UPLOAD':
        return <Chip label="UPLOAD" size="small" color="primary" sx={{ height: 20, fontSize: '11px', fontWeight: 600 }} />;
      case 'REPLACE':
        return <Chip label="REPLACE" size="small" color="warning" sx={{ height: 20, fontSize: '11px', fontWeight: 600 }} />;
      case 'DELETE':
        return <Chip label="DELETE" size="small" color="error" sx={{ height: 20, fontSize: '11px', fontWeight: 600 }} />;
      default:
        return <Chip label={action} size="small" sx={{ height: 20, fontSize: '11px', fontWeight: 600 }} />;
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
        <Typography variant="h4">Action History</Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : history.length === 0 ? (
        <EmptyState 
          icon={<HistoryIcon sx={{ fontSize: 48 }} />}
          title="No History Found"
          description="There is no recorded action history for datasets."
        />
      ) : (
        <>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} size="small">
              <TableHead>
                <TableRow sx={{ background: (theme) => `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)` }}>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Action</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Market</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Delivery Date</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell align="center">{getActionChip(row.action)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>{row.market}</TableCell>
                    <TableCell align="center">{formatOverviewDate(row.deliveryDate)}</TableCell>
                    <TableCell align="center" sx={{ color: 'text.secondary' }}>{formatOverviewDate(row.timestamp)}</TableCell>
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
    </Paper>
  );
}
