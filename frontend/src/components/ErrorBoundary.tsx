import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Collapse, IconButton } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon, Home as HomeIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { logErrorToService } from '../services/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logErrorToService({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          backgroundColor: 'background.default',
          p: 3
        }}>
          <Paper elevation={0} sx={{ 
            maxWidth: 600, 
            width: '100%', 
            p: 5, 
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h2" color="text.primary" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
              An unexpected error has occurred. We've logged the issue and are working to resolve it. Please try reloading the page.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 4, width: '100%', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<RefreshIcon />} 
                onClick={this.handleReload}
                sx={{ px: 3, py: 1 }}
              >
                Reload Page
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                startIcon={<HomeIcon />} 
                onClick={this.handleHome}
                sx={{ px: 3, py: 1 }}
              >
                Return Home
              </Button>
            </Box>

            <Box sx={{ width: '100%', borderTop: '1px solid', borderColor: 'divider', pt: 2, textAlign: 'left' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={this.toggleDetails}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Technical Details
                </Typography>
                <IconButton size="small" sx={{ transform: this.state.showDetails ? 'rotate(180deg)' : 'none', transition: '0.3s' }}>
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
              <Collapse in={this.state.showDetails}>
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'surface.main', borderRadius: 1, overflowX: 'auto' }}>
                  <Typography variant="caption" component="pre" sx={{ color: 'error.main', whiteSpace: 'pre-wrap', mb: 1 }}>
                    {this.state.error?.toString()}
                  </Typography>
                  <Typography variant="caption" component="pre" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
