import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import { IconBell, IconTrendDown, IconArrowRight, IconHotel } from './Icons';
import './AlertsPage.css';

function AlertsPage() {
  const { authFetch } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await authFetch(`${API}/bookings`);
        if (res.ok) {
          const bookings = await res.json();
          // Flatten all alerts from all bookings
          const allAlerts = [];
          for (const booking of bookings) {
            for (const alert of (booking.alerts || [])) {
              allAlerts.push({ ...alert, bookingId: booking.id, hotelName: booking.hotelName });
            }
          }
          allAlerts.sort((a, b) => new Date(b.date) - new Date(a.date));
          setAlerts(allAlerts);
        }
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      }
      setLoading(false);
    };
    fetchAlerts();
  }, [authFetch]);

  const alertTypeIcon = (type) => {
    if (type === 'price_drop') return <span className="alert-icon alert-icon-drop"><IconTrendDown size={16} /></span>;
    return <span className="alert-icon alert-icon-default"><IconBell size={16} /></span>;
  };

  if (loading) return null;

  return (
    <div className="alerts-page">
      <div className="container">
        <div className="alerts-header">
          <h1>{t('alerts.title')}</h1>
          <p className="alerts-subtitle">
            {t('alerts.subtitle')}
          </p>
        </div>

        {alerts.length === 0 ? (
          <div className="alerts-empty">
            <IconBell size={40} />
            <h3>{t('alerts.noAlerts')}</h3>
            <p>{t('alerts.noAlertsDesc')}</p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert, i) => (
              <div
                key={alert.id || i}
                className={`alert-card ${alert.type === 'price_drop' ? 'alert-drop' : ''}`}
                onClick={() => navigate(`/bookings/${alert.bookingId}`)}
              >
                {alertTypeIcon(alert.type)}
                <div className="alert-content">
                  <div className="alert-hotel">
                    <IconHotel size={14} />
                    <span>{alert.hotelName}</span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  <span className="alert-date">
                    {new Date(alert.date).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <IconArrowRight size={16} className="alert-arrow" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsPage;
