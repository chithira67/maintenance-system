import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [form, setForm] = useState({ role_name: '', description: '' });

  useEffect(() => {
    axios.get('/api/roles').then(r => setRoles(r.data)).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditRole(null); setForm({ role_name: '', description: '' }); setShowModal(true); };
  const openEdit = (role) => { setEditRole(role); setForm({ role_name: role.role_name, description: role.description || '' }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editRole) {
        await axios.put(`/api/roles/${editRole._id}`, form);
        toast.success('Role updated');
      } else {
        await axios.post('/api/roles', form);
        toast.success('Role created');
      }
      setShowModal(false);
      const res = await axios.get('/api/roles');
      setRoles(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving role');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this role?')) return;
    await axios.delete(`/api/roles/${id}`);
    toast.success('Role deleted');
    setRoles(prev => prev.filter(r => r._id !== id));
  };

  if (loading) return <div className="loader">Loading roles...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>🔐 Role Management</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Role</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Role Name</th><th>Description</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {roles.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#718096', padding: 32 }}>No roles found</td></tr>}
              {roles.map(r => (
                <tr key={r._id}>
                  <td><span className="badge badge-progress">{r.role_name}</span></td>
                  <td>{r.description || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editRole ? 'Edit Role' : 'Add Role'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Role Name</label>
                <input value={form.role_name} onChange={e => setForm({ ...form, role_name: e.target.value })} required placeholder="e.g. Admin, Technician, Supervisor" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Role description..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Role</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
