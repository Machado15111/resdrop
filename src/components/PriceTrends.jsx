import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import './PriceTrends.css';

/**
 * Compact "Price Trends" (Tendência de preços) panel.
 * - Free users: shown locked; NEVER calls the API.
 * - Paid users: on demand, calls the server (which enforces all quotas).
 * The server owns entitlement, caching and the global cost cap.
 */
export default function PriceTrends({ hotelIds = [], checkin, checkout, currency = 'USD' }) {
  const { user, authFetch } = useAuth();
  const { lang } = useI18n();
  const pt = lang === 'pt';
  const [state, setState] = useState({ status: 'idle' });

  const isPaid = user?.plan && user.plan !== 'free';
  const disclaimer = pt
    ? 'As tendências representam dados agregados de mercado e podem não corresponder a uma tarifa disponível para reserva.'
    : 'Price trends represent aggregated market data and may not match a currently bookable rate.';

  const load = async () => {
    if (!isPaid || !hotelIds.length) return;
    setState({ status: 'loading' });
    try {
      const res = await authFetch(`${API}/price-trends`, {
        method: 'POST',
        body: JSON.stringify({ hotelIds, checkin, checkout, currency }),
      });
      const json = await res.json();
      if (res.ok) setState({ status: json.status, data: json.data, views: json.userViews, cap: json.cap });
      else setState({ status: json.status || 'error', message: pt ? json.message?.pt : json.message?.en });
    } catch {
      setState({ status: 'error', message: pt ? 'Não foi possível carregar agora.' : 'Could not load right now.' });
    }
  };

  return (
    <div className="pt-card">
      <div className="pt-card__head">
        <span className="pt-card__title">{pt ? 'Tendência de preços' : 'Price Trends'}</span>
        {isPaid && <span className="pt-card__badge">{pt ? 'Plano pago' : 'Paid plan'}</span>}
      </div>

      {!isPaid && (
        <div className="pt-locked">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>{pt ? 'Recurso dos planos pagos. Faça upgrade para ver tendências de mercado.' : 'A paid-plan feature. Upgrade to see market trends.'}</span>
        </div>
      )}

      {isPaid && state.status === 'idle' && (
        <button className="pt-btn" onClick={load} disabled={!hotelIds.length}>
          {pt ? 'Ver tendência' : 'View trends'}
        </button>
      )}

      {state.status === 'loading' && <div className="pt-muted">{pt ? 'Carregando…' : 'Loading…'}</div>}

      {(state.status === 'ok' || state.status === 'cached') && (
        <div className="pt-result">
          <div className="pt-result__data">
            {(Array.isArray(state.data) ? state.data : state.data?.data || []).slice(0, 5).map((row, i) => (
              <div key={i} className="pt-row">
                <span>{row.hotelId || row.id || `#${i + 1}`}</span>
                <span>{row.averagePrice ?? row.priceAverage ?? row.avg ?? '—'}</span>
              </div>
            ))}
          </div>
          {state.cap != null && <div className="pt-muted pt-muted--sm">{pt ? `Visualizações no mês: ${state.views}/${state.cap}` : `Views this month: ${state.views}/${state.cap}`}</div>}
        </div>
      )}

      {['disabled', 'user_quota', 'global_quota', 'error'].includes(state.status) && (
        <div className="pt-notice">{state.message || disclaimer}</div>
      )}

      <p className="pt-disclaimer">{disclaimer}</p>
    </div>
  );
}
