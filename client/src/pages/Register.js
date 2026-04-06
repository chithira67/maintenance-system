import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>🔧 Maintenance System</h1>
          <p>Create your account</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input placeholder="username" value={form.username} onChange={set('username')} required />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input placeholder="Your name" value={form.name} onChange={set('name')} required />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="email@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input placeholder="+94 77 000 0000" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Create a password" value={form.password} onChange={set('password')} required />
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <div className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
