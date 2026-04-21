import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  Stack,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';

const FREQ_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Other'];

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function MasterDataPage() {
  const [tab, setTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l, e, m] = await Promise.all([
        axios.get('/api/categories'),
        axios.get('/api/locations'),
        axios.get('/api/equipment'),
        axios.get('/api/maintenance-masters'),
      ]);
      setCategories(c.data);
      setLocations(l.data);
      setEquipment(e.data);
      setMasters(m.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load master data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ——— Equipment modal ——— */
  const [eqOpen, setEqOpen] = useState(false);
  const [eqEdit, setEqEdit] = useState(null);
  const [eqForm, setEqForm] = useState({
    equipment_name: '',
    serial_number: '',
    category_id: '',
    location_id: '',
  });

  const openEq = (row) => {
    setEqEdit(row);
    setEqForm(
      row
        ? {
            equipment_name: row.equipment_name || '',
            serial_number: row.serial_number || '',
            category_id: row.category_id?._id || row.category_id || '',
            location_id: row.location_id?._id || row.location_id || '',
          }
        : { equipment_name: '', serial_number: '', category_id: '', location_id: '' }
    );
    setEqOpen(true);
  };

  const saveEq = async () => {
    try {
      const payload = { ...eqForm };
      if (!payload.category_id) delete payload.category_id;
      if (!payload.location_id) delete payload.location_id;
      if (eqEdit) await axios.put(`/api/equipment/${eqEdit._id}`, payload);
      else await axios.post('/api/equipment', payload);
      toast.success(eqEdit ? 'Equipment updated' : 'Equipment created');
      setEqOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const deactivateEq = async (id) => {
    if (!window.confirm('Deactivate this equipment?')) return;
    await axios.delete(`/api/equipment/${id}`);
    toast.success('Equipment deactivated');
    loadAll();
  };

  /* ——— Category modal ——— */
  const [catOpen, setCatOpen] = useState(false);
  const [catEdit, setCatEdit] = useState(null);
  const [catForm, setCatForm] = useState({ category_name: '', code: '' });

  const openCat = (row) => {
    setCatEdit(row);
    setCatForm(row ? { category_name: row.category_name, code: row.code || '' } : { category_name: '', code: '' });
    setCatOpen(true);
  };

  const saveCat = async () => {
    try {
      if (catEdit) await axios.put(`/api/categories/${catEdit._id}`, catForm);
      else await axios.post('/api/categories', catForm);
      toast.success(catEdit ? 'Category updated' : 'Category created');
      setCatOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const deleteCat = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    await axios.delete(`/api/categories/${id}`);
    toast.success('Category deleted');
    loadAll();
  };

  /* ——— Location modal ——— */
  const [locOpen, setLocOpen] = useState(false);
  const [locEdit, setLocEdit] = useState(null);
  const [locForm, setLocForm] = useState({ location_name: '', description: '', parent_location_id: '' });

  const openLoc = (row) => {
    setLocEdit(row);
    setLocForm(
      row
        ? {
            location_name: row.location_name,
            description: row.description || '',
            parent_location_id: row.parent_location_id?._id || row.parent_location_id || '',
          }
        : { location_name: '', description: '', parent_location_id: '' }
    );
    setLocOpen(true);
  };

  const saveLoc = async () => {
    try {
      const payload = { ...locForm };
      if (!payload.parent_location_id) delete payload.parent_location_id;
      if (locEdit) await axios.put(`/api/locations/${locEdit._id}`, payload);
      else await axios.post('/api/locations', payload);
      toast.success(locEdit ? 'Location updated' : 'Location created');
      setLocOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const deleteLoc = async (id) => {
    if (!window.confirm('Delete this location?')) return;
    await axios.delete(`/api/locations/${id}`);
    toast.success('Location deleted');
    loadAll();
  };

  /* ——— Maintenance template modal ——— */
  const [tmplOpen, setTmplOpen] = useState(false);
  const [tmplEdit, setTmplEdit] = useState(null);
  const [tmplForm, setTmplForm] = useState({
    reference_no: '',
    description: '',
    category_id: '',
    estimated_duration_hours: '',
    is_active: true,
    frequencies: [],
  });

  const openTmpl = (row) => {
    setTmplEdit(row);
    setTmplForm(
      row
        ? {
            reference_no: row.reference_no,
            description: row.description,
            category_id: row.category_id?._id || row.category_id || '',
            estimated_duration_hours: row.estimated_duration_hours ?? '',
            is_active: row.is_active !== false,
            frequencies: row.frequencies?.length ? row.frequencies : ['Monthly'],
          }
        : {
            reference_no: '',
            description: '',
            category_id: '',
            estimated_duration_hours: '',
            is_active: true,
            frequencies: ['Monthly'],
          }
    );
    setTmplOpen(true);
  };

  const toggleTmplFreq = (f) => {
    setTmplForm((prev) => ({
      ...prev,
      frequencies: prev.frequencies.includes(f) ? prev.frequencies.filter((x) => x !== f) : [...prev.frequencies, f],
    }));
  };

  const saveTmpl = async () => {
    try {
      const payload = {
        reference_no: tmplForm.reference_no,
        description: tmplForm.description,
        category_id: tmplForm.category_id || undefined,
        estimated_duration_hours: tmplForm.estimated_duration_hours === '' ? undefined : Number(tmplForm.estimated_duration_hours),
        is_active: tmplForm.is_active,
        frequencies: tmplForm.frequencies.length ? tmplForm.frequencies : ['Other'],
      };
      if (tmplEdit) await axios.put(`/api/maintenance-masters/${tmplEdit._id}`, payload);
      else await axios.post('/api/maintenance-masters', payload);
      toast.success(tmplEdit ? 'Template updated' : 'Template created');
      setTmplOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const deactivateTmpl = async (id) => {
    if (!window.confirm('Deactivate this template?')) return;
    await axios.delete(`/api/maintenance-masters/${id}`);
    toast.success('Template deactivated');
    loadAll();
  };

  if (loading) return <div className="loader">Loading master data...</div>;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2, gap: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Master data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Equipment, locations, categories, and preventive maintenance templates.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => (tab === 0 ? openEq(null) : tab === 1 ? openCat(null) : tab === 2 ? openLoc(null) : openTmpl(null))}>
          Add {tab === 0 ? 'equipment' : tab === 1 ? 'category' : tab === 2 ? 'location' : 'template'}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Equipment" />
          <Tab label="Categories" />
          <Tab label="Locations" />
          <Tab label="PM templates" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Serial</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {equipment.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.equipment_name}</TableCell>
                    <TableCell>{row.serial_number || '—'}</TableCell>
                    <TableCell>{row.category_id?.category_name || '—'}</TableCell>
                    <TableCell>{row.location_id?.location_name || '—'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEq(row)} aria-label="edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deactivateEq(row._id)} aria-label="deactivate">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.category_name}</TableCell>
                    <TableCell>{row.code || '—'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openCat(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteCat(row._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Parent</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locations.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.location_name}</TableCell>
                    <TableCell>{row.parent_location_id?.location_name || '—'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openLoc(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteLoc(row._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Frequencies</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {masters.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>
                      <strong>{row.reference_no}</strong>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>{row.description}</TableCell>
                    <TableCell>{row.category_id?.category_name || '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {(row.frequencies || []).map((f) => (
                          <Chip key={f} label={f} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>{row.is_active !== false ? 'Yes' : 'No'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openTmpl(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deactivateTmpl(row._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Equipment dialog */}
      <Dialog open={eqOpen} onClose={() => setEqOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{eqEdit ? 'Edit equipment' : 'Add equipment'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={eqForm.equipment_name} onChange={(e) => setEqForm({ ...eqForm, equipment_name: e.target.value })} fullWidth required />
            <TextField label="Serial number" value={eqForm.serial_number} onChange={(e) => setEqForm({ ...eqForm, serial_number: e.target.value })} fullWidth />
            <TextField select label="Category" value={eqForm.category_id} onChange={(e) => setEqForm({ ...eqForm, category_id: e.target.value })} fullWidth>
              <MenuItem value="">—</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.category_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Location" value={eqForm.location_id} onChange={(e) => setEqForm({ ...eqForm, location_id: e.target.value })} fullWidth>
              <MenuItem value="">—</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l._id} value={l._id}>
                  {l.location_name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEqOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEq}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={catOpen} onClose={() => setCatOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{catEdit ? 'Edit category' : 'Add category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={catForm.category_name} onChange={(e) => setCatForm({ ...catForm, category_name: e.target.value })} fullWidth required />
            <TextField label="Code" value={catForm.code} onChange={(e) => setCatForm({ ...catForm, code: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCat}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location dialog */}
      <Dialog open={locOpen} onClose={() => setLocOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{locEdit ? 'Edit location' : 'Add location'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={locForm.location_name} onChange={(e) => setLocForm({ ...locForm, location_name: e.target.value })} fullWidth required />
            <TextField label="Description" value={locForm.description} onChange={(e) => setLocForm({ ...locForm, description: e.target.value })} fullWidth multiline rows={2} />
            <TextField select label="Parent location" value={locForm.parent_location_id} onChange={(e) => setLocForm({ ...locForm, parent_location_id: e.target.value })} fullWidth>
              <MenuItem value="">—</MenuItem>
              {locations
                .filter((l) => !locEdit || l._id !== locEdit._id)
                .map((l) => (
                  <MenuItem key={l._id} value={l._id}>
                    {l.location_name}
                  </MenuItem>
                ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveLoc}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template dialog */}
      <Dialog open={tmplOpen} onClose={() => setTmplOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{tmplEdit ? 'Edit PM template' : 'Add PM template'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Reference no." value={tmplForm.reference_no} onChange={(e) => setTmplForm({ ...tmplForm, reference_no: e.target.value })} fullWidth required />
            <TextField label="Description" value={tmplForm.description} onChange={(e) => setTmplForm({ ...tmplForm, description: e.target.value })} fullWidth required multiline rows={2} />
            <TextField select label="Category" value={tmplForm.category_id} onChange={(e) => setTmplForm({ ...tmplForm, category_id: e.target.value })} fullWidth>
              <MenuItem value="">—</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.category_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Est. duration (hours)"
              type="number"
              value={tmplForm.estimated_duration_hours}
              onChange={(e) => setTmplForm({ ...tmplForm, estimated_duration_hours: e.target.value })}
              fullWidth
              inputProps={{ min: 0, step: 0.25 }}
            />
            <FormControlLabel control={<Checkbox checked={tmplForm.is_active} onChange={(e) => setTmplForm({ ...tmplForm, is_active: e.target.checked })} />} label="Active" />
            <Typography variant="subtitle2">Frequencies</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {FREQ_OPTIONS.map((f) => (
                <FormControlLabel key={f} control={<Checkbox checked={tmplForm.frequencies.includes(f)} onChange={() => toggleTmplFreq(f)} />} label={f} />
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTmplOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveTmpl}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
