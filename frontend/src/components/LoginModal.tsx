import React, { useState } from 'react';
import { 
  Dialog, DialogContent, Box, Typography, TextField, Button, 
  CircularProgress, Alert, IconButton, InputAdornment 
} from '@mui/material';
import { 
  LockOutlined as LockOutlinedIcon, 
  Visibility, VisibilityOff, Close as CloseIcon 
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth.api';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();

  // Reset state when opened
  React.useEffect(() => {
    if (open) {
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Username and password are required.');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const response = await authApi.login(trimmedUser, password);
      if (response.success) {
        login(response.token, response.user);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (event?: {}, reason?: "backdropClick" | "escapeKeyDown") => {
    if (loading) return; // Disable closing while loading
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      PaperProps={{
        sx: { 
          p: { xs: 2, sm: 3 }, 
          width: '100%', 
          maxWidth: { xs: '90vw', sm: '440px' }, 
          borderRadius: 3,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }
      }}
      BackdropProps={{
        sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' }
      }}
    >
      <Box sx={{ position: 'absolute', right: 12, top: 12 }}>
        <IconButton onClick={() => handleClose()} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, mt: 2 }}>
          <Box sx={{ bgcolor: 'primary.main', p: 1.5, borderRadius: '50%', mb: 2 }}>
            <LockOutlinedIcon sx={{ color: '#fff' }} />
          </Box>
          <Typography component="h1" variant="h5" fontWeight={600}>
            System Login
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ 
              mt: 4, 
              mb: 1, 
              py: 1.25, 
              fontSize: '14px',
              borderRadius: '999px',
              fontWeight: 500,
              background: `linear-gradient(45deg, #EA580C 30%, #C2410C 90%)`,
              boxShadow: 'none',
              transition: 'all 250ms ease',
              border: '1px solid transparent',
              '&:hover': {
                background: `linear-gradient(45deg, #C2410C 30%, #9A3412 90%)`,
                borderColor: '#9A3412',
                boxShadow: 'none',
              },
              '&.Mui-disabled': {
                background: '#e0e0e0',
                color: '#9e9e9e'
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
