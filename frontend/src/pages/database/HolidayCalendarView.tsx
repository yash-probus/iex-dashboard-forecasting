import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  alpha,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import {
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { apiClient } from '../../api/client';

interface Holiday {
  id: string;
  month: string;
  holidayDate: string;
  holidayName: string;
  holidayType: string;
  state: string;
  isActive?: boolean;
}

export default function HolidayCalendarView() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Single Holiday Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    month: '',
    holidayDate: '',
    holidayName: '',
    holidayType: 'SH',
    state: 'National'
  });

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/database/holidays');
      if (res.data?.success && res.data?.data) {
        setHolidays(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching holiday calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async () => {
    try {
      const res = await apiClient.post('/database/holidays', newHoliday);
      if (res.data?.success) {
        setIsAddModalOpen(false);
        setNewHoliday({ month: '', holidayDate: '', holidayName: '', holidayType: 'SH', state: 'National' });
        fetchHolidays();
      }
    } catch (err) {
      console.error('Error adding holiday:', err);
      alert('Failed to add holiday.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/database/holidays/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.status === 200) {
        setUploadStatus({
          type: 'success',
          message: `Successfully uploaded ${res.data.count || ''} holidays!`,
        });
        fetchHolidays();
      } else {
        setUploadStatus({
          type: 'error',
          message: res.data?.message || 'Failed to upload holiday calendar.',
        });
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'An error occurred during upload.',
      });
    } finally {
      setUploading(false);
      // Reset input value
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvRows = [
      ['Month', 'Holiday_date', 'Holiday_name', 'Holiday_type', 'State'],
      ['April', '05-04-2025', "Babu Jagjivan Ram's Birthday", 'SH', 'Andhra Pradesh'],
      ['April', '14-04-2025', "Dr. B.R. Ambedkar's Birthday", 'CH_SH', 'Andhra Pradesh'],
      ['May', '01-05-2025', 'May Day', 'SH', 'Andhra Pradesh'],
      ['August', '15-08-2025', 'Independence Day', 'CH_SH', 'Andhra Pradesh'],
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
      + csvRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Holiday_Calendar_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamically extract unique years from the holiday dates
  const uniqueYears = React.useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(new Date().getFullYear().toString());
    holidays.forEach(h => {
      const dateParts = h.holidayDate.split('-');
      if (dateParts.length === 3) {
        if (dateParts[0].length === 4) {
          yearsSet.add(dateParts[0]);
        } else if (dateParts[2].length === 4) {
          yearsSet.add(dateParts[2]);
        }
      }
    });
    return ['All', ...Array.from(yearsSet).sort()];
  }, [holidays]);

  // Filter logic
  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch =
      h.holidayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.holidayType.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesYear = true;
    if (selectedYear !== 'All') {
      const dateParts = h.holidayDate.split('-');
      const year = dateParts[0].length === 4 ? dateParts[0] : dateParts[2];
      matchesYear = year === selectedYear;
    }

    let matchesType = true;
    if (selectedType !== 'All') {
      matchesType = h.holidayType.toLowerCase() === selectedType.toLowerCase();
    }

    let matchesStatus = true;
    if (selectedStatus !== 'All') {
      const isActive = h.isActive ?? true;
      if (selectedStatus === 'Active') matchesStatus = isActive === true;
      if (selectedStatus === 'Inactive') matchesStatus = isActive === false;
    }

    return matchesSearch && matchesYear && matchesType && matchesStatus;
  });

  const getTypeChipColor = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('CH') && t.includes('SH')) {
      return { bg: '#FFEAEF', color: '#E91E63' }; // Clearing & Settlement
    }
    if (t.includes('CH')) {
      return { bg: '#E3F2FD', color: '#1E88E5' }; // Clearing
    }
    return { bg: '#E8F5E9', color: '#43A047' }; // Settlement (SH)
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Title and actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="700">
            Holiday Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage and view power exchange settlement and clearing holidays.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Download Template
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsAddModalOpen(true)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Add Holiday
          </Button>
          <Button
            variant="contained"
            component="label"
            color="primary"
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
            disabled={uploading}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, bgcolor: '#FF7043', '&:hover': { bgcolor: '#F4511E' } }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              accept=".csv, .xlsx, .xls"
              type="file"
              hidden
              onChange={handleFileUpload}
            />
          </Button>
        </Box>
      </Box>

      {uploadStatus && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            width: '100%',
            bgcolor: uploadStatus.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            color: uploadStatus.type === 'success' ? '#15803D' : '#B91C1C',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {uploadStatus.message}
        </Box>
      )}

      <Grid container spacing={4} sx={{ flexGrow: 1 }}>
        {/* Calendar List Card */}
        <Grid item xs={12} md={12} sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              {/* Filters */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{
                      padding: '8.5px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      outline: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFF',
                      color: '#0F172A',
                      cursor: 'pointer',
                    }}
                  >
                    {uniqueYears.map((y) => (
                      <option key={y} value={y}>
                        {y === 'All' ? 'Calendar Year' : y}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    style={{
                      padding: '8.5px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      outline: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFF',
                      color: '#0F172A',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="All">All Types</option>
                    <option value="SH">State Holiday (SH)</option>
                    <option value="CH">Central Holiday (CH)</option>
                    <option value="CH_SH">Central & State Holiday (CH_SH)</option>
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{
                      padding: '8.5px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      outline: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFF',
                      color: '#0F172A',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </Box>

                <TextField
                  placeholder="Search holiday, state..."
                  variant="outlined"
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    flexGrow: 1,
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : filteredHolidays.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', maxHeight: 'calc(100vh - 280px)', minHeight: 400, overflowY: 'auto' }}>
                  <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Month</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>State</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Holiday Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredHolidays.map((row) => {
                        const chipStyle = getTypeChipColor(row.holidayType);
                        return (
                          <TableRow key={row.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' } }}>
                            <TableCell sx={{ fontWeight: 500 }}>{row.month}</TableCell>
                            <TableCell>{row.holidayDate}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {row.state}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {row.holidayName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={row.holidayType}
                                size="small"
                                sx={{
                                  bgcolor: chipStyle.bg,
                                  color: chipStyle.color,
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={row.isActive === false ? 'Inactive' : 'Active'}
                                size="small"
                                sx={{
                                  bgcolor: row.isActive === false ? '#FEE2E2' : '#DCFCE7',
                                  color: row.isActive === false ? '#B91C1C' : '#15803D',
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1 }}>
                  <CalendarIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography variant="subtitle1" fontWeight="600" color="text.secondary">
                    No Holidays Found
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Upload a holiday calendar spreadsheet to get started.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Single Holiday Dialog */}
      <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add Single Holiday</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="month-select-label">Month</InputLabel>
              <Select
                labelId="month-select-label"
                label="Month"
                value={newHoliday.month}
                onChange={(e) => setNewHoliday({ ...newHoliday, month: e.target.value })}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 260,
                      overflowY: 'auto',
                      borderRadius: '10px',
                      mt: 0.5,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      '&::-webkit-scrollbar': { width: '6px' },
                      '&::-webkit-scrollbar-track': { background: 'transparent' },
                      '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.15)', borderRadius: '10px' },
                    },
                  },
                  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                  transformOrigin: { vertical: 'top', horizontal: 'left' },
                }}
              >
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <TextField
                label="Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={newHoliday.holidayDate}
                onChange={(e) => setNewHoliday({ ...newHoliday, holidayDate: e.target.value })}
                helperText="Select the date of the holiday"
              />
            </FormControl>
            <FormControl fullWidth>
              <TextField
                label="Holiday Name"
                size="small"
                value={newHoliday.holidayName}
                onChange={(e) => setNewHoliday({ ...newHoliday, holidayName: e.target.value })}
                placeholder="e.g. Republic Day"
              />
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Holiday Type</InputLabel>
              <Select
                value={newHoliday.holidayType}
                label="Holiday Type"
                onChange={(e) => setNewHoliday({ ...newHoliday, holidayType: e.target.value })}
              >
                <MenuItem value="SH">State Holiday (SH)</MenuItem>
                <MenuItem value="CH">Central Holiday (CH)</MenuItem>
                <MenuItem value="CH_SH">Central & State Holiday (CH_SH)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <TextField
                label="State"
                size="small"
                value={newHoliday.state}
                onChange={(e) => setNewHoliday({ ...newHoliday, state: e.target.value })}
                placeholder="e.g. National or State Name"
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setIsAddModalOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleAddHoliday} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
