import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', phone: '', is_active: true, roleIds: [] });

  useEffect(() => {
    Promise.all([axios.get('/api/users'), axios.get('/api/roles')])
      .then(([uRes, rRes]) => { setUsers(uRes.data); setRoles(rRes.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditUser(null);
    setForm({ username: '', name: '', email: '', password: '', phone: '', is_active: true, roleIds: [] });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ username: user.username, name: user.name, email: user.email, password: '', phone: user.phone || '', is_active: user.is_active, roleIds: user.roles?.map(r => r._id) || [] });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await axios.put(`/api/users/${editUser._id}`, form);
        toast.success('User updated');
      } else {
        await axios.post('/api/users', form);
        toast.success('User created');
      }
      setShowModal(false);
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving user');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    await axios.delete(`/api/users/${id}`);
    toast.success('User deactivated');
    setUsers(prev => prev.map(u => u._id === id ? { ...u, is_active: false } : u));
  };

  const toggleRole = (roleId) => {
    setForm(f => ({
      ...f,
      roleIds: f.roleIds.includes(roleId) ? f.roleIds.filter(r => r !== roleId) : [...f.roleIds, roleId]
    }));
  };

  if (loading) return <div className="loader">Loading users...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>👥 User Management</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
      </div>

      <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: 12 }}>
        <input className="search-bar" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ color: '#718096', fontSize: 14, alignSelf: 'center' }}>{filtered.length} user(s)</span>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Roles</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#718096', padding: 32 }}>No users found</td></tr>}
              {filtered.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>{u.roles?.map(r => <span key={r._id} className="badge badge-progress" style={{ marginRight: 4 }}>{r.role_name}</span>)}</td>
                  <td><span className={`badge ${u.is_active ? 'badge-done' : 'badge-cancelled'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      {u.is_active && <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(u._id)}>Deactivate</button>}
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
              <h3>{editUser ? 'Edit User' : 'Add User'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editUser} />
                </div>
              </div>
              <div className="form-group">
                <label>Roles</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  {roles.map(r => (
                    <label key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.roleIds.includes(r._id)} onChange={() => toggleRole(r._id)} />
                      {r.role_name}
                    </label>
                  ))}
                </div>
              </div>
              {editUser && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                    Active
                  </label>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
