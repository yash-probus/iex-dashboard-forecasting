import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Popover, 
  IconButton, 
  Typography, 
  Grid, 
  Button, 
  alpha, 
  useTheme 
} from '@mui/material';
import { 
  ChevronLeft as ChevronLeftIcon, 
  ChevronRight as ChevronRightIcon,
  CalendarToday as CalendarIcon,
  WarningAmber as WarningAmberIcon
} from '@mui/icons-material';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  maxDays?: number;  // Maximum range in days (default: 31)
  minDate?: string;  // Minimum allowed date (YYYY-MM-DD)
  maxDate?: string;  // Maximum allowed date (YYYY-MM-DD)
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  maxDays = 31,
  minDate = '2024-04-01',
  maxDate = new Date().toISOString().split('T')[0]
}: DateRangePickerProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  
  // Internal selection state
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Calendar month view state
  const [currentYear, setCurrentYear] = useState<number>(() => parseInt(startDate.split('-')[0]));
  const [currentMonth, setCurrentMonth] = useState<number>(() => parseInt(startDate.split('-')[1]) - 1); // 0-indexed

  // Sync with props when popover opens or props change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    // Focus calendar month on selected start date
    if (startDate) {
      setCurrentYear(parseInt(startDate.split('-')[0]));
      setCurrentMonth(parseInt(startDate.split('-')[1]) - 1);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setHoverDate(null);
  };

  // Helper date conversions
  const parseDateStr = (str: string) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateStr = (date: Date) => {
    return date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
  };

  // Formatting date to human-readable format DD MMM YYYY (unambiguous)
  const toDisplayFormat = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthAbbr = monthNames[parseInt(m, 10) - 1];
    return `${d} ${monthAbbr} ${y}`;
  };

  // Calculate calendar days
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleDayClick = (dayStr: string) => {
    // If we don't have a start date yet, or we already have both, set new start date
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dayStr);
      setTempEnd('');
    } else {
      // We have a start date and are selecting the end date
      const start = parseDateStr(tempStart);
      const clicked = parseDateStr(dayStr);
      
      if (clicked < start) {
        // If clicked date is before start date, treat it as new start date
        setTempStart(dayStr);
      } else {
        // Check range constraint
        const diffTime = clicked.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of both dates
        
        if (diffDays <= maxDays) {
          setTempEnd(dayStr);
          onChange(tempStart, dayStr);
          handleClose();
        }
      }
    }
  };

  // Check if a day is disabled based on maxDays range selection or min/max dates
  const isDayDisabled = (dayStr: string) => {
    if (minDate && dayStr < minDate) return true;
    if (maxDate && dayStr > maxDate) return true;

    // If start date is selected but not end date, restrict selection to maxDays
    if (tempStart && !tempEnd) {
      const start = parseDateStr(tempStart);
      const current = parseDateStr(dayStr);
      if (current < start) return false; // Can always click a date before to reset start date
      
      const diffTime = current.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > maxDays;
    }

    return false;
  };

  // Determine day styling classes/states
  const getDayStatus = (dayStr: string) => {
    if (dayStr === tempStart && dayStr === tempEnd) return 'selected-both';
    if (dayStr === tempStart) return 'selected-start';
    if (dayStr === tempEnd) return 'selected-end';
    
    if (tempStart && tempEnd && dayStr > tempStart && dayStr < tempEnd) return 'in-range';
    
    if (tempStart && !tempEnd && hoverDate && dayStr > tempStart && dayStr <= hoverDate) {
      // Check if this hovered day violates maxDays
      const start = parseDateStr(tempStart);
      const current = parseDateStr(dayStr);
      const diffTime = current.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays <= maxDays) {
        return 'in-range-preview';
      }
    }

    return 'none';
  };

  const open = Boolean(anchorEl);
  const id = open ? 'date-range-picker-popover' : undefined;

  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Render Calendar Grid Days
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
  const calendarCells = [];

  // Empty cells for alignment before first day of month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(<Grid item xs={1.71} key={`empty-${i}`} />);
  }

  // Actual day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const disabled = isDayDisabled(dayStr);
    const status = getDayStatus(dayStr);

    let bgColor = 'transparent';
    let textColor = theme.palette.text.primary;
    let borderRadius = '50%';

    if (disabled) {
      textColor = theme.palette.text.disabled;
    } else if (status === 'selected-start' || status === 'selected-both') {
      bgColor = theme.palette.primary.main;
      textColor = theme.palette.primary.contrastText;
      borderRadius = tempEnd ? '50% 0 0 50%' : '50%';
    } else if (status === 'selected-end') {
      bgColor = theme.palette.primary.main;
      textColor = theme.palette.primary.contrastText;
      borderRadius = '0 50% 50% 0';
    } else if (status === 'in-range') {
      bgColor = alpha(theme.palette.primary.main, 0.12);
      borderRadius = '0';
    } else if (status === 'in-range-preview') {
      bgColor = alpha(theme.palette.primary.main, 0.06);
      borderRadius = '0';
    }

    calendarCells.push(
      <Grid item xs={1.71} key={dayStr} sx={{ display: 'flex', justifyContent: 'center', my: 0.25 }}>
        <Box
          onMouseEnter={() => !disabled && setHoverDate(dayStr)}
          onClick={() => !disabled && handleDayClick(dayStr)}
          sx={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'default' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: (status !== 'none' && !disabled) ? 600 : 400,
            backgroundColor: bgColor,
            color: textColor,
            borderRadius: borderRadius,
            transition: 'background-color 0.15s, border-radius 0.15s',
            '&:hover': {
              backgroundColor: disabled ? 'transparent' : (status === 'none' ? alpha(theme.palette.primary.main, 0.08) : bgColor),
            }
          }}
        >
          {day}
        </Box>
      </Grid>
    );
  }

  const formattedLabel = `${toDisplayFormat(startDate)} - ${toDisplayFormat(endDate)}`;

  return (
    <Box>
      <Button
        aria-describedby={id}
        variant="outlined"
        onClick={handleOpen}
        startIcon={<CalendarIcon sx={{ color: 'text.secondary' }} />}
        sx={{
          padding: '10px 16px',
          borderRadius: '10px',
          borderColor: '#E2E8F0',
          textTransform: 'none',
          color: '#0F172A',
          fontSize: '0.875rem',
          fontWeight: 500,
          backgroundColor: '#FFF',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: '#FFF',
          }
        }}
      >
        {formattedLabel}
      </Button>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            p: 2.5,
            width: 320,
            borderRadius: 4,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
            border: '1px solid',
            borderColor: 'divider',
          }
        }}
      >
        {/* Header month navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <IconButton size="small" onClick={handlePrevMonth}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="subtitle2" fontWeight="700">
            {months[currentMonth]} {currentYear}
          </Typography>
          <IconButton size="small" onClick={handleNextMonth}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {/* Days of week header */}
        <Grid container spacing={0} sx={{ mb: 1, textAlign: 'center' }}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <Grid item xs={1.71} key={d}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {d}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Calendar cells grid */}
        <Grid container spacing={0} onMouseLeave={() => setHoverDate(null)}>
          {calendarCells}
        </Grid>

        {/* Footer info/controls */}
        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <WarningAmberIcon sx={{ fontSize: 14, color: 'error.main' }} /> Max range: 31 days
          </Typography>
          {tempStart && !tempEnd && (
            <Typography variant="caption" color="primary" fontWeight="600">
              Select end date
            </Typography>
          )}
        </Box>
      </Popover>
    </Box>
  );
}
