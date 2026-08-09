/**
 * ActivityTab — moved verbatim out of AdminDashboard.jsx (was one 1,565-line file).
 */
import { useState, useEffect, useCallback } from 'react';
import { API } from '../../api';

function ActivityTab({ authFetch }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.set('entityType', entityFilter);
      if (actionFilter) params.set('action', actionFilter);
      const res = await authFetch(`${API}/admin/activity?${params}`);
      const data = await res.json();
      setLog(data.log || []);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
    setLoading(false);
  }, [authFetch, entityFilter, actionFilter]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const entityTypes = ['', 'booking', 'user', 'email', 'special_fare'];
  const actionTypes = ['', 'admin_update', 'admin_delete', 'admin_send_email', 'price_check', 'savings_found', 'status_change', 'created'];

  return (
    <div className="admin-section">
      <h2>Activity Log</h2>

      <div className="admin-card">
        <div className="admin-filter-pills">
          <span className="filter-label">Entity:</span>
          {entityTypes.map(e => (
            <button
              key={e || 'all'}
              className={`filter-pill ${entityFilter === e ? 'active' : ''}`}
              onClick={() => setEntityFilter(e)}
            >
              {e || 'All'}
            </button>
          ))}
        </div>
        <div className="admin-filter-pills">
          <span className="filter-label">Action:</span>
          {actionTypes.map(a => (
            <button
              key={a || 'all'}
              className={`filter-pill ${actionFilter === a ? 'active' : ''}`}
              onClick={() => setActionFilter(a)}
            >
              {a || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="admin-empty"><div className="admin-spinner" /></div>
        ) : log.length === 0 ? (
          <p className="admin-empty">No activity recorded yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry, i) => (
                <tr key={i}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td><span className="activity-action-badge">{entry.action}</span></td>
                  <td>{entry.entityType || '-'}</td>
                  <td className="text-truncate">{entry.entityId || '-'}</td>
                  <td>{entry.actorEmail || 'system'}</td>
                  <td className="text-truncate">{entry.details ? JSON.stringify(entry.details).slice(0, 80) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── REVENUE TAB ───────────────────────────────────────────

export default ActivityTab;
