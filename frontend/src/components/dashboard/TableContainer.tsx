import React, { useState, useMemo } from 'react';
import { 
  Paper, Box, Typography, Button, Skeleton,
  Table, TableBody, TableCell, TableContainer as MuiTableContainer, TableHead, TableRow, TableSortLabel, alpha, useTheme 
} from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import { TableVirtuoso } from 'react-virtuoso';

export interface ColumnDefinition {
  field: string;
  headerName: string;
  width?: number;
  minWidth?: number;
  sticky?: boolean;
  stickyRight?: boolean;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  valueFormatter?: (value: any) => any;
  renderCell?: (row: any) => React.ReactNode;
}

interface TableContainerProps {
  title?: string;
  data: any[];
  columns: ColumnDefinition[];
  onExport?: () => void;
  emptyStateMessage?: React.ReactNode;
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

export default function TableContainer({ title, data, columns, onExport, emptyStateMessage, loading = false, sortBy, sortOrder = 'asc', onSort }: TableContainerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [internalSortBy, setInternalSortBy] = useState<string | undefined>(undefined);
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>('asc');

  const activeSortBy = onSort ? sortBy : internalSortBy;
  const activeSortOrder = onSort ? sortOrder : internalSortOrder;

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field);
    } else {
      const isAsc = activeSortBy === field && activeSortOrder === 'asc';
      setInternalSortOrder(isAsc ? 'desc' : 'asc');
      setInternalSortBy(field);
    }
  };

  const sortedData = useMemo(() => {
    if (onSort || !activeSortBy) return data;
    return [...data].sort((a, b) => {
      let aVal = a[activeSortBy];
      let bVal = b[activeSortBy];
      
      // Default to empty strings for null/undefined to avoid crash
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return activeSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return activeSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, activeSortBy, activeSortOrder, onSort]);

  // Calculate sticky left offsets
  let currentLeftOffset = 0;
  let currentRightOffset = 0;

  const columnsWithOffsets = columns.map(col => ({ ...col, leftOffset: 0, rightOffset: 0, isSortable: col.sortable !== false }));

  // Left offsets
  columnsWithOffsets.forEach(col => {
    col.leftOffset = currentLeftOffset;
    if (col.sticky) {
      currentLeftOffset += (col.width || col.minWidth || 100);
    }
  });

  // Right offsets
  for (let i = columnsWithOffsets.length - 1; i >= 0; i--) {
    const col = columnsWithOffsets[i];
    col.rightOffset = currentRightOffset;
    if (col.stickyRight) {
      currentRightOffset += (col.width || col.minWidth || 100);
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {title && (
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
      )}

      {/* Virtualized Table for high performance */}
      <Box sx={{ backgroundColor: 'background.paper', height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
        <TableVirtuoso
          data={sortedData}
          components={{
            Scroller: React.forwardRef<HTMLDivElement, any>((props, ref) => (
              <MuiTableContainer {...props} ref={ref} sx={{ ...props.sx, flex: 1 }} />
            )),
            Table: React.forwardRef<HTMLTableElement, any>((props, ref) => <Table {...props} ref={ref} stickyHeader size="small" sx={{ minWidth: 'max-content' }} />) as any,
            TableHead: React.forwardRef<HTMLTableSectionElement, any>((props, ref) => <TableHead {...props} ref={ref} />) as any,
            TableRow: ({ item: _item, ...props }) => (
              <TableRow 
                {...props} 
                hover 
                sx={{ 
                  '&:nth-of-type(odd)': { 
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)' 
                  },
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05) !important' : 'rgba(0, 0, 0, 0.04) !important'
                  }
                }} 
              />
            ),
            TableBody: React.forwardRef<HTMLTableSectionElement, any>((props, ref) => (
              <TableBody {...props} ref={ref} />
            )) as any,
            EmptyPlaceholder: () => (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                {emptyStateMessage || (
                  <Typography variant="body2" color="text.secondary">No records found for this date range.</Typography>
                )}
              </Box>
            )
          }}
          fixedHeaderContent={() => (
            <TableRow>
              {columnsWithOffsets.map(col => (
                <TableCell 
                  key={col.field}
                  align={col.align || "center"}
                  sx={{ 
                    fontWeight: 600, 
                    color: isDark ? '#CBD5E1' : '#1E293B',
                    backgroundColor: isDark ? '#131A2B' : '#F8FAFC',
                    backgroundImage: 'none',
                    borderBottom: '2px solid',
                    borderRight: col.sticky ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0') : 'none',
                    borderLeft: col.stickyRight ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0') : 'none',
                    borderColor: 'divider',
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    width: col.width,
                    minWidth: col.minWidth,
                    position: 'sticky',
                    top: 0,
                    left: col.sticky ? col.leftOffset : 'auto',
                    right: col.stickyRight ? col.rightOffset : 'auto',
                    zIndex: (col.sticky || col.stickyRight) ? 40 : 30,
                    cursor: col.isSortable ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={col.isSortable ? () => handleSort(col.field) : undefined}
                >
                  {col.isSortable ? (
                    <TableSortLabel
                      active={activeSortBy === col.field}
                      direction={activeSortBy === col.field ? activeSortOrder : 'asc'}
                      onClick={(e) => { e.stopPropagation(); handleSort(col.field); }}
                      sx={{
                        fontSize: '11px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: isDark ? '#CBD5E1' : '#1E293B',
                        '&.Mui-active': { color: '#8B5CF6' },
                        '& .MuiTableSortLabel-icon': { color: '#8B5CF6 !important' }
                      }}
                    >
                      {col.headerName}
                    </TableSortLabel>
                  ) : (
                    col.headerName
                  )}
                </TableCell>
              ))}
            </TableRow>
          )}
          itemContent={(index, row) => (
            <>
              {columnsWithOffsets.map(col => {
                const value = row[col.field];
                const displayValue = col.valueFormatter ? col.valueFormatter(value) : value;
                return (
                  <TableCell 
                    key={col.field}
                    align={col.align || "center"}
                    sx={{ 
                      fontSize: '12px',
                      color: 'text.primary',
                      borderBottom: '1px solid',
                      borderRight: col.sticky ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0') : 'none',
                      borderLeft: col.stickyRight ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0') : 'none',
                      borderColor: 'divider',
                      whiteSpace: 'nowrap',
                      position: (col.sticky || col.stickyRight) ? 'sticky' : 'static',
                      left: col.sticky ? col.leftOffset : 'auto',
                      right: col.stickyRight ? col.rightOffset : 'auto',
                      backgroundColor: index % 2 === 0 
                        ? (isDark ? '#0E1422' : '#FFFFFF') 
                        : (isDark ? '#141C2E' : '#FAFAFA'), 
                      zIndex: (col.sticky || col.stickyRight) ? 20 : 'auto',
                    }}
                  >
                    {col.renderCell 
                      ? col.renderCell(row) 
                      : (displayValue !== undefined && displayValue !== null ? displayValue : '-')}
                  </TableCell>
                );
              })}
            </>
          )}
        />
      </Box>
      
      {/* Footer summarizing record count without pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', backgroundColor: isDark ? '#0E1422' : 'background.default' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {loading ? 'Loading records...' : data.length === 0 ? 'No records' : data.length === 1 ? 'Showing 1 record' : `Showing ${data.length} records`}
        </Typography>
      </Box>
    </Paper>
  );
}
