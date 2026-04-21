import React, { useState, useEffect } from 'react';
import axios from 'axios';

const statusColor = { Pending: 'pending', 'In Progress': 'progress', Done: 'done', Verified: 'verified', Overdue: 'overdue', Cancelled: 'cancelled' };

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader">Loading dashboard...</div>;
  if (!data) return <div className="loader">Failed to load dashboard.</div>;

  return (
    <div>
      <div className="page-header"><h2>📊 Admin Dashboard</h2></div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.totalTasks}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#38a169' }}>{data.completedToday}</div>
          <div className="stat-label">Completed Today</div>
        </div>
        {data.summary.map(s => (
          <div key={s.status} className="stat-card">
            <div className="stat-value">{s.count}</div>
            <div className="stat-label">{s.status}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">⚠️ Overdue Tasks (Top 10)</div>
        {data.overdue.length === 0
          ? <p style={{ color: '#718096' }}>No overdue tasks 🎉</p>
          : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Equipment</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdue.map(t => (
                    <tr key={t._id}>
                      <td><strong>{t.maintenance_id?.reference_no}</strong></td>
                      <td>{t.equipment_id?.equipment_name || '—'}</td>
                      <td>{t.assigned_to?.name || '—'}</td>
                      <td style={{ color: '#e53e3e' }}>{t.next_due ? new Date(t.next_due).toLocaleDateString() : '—'}</td>
                      <td><span className={`priority-${t.priority?.toLowerCase()}`}>{t.priority}</span></td>
                      <td><span className={`badge badge-${statusColor[t.status_id?.status_name] || 'pending'}`}>{t.status_id?.status_name}</span></td>
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
