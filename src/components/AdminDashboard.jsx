import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IconBarChart, IconUsers, IconDollar, IconSearch, IconLink, IconSettings, IconHotel, IconRefresh, IconClock, IconActivity, IconStar, IconCheck, IconCrown, IconZap, IconServer, IconTarget, IconChart, IconPercent, IconShield, IconTrendUp, IconMail, IconTrash, IconX, IconEye } from './Icons';
import './AdminDashboard.css';
import { API } from '../api';

function AdminDashboard() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const onBack = () => navigate('/dashboard');
  const [activeTab, setActiveTab] = useState('overview');
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggeringCheck, setTriggeringCheck] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, config] = await Promise.all([
        authFetch(`${API}/admin/dashboard`).then(r => r.json()),
        authFetch(`${API}/config`).then(r => r.json()),
      ]);
      setAdminData({ ...dashboard, config });
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000);
    return () => clearInterval(interval);
  }, [fetchAdminData]);

  const triggerManualCheck = async () => {
    setTriggeringCheck(true);
    try {
      const res = await authFetch(`${API}/admin/trigger-check`, { method: 'POST' });
      const result = await res.json();
      alert(`Price check complete!\n${result.bookingsChecked} bookings checked\n${result.savingsFound} new savings found`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to trigger check: ' + err.message);
    }
    setTriggeringCheck(false);
  };

  if (loading && !adminData) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!adminData) return null;

  const { stats, scheduler, users, bookings, revenue, affiliates, system } = adminData;

  const tabs = ['overview', 'bookings', 'users', 'revenue', 'monitoring', 'activity', 'affiliates', 'system'];
  const tabIcons = {
    overview: <IconBarChart size={16} />,
    bookings: <IconHotel size={16} />,
    users: <IconUsers size={16} />,
    revenue: <IconDollar size={16} />,
    monitoring: <IconSearch size={16} />,
    activity: <IconActivity size={16} />,
    affiliates: <IconLink size={16} />,
    system: <IconSettings size={16} />,
  };

  return (
    <div className="admin">
      <div className="admin-header">
        <div className="container admin-header-inner">
          <div className="admin-header-left">
            <button className="btn btn-ghost" onClick={onBack}>&#8592; Back</button>
            <h1>Super Admin</h1>
            <span className="admin-badge">ADMIN PANEL</span>
          </div>
          <div className="admin-header-right">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/admin/special-fares')}
            >
              Tarifas Especiais
            </button>
            <span className="admin-live-dot" />
            <span className="admin-live-text">Live</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={triggerManualCheck}
              disabled={triggeringCheck}
            >
              {triggeringCheck ? 'Checking...' : 'Run Price Check'}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <div className="container">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabIcons[tab]}
              {' '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-content container">
        {activeTab === 'overview' && <OverviewTab data={adminData} />}
        {activeTab === 'bookings' && <BookingsTab authFetch={authFetch} />}
        {activeTab === 'users' && <UsersTab users={users} stats={stats} authFetch={authFetch} />}
        {activeTab === 'revenue' && <RevenueTab revenue={revenue} affiliates={affiliates} />}
        {activeTab === 'monitoring' && <MonitoringTab scheduler={scheduler} stats={stats} />}
        {activeTab === 'activity' && <ActivityTab authFetch={authFetch} />}
        {activeTab === 'affiliates' && <AffiliatesTab affiliates={affiliates} config={adminData.config} />}
        {activeTab === 'system' && <SystemTab system={system} config={adminData.config} authFetch={authFetch} />}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ──────────────────────────────────────────
function OverviewTab({ data }) {
  const { stats, scheduler, users, revenue } = data;

  return (
    <div className="admin-section">
      <h2>Dashboard Overview</h2>

      <div className="admin-kpi-grid">
        <KpiCard
          label="Total Users"
          value={users?.total || 0}
          icon={<IconUsers size={24} />}
          trend={`+${users?.newToday || 0} today`}
          color="blue"
        />
        <KpiCard
          label="Active Bookings"
          value={stats?.totalBookings || 0}
          icon={<IconHotel size={24} />}
          trend={`${stats?.savingsFound || 0} with savings`}
          color="purple"
        />
        <KpiCard
          label="Total Savings Found"
          value={`$${(stats?.totalSavings || 0).toLocaleString()}`}
          icon={<IconDollar size={24} />}
          trend={`${stats?.successRate || 0}% success rate`}
          color="green"
        />
        <KpiCard
          label="Est. Revenue"
          value={`$${(revenue?.estimatedMonthly || 0).toLocaleString()}`}
          icon={<IconTrendUp size={24} />}
          trend="this month"
          color="orange"
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Quick Stats</h3>
          <div className="admin-stat-list">
            <StatRow label="Avg Savings per Booking" value={`R$${stats?.avgSavings || 0}`} />
            <StatRow label="Price Checks Today" value={scheduler?.totalChecksRun || 0} />
            <StatRow label="Checks Per Day" value={`${scheduler?.checksPerDay || 3}x`} />
            <StatRow label="Last Check" value={scheduler?.lastCheck ? new Date(scheduler.lastCheck).toLocaleString() : 'Never'} />
            <StatRow label="Next Check" value={scheduler?.nextCheck ? new Date(scheduler.nextCheck).toLocaleString() : 'N/A'} />
            <StatRow label="API Mode" value={stats?.apiMode || 'SIMULATION'} />
          </div>
        </div>

        <div className="admin-card">
          <h3>Affiliate Programmes</h3>
          <div className="admin-stat-list">
            <StatRow
              label="Booking.com (Awin)"
              value={<StatusBadge status={data.config?.awinConfigured ? 'connected' : 'disconnected'} />}
            />
            <StatRow
              label="Expedia (Awin)"
              value={<StatusBadge status={data.affiliates?.expedia?.configured ? 'connected' : 'pending'} />}
            />
            <StatRow
              label="Booking.com Direct API"
              value={<StatusBadge status={data.config?.bookingComConfigured ? 'connected' : 'not needed'} />}
            />
            <StatRow label="Awin Publisher ID" value={data.config?.awinPublisherId || 'Not set'} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card">
        <h3>Recent Check History</h3>
        {scheduler?.recentHistory?.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Bookings Checked</th>
                <th>Savings Found</th>
                <th>New Savings</th>
                <th>Errors</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduler.recentHistory.slice().reverse().map((entry, i) => (
                <tr key={i}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>{entry.bookingsChecked}</td>
                  <td>{entry.savingsFound}</td>
                  <td>R${entry.totalNewSavings || 0}</td>
                  <td className={entry.errors > 0 ? 'text-danger' : ''}>{entry.errors}</td>
                  <td>{entry.duration}ms</td>
                  <td><StatusBadge status={entry.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No checks run yet. Click &quot;Run Price Check&quot; to start.</p>
        )}
      </div>
    </div>
  );
}

// ─── BOOKINGS TAB ─────────────────────────────────────────
function BookingsTab({ authFetch }) {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [emailForm, setEmailForm] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const searchTimer = useRef(null);
  const limit = 50;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      params.set('sort', sort);
      params.set('order', order);
      params.set('page', page);
      params.set('limit', limit);
      const res = await authFetch(`${API}/admin/bookings?${params}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
    setLoading(false);
  }, [authFetch, statusFilter, search, sort, order, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleSearch = (val) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  const handleSort = (col) => {
    if (sort === col) {
      setOrder(order === 'desc' ? 'asc' : 'desc');
    } else {
      setSort(col);
      setOrder('desc');
    }
    setPage(1);
  };

  const openDetail = async (bookingId) => {
    setSelectedBooking(bookingId);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await authFetch(`${API}/admin/bookings/${bookingId}`);
      const data = await res.json();
      setDetailData(data);
    } catch (err) {
      console.error('Failed to fetch booking detail:', err);
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedBooking(null);
    setDetailData(null);
    setEmailForm(null);
    setEditingStatus(null);
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await authFetch(`${API}/admin/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setEditingStatus(null);
      openDetail(bookingId);
      fetchBookings();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking? This cannot be undone.')) return;
    try {
      await authFetch(`${API}/admin/bookings/${bookingId}`, { method: 'DELETE' });
      closeDetail();
      fetchBookings();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
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
        alert('Email sent successfully!');
        setEmailForm(null);
      } else {
        alert('Failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to send email: ' + err.message);
    }
    setSendingEmail(false);
  };

  const totalPages = Math.ceil(total / limit);
  const statuses = ['all', 'monitoring', 'lower_fare_found', 'savings_found', 'confirmed_savings', 'dismissed'];
  const statusLabels = {
    all: 'All', monitoring: 'Monitoring', lower_fare_found: 'Lower Fare Found',
    savings_found: 'Savings Found', confirmed_savings: 'Confirmed', dismissed: 'Dismissed',
  };

  return (
    <div className="admin-section">
      <h2>Bookings Management</h2>

      <div className="admin-card">
        <div className="admin-search-bar">
          <IconSearch size={16} />
          <input
            type="text"
            placeholder="Search hotel name, email, or destination..."
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="admin-filter-pills">
          {statuses.map(s => (
            <button
              key={s}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {statusLabels[s] || s}
            </button>
          ))}
        </div>

        <div className="admin-table-info">
          <span>{total} booking{total !== 1 ? 's' : ''} found</span>
        </div>

        {loading ? (
          <div className="admin-empty"><div className="admin-spinner" /></div>
        ) : bookings.length === 0 ? (
          <p className="admin-empty">No bookings match your filters.</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('hotel_name')}>
                      Hotel {sort === 'hotel_name' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>User Email</th>
                    <th>Destination</th>
                    <th className="sortable" onClick={() => handleSort('checkin_date')}>
                      Check-in {sort === 'checkin_date' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>Check-out</th>
                    <th className="sortable" onClick={() => handleSort('original_price')}>
                      Original {sort === 'original_price' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>Best Price</th>
                    <th className="sortable" onClick={() => handleSort('total_savings')}>
                      Savings {sort === 'total_savings' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>Status</th>
                    <th className="sortable" onClick={() => handleSort('created_at')}>
                      Created {sort === 'created_at' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="admin-booking-row" onClick={() => openDetail(b.id)}>
                      <td className="text-truncate">{b.hotelName || '-'}</td>
                      <td className="text-truncate">{b.email || '-'}</td>
                      <td className="text-truncate">{b.destination || '-'}</td>
                      <td>{b.checkinDate ? new Date(b.checkinDate).toLocaleDateString() : '-'}</td>
                      <td>{b.checkoutDate ? new Date(b.checkoutDate).toLocaleDateString() : '-'}</td>
                      <td>R${parseFloat(b.originalPrice || 0).toLocaleString()}</td>
                      <td>{b.bestPrice ? `R$${parseFloat(b.bestPrice).toLocaleString()}` : '-'}</td>
                      <td className={parseFloat(b.totalSavings) > 0 ? 'text-savings' : ''}>
                        {parseFloat(b.totalSavings) > 0 ? `R$${parseFloat(b.totalSavings).toLocaleString()}` : '-'}
                      </td>
                      <td><BookingStatusBadge status={b.status} /></td>
                      <td>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <>
          <div className="admin-detail-overlay" onClick={closeDetail} />
          <div className="admin-detail-modal">
            <div className="admin-detail-header">
              <h3>Booking Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeDetail}><IconX size={18} /></button>
            </div>
            {detailLoading ? (
              <div className="admin-empty"><div className="admin-spinner" /></div>
            ) : detailData ? (
              <div className="admin-detail-body">
                <div className="admin-detail-section">
                  <h4>Booking Info</h4>
                  <div className="admin-stat-list">
                    <StatRow label="ID" value={detailData.booking.id} />
                    <StatRow label="Hotel" value={detailData.booking.hotelName || '-'} />
                    <StatRow label="Destination" value={detailData.booking.destination || '-'} />
                    <StatRow label="Guest" value={detailData.booking.guestName || '-'} />
                    <StatRow label="Email" value={detailData.booking.email || '-'} />
                    <StatRow label="Check-in" value={detailData.booking.checkinDate || '-'} />
                    <StatRow label="Check-out" value={detailData.booking.checkoutDate || '-'} />
                    <StatRow label="Room Type" value={detailData.booking.roomType || '-'} />
                    <StatRow label="Original Price" value={`R$${detailData.booking.originalPrice || 0}`} />
                    <StatRow label="Best Price" value={detailData.booking.bestPrice ? `R$${detailData.booking.bestPrice}` : '-'} />
                    <StatRow label="Savings" value={detailData.booking.totalSavings ? `R$${detailData.booking.totalSavings}` : '-'} />
                    <StatRow label="Best Source" value={detailData.booking.bestSource || '-'} />
                    <StatRow label="Confirmation #" value={detailData.booking.confirmationNumber || '-'} />
                    <StatRow label="Status" value={<BookingStatusBadge status={detailData.booking.status} />} />
                    <StatRow label="Check Count" value={detailData.booking.checkCount || 0} />
                    <StatRow label="Created" value={detailData.booking.createdAt ? new Date(detailData.booking.createdAt).toLocaleString() : '-'} />
                    <StatRow label="Last Checked" value={detailData.booking.lastChecked ? new Date(detailData.booking.lastChecked).toLocaleString() : 'Never'} />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="admin-detail-section">
                  <h4>Quick Actions</h4>
                  <div className="admin-actions">
                    {editingStatus ? (
                      <div className="admin-status-edit">
                        <select value={editingStatus} onChange={e => setEditingStatus(e.target.value)}>
                          <option value="monitoring">Monitoring</option>
                          <option value="lower_fare_found">Lower Fare Found</option>
                          <option value="savings_found">Savings Found</option>
                          <option value="confirmed_savings">Confirmed</option>
                          <option value="dismissed">Dismissed</option>
                          <option value="pending_user_confirmation">Pending User Confirmation</option>
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(detailData.booking.id, editingStatus)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingStatus(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingStatus(detailData.booking.status)}>Update Status</button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEmailForm({ to: detailData.booking.email, subject: `Re: ${detailData.booking.hotelName || 'Your Booking'}`, body: '' })}
                    >
                      <IconMail size={14} /> Send Email
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(detailData.booking.id)}>
                      <IconTrash size={14} /> Delete
                    </button>
                  </div>
                </div>

                {/* Email Compose */}
                {emailForm && (
                  <div className="admin-detail-section">
                    <h4>Compose Email</h4>
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
                        <textarea rows={5} value={emailForm.body} onChange={e => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Write your message..." />
                      </div>
                      <div className="email-actions">
                        <button className="btn btn-primary btn-sm" onClick={handleSendEmail} disabled={sendingEmail}>
                          {sendingEmail ? 'Sending...' : 'Send Email'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEmailForm(null)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fare Alerts */}
                <div className="admin-detail-section">
                  <h4>Fare Alerts ({detailData.fareAlerts?.length || 0})</h4>
                  {detailData.fareAlerts?.length > 0 ? (
                    <div className="admin-detail-list">
                      {detailData.fareAlerts.map((a, i) => (
                        <div key={i} className="admin-detail-list-item">
                          <span className="detail-time">{new Date(a.createdAt).toLocaleString()}</span>
                          <span>R${a.offeredPrice || a.savingsAmount || '-'} via {a.foundSource || '-'}</span>
                          <BookingStatusBadge status={a.status || 'alert'} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-empty">No fare alerts yet.</p>
                  )}
                </div>

                {/* Activity Log */}
                <div className="admin-detail-section">
                  <h4>Activity Log ({detailData.activityLog?.length || 0})</h4>
                  {detailData.activityLog?.length > 0 ? (
                    <div className="admin-detail-list">
                      {detailData.activityLog.map((a, i) => (
                        <div key={i} className="admin-detail-list-item">
                          <span className="detail-time">{new Date(a.createdAt).toLocaleString()}</span>
                          <span className="detail-action">{a.action}</span>
                          <span className="detail-actor">{a.actorEmail || 'system'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-empty">No activity recorded.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="admin-empty">Failed to load booking details.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── USERS TAB ─────────────────────────────────────────────
function UsersTab({ users, stats, authFetch }) {
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
function RevenueTab({ revenue, affiliates }) {
  return (
    <div className="admin-section">
      <h2>Revenue &amp; Commissions</h2>

      <div className="admin-kpi-grid">
        <KpiCard
          label="Est. Monthly Revenue"
          value={`$${(revenue?.estimatedMonthly || 0).toLocaleString()}`}
          icon={<IconDollar size={24} />}
          color="green"
        />
        <KpiCard
          label="Affiliate Commissions"
          value={`$${(revenue?.affiliateCommissions || 0).toLocaleString()}`}
          icon={<IconLink size={24} />}
          color="blue"
        />
        <KpiCard
          label="Membership Revenue"
          value={`$${(revenue?.membershipRevenue || 0).toLocaleString()}`}
          icon={<IconCrown size={24} />}
          color="purple"
        />
        <KpiCard
          label="Rebookings This Month"
          value={revenue?.rebookingsThisMonth || 0}
          icon={<IconRefresh size={24} />}
          color="orange"
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Commission Breakdown</h3>
          <div className="admin-stat-list">
            <StatRow label="Booking.com (est. 25-40%)" value={`R$${revenue?.bookingCommissions || 0}`} />
            <StatRow label="Expedia (4% lodging)" value={`R$${revenue?.expediaCommissions || 0}`} />
            <StatRow label="Other OTAs" value={`R$${revenue?.otherCommissions || 0}`} />
            <StatRow label="Total Booking Value" value={`R$${(revenue?.totalBookingValue || 0).toLocaleString()}`} />
            <StatRow label="Avg Commission Rate" value={`${revenue?.avgCommissionRate || 0}%`} />
          </div>
        </div>

        <div className="admin-card">
          <h3>Revenue Projections</h3>
          <div className="admin-stat-list">
            <StatRow label="Current MRR" value={`R$${revenue?.currentMRR || 0}`} />
            <StatRow label="Projected ARR" value={`R$${(revenue?.projectedARR || 0).toLocaleString()}`} />
            <StatRow label="LTV per User" value={`R$${revenue?.ltvPerUser || 0}`} />
            <StatRow label="CAC Target" value={`R$${revenue?.cacTarget || 0}`} />
            <StatRow label="Break-even Users" value={revenue?.breakEvenUsers || 'N/A'} />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3>Expedia Commission Rates</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Commission Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(affiliates?.expediaCommissions || []).map((c, i) => (
              <tr key={i}>
                <td>{c.category}</td>
                <td>{c.label}</td>
                <td><StatusBadge status={c.eligible ? 'eligible' : 'not eligible'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MONITORING TAB ────────────────────────────────────────
function MonitoringTab({ scheduler, stats }) {
  return (
    <div className="admin-section">
      <h2>Price Monitoring</h2>

      <div className="admin-kpi-grid">
        <KpiCard
          label="Scheduler Status"
          value={scheduler?.running ? 'RUNNING' : 'STOPPED'}
          icon={scheduler?.running ? <IconActivity size={24} /> : <IconTarget size={24} />}
          color={scheduler?.running ? 'green' : 'red'}
        />
        <KpiCard
          label="Checks Per Day"
          value={`${scheduler?.checksPerDay || 0}x`}
          icon={<IconRefresh size={24} />}
          color="blue"
        />
        <KpiCard
          label="Total Checks Run"
          value={scheduler?.totalChecksRun || 0}
          icon={<IconCheck size={24} />}
          color="purple"
        />
        <KpiCard
          label="Success Rate"
          value={`${stats?.successRate || 0}%`}
          icon={<IconChart size={24} />}
          color="orange"
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Schedule Configuration</h3>
          <div className="admin-stat-list">
            <StatRow label="Check Times" value={(scheduler?.checkHours || []).join(', ')} />
            <StatRow label="Last Check" value={scheduler?.lastCheck ? new Date(scheduler.lastCheck).toLocaleString() : 'Never'} />
            <StatRow label="Next Check" value={scheduler?.nextCheck ? new Date(scheduler.nextCheck).toLocaleString() : 'N/A'} />
            <StatRow label="Active Bookings" value={stats?.totalBookings || 0} />
            <StatRow label="Est. API Calls/Day" value={`${(stats?.totalBookings || 0) * (scheduler?.checksPerDay || 3) * 6} calls`} />
          </div>
        </div>

        <div className="admin-card">
          <h3>Check Performance</h3>
          <div className="admin-stat-list">
            {scheduler?.recentHistory?.slice(-5).reverse().map((entry, i) => (
              <StatRow
                key={i}
                label={new Date(entry.timestamp).toLocaleTimeString()}
                value={`${entry.bookingsChecked} checked, ${entry.savingsFound} savings (${entry.duration}ms)`}
              />
            ))}
            {(!scheduler?.recentHistory || scheduler.recentHistory.length === 0) && (
              <p className="admin-empty">No checks yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3>Cost Estimate (2-3x daily checks)</h3>
        <div className="admin-info-box">
          <p><strong>Current Configuration:</strong> {scheduler?.checksPerDay || 3} checks/day</p>
          <p><strong>Per check:</strong> Each booking generates ~6 price lookups across OTA sources</p>
          <p><strong>Daily API calls:</strong> {(stats?.totalBookings || 0)} bookings x {scheduler?.checksPerDay || 3} checks x 6 sources = ~{(stats?.totalBookings || 0) * (scheduler?.checksPerDay || 3) * 6} calls/day</p>
          <p><strong>Monthly estimate:</strong> ~{(stats?.totalBookings || 0) * (scheduler?.checksPerDay || 3) * 6 * 30} calls/month</p>
        </div>
      </div>
    </div>
  );
}

// ─── AFFILIATES TAB ────────────────────────────────────────
function AffiliatesTab({ affiliates, config }) {
  return (
    <div className="admin-section">
      <h2>Affiliate Programmes</h2>

      <div className="admin-grid-2">
        {/* Booking.com */}
        <div className="admin-card affiliate-card">
          <div className="affiliate-header">
            <span className="affiliate-logo">B</span>
            <div>
              <h3>Booking.com</h3>
              <p className="affiliate-network">via Awin Network</p>
            </div>
            <StatusBadge status={config?.awinConfigured ? 'connected' : 'pending'} />
          </div>
          <div className="admin-stat-list">
            <StatRow label="Advertiser ID (Brazil)" value={affiliates?.booking?.advertiserIdBrazil || 'N/A'} />
            <StatRow label="Publisher ID" value={config?.awinPublisherId || 'Not set'} />
            <StatRow label="Programme Status" value={affiliates?.booking?.programmeStatus || 'Pending approval'} />
            <StatRow label="Commission" value="25-40% (varies)" />
            <StatRow label="Cookie Window" value="Session-based" />
          </div>
        </div>

        {/* Expedia */}
        <div className="admin-card affiliate-card">
          <div className="affiliate-header">
            <span className="affiliate-logo">E</span>
            <div>
              <h3>Expedia</h3>
              <p className="affiliate-network">via Awin Network</p>
            </div>
            <StatusBadge status={affiliates?.expedia?.configured ? 'connected' : 'pending'} />
          </div>
          <div className="admin-stat-list">
            <StatRow label="Advertiser ID" value={affiliates?.expedia?.advertiserId || 'Not set'} />
            <StatRow label="Lodging Commission" value="4%" />
            <StatRow label="Packages Commission" value="2%" />
            <StatRow label="Cars Commission" value="1.5%" />
            <StatRow label="Cookie Window" value="7 days" />
            <StatRow label="Attribution" value="Last click via Awin" />
          </div>
        </div>
      </div>

      {/* Commission comparison */}
      <div className="admin-card">
        <h3>Commission Comparison</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Lodging</th>
              <th>Packages</th>
              <th>Cars</th>
              <th>Rentals</th>
              <th>Cookie</th>
              <th>Attribution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Booking.com</strong></td>
              <td>25-40%</td>
              <td>N/A</td>
              <td>N/A</td>
              <td>N/A</td>
              <td>Session</td>
              <td>Last click</td>
            </tr>
            <tr>
              <td><strong>Expedia</strong></td>
              <td>4%</td>
              <td>2%</td>
              <td>1.5%</td>
              <td>2%</td>
              <td>7 days</td>
              <td>Last click (Awin)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="admin-card">
        <h3>Expedia Restrictions</h3>
        <div className="admin-grid-2">
          <div>
            <h4 className="admin-subtitle">Allowed Affiliate Types</h4>
            <ul className="admin-list">
              <li>Coupons</li>
              <li>Social Media</li>
              <li>Content</li>
              <li>Email Marketing</li>
              <li>Cashback</li>
            </ul>
          </div>
          <div>
            <h4 className="admin-subtitle">Not Allowed / Not Eligible</h4>
            <ul className="admin-list admin-list-danger">
              <li>Siteunder</li>
              <li>Direct Search (SEM)</li>
              <li>Flights -- 0% commission</li>
              <li>Insurance -- 0% commission</li>
              <li>Lodging with coupon -- 0% commission</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SYSTEM TAB ────────────────────────────────────────────
function SystemTab({ system, config, authFetch }) {
  const [emailStatus, setEmailStatus] = useState(null);

  useEffect(() => {
    // Check email configuration from config
    const resendConfigured = !!config?.resendConfigured;
    setEmailStatus(resendConfigured);
  }, [config]);

  return (
    <div className="admin-section">
      <h2>System Health</h2>

      <div className="admin-kpi-grid">
        <KpiCard label="Uptime" value={system?.uptime || 'N/A'} icon={<IconClock size={24} />} color="green" />
        <KpiCard label="Memory" value={system?.memoryUsage || 'N/A'} icon={<IconServer size={24} />} color="blue" />
        <KpiCard label="API Mode" value={config?.apiMode || 'N/A'} icon={<IconSettings size={24} />} color="purple" />
        <KpiCard label="Server" value="Node.js" icon={<IconServer size={24} />} color="orange" />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Server Info</h3>
          <div className="admin-stat-list">
            <StatRow label="Node.js Version" value={system?.nodeVersion || 'N/A'} />
            <StatRow label="Server Uptime" value={system?.uptime || 'N/A'} />
            <StatRow label="Memory Used" value={system?.memoryUsage || 'N/A'} />
            <StatRow label="Platform" value={system?.platform || 'N/A'} />
            <StatRow label="Environment" value={system?.environment || 'development'} />
          </div>
        </div>

        <div className="admin-card">
          <h3>API Connections</h3>
          <div className="admin-stat-list">
            <StatRow
              label="Awin API"
              value={<StatusBadge status={config?.awinConfigured ? 'connected' : 'disconnected'} />}
            />
            <StatRow
              label="Booking.com API"
              value={<StatusBadge status={config?.bookingComConfigured ? 'connected' : 'simulation'} />}
            />
            <StatRow
              label="Expedia (Awin)"
              value={<StatusBadge status={system?.expediaConfigured ? 'connected' : 'pending setup'} />}
            />
            <StatRow label="Sandbox Mode" value={config?.sandboxMode ? 'ON' : 'OFF'} />
          </div>
        </div>
      </div>

      {/* Email Service Status */}
      <div className="admin-card">
        <h3>Email Service (Resend)</h3>
        <div className="admin-stat-list">
          <StatRow
            label="Resend API"
            value={<StatusBadge status={emailStatus ? 'connected' : 'disconnected'} />}
          />
          <StatRow label="From Address" value={config?.resendFrom || 'Not configured'} />
          <StatRow label="Status" value={emailStatus ? 'Ready to send emails' : 'Set RESEND_API_KEY to enable'} />
        </div>
      </div>

      <div className="admin-card">
        <h3>Estimated Monthly Costs</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>1K Users</th>
              <th>10K Users</th>
              <th>100K Users</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Hosting (VPS/Cloud)</td><td>$5-15</td><td>$50-100</td><td>$300-500</td></tr>
            <tr><td>Database (PostgreSQL)</td><td>$0-15</td><td>$25-50</td><td>$100-200</td></tr>
            <tr><td>Email/Notifications</td><td>$0-10</td><td>$25-50</td><td>$100-300</td></tr>
            <tr><td>CDN + SSL + Domain</td><td>$10-20</td><td>$20-40</td><td>$50-100</td></tr>
            <tr><td>Monitoring/Logging</td><td>$0</td><td>$10-20</td><td>$50-100</td></tr>
            <tr className="admin-table-total"><td><strong>Total</strong></td><td><strong>$15-60</strong></td><td><strong>$130-260</strong></td><td><strong>$600-1,200</strong></td></tr>
          </tbody>
        </table>
        <p className="admin-note">* API costs are $0 -- using free affiliate links via Awin (no per-call charges)</p>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ─────────────────────────────────────

function KpiCard({ label, value, icon, trend, color = 'blue' }) {
  return (
    <div className={`kpi-card kpi-${color}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-info">
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{label}</span>
        {trend && <span className="kpi-trend">{trend}</span>}
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{typeof value === 'object' ? value : String(value)}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusMap = {
    connected: { label: 'Connected', cls: 'status-green' },
    active: { label: 'Active', cls: 'status-green' },
    running: { label: 'Running', cls: 'status-green' },
    eligible: { label: 'Eligible', cls: 'status-green' },
    completed: { label: 'Completed', cls: 'status-green' },
    pending: { label: 'Pending', cls: 'status-yellow' },
    'pending setup': { label: 'Pending Setup', cls: 'status-yellow' },
    'not needed': { label: 'Not Needed', cls: 'status-gray' },
    'not eligible': { label: 'Not Eligible', cls: 'status-red' },
    disconnected: { label: 'Disconnected', cls: 'status-red' },
    inactive: { label: 'Inactive', cls: 'status-gray' },
    simulation: { label: 'Simulation', cls: 'status-yellow' },
    no_bookings: { label: 'No Bookings', cls: 'status-gray' },
  };

  const s = statusMap[status] || { label: status, cls: 'status-gray' };
  return <span className={`status-badge ${s.cls}`}>{s.label}</span>;
}

function BookingStatusBadge({ status }) {
  const statusMap = {
    monitoring: { label: 'Monitoring', cls: 'booking-status-monitoring' },
    lower_fare_found: { label: 'Lower Fare Found', cls: 'booking-status-lower' },
    savings_found: { label: 'Savings Found', cls: 'booking-status-savings' },
    confirmed_savings: { label: 'Confirmed', cls: 'booking-status-confirmed' },
    pending_user_confirmation: { label: 'Pending Confirmation', cls: 'booking-status-pending' },
    dismissed: { label: 'Dismissed', cls: 'booking-status-dismissed' },
    alert: { label: 'Alert', cls: 'booking-status-lower' },
  };

  const s = statusMap[status] || { label: status || 'Unknown', cls: 'booking-status-monitoring' };
  return <span className={`booking-status-badge ${s.cls}`}>{s.label}</span>;
}

export default AdminDashboard;
