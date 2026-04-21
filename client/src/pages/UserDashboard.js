import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Paper } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function UserDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/api/dashboard/my')
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader">Loading...</div>;

  const chartData = (data?.summary || []).map((s) => ({ name: s.status, count: s.count }));

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Welcome, {user?.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your assigned maintenance workload and due dates.
      </Typography>

      {typeof data?.myDueSoon === 'number' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
          <Typography variant="body2" color="text.secondary">
            Due in the next 7 days
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.dark' }}>
            {data.myDueSoon}
          </Typography>
        </Paper>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(200px, 1fr) 2fr' },
          gap: 2,
          mb: 3,
          alignItems: 'stretch',
        }}
      >
        <div className="stats-grid" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data?.summary.map((s) => (
            <Paper key={s.status} variant="outlined" className="stat-card" sx={{ borderRadius: 2 }}>
              <div className="stat-value">{s.count}</div>
              <div className="stat-label">{s.status}</div>
            </Paper>
          ))}
        </div>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 280 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Status breakdown
          </Typography>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Your overdue tasks
        </Typography>
        {!data?.overdue?.length ? (
          <Typography color="text.secondary">No overdue tasks.</Typography>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Description</th>
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
                    <td>{(t.maintenance_id?.description || '').slice(0, 60)}</td>
                    <td style={{ color: '#c53030', fontWeight: 600 }}>{t.next_due ? new Date(t.next_due).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td>
                      <span className="badge badge-overdue">{t.status_id?.status_name}</span>
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
