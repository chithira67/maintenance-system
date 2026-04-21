import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, Typography, Button, Paper, Stack, Chip, TextField } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SaveIcon from '@mui/icons-material/Save';

const COLUMNS = [
  { key: 'task_code', label: 'Task ID' },
  { key: 'maintenance_reference', label: 'Reference' },
  { key: 'maintenance_description', label: 'Description' },
  { key: 'equipment_name', label: 'Equipment Name' },
  { key: 'assigned_name', label: 'Assigned To' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'last_done', label: 'Last Done' },
  { key: 'next_due', label: 'Next Due' },
  { key: 'status_name', label: 'Status' },
  { key: 'priority', label: 'Priority' },
];

export default function ImageImportPage() {
  const [mode, setMode] = useState('image');
  const [file, setFile] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [rows, setRows] = useState([]);
  const [rawText, setRawText] = useState('');

  const canCommit = useMemo(() => rows.length > 0 && !loadingCommit, [rows.length, loadingCommit]);

  const uploadForPreview = async () => {
    if (!file) {
      toast.error('Please choose an image first');
      return;
    }
    setLoadingPreview(true);
    try {
      const formData = new FormData();
      const formKey = mode === 'xlsx' ? 'file' : 'image';
      const endpoint = mode === 'xlsx' ? '/api/import/tasks/xlsx-preview' : '/api/import/tasks/ocr-preview';
      formData.append(formKey, file);
      const res = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRows(res.data.rows || []);
      setRawText(res.data.rawText || '');
      toast.success(`OCR complete: ${res.data.parsedCount || 0} row(s) found`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image parsing failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  const updateCell = (index, key, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const commitRows = async () => {
    if (!rows.length) return;
    setLoadingCommit(true);
    try {
      const res = await axios.post('/api/import/tasks/commit', { rows });
      toast.success(`Imported ${res.data.createdCount} row(s)`);
      if (res.data.errorCount) {
        toast.warning(`${res.data.errorCount} row(s) failed - review console/network response`);
      }
      setRows([]);
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setLoadingCommit(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Import Tasks from Image
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload a maintenance chart screenshot, review OCR output, correct fields, then import.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            select
            size="small"
            label="Import Type"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setFile(null);
              setRows([]);
              setRawText('');
            }}
            SelectProps={{ native: true }}
            sx={{ minWidth: 150 }}
          >
            <option value="image">Image OCR</option>
            <option value="xlsx">XLSX</option>
          </TextField>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
            {mode === 'xlsx' ? 'Choose XLSX' : 'Choose Image'}
            <input
              hidden
              type="file"
              accept={mode === 'xlsx' ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'image/png,image/jpeg,image/jpg,image/webp'}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Button>
          <Chip label={file ? file.name : 'No file selected'} variant="outlined" />
          <Button variant="contained" disabled={!file || loadingPreview} onClick={uploadForPreview}>
            {loadingPreview ? 'Parsing...' : 'Parse Preview'}
          </Button>
          <Button variant="contained" color="secondary" startIcon={<SaveIcon />} disabled={!canCommit} onClick={commitRows}>
            {loadingCommit ? 'Importing...' : 'Import Rows'}
          </Button>
        </Stack>
      </Paper>

      {!!rows.length && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Preview ({rows.length} rows)
          </Typography>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.task_code || 'row'}-${index}`}>
                    {COLUMNS.map((col) => (
                      <td key={col.key} style={{ minWidth: 120 }}>
                        <input
                          className="search-bar"
                          style={{ minWidth: 90, width: '100%' }}
                          value={row[col.key] || ''}
                          onChange={(e) => updateCell(index, col.key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <Button color="error" size="small" onClick={() => removeRow(index)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Paper>
      )}

      {!!rawText && mode === 'image' && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            OCR Raw Text (debug)
          </Typography>
          <TextField value={rawText} multiline minRows={8} fullWidth disabled />
        </Paper>
      )}
    </Box>
  );
}

