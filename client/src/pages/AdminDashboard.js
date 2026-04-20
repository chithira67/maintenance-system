import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Paper } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const statusColor = {
  Pending: 'pending',
  'In Progress': 'progress',
  Done: 'done',
  Verified: 'verified',
  Overdue: 'overdue',
  Cancelled: 'cancelled',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get('/api/dashboard')
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader">Loading dashboard...</div>;
  if (error) return <div className="loader">{error}</div>;
  if (!data) return <div className="loader">No data</div>;

  const freqChart = (data.byFrequency || []).map((d) => ({
    name: d.frequency || 'Other',
    tasks: d.count,
  }));

  const trendData = data.completionTrend || [];
  const workloadData = (data.workload || []).map((w) => ({
    name: w.name?.split(' ')[0] || 'User',
    open: w.openCount,
  }));

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Team dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Maintenance workload, overdue risk, and completion trends.
      </Typography>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <Paper variant="outlined" className="stat-card" sx={{ borderRadius: 2, borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
          <div className="stat-value">{data.totalTasks}</div>
          <div className="stat-label">Total tasks</div>
        </Paper>
        <Paper variant="outlined" className="stat-card" sx={{ borderRadius: 2, borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
          <div className="stat-value" style={{ color: '#2d6a4f' }}>
            {data.completedToday}
          </div>
          <div className="stat-label">Completed today</div>
        </Paper>
        <Paper variant="outlined" className="stat-card" sx={{ borderRadius: 2, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
          <div className="stat-value" style={{ color: '#c05621' }}>
            {data.dueSoon ?? 0}
          </div>
          <div className="stat-label">Due in 7 days</div>
        </Paper>
        {data.summary.map((s) => (
          <Paper key={s.status} variant="outlined" className="stat-card" sx={{ borderRadius: 2 }}>
            <div className="stat-value">{s.count}</div>
            <div className="stat-label">{s.status}</div>
          </Paper>
        ))}
      </div>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 320 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Completions (14 days)
          </Typography>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" name="Completed" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 320 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Tasks by frequency
          </Typography>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={freqChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="tasks" name="Tasks" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 300, gridColumn: { xs: '1', md: '1 / -1' } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Open workload by assignee
          </Typography>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workloadData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="open" name="Open tasks" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Overdue tasks (top 10)
        </Typography>
        {data.overdue.length === 0 ? (
          <Typography color="text.secondary">No overdue tasks.</Typography>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Equipment</th>
                  <th>Assigned</th>
                  <th>Due</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.overdue.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <strong>{t.maintenance_id?.reference_no}</strong>
                    </td>
                    <td>{t.equipment_id?.equipment_name || '—'}</td>
                    <td>{t.assigned_to?.name || '—'}</td>
                    <td style={{ color: '#c53030', fontWeight: 600 }}>{t.next_due ? new Date(t.next_due).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${statusColor[t.status_id?.status_name] || 'pending'}`}>{t.status_id?.status_name}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Paper>
    </Box>
  );
}
