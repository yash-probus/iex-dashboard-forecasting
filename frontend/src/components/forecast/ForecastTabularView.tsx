import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer as MuiTableContainer,
  TableRow,
  TableHead,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Button,
  Pagination,
  alpha
} from '@mui/material';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../ThemeProvider';

interface ForecastTabularViewProps {
  title: string;
  data: any[];
  columns: any[];
  accentColor?: string;
  isPrice?: boolean;
  isDemand?: boolean;
  isGeneration?: boolean;
  subType?: string;
  onExport?: () => void;
}

export default function ForecastTabularView({
  title,
  data,
  columns,
  accentColor = '#8B5CF6',
  isPrice = true,
  isDemand = false,
  isGeneration = false,
  subType = 'dam',
  onExport
}: ForecastTabularViewProps) {
  const { isDark } = useTheme();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 24; // 24 slots (6 hours) per page or show all

  // Filtered rows
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lower = searchTerm.toLowerCase().trim();
    return data.filter(row => {
      return (
        (row.timeBlock && row.timeBlock.toLowerCase().includes(lower)) ||
        (row.hour && String(row.hour).toLowerCase().includes(lower)) ||
        (row.date && String(row.date).toLowerCase().includes(lower)) ||
        (row.intervalNumber && String(row.intervalNumber).includes(lower)) ||
        (row.priceRange && String(row.priceRange).toLowerCase().includes(lower))
      );
    });
  }, [data, searchTerm]);

  // Paginated rows
  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3.5,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(226, 232, 240, 0.9)',
        bgcolor: isDark ? 'rgba(14, 20, 34, 0.85)' : '#FFFFFF',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
        flexShrink: 0,
        width: '100%',
        boxShadow: isDark
          ? '0 10px 25px -8px rgba(0, 0, 0, 0.5)'
          : '0 8px 20px -6px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Header & Search Toolbar */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(accentColor, isDark ? 0.2 : 0.1),
              color: accentColor
            }}
          >
            <FileSpreadsheet size={18} />
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '16px', color: isDark ? '#F8FAFC' : '#001356' }}>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Displaying {filteredData.length} total interval settlement blocks
            </Typography>
          </Box>
        </Box>

        {/* Search Bar & Pagination Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search block, e.g. 08:15 or Hour 04..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} style={{ color: isDark ? '#64748B' : '#94A3B8' }} />
                </InputAdornment>
              )
            }}
            sx={{
              width: { xs: '100%', sm: 260 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                fontSize: '13px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }
            }}
          />

          {onExport && (
            <Button
              variant="outlined"
              size="small"
              onClick={onExport}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12px',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                color: isDark ? '#F8FAFC' : '#0F172A',
                '&:hover': {
                  borderColor: accentColor,
                  bgcolor: alpha(accentColor, 0.08)
                }
              }}
            >
              Export CSV
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Table */}
      <MuiTableContainer sx={{ maxHeight: 460, overflowY: 'auto' }}>
        <Table stickyHeader size="small" sx={{ width: '100%' }}>
          <TableHead>
            <TableRow>
              {/* Optional Slot # column */}
              <TableCell
                align="center"
                sx={{
                  fontWeight: 700,
                  color: isDark ? '#CBD5E1' : '#475569',
                  bgcolor: isDark ? '#0E1422' : '#F8FAFC',
                  borderBottom: '1px solid',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  fontSize: '11px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  py: 1.25,
                  zIndex: 20
                }}
              >
                SLOT #
              </TableCell>

              {columns.map(col => (
                <TableCell
                  key={col.field}
                  align={col.align || "center"}
                  sx={{
                    fontWeight: 700,
                    color: isDark ? '#CBD5E1' : '#475569',
                    bgcolor: isDark ? '#0E1422' : '#F8FAFC',
                    borderBottom: '1px solid',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    width: col.width,
                    minWidth: col.minWidth,
                    py: 1.25,
                    zIndex: 20
                  }}
                >
                  {col.headerName}
                </TableCell>
              ))}

              {/* Extra Variance Column for Price */}
              {isPrice && (
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    color: isDark ? '#CBD5E1' : '#475569',
                    bgcolor: isDark ? '#0E1422' : '#F8FAFC',
                    borderBottom: '1px solid',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    py: 1.25,
                    zIndex: 20
                  }}
                >
                  SPREAD (ACTUAL - FC)
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (isPrice ? 2 : 1)} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                    No intervals found matching "{searchTerm}"
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const globalIndex = (page - 1) * rowsPerPage + index;
                const slotNum = row.intervalNumber ?? globalIndex + 1;
                const fVal = row.mcp ?? row.mcpDayahead ?? row.mcpNowcast;
                const aVal = row.actualMcp;

                // Calculate spread
                let diff: number | null = null;
                if (typeof fVal === 'number' && typeof aVal === 'number') {
                  diff = parseFloat((aVal - fVal).toFixed(2));
                }

                return (
                  <TableRow
                    key={index}
                    hover
                    sx={{
                      transition: 'background-color 0.15s ease',
                      bgcolor: index % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.015)'),
                      '&:hover': {
                        bgcolor: isDark ? 'rgba(139, 92, 246, 0.08) !important' : 'rgba(139, 92, 246, 0.05) !important'
                      }
                    }}
                  >
                    {/* Slot badge */}
                    <TableCell align="center" sx={{ py: 1 }}>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 0.75,
                          py: 0.2,
                          borderRadius: 1,
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono, monospace)',
                          bgcolor: alpha(accentColor, isDark ? 0.18 : 0.1),
                          color: accentColor
                        }}
                      >
                        #{String(slotNum).padStart(2, '0')}
                      </Box>
                    </TableCell>

                    {columns.map(col => {
                      const value = row[col.field];
                      const displayValue = col.valueFormatter ? col.valueFormatter(value) : value;

                      // Custom styling for Forecasted & Actual Price cells
                      const isForecastField = col.field === 'mcp' || col.field === 'mcpDayahead' || col.field === 'mcpNowcast';
                      const isActualField = col.field === 'actualMcp';

                      return (
                        <TableCell
                          key={col.field}
                          align={col.align || "center"}
                          sx={{
                            fontSize: '12.5px',
                            fontFamily: 'var(--font-mono, monospace)',
                            color: isForecastField
                              ? accentColor
                              : isActualField
                              ? '#10B981'
                              : isDark ? '#F1F5F9' : '#0F172A',
                            fontWeight: isForecastField || isActualField ? 700 : 500,
                            whiteSpace: 'nowrap',
                            py: 1
                          }}
                        >
                          {col.renderCell
                            ? col.renderCell(row)
                            : (displayValue !== undefined && displayValue !== null ? displayValue : '—')}
                        </TableCell>
                      );
                    })}

                    {/* Spread / Variance Cell */}
                    {isPrice && (
                      <TableCell align="center" sx={{ py: 1 }}>
                        {diff !== null ? (
                          <Chip
                            label={diff === 0 ? '₹0.00 (Match)' : `${diff > 0 ? '+' : ''}₹${diff.toFixed(2)}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '10.5px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono, monospace)',
                              bgcolor: diff === 0
                                ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                                : Math.abs(diff) <= 0.3
                                ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                                : (isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'),
                              color: diff === 0 ? '#10B981' : Math.abs(diff) <= 0.3 ? '#3B82F6' : '#F59E0B'
                            }}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                            Pending
                          </Typography>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </MuiTableContainer>

      {/* Pagination & Footer */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          borderTop: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          bgcolor: isDark ? 'rgba(14, 20, 34, 0.6)' : '#FAFCFE',
          gap: 2
        }}
      >
        <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
          Showing {(page - 1) * rowsPerPage + 1} - {Math.min(page * rowsPerPage, filteredData.length)} of {filteredData.length} records
        </Typography>

        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, val) => setPage(val)}
            size="small"
            sx={{
              '& .MuiPaginationItem-root': {
                color: isDark ? '#94A3B8' : '#64748B',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: 1.5,
                '&.Mui-selected': {
                  bgcolor: accentColor,
                  color: '#FFF',
                  '&:hover': { bgcolor: accentColor }
                }
              }
            }}
          />
        )}
      </Box>
    </Paper>
  );
}
