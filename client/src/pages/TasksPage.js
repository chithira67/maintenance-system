import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const statusColors = { Pending: 'pending', 'In Progress': 'progress', Done: 'done', Verified: 'verified', Overdue: 'overdue', Cancelled: 'cancelled' };

export default function TasksPage() {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTask, setStatusTask] = useState(null);
  const [form, setForm] = useState({ maintenance_id: '', equipment_id: '', start_date: '', next_due: '', assigned_to: '', status_id: '', priority: 'Medium', remarks: '' });
  const [maintenances, setMaintenances] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    const [tRes, sRes, uRes, eRes] = await Promise.all([
      axios.get('/api/tasks'),
      axios.get('/api/tasks').then(() => axios.get('/api/dashboard')).catch(() => ({ data: [] })),
      axios.get('/api/users').catch(() => ({ data: [] })),
      axios.get('/api/equipment').catch(() => ({ data: [] }))
    ]);
    setTasks(tRes.data);
    setUsers(uRes.data);
    setEquipment(eRes.data);
    setLoading(false);
  };

  useEffect(() => {
    axios.get('/api/tasks').then(r => setTasks(r.data));
    axios.get('/api/equipment').then(r => setEquipment(r.data)).catch(() => {});
    if (isAdmin()) {
      axios.get('/api/users').then(r => setUsers(r.data)).catch(() => {});
    }
    // Get statuses from tasks
    setLoading(false);
  }, []);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.maintenance_id?.reference_no?.toLowerCase().includes(q) ||
      t.maintenance_id?.description?.toLowerCase().includes(q) ||
      t.assigned_to?.name?.toLowerCase().includes(q) ||
      t.equipment_id?.equipment_name?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || t.status_id?.status_name === filterStatus;
    return matchSearch && matchStatus;
  });

  const uniqueStatuses = [...new Set(tasks.map(t => t.status_id?.status_name).filter(Boolean))];

  const openCreate = () => {
    setEditTask(null);
    setForm({ maintenance_id: '', equipment_id: '', start_date: '', next_due: '', assigned_to: '', status_id: '', priority: 'Medium', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      maintenance_id: task.maintenance_id?._id || '',
      equipment_id: task.equipment_id?._id || '',
      start_date: task.start_date ? task.start_date.substring(0, 10) : '',
      next_due: task.next_due ? task.next_due.substring(0, 10) : '',
      assigned_to: task.assigned_to?._id || '',
      status_id: task.status_id?._id || '',
      priority: task.priority || 'Medium',
      remarks: task.remarks || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editTask) {
        await axios.put(`/api/tasks/${editTask._id}`, form);
        toast.success('Task updated');
      } else {
        await axios.post('/api/tasks', form);
        toast.success('Task created');
      }
      setShowModal(false);
      const res = await axios.get('/api/tasks');
      setTasks(res.data);
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
      const res = await axios.get('/api/tasks');
      setTasks(res.data);
    } catch (err) {
      toast.error('Error completing task');
    }
  };

  const handleVerify = async (taskId) => {
    try {
      await axios.patch(`/api/tasks/${taskId}/verify`);
      toast.success('Task verified');
      const res = await axios.get('/api/tasks');
      setTasks(res.data);
    } catch (err) {
      toast.error('Error verifying task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    await axios.delete(`/api/tasks/${id}`);
    toast.success('Task deleted');
    setTasks(prev => prev.filter(t => t._id !== id));
  };

  if (loading) return <div className="loader">Loading tasks...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>✅ Maintenance Tasks</h2>
        {isAdmin() && <button className="btn btn-primary" onClick={openCreate}>+ New Task</button>}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="search-bar" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="search-bar" style={{ minWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {uniqueStatuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ color: '#718096', fontSize: 14 }}>{filtered.length} task(s)</span>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Description</th>
                <th>Equipment</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#718096', padding: 32 }}>No tasks found</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t._id}>
                  <td><strong>{t.maintenance_id?.reference_no || '—'}</strong></td>
                  <td style={{ maxWidth: 200 }}>{t.maintenance_id?.description?.substring(0, 60) || '—'}</td>
                  <td>{t.equipment_id?.equipment_name || '—'}</td>
                  <td>{t.assigned_to?.name || '—'}</td>
                  <td>{t.next_due ? new Date(t.next_due).toLocaleDateString() : '—'}</td>
                  <td><span className={`priority-${t.priority?.toLowerCase()}`}>{t.priority}</span></td>
                  <td><span className={`badge badge-${statusColors[t.status_id?.status_name] || 'pending'}`}>{t.status_id?.status_name || '—'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {t.status_id?.status_name !== 'Done' && t.status_id?.status_name !== 'Verified' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleComplete(t)}>Complete</button>
                      )}
                      {isAdmin() && t.status_id?.status_name === 'Done' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleVerify(t._id)}>Verify</button>
                      )}
                      {isAdmin() && <button className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Edit</button>}
                      {isAdmin() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t._id)}>Del</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editTask ? 'Edit Task' : 'New Task'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Reference No / Maintenance ID</label>
                <input placeholder="Maintenance ID" value={form.maintenance_id} onChange={e => setForm({ ...form, maintenance_id: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Equipment</label>
                  <select value={form.equipment_id} onChange={e => setForm({ ...form, equipment_id: e.target.value })}>
                    <option value="">Select equipment</option>
                    {equipment.map(eq => <option key={eq._id} value={eq._id}>{eq.equipment_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assigned To</label>
                  <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                    <option value="">Select user</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Next Due</label>
                  <input type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status ID</label>
                  <input placeholder="Status ID" value={form.status_id} onChange={e => setForm({ ...form, status_id: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea rows={3} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {showStatusModal && <CompleteModal task={statusTask} onSubmit={submitComplete} onClose={() => setShowStatusModal(false)} />}
    </div>
  );
}

function CompleteModal({ task, onSubmit, onClose }) {
  const [remarks, setRemarks] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Complete Task</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p style={{ color: '#718096', marginBottom: 16 }}>Mark <strong>{task?.maintenance_id?.reference_no}</strong> as done?</p>
        <div className="form-group">
          <label>Remarks (optional)</label>
          <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add any completion notes..." />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={() => onSubmit(remarks)}>Mark Complete</button>
        </div>
      </div>
    </div>
  );
}
