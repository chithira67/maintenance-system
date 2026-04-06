import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef();

  useEffect(() => {
    axios.get('/api/notifications').then(r => setNotifications(r.data)).catch(() => {});
    const handleClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    await axios.patch('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🔧 <span>Maintenance</span> System</div>
        <nav>
          <NavLink to="/dashboard">📊 Dashboard</NavLink>
          <NavLink to="/tasks">✅ Tasks</NavLink>
          {isAdmin() && <NavLink to="/users">👥 Users</NavLink>}
          {isAdmin() && <NavLink to="/roles">🔐 Roles</NavLink>}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <strong>{user?.name}</strong>
            {user?.roles?.join(', ')}
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div />
          <div className="topbar-actions" ref={notifRef}>
            <button className="btn btn-outline" style={{ position: 'relative' }} onClick={() => setShowNotif(s => !s)}>
              🔔 {unreadCount > 0 && <span style={{ marginLeft: 4, background: '#e53e3e', color: '#fff', borderRadius: '50%', padding: '0 6px', fontSize: 11 }}>{unreadCount}</span>}
            </button>
            {showNotif && (
              <div className="notif-dropdown">
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: 14 }}>Notifications</strong>
                  {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize: 12, color: '#4f8ef7', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>}
                </div>
                {notifications.length === 0
                  ? <div className="notif-empty">No notifications</div>
                  : notifications.map(n => (
                    <div key={n._id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                      {n.message}
                      <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
