import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function RolesPage() {
  const { can } = useAuth();
  const manage = can('roles:manage');
  const [roles, setRoles] = useState([]);
  const [permMeta, setPermMeta] = useState({ keys: [], labels: {} });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [form, setForm] = useState({ role_name: '', description: '', permissions: [] });

  const loadRoles = () => axios.get('/api/roles').then((r) => setRoles(r.data));

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        await loadRoles();
        if (manage) {
          try {
            const p = await axios.get('/api/permissions');
            if (!cancelled) setPermMeta({ keys: p.data.keys || [], labels: p.data.labels || {} });
          } catch {
            if (!cancelled) setPermMeta({ keys: [], labels: {} });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [manage]);

  const openCreate = () => {
    setEditRole(null);
    setForm({ role_name: '', description: '', permissions: [] });
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditRole(role);
    setForm({
      role_name: role.role_name,
      description: role.description || '',
      permissions: role.permissions?.length ? [...role.permissions] : [],
    });
    setShowModal(true);
  };

  const togglePerm = (key) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!manage) return;
    try {
      const body = {
        role_name: form.role_name,
        description: form.description,
        permissions: form.permissions,
      };
      if (editRole) await axios.put(`/api/roles/${editRole._id}`, body);
      else await axios.post('/api/roles', body);
      toast.success(editRole ? 'Role updated' : 'Role created');
      setShowModal(false);
      await loadRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving role');
    }
  };

  const handleDelete = async (id) => {
    if (!manage) return;
    if (!window.confirm('Delete this role?')) return;
    await axios.delete(`/api/roles/${id}`);
    toast.success('Role deleted');
    setRoles((prev) => prev.filter((r) => r._id !== id));
  };

  if (loading) return <div className="loader">Loading roles...</div>;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2, gap: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Roles & permissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {manage ? 'Define access for supervisors, technicians, and custom roles.' : 'View system roles. Only administrators can edit permissions.'}
          </Typography>
        </Box>
        {manage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add role
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Permissions</TableCell>
              {manage && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={manage ? 4 : 3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No roles found
                </TableCell>
              </TableRow>
            )}
            {roles.map((r) => (
              <TableRow key={r._id} hover>
                <TableCell>
                  <Chip label={r.role_name} color="primary" variant="outlined" size="small" />
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>{r.description || '—'}</TableCell>
                <TableCell>
                  <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ py: 0.5 }}>
                    {(r.permissions || []).includes('*') ? (
                      <Chip label="Full access (*)" size="small" color="secondary" />
                    ) : (
                      (r.permissions || []).slice(0, 8).map((p) => (
                        <Chip key={p} label={p} size="small" variant="outlined" />
                      ))
                    )}
                    {(r.permissions || []).length > 8 && !r.permissions.includes('*') && (
                      <Chip label={`+${r.permissions.length - 8}`} size="small" />
                    )}
                  </Stack>
                </TableCell>
                {manage && (
                  <TableCell align="right">
                    <Button size="small" onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => handleDelete(r._id)}>
                      Delete
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {manage && (
        <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editRole ? 'Edit role' : 'Add role'}</DialogTitle>
          <form onSubmit={handleSave}>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="Role name" value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })} required fullWidth disabled={Boolean(editRole && ['Admin', 'User', 'Technician', 'Supervisor'].includes(editRole.role_name))} />
                <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={2} />
                <Typography variant="subtitle2">Permissions</Typography>
                <FormGroup>
                  {permMeta.keys.map((key) => (
                    <FormControlLabel key={key} control={<Checkbox checked={form.permissions.includes(key)} onChange={() => togglePerm(key)} />} label={permMeta.labels[key] || key} />
                  ))}
                </FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.permissions.includes('*')}
                      onChange={() => {
                        setForm((f) => ({
                          ...f,
                          permissions: f.permissions.includes('*') ? f.permissions.filter((p) => p !== '*') : ['*'],
                        }));
                      }}
                    />
                  }
                  label="Full access (wildcard *)"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button type="button" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Save
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </Box>
  );
}
