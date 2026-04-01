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
  const [viewMode, setViewMode] = useState('table');
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
  const statusCounts = {};
  bookings.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });

  // Compute summary KPIs from current page data
  const totalSavingsSum = bookings.reduce((s, b) => s + (parseFloat(b.totalSavings) || 0), 0);
  const withSavings = bookings.filter(b => parseFloat(b.totalSavings) > 0).length;
  const avgPrice = bookings.length > 0 ? bookings.reduce((s, b) => s + (parseFloat(b.originalPrice) || 0), 0) / bookings.length : 0;

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getNights = (checkin, checkout) => {
    if (!checkin || !checkout) return null;
    return Math.ceil((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
  };

  const formatPrice = (val) => {
    const n = parseFloat(val);
    if (!n || isNaN(n)) return '-';
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="admin-section">
      <div className="admin-bookings-header">
        <h2>Bookings Management</h2>
        <div className="admin-view-toggle">
          <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="Table view">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 2h16v2H0V2zm0 5h16v2H0V7zm0 5h16v2H0v-2z"/></svg>
          </button>
          <button className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')} title="Card view">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 0h7v7H0V0zm9 0h7v7H9V0zM0 9h7v7H0V9zm9 0h7v7H9V9z"/></svg>
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="admin-kpi-grid admin-kpi-grid-5">
        <KpiCard label="Total Bookings" value={total} icon={<IconHotel size={20} />} color="blue" />
        <KpiCard label="With Savings" value={withSavings} icon={<IconCheck size={20} />} color="green" trend={total > 0 ? `${Math.round(withSavings/total*100)}%` : '0%'} />
        <KpiCard label="Total Savings" value={`$${formatPrice(totalSavingsSum)}`} icon={<IconDollar size={20} />} color="green" />
        <KpiCard label="Avg Booking Value" value={`$${formatPrice(avgPrice)}`} icon={<IconChart size={20} />} color="purple" />
        <KpiCard label="Page" value={`${page}/${totalPages || 1}`} icon={<IconSearch size={20} />} color="orange" trend={`${limit} per page`} />
      </div>

      <div className="admin-card">
        <div className="admin-search-bar">
          <IconSearch size={16} />
          <input
            type="text"
            placeholder="Search hotel name, guest email, destination, or user name..."
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
              {s !== 'all' && statusCounts[s] ? <span className="filter-count">{statusCounts[s]}</span> : null}
            </button>
          ))}
        </div>

        <div className="admin-table-info">
          <span>{total} booking{total !== 1 ? 's' : ''} found</span>
          {search && <span className="search-tag">Search: "{search}" <button className="btn-clear-search" onClick={() => { setSearch(''); document.querySelector('.admin-search-bar input').value = ''; }}>x</button></span>}
        </div>

        {loading ? (
          <div className="admin-empty"><div className="admin-spinner" /></div>
        ) : bookings.length === 0 ? (
          <p className="admin-empty">No bookings match your filters.</p>
        ) : viewMode === 'table' ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-bookings-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('hotel_name')}>
                      Hotel {sort === 'hotel_name' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>Account</th>
                    <th>Destination</th>
                    <th className="sortable" onClick={() => handleSort('checkin_date')}>
                      Dates {sort === 'checkin_date' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="sortable th-right" onClick={() => handleSort('original_price')}>
                      Price {sort === 'original_price' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="sortable th-right" onClick={() => handleSort('total_savings')}>
                      Savings {sort === 'total_savings' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>Status</th>
                    <th className="sortable" onClick={() => handleSort('created_at')}>
                      Created {sort === 'created_at' ? (order === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const days = getDaysUntil(b.checkinDate);
                    const nights = getNights(b.checkinDate, b.checkoutDate);
                    const savingsPercent = parseFloat(b.originalPrice) > 0 && parseFloat(b.totalSavings) > 0
                      ? Math.round(parseFloat(b.totalSavings) / parseFloat(b.originalPrice) * 100) : 0;
                    return (
                      <tr key={b.id} className="admin-booking-row" onClick={() => openDetail(b.id)}>
                        <td>
                          <div className="booking-hotel-cell">
                            <span className="booking-hotel-name">{b.hotelName || '-'}</span>
                            {b.roomType && <span className="booking-room-type">{b.roomType}</span>}
                          </div>
                        </td>
                        <td>
                          <div className="booking-account-cell">
                            <span className="booking-user-name">{b.userName || '-'}</span>
                            <span className="booking-user-email">{b.email || '-'}</span>
                            <span className={`plan-badge-sm plan-${b.userPlan || 'free'}`}>{b.userPlan || 'free'}</span>
                          </div>
                        </td>
                        <td className="text-truncate">{b.destination || '-'}</td>
                        <td>
                          <div className="booking-dates-cell">
                            <span>{b.checkinDate ? new Date(b.checkinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}</span>
                            {nights && <span className="booking-nights">{nights}n</span>}
                            {days !== null && <span className={`booking-countdown ${days < 0 ? 'past' : days <= 7 ? 'soon' : ''}`}>
                              {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `in ${days}d`}
                            </span>}
                          </div>
                        </td>
                        <td className="td-right">
                          <span className="booking-price">${formatPrice(b.originalPrice)}</span>
                        </td>
                        <td className="td-right">
                          {parseFloat(b.totalSavings) > 0 ? (
                            <div className="booking-savings-cell">
                              <span className="booking-savings-amount">-${formatPrice(b.totalSavings)}</span>
                              <span className="booking-savings-percent">{savingsPercent}%</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td><BookingStatusBadge status={b.status} /></td>
                        <td className="td-muted">{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}</td>
                      </tr>
                    );
                  })}
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
        ) : (
          /* Card View */
          <>
            <div className="admin-booking-cards">
              {bookings.map(b => {
                const days = getDaysUntil(b.checkinDate);
                const nights = getNights(b.checkinDate, b.checkoutDate);
                const savingsPercent = parseFloat(b.originalPrice) > 0 && parseFloat(b.totalSavings) > 0
                  ? Math.round(parseFloat(b.totalSavings) / parseFloat(b.originalPrice) * 100) : 0;
                return (
                  <div key={b.id} className="booking-card" onClick={() => openDetail(b.id)}>
                    <div className="booking-card-top">
                      <div className="booking-card-hotel">
                        <h4>{b.hotelName || 'Unknown Hotel'}</h4>
                        <span className="booking-card-dest">{b.destination || '-'}</span>
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <div className="booking-card-account">
                      <div className="booking-card-avatar">{(b.userName || b.email || '?')[0].toUpperCase()}</div>
                      <div>
                        <span className="booking-card-user">{b.userName || '-'}</span>
                        <span className="booking-card-email">{b.email}</span>
                      </div>
                      <span className={`plan-badge-sm plan-${b.userPlan || 'free'}`}>{b.userPlan || 'free'}</span>
                    </div>
                    <div className="booking-card-details">
                      <div className="booking-card-detail">
                        <span className="bcd-label">Check-in</span>
                        <span className="bcd-value">{b.checkinDate ? new Date(b.checkinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                      </div>
                      <div className="booking-card-detail">
                        <span className="bcd-label">Nights</span>
                        <span className="bcd-value">{nights || '-'}</span>
                      </div>
                      <div className="booking-card-detail">
                        <span className="bcd-label">Room</span>
                        <span className="bcd-value">{b.roomType || '-'}</span>
                      </div>
                      {days !== null && (
                        <div className="booking-card-detail">
                          <span className="bcd-label">Countdown</span>
                          <span className={`bcd-value ${days < 0 ? 'text-danger' : days <= 7 ? 'text-warning' : ''}`}>
                            {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days} days`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="booking-card-pricing">
                      <div className="booking-card-price">
                        <span className="bcp-label">Paid</span>
                        <span className="bcp-amount">${formatPrice(b.originalPrice)}</span>
                      </div>
                      {parseFloat(b.totalSavings) > 0 && (
                        <div className="booking-card-savings">
                          <span className="bcp-label">Savings</span>
                          <span className="bcp-savings">-${formatPrice(b.totalSavings)} <small>({savingsPercent}%)</small></span>
                        </div>
                      )}
                      {b.bestSource && (
                        <div className="booking-card-source">
                          <span className="bcp-label">Best via</span>
                          <span className="bcp-source">{b.bestSource}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
          <div className="admin-detail-modal admin-detail-wide">
            <div className="admin-detail-header">
              <h3>Booking Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeDetail}><IconX size={18} /></button>
            </div>
            {detailLoading ? (
              <div className="admin-empty"><div className="admin-spinner" /></div>
            ) : detailData ? (
              <div className="admin-detail-body">
                {/* Hotel & Status Summary */}
                <div className="detail-hero">
                  <div className="detail-hero-left">
                    <h2 className="detail-hotel-name">{detailData.booking.hotelName || 'Unknown Hotel'}</h2>
                    <span className="detail-hotel-dest">{detailData.booking.destination || ''}</span>
                  </div>
                  <BookingStatusBadge status={detailData.booking.status} />
                </div>

                {/* Account Info */}
                {detailData.user && (
                  <div className="detail-account-bar">
                    <div className="detail-account-avatar">{(detailData.user.name || detailData.user.email || '?')[0].toUpperCase()}</div>
                    <div className="detail-account-info">
                      <span className="detail-account-name">{detailData.user.name}</span>
                      <span className="detail-account-email">{detailData.user.email}</span>
                    </div>
                    <span className={`plan-badge plan-${detailData.user.plan || 'free'}`}>{detailData.user.plan || 'free'}</span>
                    {detailData.user.joinedAt && <span className="detail-account-joined">Joined {new Date(detailData.user.joinedAt).toLocaleDateString()}</span>}
                  </div>
                )}

                {/* Pricing Cards */}
                <div className="detail-pricing-grid">
                  <div className="detail-price-card">
                    <span className="dpc-label">Original Price</span>
                    <span className="dpc-amount">${formatPrice(detailData.booking.originalPrice)}</span>
                  </div>
                  <div className="detail-price-card detail-price-best">
                    <span className="dpc-label">Best Price Found</span>
                    <span className="dpc-amount">{detailData.booking.bestPrice ? `$${formatPrice(detailData.booking.bestPrice)}` : '-'}</span>
                    {detailData.booking.bestSource && <span className="dpc-source">via {detailData.booking.bestSource}</span>}
                  </div>
                  <div className={`detail-price-card ${parseFloat(detailData.booking.totalSavings) > 0 ? 'detail-price-savings' : ''}`}>
                    <span className="dpc-label">Savings</span>
                    <span className="dpc-amount">{parseFloat(detailData.booking.totalSavings) > 0 ? `-$${formatPrice(detailData.booking.totalSavings)}` : '-'}</span>
                    {parseFloat(detailData.booking.originalPrice) > 0 && parseFloat(detailData.booking.totalSavings) > 0 && (
                      <span className="dpc-percent">{Math.round(parseFloat(detailData.booking.totalSavings) / parseFloat(detailData.booking.originalPrice) * 100)}% off</span>
                    )}
                  </div>
                </div>

                {/* Stay Details */}
                <div className="admin-detail-section">
                  <h4>Stay Details</h4>
                  <div className="detail-info-grid">
                    <div className="detail-info-item">
                      <span className="dii-label">Guest</span>
                      <span className="dii-value">{detailData.booking.guestName || '-'}</span>
                    </div>
                    <div className="detail-info-item">
                      <span className="dii-label">Room Type</span>
                      <span className="dii-value">{detailData.booking.roomType || '-'}</span>
                    </div>
                    <div className="detail-info-item">
                      <span className="dii-label">Check-in</span>
                      <span className="dii-value">{detailData.booking.checkinDate ? new Date(detailData.booking.checkinDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                    </div>
                    <div className="detail-info-item">
                      <span className="dii-label">Check-out</span>
                      <span className="dii-value">{detailData.booking.checkoutDate ? new Date(detailData.booking.checkoutDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                    </div>
                    <div className="detail-info-item">
                      <span className="dii-label">Confirmation #</span>
                      <span className="dii-value dii-mono">{detailData.booking.confirmationNumber || '-'}</span>
                    </div>
                    <div className="detail-info-item">
                      <span className="dii-label">Checks Run</span>
                      <span className="dii-value">{detailData.booking.checkCount || 0}</span>
                    </div>
                    <div className="detail-info-item">
                      <span className="dii-label">Created</span>
                      <span className="dii-value">{detailData.booking.createdAt ? new Date(detailData.booking.createdAt).toLocaleString() : '-'}</span>
                    </div>
                    <div className="detail-info-item">
                      <span className="dii-label">Last Checked</span>
                      <span className="dii-value">{detailData.booking.lastChecked ? new Date(detailData.booking.lastChecked).toLocaleString() : 'Never'}</span>
                    </div>
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
                          <span>${a.offeredPrice || a.savingsAmount || '-'} via {a.foundSource || '-'}</span>
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

                {/* Booking ID */}
                <div className="detail-id-footer">
                  <span>ID: {detailData.booking.id}</span>
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
