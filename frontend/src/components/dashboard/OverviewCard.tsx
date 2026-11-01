import React from 'react';
import { Box, Typography, Paper, Skeleton, Tooltip, alpha, useTheme } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { OverviewItemConfig, OverviewItemType } from '../../constants/dashboardOverview';
import { MarketOverviewSummary } from '../../types/overview';
import { formatOverviewDate } from '../../utils/date';

interface OverviewCardProps {
  type: OverviewItemType;
  item: OverviewItemConfig;
  isLoading?: boolean;
  marketData?: MarketOverviewSummary | null;
}

const MarketBody = ({ isLoading, marketData, color }: { isLoading?: boolean; marketData?: MarketOverviewSummary | null; color: string }) => {
  if (isLoading) {
    return (
      <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="20%" height={40} />
        </Box>
        <Skeleton variant="rounded" width="100%" height={64} />
      </Box>
    );
  }

  if (marketData) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Tooltip title="Number of ACTIVE datasets currently available for analysis." arrow placement="top-start">
            <Box sx={{ display: 'inline-block' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Datasets
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h2" color="text.primary" sx={{ fontWeight: 700 }}>
                  {marketData.activeDatasetCount}
                </Typography>
                {marketData.activeDatasetCount > 0 && (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color, opacity: 0.8 }} />
                )}
              </Box>
            </Box>
          </Tooltip>
        </Box>

        <Box sx={{ 
          p: 2, 
          backgroundColor: 'background.default', 
          borderRadius: 2, 
          border: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Data Coverage
          </Typography>
          {marketData.coverageStart && marketData.coverageEnd ? (
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {formatOverviewDate(marketData.coverageStart)} <Box component="span" sx={{ color: 'text.disabled', mx: 0.5 }}>→</Box> {formatOverviewDate(marketData.coverageEnd)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
              No active datasets available
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="body2" color="text.disabled">
        Data unavailable
      </Typography>
    </Box>
  );
};

const ResourceBody = ({ description }: { description: string }) => {
  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {description}
      </Typography>
    </Box>
  );
};

export const OverviewCard = React.memo(({ type, item, isLoading, marketData }: OverviewCardProps) => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      role="button"
      tabIndex={0}
      aria-label={`Navigate to ${item.title}`}
      onClick={() => navigate(item.path)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(item.path);
        }
      }}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: type === 'market' ? 3 : 2.5,
        border: '1px solid',
        borderColor: 'divider',
        background: `radial-gradient(circle at 100% 0%, ${alpha(item.color, 0.06)} 0%, ${theme.palette.background.paper} 60%)`,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: type === 'market' ? 280 : 210, // ~25% reduction for compact variant
        '&:hover': {
          borderColor: alpha(item.color, 0.4),
          boxShadow: `0 12px 24px -10px ${alpha(item.color, 0.2)}`,
          transform: 'translateY(-2px)',
          '& .action-arrow': {
            transform: 'translateX(4px)',
            opacity: 1,
            color: item.color
          }
        },
        '&:focus-visible': {
          outline: `2px solid ${item.color}`,
          outlineOffset: '2px',
          borderColor: alpha(item.color, 0.4),
          boxShadow: `0 12px 24px -10px ${alpha(item.color, 0.2)}`,
        }
      }}
    >
      {/* Card Header (Shared) */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: type === 'market' ? 4 : 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            color: item.color, 
            backgroundColor: alpha(item.color, 0.08),
            p: 1.2,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {item.icon}
          </Box>
          <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {item.title}
          </Typography>
        </Box>
        <ArrowForwardIcon 
          className="action-arrow"
          sx={{ 
            color: 'text.disabled', 
            opacity: 0.7, 
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
          }} 
        />
      </Box>

      {/* Card Body (Variant Specific) */}
      {type === 'market' ? (
        <MarketBody isLoading={isLoading} marketData={marketData} color={item.color} />
      ) : (
        <ResourceBody description={item.description} />
      )}
    </Paper>
  );
});

OverviewCard.displayName = 'OverviewCard';
