import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Box, Typography, CircularProgress 
} from '@mui/material';

interface RECEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

export default function RECEntryDialog({ open, onClose, onSubmit, isSubmitting }: RECEntryDialogProps) {
  const [formData, setFormData] = useState({
    date: '',
    purchaseBid: '',
    sellBid: '',
    mcv: '',
    fsv: '',
    mcp: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>Add REC Market Entry</Typography>
        <Typography variant="body2" color="text.secondary">
          Manually enter REC market data for a specific date. If an entry for this date already exists, it will be replaced.
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Purchase Bid (MW)"
              name="purchaseBid"
              type="number"
              inputProps={{ step: 'any' }}
              value={formData.purchaseBid}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="Sell Bid (MW)"
              name="sellBid"
              type="number"
              inputProps={{ step: 'any' }}
              value={formData.sellBid}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="MCV (MW)"
              name="mcv"
              type="number"
              inputProps={{ step: 'any' }}
              value={formData.mcv}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="Final Scheduled Volume (MW)"
              name="fsv"
              type="number"
              inputProps={{ step: 'any' }}
              value={formData.fsv}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="MCP (Rs/MWh)"
              name="mcp"
              type="number"
              inputProps={{ step: 'any' }}
              value={formData.mcp}
              onChange={handleChange}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1.5 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined}
            sx={{ bgcolor: '#3B8FF3', '&:hover': { bgcolor: '#2C7AE0' } }}
          >
            {isSubmitting ? 'Saving...' : 'Save Entry'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
