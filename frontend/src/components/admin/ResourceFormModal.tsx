import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, MenuItem, Box, Grid, Checkbox, ListItemText, Typography, IconButton
} from '@mui/material';
import { Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';
import { FormField } from '../../pages/admin/resource-center/config/resourceConfig';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface ResourceFormModalProps {
  open: boolean;
  title: string;
  fields: FormField[];
  initialData?: any;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function ResourceFormModal({ 
  open, title, fields, initialData, isSubmitting = false, onClose, onSave 
}: ResourceFormModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        const defaults: Record<string, any> = {};
        fields.forEach(f => {
          defaults[f.name] = f.type === 'number' ? '' : f.type === 'dropdown-multi' || f.type === 'image-multi' ? [] : '';
        });
        setFormData(defaults);
      }
    }
  }, [open, initialData, fields]);

  const handleChange = (name: string, value: any, type: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleImageUpload = (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages: string[] = [];
    let processed = 0;
    const fileArray = Array.from(files);
    
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
        }
        processed++;
        if (processed === fileArray.length) {
          setFormData(prev => ({
            ...prev,
            [name]: [...(prev[name] || []), ...newImages]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (name: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSave = () => {
    // Basic validation: ensure all visible fields are filled
    const isValid = visibleFields.every(f => {
      const val = formData[f.name];
      if (f.type === 'dropdown-multi' || f.type === 'image-multi') return Array.isArray(val) && val.length > 0;
      if (f.type === 'rich-text') return val !== '' && val !== undefined && val !== '<p><br></p>';
      return val !== '' && val !== undefined;
    });
    if (!isValid) {
      alert('All fields are mandatory.');
      return;
    }
    onSave(formData);
  };

  const handleClose = (event?: any, reason?: string) => {
    if (isSubmitting) return;
    onClose();
  };

  // Determine modal size based on number of fields or presence of rich-text
  const hasRichText = fields.some(f => f.type === 'rich-text');
  const isLarge = fields.length > 6 || hasRichText;

  // Filter fields: hide 'id' when creating (initialData is null)
  const visibleFields = fields.filter(f => {
    if (!initialData && f.name === 'id') return false;
    return true;
  });

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      disableEscapeKeyDown={isSubmitting}
      maxWidth={isLarge ? 'md' : 'sm'} 
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider', pb: 2, mb: 2 }}>
        {initialData ? 'Edit' : 'Add'} {title} Record
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {visibleFields.map((field) => (
            <Grid item xs={12} sm={(isLarge && field.type !== 'rich-text' && field.type !== 'image-multi') ? 6 : 12} key={field.name}>
              {field.type === 'dropdown' || field.type === 'dropdown-multi' ? (
                <TextField
                  select
                  SelectProps={{ multiple: field.type === 'dropdown-multi' }}
                  fullWidth
                  label={field.label}
                  value={field.type === 'dropdown-multi' ? (formData[field.name] || []) : (formData[field.name] || '')}
                  onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                  variant="outlined"
                  size="small"
                  disabled={isSubmitting || (field.name === 'id' && !!initialData)}
                >
                  {typeof field.options === 'function' ? field.options(formData).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {field.type === 'dropdown-multi' && (
                        <Checkbox checked={(formData[field.name] || []).includes(opt.value)} size="small" />
                      )}
                      <ListItemText primary={opt.label} />
                    </MenuItem>
                  )) : field.options?.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {field.type === 'dropdown-multi' && (
                        <Checkbox checked={(formData[field.name] || []).includes(opt.value)} size="small" />
                      )}
                      <ListItemText primary={opt.label} />
                    </MenuItem>
                  ))}
                </TextField>
              ) : field.type === 'rich-text' ? (
                <Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{field.label}</Typography>
                  <ReactQuill 
                    theme="snow"
                    value={formData[field.name] || ''} 
                    onChange={(val: string) => handleChange(field.name, val, field.type)}
                    style={{ height: '200px', marginBottom: '40px' }}
                  />
                </Box>
              ) : field.type === 'image-multi' ? (
                <Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{field.label}</Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    Upload Images
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(field.name, e)}
                    />
                  </Button>
                  <Grid container spacing={2}>
                    {(formData[field.name] || []).map((imgUrl: string, index: number) => (
                      <Grid item key={index}>
                        <Box sx={{ position: 'relative', width: 100, height: 100, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
                          <img src={imgUrl} alt={`upload-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoveImage(field.name, index)}
                            sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(255,255,255,0.7)' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                <TextField
                  fullWidth
                  label={field.label}
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={formData[field.name] === undefined ? '' : formData[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value, field.type)}
                  variant="outlined"
                  size="small"
                  disabled={isSubmitting || (field.name === 'id' && !!initialData)}
                  inputProps={field.type === 'number' ? { step: 'any' } : {}}
                  InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                />
              )}
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid', borderColor: 'divider', mt: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSubmitting} variant="contained">
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
