import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, Typography, Button, Stack, Chip, Paper } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  Pending: 'pending',
  'In Progress': 'progress',
  Done: 'done',
  Verified: 'verified',
  Overdue: 'overdue',
  Cancelled: 'cancelled',
};

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Other'];

export default function TasksPage() {
  const { user, can } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTask, setStatusTask] = useState(null);
  const [form, setForm] = useState({
    task_code: '',
    maintenance_id: '',
    maintenance_reference: '',
    maintenance_description: '',
    equipment_id: '',
    start_date: '',
    next_due: '',
    assigned_to: '',
    status_id: '',
    frequency: 'Other',
    priority: 'Medium',
    remarks: '',
  });
  const [maintenances, setMaintenances] = useState([]);

  const refreshTasks = async () => {
    const res = await axios.get('/api/tasks');
    setTasks(res.data);
  };

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [tRes, sRes, eRes, mRes] = await Promise.all([
          axios.get('/api/tasks'),
          axios.get('/api/statuses'),
          axios.get('/api/equipment'),
          axios.get('/api/maintenance-masters'),
        ]);
        if (cancelled) return;
        setTasks(tRes.data);
        setStatuses(sRes.data);
        setEquipment(eRes.data);
        setMaintenances(mRes.data);

        const perms = user.permissions || [];
        const needAssignees = perms.includes('*') || perms.includes('tasks:create') || perms.includes('tasks:assign');
        if (needAssignees) {
          try {
            const uRes = await axios.get('/api/users/assignees');
            if (!cancelled) setUsers(uRes.data);
          } catch {
            if (!cancelled) setUsers([]);
          }
        } else {
          setUsers([]);
        }
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || 'Failed to load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase();
    const maintenanceRef = t.maintenance_id?.reference_no || t.maintenance_reference || '';
    const maintenanceDesc = t.maintenance_id?.description || t.maintenance_description || '';
    const code = (t.task_code || '').toLowerCase();
    const matchSearch =
      !q ||
      code.includes(q) ||
      maintenanceRef.toLowerCase().includes(q) ||
      maintenanceDesc.toLowerCase().includes(q) ||
      t.assigned_to?.name?.toLowerCase().includes(q) ||
      t.equipment_id?.equipment_name?.toLowerCase().includes(q);
    const matchStatus =
      !filterStatus || filterStatus === '__overdue__' || t.status_id?.status_name === filterStatus;
    const freq = t.frequency || t.maintenance_id?.frequencies?.[0] || 'Other';
    const matchFreq = !filterFrequency || freq === filterFrequency;
    let matchOverdueOnly = true;
    if (filterStatus === '__overdue__') {
      if (!t.next_due) matchOverdueOnly = false;
      else {
        const due = new Date(t.next_due);
        due.setHours(0, 0, 0, 0);
        matchOverdueOnly = due < today && !['Done', 'Verified', 'Cancelled'].includes(t.status_id?.status_name);
      }
    }
    return matchSearch && matchStatus && matchFreq && matchOverdueOnly;
  });

  const uniqueStatuses = useMemo(() => [...new Set(tasks.map((t) => t.status_id?.status_name).filter(Boolean))], [tasks]);

  const openCreate = () => {
    setEditTask(null);
    setForm({
      task_code: '',
      maintenance_id: '',
      maintenance_reference: '',
      maintenance_description: '',
      equipment_id: '',
      start_date: '',
      next_due: '',
      assigned_to: '',
      status_id: statuses.find((s) => s.status_name === 'Pending')?._id || '',
      frequency: 'Other',
      priority: 'Medium',
      remarks: '',
    });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      task_code: task.task_code || '',
      maintenance_id: task.maintenance_id?._id || '',
      maintenance_reference: task.maintenance_reference || task.maintenance_id?.reference_no || '',
      maintenance_description: task.maintenance_description || task.maintenance_id?.description || '',
      equipment_id: task.equipment_id?._id || '',
      start_date: task.start_date ? task.start_date.substring(0, 10) : '',
      next_due: task.next_due ? task.next_due.substring(0, 10) : '',
      assigned_to: task.assigned_to?._id || '',
      status_id: task.status_id?._id || '',
      frequency: task.frequency || 'Other',
      priority: task.priority || 'Medium',
      remarks: task.remarks || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      ['equipment_id', 'assigned_to'].forEach((field) => {
        if (!payload[field]) delete payload[field];
      });
      if (!payload.maintenance_reference) delete payload.maintenance_reference;
      if (!payload.maintenance_description) delete payload.maintenance_description;
      if (!payload.task_code) delete payload.task_code;
      if (editTask) await axios.put(`/api/tasks/${editTask._id}`, payload);
      else await axios.post('/api/tasks', payload);
      toast.success(editTask ? 'Task updated' : 'Task created');
      setShowModal(false);
      await refreshTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving task');
    }
  };

  const handleComplete = async (task) => {
    setStatusTask(task);
    setShowStatusModal(true);
  };

  const submitComplete = async (remarks) => {
    try {
      await axios.patch(`/api/tasks/${statusTask._id}/complete`, { remarks });
      toast.success('Task marked as complete');
      setShowStatusModal(false);
      await refreshTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error completing task');
    }
  };

  const handleVerify = async (taskId) => {
    try {
      await axios.patch(`/api/tasks/${taskId}/verify`);
      toast.success('Task verified');
      await refreshTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error verifying task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    await axios.delete(`/api/tasks/${id}`);
    toast.success('Task deleted');
    setTasks((prev) => prev.filter((t) => t._id !== id));
  };

  const isAssignedToMe = (t) => t.assigned_to && user && String(t.assigned_to._id || t.assigned_to) === String(user.id);

  const canEditTask = (t) => can('tasks:edit') || (can('tasks:edit_own') && isAssignedToMe(t));

  const canShowComplete = (t) =>
    can('tasks:complete') &&
    (can('tasks:view_all') || isAssignedToMe(t)) &&
    !['Done', 'Verified', 'Cancelled'].includes(t.status_id?.status_name);

  if (loading) return <div className="loader">Loading tasks...</div>;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2, gap: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Maintenance tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Preventive work orders, assignments, and completion workflow.
          </Typography>
        </Box>
        {can('tasks:create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New task
          </Button>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" alignItems={{ md: 'center' }}>
          <input className="search-bar" placeholder="Search by ID, reference, equipment, assignee…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          <select className="search-bar" style={{ minWidth: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="__overdue__">Overdue only</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className="search-bar" style={{ minWidth: 160 }} value={filterFrequency} onChange={(e) => setFilterFrequency(e.target.value)}>
            <option value="">All frequencies</option>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <Chip label={`${filtered.length} shown`} variant="outlined" size="small" />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Equipment</th>
                <th>Assigned</th>
                <th>Frequency</th>
                <th>Due</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#718096', padding: 32 }}>
                    No tasks match your filters
                  </td>
                </tr>
              )}
              {filtered.map((t) => {
                const freq = t.frequency || t.maintenance_id?.frequencies?.[0] || 'Other';
                const due = t.next_due ? new Date(t.next_due) : null;
                if (due) due.setHours(0, 0, 0, 0);
                const isDueOverdue = due && due < today && !['Done', 'Verified', 'Cancelled'].includes(t.status_id?.status_name);
                return (
                  <tr key={t._id} className={isDueOverdue ? 'row-overdue' : ''}>
                    <td>
                      <strong>{t.task_code || '—'}</strong>
                    </td>
                    <td>
                      <strong>{t.maintenance_id?.reference_no || t.maintenance_reference || '—'}</strong>
                    </td>
                    <td style={{ maxWidth: 200 }}>{(t.maintenance_id?.description || t.maintenance_description || '—').slice(0, 80)}</td>
                    <td>{t.equipment_id?.equipment_name || '—'}</td>
                    <td>{t.assigned_to?.name || '—'}</td>
                    <td>
                      <span className={`freq-chip freq-${freq.replace(/\s+/g, '-').toLowerCase()}`}>{freq}</span>
                    </td>
                    <td style={{ color: isDueOverdue ? '#c53030' : undefined, fontWeight: isDueOverdue ? 600 : 400 }}>
                      {t.next_due ? new Date(t.next_due).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className={`priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${statusColors[t.status_id?.status_name] || 'pending'}`}>{t.status_id?.status_name || '—'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {canShowComplete(t) && (
                          <button type="button" className="btn btn-success btn-sm" onClick={() => handleComplete(t)}>
                            Complete
                          </button>
                        )}
                        {can('tasks:verify') && t.status_id?.status_name === 'Done' && (
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleVerify(t._id)}>
                            Verify
                          </button>
                        )}
                        {canEditTask(t) && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>
                            Edit
                          </button>
                        )}
                        {can('tasks:delete') && (
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(t._id)}>
                            Del
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Paper>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editTask ? 'Edit task' : 'New task'}</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Task ID (optional)</label>
                <input placeholder="e.g. M001" value={form.task_code} onChange={(e) => setForm({ ...form, task_code: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Maintenance template</label>
                <select
                  value={form.maintenance_id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (!selectedId) {
                      setForm({ ...form, maintenance_id: '', maintenance_reference: '', maintenance_description: '' });
                      return;
                    }
                    const selected = maintenances.find((m) => m._id === selectedId);
                    setForm({
                      ...form,
                      maintenance_id: selectedId,
                      maintenance_reference: selected?.reference_no || '',
                      maintenance_description: selected?.description || '',
                    });
                  }}
                >
                  <option value="">Choose template (optional)</option>
                  {maintenances.map((m) => (
                    <option key={m._id} value={m._id}>{`${m.reference_no} — ${m.description.substring(0, 60)}`}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reference</label>
                <input placeholder="Task reference code" value={form.maintenance_reference} onChange={(e) => setForm({ ...form, maintenance_reference: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input placeholder="Short description" value={form.maintenance_description} onChange={(e) => setForm({ ...form, maintenance_description: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Equipment</label>
                  <select value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}>
                    <option value="">Select equipment</option>
                    {equipment.map((eq) => (
                      <option key={eq._id} value={eq._id}>
                        {eq.equipment_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assigned to</label>
                  <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} disabled={!can('tasks:assign') && Boolean(editTask)}>
                    <option value="">Select user</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  {!can('tasks:assign') && (
                    <small style={{ display: 'block', marginTop: 4, color: '#718096', fontSize: 12 }}>Only users with assign permission can change assignee.</small>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Next due</label>
                  <input type="date" value={form.next_due} onChange={(e) => setForm({ ...form, next_due: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {['Critical', 'High', 'Medium', 'Low'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status_id} onChange={(e) => setForm({ ...form, status_id: e.target.value })} required>
                    <option value="">Select status</option>
                    {statuses.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.status_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatusModal && <CompleteModal task={statusTask} onSubmit={submitComplete} onClose={() => setShowStatusModal(false)} />}
    </Box>
  );
}

function CompleteModal({ task, onSubmit, onClose }) {
  const [remarks, setRemarks] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Complete task</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <p style={{ color: '#718096', marginBottom: 16 }}>
          Mark <strong>{task?.maintenance_id?.reference_no || task?.task_code}</strong> as done?
        </p>
        <div className="form-group">
          <label>Remarks (optional)</label>
          <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Completion notes…" />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-success" onClick={() => onSubmit(remarks)}>
            Mark complete
          </button>
        </div>
      </div>
    </div>
  );
}
