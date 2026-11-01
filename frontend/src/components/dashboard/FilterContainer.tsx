import React, { useState, useEffect } from 'react';
import { Paper, Box, Button, TextField, MenuItem } from '@mui/material';
import { FilterList as FilterIcon, FileDownload as DownloadIcon, Search as SearchIcon } from '@mui/icons-material';
import { IntervalFilter, MarketFilters } from '../../hooks/useMarketFilters';
import ActionButton from '../common/ActionButton';
import DateRangePicker from '../common/DateRangePicker';
import { State } from 'country-state-city';

interface FilterContainerProps {
  accentColor?: string;
  filters: MarketFilters;
  onSearch: (filters: MarketFilters, selectedState?: string) => void;
  onManageData?: () => void;
  hideHourlyDaily?: boolean;
  maxDays?: number;
  maxDate?: string;
}

export default function FilterContainer({ 
  accentColor = 'primary.main',
  filters,
  onSearch,
  onManageData,
  hideHourlyDaily,
  maxDays,
  maxDate
}: FilterContainerProps) {
  const [localStartDate, setLocalStartDate] = useState(filters.startDate);
  const [localEndDate, setLocalEndDate] = useState(filters.endDate);
  const [localInterval, setLocalInterval] = useState<IntervalFilter>(filters.interval);
  const [localState, setLocalState] = useState('');

  const allStates = React.useMemo(() => {
    return State.getStatesOfCountry('IN').sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  useEffect(() => {
    setLocalStartDate(filters.startDate);
    setLocalEndDate(filters.endDate);
    setLocalInterval(filters.interval);
  }, [filters]);

  const handleSearch = () => {
    onSearch({ startDate: localStartDate, endDate: localEndDate, interval: localInterval }, localState);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <DateRangePicker 
        startDate={localStartDate}
        endDate={localEndDate}
        maxDays={maxDays}
        maxDate={maxDate}
        onChange={(s, e) => {
          setLocalStartDate(s);
          setLocalEndDate(e);
        }}
      />

      <Button
        variant="contained"
        onClick={handleSearch}
        sx={{ 
          bgcolor: accentColor, 
          '&:hover': { bgcolor: accentColor, filter: 'brightness(0.9)' },
          textTransform: 'none',
          borderRadius: 1.5,
          px: 3
        }}
      >
        Submit
      </Button>
    </Box>
  );
}
