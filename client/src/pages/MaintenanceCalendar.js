import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const frequencyLabels = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual', 'Other'];
const statusColor = { Pending: 'pending', 'In Progress': 'progress', Done: 'done', Verified: 'verified', Overdue: 'overdue', Cancelled: 'cancelled' };

function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = first.getDay();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

export default function MaintenanceCalendar() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(normalizeDate(new Date()));
  const [showAlerts, setShowAlerts] = useState(false);
  const [filterFrequency, setFilterFrequency] = useState('');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get('/api/tasks');
        setTasks(res.data || []);
      } catch (err) {
        toast.error('Could not load maintenance tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const today = useMemo(() => normalizeDate(new Date()), []);

  const tasksWithFrequency = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      frequency: task.frequency || task.maintenance_id?.frequencies?.[0] || 'Other'
    }));
  }, [tasks]);

  const dueTasks = useMemo(() => tasksWithFrequency.filter(task => {
    if (!task.next_due) return false;
    const dueDate = normalizeDate(task.next_due);
    const status = task.status_id?.status_name;
    return ['Pending', 'In Progress', 'Overdue', 'Other'].includes(status) || !['Done', 'Verified'].includes(status) ? dueDate <= today : false;
  }), [tasksWithFrequency, today]);

  const alertGroup = useMemo(() => {
    const groups = frequencyLabels.reduce((acc, label) => ({ ...acc, [label]: [] }), {});
    dueTasks.forEach((task) => {
      const label = frequencyLabels.includes(task.frequency) ? task.frequency : 'Other';
      groups[label].push(task);
    });
    return groups;
  }, [dueTasks]);

  useEffect(() => {
    if (!loading && dueTasks.length > 0) {
      setShowAlerts(true);
    }
  }, [loading, dueTasks.length]);

  const monthDays = useMemo(() => buildMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()), [currentMonth]);

  const filteredTasksWithFrequency = useMemo(() => {
    return filterFrequency
      ? tasksWithFrequency.filter(task => task.frequency === filterFrequency)
      : tasksWithFrequency;
  }, [tasksWithFrequency, filterFrequency]);

  const tasksByDate = useMemo(() => {
    return filteredTasksWithFrequency.reduce((acc, task) => {
      if (!task.next_due) return acc;
      const key = normalizeDate(task.next_due).toISOString();
      acc[key] = acc[key] || [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [filteredTasksWithFrequency]);

  const selectedTasks = useMemo(() => {
    const key = selectedDate.toISOString();
    return tasksByDate[key] || [];
  }, [selectedDate, tasksByDate]);

  const selectedMonthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const changeMonth = (offset) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const closeAlerts = () => setShowAlerts(false);

  if (loading) return <div className="loader">Loading schedule...</div>;

  return (
    <div>
      <div className="page-header" style={{ gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2>🗓️ Scheduled Maintenance Calendar</h2>
          <p style={{ color: '#718096', marginTop: 8 }}>View upcoming tasks and receive alert pop-ups for Daily, Weekly, Monthly, Quarterly and Annual maintenance.</p>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <label style={{ color: '#4a5568', fontWeight: 600 }}>Filter by frequency:</label>
          <select value={filterFrequency} onChange={e => setFilterFrequency(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 180 }}>
            <option value="">All frequencies</option>
            {frequencyLabels.map(label => <option key={label} value={label}>{label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {frequencyLabels.map(label => {
            const count = tasksWithFrequency.filter(t => t.frequency === label).length;
            return (
              <div key={label} className="stat-card" style={{ flex: '1 1 160px' }}>
                <div className="stat-value">{count}</div>
                <div className="stat-label">{label} tasks</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ flex: '1 1 220px' }}>
            <div className="stat-value">{dueTasks.length}</div>
            <div className="stat-label">Due or overdue tasks</div>
          </div>
          <div className="stat-card" style={{ flex: '1 1 220px' }}>
            <div className="stat-value">{selectedTasks.length}</div>
            <div className="stat-label">Tasks on {selectedDate.toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="calendar-header">
          <button className="btn btn-outline" type="button" onClick={() => changeMonth(-1)}>Prev</button>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedMonthName}</div>
          <button className="btn btn-outline" type="button" onClick={() => changeMonth(1)}>Next</button>
        </div>
        <div className="calendar-grid">
          {weekdays.map(day => <div key={day} className="calendar-weekday">{day}</div>)}
          {monthDays.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="calendar-cell empty" />;
            const iso = normalizeDate(date).toISOString();
            const items = tasksByDate[iso] || [];
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            return (
              <button
                key={iso}
                type="button"
                className={`calendar-cell ${isToday ? 'calendar-today' : ''} ${isSelected ? 'calendar-selected' : ''}`}
                onClick={() => setSelectedDate(normalizeDate(date))}
              >
                <span>{date.getDate()}</span>
                {items.length > 0 && <span className="calendar-badge">{items.length}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Tasks for {selectedDate.toLocaleDateString()}</div>
        {selectedTasks.length === 0 ? (
          <p style={{ color: '#718096' }}>No scheduled work on this date.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Equipment</th>
                  <th>Frequency</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedTasks.map(task => (
                  <tr key={task._id}>
                    <td>{task.maintenance_id?.reference_no || task.maintenance_reference || task.maintenance_id?.description || task.maintenance_description || '—'}</td>
                    <td>{task.equipment_id?.equipment_name || '—'}</td>
                    <td>{task.frequency}</td>
                    <td>{task.assigned_to?.name || '—'}</td>
                    <td><span className={`badge badge-${statusColor[task.status_id?.status_name] || 'pending'}`}>{task.status_id?.status_name || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAlerts && (
        <div className="modal-overlay" onClick={closeAlerts}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Maintenance Alerts</h3>
              <button className="modal-close" onClick={closeAlerts}>×</button>
            </div>
            <p style={{ color: '#718096', marginBottom: 16 }}>Tasks due today or overdue are grouped by frequency below.</p>
            {frequencyLabels.map(label => (
              <div key={label} style={{ marginBottom: 18 }}>
                <h4 style={{ marginBottom: 8 }}>{label}</h4>
                {alertGroup[label].length === 0 ? (
                  <p style={{ color: '#718096', margin: 0 }}>No pending {label.toLowerCase()} tasks.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Equipment</th>
                          <th>Due Date</th>
                          <th>Assigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alertGroup[label].map(task => (
                          <tr key={task._id}>
                            <td>{task.maintenance_id?.reference_no || task.maintenance_id?.description}</td>
                            <td>{task.equipment_id?.equipment_name || '—'}</td>
                            <td style={{ color: '#e53e3e' }}>{new Date(task.next_due).toLocaleDateString()}</td>
                            <td>{task.assigned_to?.name || 'Unassigned'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={closeAlerts}>Close alerts</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
