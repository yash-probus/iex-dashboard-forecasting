import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Box, Typography, Paper } from '@mui/material';

const geoUrl = '/india-states.geojson';

interface IndiaMapProps {
  regionData: any[]; // Expecting the data passed from the parent
}

// Map the geojson state names to the regions exactly
const stateToRegion: Record<string, string> = {
  'Jammu and Kashmir': 'Northern States',
  'Ladakh': 'Northern States',
  'Himachal Pradesh': 'Northern States',
  'Punjab': 'Northern States',
  'Haryana': 'Northern States',
  'Uttarakhand': 'Northern States',
  'Delhi': 'Northern States',
  'Uttar Pradesh': 'Northern States',
  'Rajasthan': 'Northern States',
  'Chandigarh': 'Northern States',

  'Gujarat': 'Western States',
  'Madhya Pradesh': 'Western States',
  'Maharashtra': 'Western States',
  'Chhattisgarh': 'Western States',
  'Goa': 'Western States',
  'Dadra and Nagar Haveli and Daman and Diu': 'Western States',

  'Andhra Pradesh': 'Southern States',
  'Telangana': 'Southern States',
  'Karnataka': 'Southern States',
  'Kerala': 'Southern States',
  'Tamil Nadu': 'Southern States',
  'Puducherry': 'Southern States',
  'Lakshadweep': 'Southern States',
  'Andaman and Nicobar Islands': 'Southern States',

  'Bihar': 'Eastern States',
  'Jharkhand': 'Eastern States',
  'West Bengal': 'Eastern States',
  'Odisha': 'Eastern States',
  'Sikkim': 'Eastern States',

  'Arunachal Pradesh': 'North-Eastern States',
  'Assam': 'North-Eastern States',
  'Meghalaya': 'North-Eastern States',
  'Nagaland': 'North-Eastern States',
  'Manipur': 'North-Eastern States',
  'Mizoram': 'North-Eastern States',
  'Tripura': 'North-Eastern States',
};

const regionColors: Record<string, string> = {
  'Northern States': '#F59E0B',
  'Western States': '#F43F5E',
  'Southern States': '#8B5CF6',
  'Eastern States': '#EA580C',
  'North-Eastern States': '#0EA5E9'
};

export default function IndiaMap({ regionData }: IndiaMapProps) {
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Pre-calculate prices per region
  const regionPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    if (regionData) {
      regionData.forEach((region: any) => {
        // Handle name mismatch if needed
        const regionName = region.name === 'North Eastern States' ? 'North-Eastern States' : region.name;
        prices[regionName] = region.price;
      });
    }
    return prices;
  }, [regionData]);

  const handleMouseEnter = (geo: any, event: any) => {
    const stateName = geo.properties.name;
    const regionName = stateToRegion[stateName];
    const price = regionName && regionPrices[regionName] !== undefined ? regionPrices[regionName].toFixed(2) : '--';
    
    setTooltipContent(`${stateName} (${regionName || 'Unknown'})\n₹${price}/Unit`);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '600px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 900,
          center: [81, 23.5] // Adjusted center and scale so Kashmir isn't cut off
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.name;
              const regionName = stateToRegion[stateName];
              const color = regionName ? regionColors[regionName] : '#E5E7EB';

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(e) => handleMouseEnter(geo, e)}
                  onMouseLeave={() => setTooltipContent('')}
                  style={{
                    default: {
                      fill: color,
                      outline: 'none',
                      stroke: '#FFFFFF',
                      strokeWidth: 0.5,
                      transition: 'all 0.2s',
                    },
                    hover: {
                      fill: color,
                      outline: 'none',
                      stroke: '#111827',
                      strokeWidth: 1.5,
                      filter: 'brightness(1.1)',
                      cursor: 'pointer'
                    },
                    pressed: {
                      fill: color,
                      outline: 'none',
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltipContent && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y + 15,
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #E5E7EB',
            pointerEvents: 'none',
            zIndex: 1000,
            borderRadius: 2,
            whiteSpace: 'pre-line',
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {tooltipContent.split('\n')[0]}
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="primary.main">
            {tooltipContent.split('\n')[1]}
          </Typography>
        </Paper>
      )}

      {/* Legend */}
      <Paper elevation={0} sx={{ position: 'absolute', bottom: 16, right: 16, p: 2, border: '1px solid #E5E7EB', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Regions</Typography>
        {Object.keys(regionColors).map((region) => (
          <Box key={region} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: regionColors[region], mr: 1 }} />
            <Typography variant="caption">{region}</Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
