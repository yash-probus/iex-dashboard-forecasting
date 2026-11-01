import React, { useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import AppRoutes from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider as ProltThemeProvider, useTheme } from './components/ThemeProvider';

function ThemedApp() {
  const { isDark } = useTheme();

  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        background: {
          default: isDark ? '#070A12' : '#F8FAFC',
          paper: isDark ? '#0E1422' : '#FFFFFF',
        },
        text: {
          primary: isDark ? '#F8FAFC' : '#001356',
          secondary: isDark ? '#94A3B8' : '#566578',
        },
        primary: {
          main: '#2563EB',
          light: '#60A5FA',
          dark: '#1D4ED8',
          contrastText: '#FFFFFF'
        },
        secondary: {
          main: '#64748B',
          light: '#94A3B8',
          dark: '#334155',
        },
        divider: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      },
      typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        h1: { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.025em' },
        h2: { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 600, fontSize: '20px', letterSpacing: '-0.02em' },
        h3: { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 600, fontSize: '18px', letterSpacing: '-0.015em' },
        h4: { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.01em' },
        h5: { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 600, fontSize: '15px', letterSpacing: '-0.005em' },
        h6: { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.005em' },
        subtitle1: { fontFamily: '"Inter", sans-serif', fontWeight: 500, fontSize: '14px', letterSpacing: '-0.01em' },
        subtitle2: { fontFamily: '"Inter", sans-serif', fontWeight: 500, fontSize: '12px', letterSpacing: '-0.005em' },
        body1: { fontSize: '14px', lineHeight: 1.5, letterSpacing: '-0.011em' },
        body2: { fontSize: '12px', lineHeight: 1.45, letterSpacing: '-0.006em' },
        caption: { fontSize: '11px', letterSpacing: '0.005em' },
        button: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '13px',
          letterSpacing: '-0.01em'
        },
      },
      shape: {
        borderRadius: 12,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              boxShadow: 'none',
              padding: '8px 16px',
              transition: 'all 0.2s ease-in-out',
              borderRadius: 8,
              '&:hover': {
                boxShadow: isDark ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 4px 12px rgba(37, 99, 235, 0.15)',
                transform: 'translateY(-1px)'
              },
              '&:active': {
                transform: 'translateY(0)'
              }
            },
            outlined: {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0',
              '&:hover': {
                borderColor: '#2563EB',
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : 'transparent'
              }
            }
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: isDark ? '#0E1422' : '#FFFFFF',
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9'
            },
            elevation1: {
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)'
            },
            elevation2: {
              boxShadow: isDark ? '0 10px 25px -3px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)'
            }
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundColor: isDark ? '#0E1422' : '#FFFFFF',
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
              transition: 'box-shadow 0.2s ease-in-out',
              '&:hover': {
                boxShadow: isDark ? '0 10px 25px -3px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)'
              }
            }
          }
        },
        MuiTab: {
          styleOverrides: {
            root: {
              fontSize: '14px',
              fontWeight: 600,
              minHeight: '48px',
              textTransform: 'none'
            }
          }
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
              padding: '12px 16px',
              whiteSpace: 'nowrap',
              color: isDark ? '#E2E8F0' : 'inherit',
            },
            head: {
              fontWeight: 600,
              color: isDark ? '#94A3B8' : '#64748B',
              textTransform: 'none',
              fontSize: '13px',
              letterSpacing: '0.02em',
              backgroundColor: isDark ? '#131A2B' : '#F8FAFC',
              whiteSpace: 'nowrap',
            }
          }
        }
      },
    });
  }, [isDark]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <NotificationProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </NotificationProvider>
      </ErrorBoundary>
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProltThemeProvider>
        <ThemedApp />
      </ProltThemeProvider>
      {(import.meta as any).env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
