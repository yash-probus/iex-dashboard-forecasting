import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ResourceDeleteDialogProps {
  open: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResourceDeleteDialog({ open, isSubmitting = false, onClose, onConfirm }: ResourceDeleteDialogProps) {
  const handleClose = (event?: any, reason?: string) => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      disableEscapeKeyDown={isSubmitting}
      PaperProps={{ sx: { borderRadius: 2, minWidth: 400 } }}
    >
      <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Delete Record?</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          This action cannot be undone. Are you sure you want to permanently delete this record?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} disabled={isSubmitting} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button onClick={onConfirm} disabled={isSubmitting} variant="contained" color="error">
          {isSubmitting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
