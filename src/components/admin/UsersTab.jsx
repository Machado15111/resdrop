/**
 * UsersTab — moved verbatim out of AdminDashboard.jsx (was one 1,565-line file).
 */
import { useState } from 'react';
import { IconActivity, IconMail, IconSearch, IconStar, IconTrendUp, IconUsers, IconX } from '../Icons';
import { KpiCard, StatusBadge, BookingStatusBadge } from './SharedUI';
import { API } from '../../api';

function UsersTab({ users, authFetch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [emailForm, setEmailForm] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [changingPlan, setChangingPlan] = useState(null);

  const filteredUsers = (users?.list || []).filter(u => {
    const matchSearch = !searchTerm ||
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchPlan = planFilter === 'all' || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const openUserDetail = async (email) => {
    if (expandedUser === email) {
      setExpandedUser(null);
      setUserDetail(null);
      return;
    }
    setExpandedUser(email);
    setDetailLoading(true);
    try {
      const res = await authFetch(`${API}/admin/users/${encodeURIComponent(email)}`);
      const data = await res.json();
      setUserDetail(data);
    } catch (err) {
      console.error('Failed to fetch user detail:', err);
    }
    setDetailLoading(false);
  };

  const handlePlanChange = async (email, newPlan) => {
    try {
      await authFetch(`${API}/admin/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      setChangingPlan(null);
      // Refresh user detail
      openUserDetail(email);
    } catch (err) {
      alert('Failed to change plan: ' + err.message);
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm?.to || !emailForm?.subject || !emailForm?.body) return;
    setSendingEmail(true);
    try {
      const res = await authFetch(`${API}/admin/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      });
      const result = await res.json();
      if (result.success) {
        alert('Email sent!');
        setEmailForm(null);
      } else {
        alert('Failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSendingEmail(false);
  };

  const plans = ['all', 'free', 'viajante', 'premium'];

  return (
    <div className="admin-section">
      <h2>User Management</h2>

      <div className="admin-kpi-grid">
        <KpiCard label="Total Users" value={users?.total || 0} icon={<IconUsers size={24} />} color="blue" />
        <KpiCard label="Active Today" value={users?.activeToday || 0} icon={<IconActivity size={24} />} color="green" />
        <KpiCard label="New This Week" value={users?.newThisWeek || 0} icon={<IconTrendUp size={24} />} color="purple" />
        <KpiCard label="Premium Users" value={users?.premium || 0} icon={<IconStar size={24} />} color="orange" />
      </div>

      <div className="admin-card">
        <div className="admin-search-bar">
          <IconSearch size={16} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="admin-filter-pills">
          {plans.map(p => (
            <button
              key={p}
              className={`filter-pill ${planFilter === p ? 'active' : ''}`}
              onClick={() => setPlanFilter(p)}
            >
              {p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {filteredUsers.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Bookings</th>
                <th>Total Savings</th>
                <th>Plan</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, i) => (
                <>
                  <tr key={`user-${i}`} className="admin-booking-row" onClick={() => openUserDetail(user.email)}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.bookings}</td>
                    <td>R${user.totalSavings}</td>
                    <td><span className={`plan-badge plan-${user.plan}`}>{user.plan}</span></td>
                    <td>{new Date(user.joinedAt).toLocaleDateString()}</td>
                    <td><StatusBadge status={user.active ? 'active' : 'inactive'} /></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEmailForm({ to: user.email, subject: '', body: '' }); }}>
                        <IconMail size={14} />
                      </button>
                    </td>
                  </tr>
                  {expandedUser === user.email && (
                    <tr key={`detail-${i}`} className="admin-user-detail-row">
                      <td colSpan={8}>
                        {detailLoading ? (
                          <div className="admin-empty"><div className="admin-spinner" /></div>
                        ) : userDetail ? (
                          <div className="admin-user-expanded">
                            <div className="admin-user-expanded-info">
                              <div className="admin-actions" style={{ marginBottom: 12 }}>
                                {changingPlan !== null ? (
                                  <div className="admin-status-edit">
                                    <select value={changingPlan} onChange={e => setChangingPlan(e.target.value)}>
                                      <option value="free">Free</option>
                                      <option value="viajante">Viajante</option>
                                      <option value="premium">Premium</option>
                                    </select>
                                    <button className="btn btn-primary btn-sm" onClick={() => handlePlanChange(user.email, changingPlan)}>Save</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setChangingPlan(null)}>Cancel</button>
                                  </div>
                                ) : (
                                  <button className="btn btn-ghost btn-sm" onClick={() => setChangingPlan(userDetail.user?.plan || 'free')}>Change Plan</button>
                                )}
                              </div>
                              <h4>User Bookings ({userDetail.bookings?.length || 0})</h4>
                              {userDetail.bookings?.length > 0 ? (
                                <table className="admin-table admin-table-nested">
                                  <thead>
                                    <tr>
                                      <th>Hotel</th>
                                      <th>Check-in</th>
                                      <th>Original</th>
                                      <th>Savings</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {userDetail.bookings.map((b, j) => (
                                      <tr key={j}>
                                        <td>{b.hotelName || '-'}</td>
                                        <td>{b.checkinDate ? new Date(b.checkinDate).toLocaleDateString() : '-'}</td>
                                        <td>R${b.originalPrice || 0}</td>
                                        <td>{parseFloat(b.totalSavings) > 0 ? `R$${b.totalSavings}` : '-'}</td>
                                        <td><BookingStatusBadge status={b.status} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="admin-empty">No bookings.</p>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No users match your filters.</p>
        )}
      </div>

      {/* Email Compose Modal */}
      {emailForm && (
        <>
          <div className="admin-detail-overlay" onClick={() => setEmailForm(null)} />
          <div className="admin-detail-modal">
            <div className="admin-detail-header">
              <h3>Send Email</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEmailForm(null)}><IconX size={18} /></button>
            </div>
            <div className="admin-detail-body">
              <div className="admin-email-compose">
                <div className="email-field">
                  <label>To:</label>
                  <input type="email" value={emailForm.to} onChange={e => setEmailForm({ ...emailForm, to: e.target.value })} />
                </div>
                <div className="email-field">
                  <label>Subject:</label>
                  <input type="text" value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} />
                </div>
                <div className="email-field">
                  <label>Body:</label>
                  <textarea rows={6} value={emailForm.body} onChange={e => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Write your message..." />
                </div>
                <div className="email-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleSendEmail} disabled={sendingEmail}>
                    {sendingEmail ? 'Sending...' : 'Send Email'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEmailForm(null)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ACTIVITY TAB ─────────────────────────────────────────

export default UsersTab;
