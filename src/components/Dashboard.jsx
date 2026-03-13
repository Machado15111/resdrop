import { IconHotel, IconPlus, IconRefresh, IconArrowRight, IconTrendDown, IconShield, IconBarChart, IconDollar } from './Icons';
import { useI18n } from '../i18n';
import './Dashboard.css';

function Dashboard({ bookings, onSelect, onRefresh, stats, onNewBooking, currentUser, bookingStates = {} }) {
  const { t, lang } = useI18n();
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
      day: 'numeric', month: 'short',
    });
  };

  const getNights = (checkin, checkout) => {
    return Math.ceil((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
  };

  const now = new Date();
  const active = bookings.filter(b => new Date(b.checkoutDate) >= now);
  const past = bookings.filter(b => new Date(b.checkoutDate) < now);
  const firstName = currentUser?.name?.split(' ')[0] || '';

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Welcome */}
        <div className="dash-welcome">
          <div>
            <h1 className="dash-greeting">
              {lang === 'pt' ? `Ola, ${firstName}` : `Hello, ${firstName}`}
            </h1>
            <p className="dash-greeting-sub">
              {lang === 'pt'
                ? 'Acompanhe suas reservas e economias em um so lugar.'
                : 'Track your bookings and savings in one place.'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={onNewBooking}>
            <IconPlus size={18} />
            {t('dash.addBooking')}
          </button>
        </div>

        {/* Stats cards */}
        <div className="dash-kpis">
          <div className="dash-kpi">
            <div className="dash-kpi-icon kpi-blue"><IconBarChart size={20} /></div>
            <div className="dash-kpi-data">
              <span className="dash-kpi-value">{stats?.totalBookings || 0}</span>
              <span className="dash-kpi-label">{lang === 'pt' ? 'Reservas' : 'Bookings'}</span>
            </div>
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-icon kpi-green"><IconDollar size={20} /></div>
            <div className="dash-kpi-data">
              <span className="dash-kpi-value accent">R${(stats?.totalSavings || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
              <span className="dash-kpi-label">{lang === 'pt' ? 'Economia total' : 'Total savings'}</span>
            </div>
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-icon kpi-gold"><IconTrendDown size={20} /></div>
            <div className="dash-kpi-data">
              <span className="dash-kpi-value">{stats?.savingsFound || 0}</span>
              <span className="dash-kpi-label">{lang === 'pt' ? 'Quedas encontradas' : 'Drops found'}</span>
            </div>
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-icon kpi-purple"><IconShield size={20} /></div>
            <div className="dash-kpi-data">
              <span className="dash-kpi-value">{stats?.successRate || 0}%</span>
              <span className="dash-kpi-label">{lang === 'pt' ? 'Taxa de sucesso' : 'Success rate'}</span>
            </div>
          </div>
        </div>

        {/* Active bookings */}
        <div className="dash-section">
          <h2 className="dash-section-title">
            {lang === 'pt' ? 'Reservas ativas' : 'Active bookings'}
            {active.length > 0 && <span className="dash-count">{active.length}</span>}
          </h2>

          {active.length === 0 ? (
            <div className="dash-empty">
              <IconHotel size={40} />
              <h3>{t('dash.noBookings')}</h3>
              <p>{t('dash.noBookingsDesc')}</p>
              <button className="btn btn-primary" onClick={onNewBooking}>
                {t('dash.addFirst')}
              </button>
            </div>
          ) : (
            <div className="dash-bookings-list">
              {active.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onSelect={onSelect}
                  onRefresh={onRefresh}
                  formatDate={formatDate}
                  getNights={getNights}
                  t={t}
                  lang={lang}
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
              {lang === 'pt' ? 'Historico' : 'History'}
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

function BookingCard({ booking, onSelect, onRefresh, formatDate, getNights, t, lang, isPast, bookingState }) {
  const statusMap = {
    savings_found: { label: lang === 'pt' ? 'Economia encontrada' : 'Savings found', cls: 'status-success' },
    monitoring: { label: lang === 'pt' ? 'Monitorando' : 'Monitoring', cls: 'status-info' },
    booked: { label: lang === 'pt' ? 'Re-reservado' : 'Rebooked', cls: 'status-accent' },
    expired: { label: lang === 'pt' ? 'Expirado' : 'Expired', cls: 'status-muted' },
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
          <span className="dbc-price-label">{lang === 'pt' ? 'Preco original' : 'Original price'}</span>
          <span className="dbc-price">R${booking.originalPrice.toLocaleString('pt-BR')}</span>
        </div>
        {booking.status === 'savings_found' && booking.bestPrice && booking.totalSavings > 0 ? (
          <div className="dbc-savings-info">
            <div className="dbc-best">
              <span className="dbc-price-label">{t('dash.bestFound')}</span>
              <span className="dbc-price accent">R${booking.bestPrice.toLocaleString('pt-BR')}</span>
            </div>
            <span className="badge badge-success">{t('common.save')} R${booking.totalSavings.toFixed(0)}</span>
          </div>
        ) : (
          <span className="badge badge-info">{t('dash.monitoringStatus')}</span>
        )}
      </div>

      <div className="dbc-actions">
        {!isPast && (
          <button
            className={`btn btn-sm ${isSuccess ? 'btn-success-state' : isError ? 'btn-error-state' : 'btn-ghost'}`}
            onClick={(e) => { e.stopPropagation(); onRefresh(booking.id); }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-pulse">{lang === 'pt' ? 'Buscando...' : 'Checking...'}</span>
            ) : isSuccess ? (
              <span>&#10003;</span>
            ) : isError ? (
              <span>&#10007;</span>
            ) : (
              <><IconRefresh size={14} /> {t('dash.refresh')}</>
            )}
          </button>
        )}
        <button className="btn btn-outline btn-sm">
          {t('dash.viewDetails')} <IconArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
