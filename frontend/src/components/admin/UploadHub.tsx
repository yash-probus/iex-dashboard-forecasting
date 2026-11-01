import React, { useState } from 'react';
import { 
  Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, TextField, 
  CircularProgress, Alert, Paper, LinearProgress
} from '@mui/material';
import { CloudUpload as UploadIcon, CheckCircle, Warning as WarningIcon, Description as FileIcon } from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { uploadApi } from '../../api/upload.api';
import { formatOverviewDate } from '../../utils/date';

interface UploadHubProps {
  onUploadSuccess: () => void;
}

type UploadStep = 'select' | 'uploading' | 'replace_confirm' | 'success';

export default function UploadHub({ onUploadSuccess }: UploadHubProps) {
  const { showNotification } = useNotification();
  
  const [step, setStep] = useState<UploadStep>('select');
  const [market, setMarket] = useState('DAM');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const resetState = () => {
    setStep('select');
    setFile(null);
    setProgress(0);
    setError(null);
    setUploadResult(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    // IEX single-day files are typically < 100KB. 
    // We set a hard limit of 2MB on the client side to prevent huge files from even starting upload.
    const MAX_SIZE_MB = 2;
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB). Please upload a single-day file under 2MB. Bulk archives are not supported.`);
      return;
    }
    setFile(selectedFile);
  };

  const executeUpload = async (action?: 'replace') => {
    if (!file) return;

    setStep('uploading');
    setProgress(0);
    setError(null);

    try {
      const res = await uploadApi.uploadDataset(market, date, file, action, (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      setUploadResult(res);
      setStep('success');
      onUploadSuccess();

    } catch (err: any) {
      if (err.response?.status === 409) {
        setStep('replace_confirm');
      } else {
        setError(err.response?.data?.message || err.message || 'An unexpected error occurred during upload.');
        setStep('select');
      }
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 4, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Upload Market Data</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
      )}

      {step === 'select' && (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Market</InputLabel>
              <Select value={market} label="Market" onChange={(e) => setMarket(e.target.value)}>
                <MenuItem value="DAM">Day Ahead Market (DAM)</MenuItem>
                <MenuItem value="GDAM">Green Day Ahead (GDAM)</MenuItem>
                <MenuItem value="RTM">Real Time Market (RTM)</MenuItem>
                <MenuItem value="REC">Renewable Energy Certificates (REC)</MenuItem>
              </Select>
            </FormControl>
            
            <TextField 
              type="date" 
              label="Delivery Date" 
              fullWidth 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }} 
            />
          </Box>

          <Box sx={{ flex: 2 }}>
            <Box 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              sx={{
                height: '100%',
                minHeight: 160,
                border: '2px dashed',
                borderColor: file ? 'primary.main' : 'divider',
                backgroundColor: file ? 'rgba(59, 143, 243, 0.05)' : 'background.default',
                borderRadius: 2,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(59, 143, 243, 0.05)'
                }
              }}
              onClick={() => document.getElementById('file-upload-hub')?.click()}
            >
              <input 
                id="file-upload-hub" 
                type="file" 
                accept=".csv,.xlsx,.xls,.xlxs" 
                hidden 
                onChange={handleFileSelect} 
              />
              {file ? (
                <>
                  <FileIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="subtitle2" color="text.primary">{file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{(file.size / 1024).toFixed(1)} KB</Typography>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); setFile(null); }} sx={{ mt: 1 }}>Clear File</Button>
                </>
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="subtitle2" color="text.primary" gutterBottom>
                    Click or drag file to this area to upload
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Support for a single-day CSV/XLSX file (Max 2MB).
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {step === 'uploading' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, gap: 2 }}>
          <CircularProgress size={40} thickness={4} />
          <Box sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              Uploading and Validating...
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Please wait, this will only take a moment.
            </Typography>
          </Box>
        </Box>
      )}

      {step === 'replace_confirm' && (
        <Box sx={{ py: 2 }}>
          <Alert severity="warning" icon={<WarningIcon fontSize="inherit" />} sx={{ mb: 3 }}>
            A dataset for <strong>{market}</strong> on <strong>{formatOverviewDate(date)}</strong> already exists.
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to replace the existing dataset? 
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Replacing it will archive the old dataset and immediately publish the new one to the public dashboard.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" color="warning" onClick={() => executeUpload('replace')}>Yes, Replace Dataset</Button>
            <Button onClick={() => setStep('select')} color="inherit">Cancel</Button>
          </Box>
        </Box>
      )}

      {step === 'success' && uploadResult && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 3, gap: 2 }}>
          <CheckCircle color="success" sx={{ fontSize: 48 }} />
          <Typography variant="h5" color="text.primary">Upload Successful</Typography>
          
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.main', borderRadius: 2, width: '100%', maxWidth: 500, mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}><strong>Market:</strong> {uploadResult.market}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}><strong>Delivery Date:</strong> {formatOverviewDate(uploadResult.deliveryDate)}</Typography>
            <Typography variant="body2"><strong>Rows Parsed:</strong> {uploadResult.rowCount}</Typography>
          </Paper>

          <Button variant="outlined" onClick={resetState} sx={{ mt: 2 }}>Upload Another File</Button>
        </Box>
      )}

      {step === 'select' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            variant="contained" 
            onClick={() => executeUpload()} 
            disabled={!file}
            sx={{ px: 4, py: 1 }}
          >
            Process & Upload
          </Button>
        </Box>
      )}
    </Paper>
  );
}
