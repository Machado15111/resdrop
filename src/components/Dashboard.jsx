import { useState, useMemo } from 'react';
import { IconHotel, IconPlus, IconRefresh, IconArrowRight, IconTrendDown, IconBarChart, IconDollar, IconSearch, IconUpload, IconExternalLink, IconClock } from './Icons';
import { useI18n } from '../i18n';
import './Dashboard.css';

const CURRENCY_SYMBOLS = { BRL: 'R$', USD: '$', EUR: '€', GBP: '£' };

function formatCurrency(amount, currencyCode) {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode || 'R$';
  const locale = currencyCode === 'BRL' ? 'pt-BR' : 'en-US';
  return `${symbol}${Number(amount).toLocaleString(locale, { minimumFractionDigits: 0 })}`;
}

function Dashboard({ bookings, onSelect, onRefresh, stats, onNewBooking, onViewAnalytics, onExport, onImport, onArchive, currentUser, bookingStates = {} }) {
  const { t, lang } = useI18n();
  const currency = currentUser?.currency || 'BRL';
  const fmt = (amount) => formatCurrency(amount, currency);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
      day: 'numeric', month: 'short',
    });
  };

  const getNights = (checkin, checkout) => {
    return Math.ceil((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
  };

  const now = new Date();
  const firstName = currentUser?.name?.split(' ')[0] || '';

  // Deadline alerts: bookings with a cancellationDeadline within 72h
  const deadlineAlerts = useMemo(() => {
    return bookings
      .filter(b => {
        if (!b.cancellationDeadline || b.status === 'archived') return false;
        const dl = new Date(b.cancellationDeadline);
        const hours = (dl - now) / (1000 * 60 * 60);
        return hours > 0 && hours <= 72;
      })
      .map(b => ({ ...b, hoursLeft: Math.round((new Date(b.cancellationDeadline) - now) / (1000 * 60 * 60)) }))
      .sort((a, b) => a.hoursLeft - b.hoursLeft);
  }, [bookings]);

  // Apply search + status filter
  const filtered = useMemo(() => {
    let list = bookings.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(b =>
        (b.hotelName || '').toLowerCase().includes(q) ||
        (b.destination || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'archived') {
      list = list.filter(b => b.status === 'archived');
    } else {
      list = list.filter(b => b.status !== 'archived');
      if (statusFilter === 'monitoring') {
        list = list.filter(b => ['monitoring', 'received', 'processing'].includes(b.status));
      } else if (statusFilter === 'savings') {
        list = list.filter(b => ['savings_found', 'lower_fare_found', 'confirmed_savings'].includes(b.status));
      } else if (statusFilter === 'needs_review') {
        list = list.filter(b => b.status === 'needs_review');
      }
    }
    if (sortBy === 'savings') {
      list.sort((a, b) => (b.potentialSavings || b.totalSavings || 0) - (a.potentialSavings || a.totalSavings || 0));
    } else if (sortBy === 'checkin') {
      list.sort((a, b) => new Date(a.checkinDate) - new Date(b.checkinDate));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [bookings, search, statusFilter, sortBy]);

  const active = filtered.filter(b => new Date(b.checkoutDate) >= now);
  const past = filtered.filter(b => new Date(b.checkoutDate) < now);
  const hasFilters = search.trim() || statusFilter !== 'all';

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Welcome */}
        <div className="dash-welcome">
          <div>
            <h1 className="dash-greeting">
              {t('dash.greeting')}, {firstName}
            </h1>
            <p className="dash-greeting-sub">
              {t('dash.greetingSub')}
            </p>
          </div>
          <div className="dash-welcome-actions">
            <button className="btn-primary" onClick={onNewBooking}>
              <IconPlus size={18} />
              {t('dash.addBooking')}
            </button>
            {onViewAnalytics && (
              <button className="btn-secondary" onClick={onViewAnalytics}>
                <IconBarChart size={18} />
                Analytics
              </button>
            )}
          </div>
        </div>

        {/* Deadline alerts banner */}
        {deadlineAlerts.length > 0 && (
          <div className="dash-deadline-banner">
            <div className="ddb-icon"><IconClock size={20} /></div>
            <div className="ddb-body">
              <div className="ddb-title">
                {t('dash.deadlineTitle')}
                <span className="ddb-count">{deadlineAlerts.length}</span>
              </div>
              <div className="ddb-list">
                {deadlineAlerts.slice(0, 3).map(b => (
                  <button key={b.id} className="ddb-item" onClick={() => onSelect(b)}>
                    <span className="ddb-hotel">{b.hotelName}</span>
                    <span className="ddb-hours">{t('dash.deadlineHours').replace('{h}', b.hoursLeft)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar: search, filter, sort, export, import */}
        <div className="dash-toolbar">
          <div className="dash-search">
            <IconSearch size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dash.searchPlaceholder')}
            />
          </div>
          <select className="dash-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t('dash.filterAll')}</option>
            <option value="monitoring">{t('dash.filterMonitoring')}</option>
            <option value="savings">{t('dash.filterSavings')}</option>
            <option value="needs_review">{t('dash.filterNeedsReview')}</option>
            <option value="archived">{t('dash.filterArchived')}</option>
          </select>
          <select className="dash-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">{t('dash.sortRecent')}</option>
            <option value="savings">{t('dash.sortSavings')}</option>
            <option value="checkin">{t('dash.sortCheckin')}</option>
          </select>
          <div className="dash-toolbar-spacer" />
          {onImport && (
            <button className="dash-tool-btn" onClick={onImport}>
              <IconUpload size={15} /> {t('dash.import')}
            </button>
          )}
          {onExport && (
            <div className="dash-export-wrap">
              <button className="dash-tool-btn" onClick={() => onExport('csv')}>
                <IconExternalLink size={15} /> {t('dash.exportCsv')}
              </button>
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div className="dash-kpis">
          <div className="dash-kpi">
            <div className="dash-kpi-icon kpi-blue"><IconBarChart size={20} /></div>
            <div className="dash-kpi-data">
              <span className="dash-kpi-value">{stats?.totalBookings || 0}</span>
              <span className="dash-kpi-label">{t('dash.bookings')}</span>
            </div>
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-icon kpi-gold"><IconDollar size={20} /></div>
            <div className="dash-kpi-data">
              <span className="dash-kpi-value gold">{fmt(stats?.potentialSavings || 0)}</span>
              <span className="dash-kpi-label">{t('dash.potentialSavings')}</span>
            </div>
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-icon kpi-green"><IconDollar size={20} /></div>
            <div className="dash-kpi-data">
              <span className="dash-kpi-value accent">{fmt(stats?.totalSavings || 0)}</span>
              <span className="dash-kpi-label">{t('dash.confirmedSavings')}</span>
            </div>
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-icon kpi-purple"><IconTrendDown size={20} /></div>
            <div className="dash-kpi-data">
              <span className="dash-kpi-value">{stats?.savingsFound || 0}</span>
              <span className="dash-kpi-label">{t('dash.dropsFound')}</span>
            </div>
          </div>
        </div>

        {/* Active bookings */}
        <div className="dash-section">
          <h2 className="dash-section-title">
            {t('dash.activeBookings')}
            {active.length > 0 && <span className="dash-count">{active.length}</span>}
          </h2>

          {active.length === 0 ? (
            hasFilters ? (
              <div className="dash-empty dash-empty--filtered">
                <p>{t('dash.noResults')}</p>
                <button className="btn-outline" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                  {t('dash.clearFilters')}
                </button>
              </div>
            ) : (
              <div className="dash-empty">
                <div className="empty-icon-wrap">
                  <IconHotel size={32} />
                </div>
                <h3>{t('dash.noBookings')}</h3>
                <p>{t('dash.noBookingsDesc')}</p>
                <button className="btn-primary" onClick={onNewBooking}>
                  {t('dash.addFirst')}
                </button>
              </div>
            )
          ) : (
            <div className="dash-bookings-list">
              {active.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onSelect={onSelect}
                  onRefresh={onRefresh}
                  onArchive={onArchive}
                  formatDate={formatDate}
                  getNights={getNights}
                  t={t}
                  lang={lang}
                  fmt={fmt}
                  bookingState={bookingStates[booking.id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Past bookings */}
        {past.length > 0 && (
          <div className="dash-section">
            <h2 className="dash-section-title">
              {t('dash.history')}
              <span className="dash-count">{past.length}</span>
            </h2>
            <div className="dash-bookings-list past">
              {past.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onSelect={onSelect}
                  onRefresh={onRefresh}
                  formatDate={formatDate}
                  getNights={getNights}
                  t={t}
                  lang={lang}
                  fmt={fmt}
                  isPast
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking, onSelect, onRefresh, onArchive, formatDate, getNights, t, lang, fmt, isPast, bookingState }) {
  const statusMap = {
    received: { label: t('dash.received'), cls: 'status-pending' },
    processing: { label: t('dash.processing'), cls: 'status-pending' },
    needs_review: { label: t('dash.needsReview'), cls: 'status-warning' },
    savings_found: { label: t('dash.savingsFound'), cls: 'status-success' },
    lower_fare_found: { label: t('savings.lowerFareFound'), cls: 'status-success' },
    confirmed_savings: { label: t('savings.confirmedBadge'), cls: 'status-confirmed' },
    dismissed: { label: t('savings.dismissedBadge'), cls: 'status-muted' },
    monitoring: { label: t('dash.monitoring'), cls: 'status-info' },
    booked: { label: t('detail.rebooked'), cls: 'status-accent' },
    expired: { label: t('detail.expired'), cls: 'status-muted' },
  };
  const st = statusMap[booking.status] || statusMap.monitoring;
  const isLoading = bookingState?.state === 'loading';
  const isSuccess = bookingState?.state === 'success';
  const isError = bookingState?.state === 'error';

  return (
    <div className={`dash-booking-card ${isPast ? 'past-card' : ''}`} onClick={() => onSelect(booking)}>
      <div className="dbc-main">
        <div className="dbc-hotel-icon"><IconHotel size={22} /></div>
        <div className="dbc-info">
          <div className="dbc-hotel-name">{booking.hotelName}</div>
          <div className="dbc-details">
            <span>{booking.destination}</span>
            <span className="dbc-dot">&middot;</span>
            <span>{formatDate(booking.checkinDate)} &mdash; {formatDate(booking.checkoutDate)}</span>
            <span className="dbc-dot">&middot;</span>
            <span>{getNights(booking.checkinDate, booking.checkoutDate)} {t('common.nights')}</span>
          </div>
          <div className="dbc-meta">
            <span className="dbc-room">{booking.roomType}</span>
            <span className={`dbc-status-badge ${st.cls}`}>{st.label}</span>
          </div>
        </div>
      </div>

      <div className="dbc-pricing">
        <div className="dbc-original">
          <span className="dbc-price-label">{t('dash.originalPrice')}</span>
          <span className="dbc-price">{fmt ? fmt(booking.originalPrice) : `R$${booking.originalPrice.toLocaleString('pt-BR')}`}</span>
        </div>
        {(booking.status === 'savings_found' || booking.status === 'lower_fare_found') && booking.bestPrice && (booking.potentialSavings > 0 || booking.totalSavings > 0) ? (
          <div className="dbc-savings-info">
            <div className="dbc-best">
              <span className="dbc-price-label">{t('dash.bestFound')}</span>
              <span className="dbc-price accent">{fmt ? fmt(booking.bestPrice) : `R$${booking.bestPrice.toLocaleString('pt-BR')}`}</span>
            </div>
            <span className="badge badge-success">{t('dash.lowerRateFound')} {fmt ? fmt(booking.potentialSavings || booking.totalSavings) : `R$${(booking.potentialSavings || booking.totalSavings).toFixed(0)}`}</span>
          </div>
        ) : booking.status === 'confirmed_savings' && booking.totalSavings > 0 ? (
          <div className="dbc-savings-info">
            <span className="badge badge-confirmed">{t('savings.confirmedBadge')} {fmt ? fmt(booking.totalSavings) : `R$${booking.totalSavings.toFixed(0)}`}</span>
          </div>
        ) : (
          <div className="dbc-monitoring-active">
            <span className="badge badge-info">{t('dash.monitoringActive')}</span>
            {booking.lastChecked && (
              <span className="dbc-last-check">{t('dash.lastCheck')} {new Date(booking.lastChecked).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
        )}
      </div>

      <div className="dbc-actions">
        {!isPast && (
          <button
            className={`btn-ghost ${isSuccess ? 'btn-success-state' : isError ? 'btn-error-state' : ''}`}
            onClick={(e) => { e.stopPropagation(); onRefresh(booking.id); }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-pulse">{t('dash.checking')}</span>
            ) : isSuccess ? (
              <span>&#10003;</span>
            ) : isError ? (
              <span>&#10007;</span>
            ) : (
              <><IconRefresh size={14} /> {t('dash.refresh')}</>
            )}
          </button>
        )}
        <button className="btn-outline">
          {t('dash.viewDetails')} <IconArrowRight size={14} />
        </button>
        {onArchive && (
          <button
            className="btn-archive"
            onClick={(e) => { e.stopPropagation(); onArchive(booking); }}
            title={booking.status === 'archived' ? t('dash.unarchive') : t('dash.archive')}
          >
            {booking.status === 'archived' ? t('dash.unarchive') : t('dash.archive')}
          </button>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
