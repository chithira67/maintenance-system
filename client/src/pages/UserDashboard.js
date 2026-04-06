import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function UserDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/dashboard/my').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader">Loading...</div>;

  return (
    <div>
      <div className="page-header"><h2>👋 Welcome, {user?.name}</h2></div>

      <div className="stats-grid">
        {data?.summary.map(s => (
          <div key={s.status} className="stat-card">
            <div className="stat-value">{s.count}</div>
            <div className="stat-label">{s.status}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">⚠️ Your Overdue Tasks</div>
        {!data?.overdue.length
          ? <p style={{ color: '#718096' }}>No overdue tasks 🎉</p>
          : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Reference</th><th>Description</th><th>Due Date</th><th>Priority</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.overdue.map(t => (
                    <tr key={t._id}>
                      <td><strong>{t.maintenance_id?.reference_no}</strong></td>
                      <td>{t.maintenance_id?.description?.substring(0, 60)}...</td>
                      <td style={{ color: '#e53e3e' }}>{t.next_due ? new Date(t.next_due).toLocaleDateString() : '—'}</td>
                      <td><span className={`priority-${t.priority?.toLowerCase()}`}>{t.priority}</span></td>
                      <td><span className="badge badge-overdue">{t.status_id?.status_name}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
