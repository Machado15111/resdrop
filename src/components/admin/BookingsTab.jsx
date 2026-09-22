/**
 * BookingsTab — moved verbatim out of AdminDashboard.jsx (was one 1,565-line file).
 */
import { useState, useCallback, useRef } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { IconChart, IconCheck, IconDollar, IconHotel, IconMail, IconSearch, IconTrash, IconX } from '../Icons';
import { KpiCard, BookingStatusBadge } from './SharedUI';
import { API } from '../../api';

function BookingsTab({ authFetch }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [emailForm, setEmailForm] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const searchTimer = useRef(null);
  const limit = 50;

  const loadBookings = useCallback(async (signal) => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('search', search);
    params.set('sort', sort);
    params.set('order', order);
    params.set('page', page);
    params.set('limit', limit);
    const res = await authFetch(`${API}/admin/bookings?${params}`, { signal });
    const data = await res.json();
    return { bookings: data.bookings || [], total: data.total || 0 };
  }, [authFetch, statusFilter, search, sort, order, page]);

  // Each keystroke in the search box used to leave its request running, so the
  // table settled on whichever answer came back last. The hook aborts the
  // previous one and ignores any late reply.
  const { data: { bookings, total }, loading, reload: fetchBookings } =
    useAsyncData(loadBookings, { initialData: { bookings: [], total: 0 } });

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

export default BookingsTab;
