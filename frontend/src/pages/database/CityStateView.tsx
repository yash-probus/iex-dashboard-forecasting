import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  TableSortLabel,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Download as DownloadIcon } from '@mui/icons-material';
import { apiClient } from '../../api/client';

interface CityStateItem {
  id: string;
  cityName: string;
  stateName: string;
  population: number;
  latitude: number;
  longitude: number;
}

export default function CityStateView() {
  const [data, setData] = useState<CityStateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Filter & Sort State
  const [selectedStateFilter, setSelectedStateFilter] = useState('');
  const [orderBy, setOrderBy] = useState<keyof CityStateItem>('stateName');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cityName, setCityName] = useState('');
  const [stateName, setStateName] = useState('');
  const [population, setPopulation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/database/city-state');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching city state data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Extract unique states
  const uniqueStates = React.useMemo(() => {
    return Array.from(new Set(data.map((item) => item.stateName))).sort();
  }, [data]);

  // Filter data
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = item.cityName.toLowerCase().includes(query) ||
                            item.stateName.toLowerCase().includes(query);
      const matchesState = selectedStateFilter === '' || item.stateName === selectedStateFilter;
      return matchesSearch && matchesState;
    });
  }, [data, searchQuery, selectedStateFilter]);

  const handleRequestSort = (property: keyof CityStateItem) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];
      
      // Safe checking for comparison
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, orderBy, order]);

  const handleOpenDialog = () => {
    setCityName('');
    setStateName('');
    setPopulation('');
    setLatitude('');
    setLongitude('');
    setErrorMsg(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim() || !stateName.trim() || !population.trim() || !latitude.trim() || !longitude.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    const popNum = parseInt(population, 10);
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(popNum) || popNum < 0) {
      setErrorMsg('Population must be a valid positive integer.');
      return;
    }
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMsg('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setErrorMsg('Longitude must be a valid number between -180 and 180.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.post('/database/city-state', {
        cityName,
        stateName,
        population: popNum,
        latitude: latNum,
        longitude: lonNum,
      });

      if (res.data?.success) {
        setDialogOpen(false);
        fetchData();
      } else {
        setErrorMsg(res.data?.message || 'Failed to save entry.');
      }
    } catch (err: any) {
      console.error('Error saving city state entry:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%', flexGrow: 1 }}>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight="700">
                State & City Data
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                View geographical coordinates and population statistics for cities across India.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const url = `${apiClient.defaults.baseURL || 'http://localhost:3000/api'}/database/export/csv?dataset=city_state`;
                  window.open(url, '_blank');
                }}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
              >
                Export Data
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
              >
                Add Entry
              </Button>
            </Box>
          </Box>


          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              placeholder="Search city, state..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              sx={{
                width: 400,
                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ width: 250 }}>
              <InputLabel id="state-filter-label">Filter by State</InputLabel>
              <Select
                labelId="state-filter-label"
                id="state-filter"
                value={selectedStateFilter}
                label="Filter by State"
                onChange={(e) => {
                  setSelectedStateFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ borderRadius: '10px', bgcolor: '#FFF' }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 280,
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
                <MenuItem value=""><em>All States</em></MenuItem>
                {uniqueStates.map((state) => (
                  <MenuItem key={state} value={state}>{state}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : sortedData.length > 0 ? (
            <>
              <TableContainer 
                component={Paper} 
                elevation={0} 
                sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: '10px',
                  maxHeight: 'calc(100vh - 340px)', // This enables the sticky header to work
                  overflow: 'auto',
                  flexGrow: 1
                }}
              >
                <Table stickyHeader sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>
                        <TableSortLabel
                          active={orderBy === 'stateName'}
                          direction={orderBy === 'stateName' ? order : 'asc'}
                          onClick={() => handleRequestSort('stateName')}
                        >
                          State
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>
                        <TableSortLabel
                          active={orderBy === 'cityName'}
                          direction={orderBy === 'cityName' ? order : 'asc'}
                          onClick={() => handleRequestSort('cityName')}
                        >
                          City
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>
                        <TableSortLabel
                          active={orderBy === 'population'}
                          direction={orderBy === 'population' ? order : 'asc'}
                          onClick={() => handleRequestSort('population')}
                        >
                          2011 Census Population
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>
                        <TableSortLabel
                          active={orderBy === 'latitude'}
                          direction={orderBy === 'latitude' ? order : 'asc'}
                          onClick={() => handleRequestSort('latitude')}
                        >
                          Latitude
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>
                        <TableSortLabel
                          active={orderBy === 'longitude'}
                          direction={orderBy === 'longitude' ? order : 'asc'}
                          onClick={() => handleRequestSort('longitude')}
                        >
                          Longitude
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedData
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row) => (
                        <TableRow key={row.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' } }}>
                          <TableCell sx={{ color: 'text.secondary' }}>{row.stateName}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.cityName}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{row.population.toLocaleString('en-IN')}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{row.latitude.toFixed(4)}° N</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{row.longitude.toFixed(4)}° E</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          ) : (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No city & state records found.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        fullWidth 
        maxWidth="sm" 
        PaperProps={{ sx: { borderRadius: '16px', m: 2 } }}
      >
        <form onSubmit={handleSave}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add State & City Entry</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            {errorMsg && <Alert severity="error" sx={{ borderRadius: 2 }}>{errorMsg}</Alert>}
            
            <TextField
              label="City Name"
              variant="outlined"
              fullWidth
              required
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              InputProps={{ style: { borderRadius: '10px' } }}
            />
            <TextField
              label="State Name"
              variant="outlined"
              fullWidth
              required
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              InputProps={{ style: { borderRadius: '10px' } }}
            />
            <TextField
              label="2011 Census Population"
              variant="outlined"
              fullWidth
              required
              type="number"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
              InputProps={{ style: { borderRadius: '10px' } }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Latitude (Decimal)"
                variant="outlined"
                fullWidth
                required
                type="number"
                inputProps={{ step: 'any' }}
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                InputProps={{ style: { borderRadius: '10px' } }}
              />
              <TextField
                label="Longitude (Decimal)"
                variant="outlined"
                fullWidth
                required
                type="number"
                inputProps={{ step: 'any' }}
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                InputProps={{ style: { borderRadius: '10px' } }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
            <Button onClick={handleCloseDialog} color="inherit" disabled={saving} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
