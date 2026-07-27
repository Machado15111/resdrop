import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import { pushSupported, getPushState, subscribePush, unsubscribePush } from '../push';
import './PushToggle.css';

/**
 * "Price-drop alerts" toggle (Web Push). Renders nothing at all unless push is
 * both supported by the device AND configured on the server (VAPID keys set), so
 * it stays invisible until the backend is ready.
 */
export default function PushToggle() {
  const { authFetch } = useAuth();
  const { lang } = useI18n();
  const pt = lang === 'pt';
  const [vapid, setVapid] = useState(null);
  const [state, setState] = useState('loading'); // loading|unsupported|denied|default|subscribed|unavailable
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) { if (!cancelled) setState('unsupported'); return; }
      try {
        const cfg = await fetch(`${API}/config`).then(r => r.json());
        if (cancelled) return;
        if (!cfg.pushEnabled || !cfg.vapidPublicKey) { setState('unavailable'); return; }
        setVapid(cfg.vapidPublicKey);
        setState(await getPushState());
      } catch {
        if (!cancelled) setState('unavailable');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Hide entirely when push can't work here (server not configured, or SSR-ish).
  if (state === 'loading' || state === 'unavailable') return null;

  const enable = async () => {
    setBusy(true);
    const ok = await subscribePush(vapid, authFetch);
    setState(ok ? 'subscribed' : (Notification.permission === 'denied' ? 'denied' : 'default'));
    setBusy(false);
  };
  const disable = async () => {
    setBusy(true);
    await unsubscribePush(authFetch);
    setState('default');
    setBusy(false);
  };

  return (
    <div className="account-section">
      <h2>{pt ? 'Notificações' : 'Notifications'}</h2>
      <div className="push-toggle">
        <div className="push-toggle-info">
          <strong>{pt ? 'Alertas de queda de preço' : 'Price-drop alerts'}</strong>
          <span>{pt ? 'Receba uma notificação assim que o preço cair.' : 'Get a notification the moment a price drops.'}</span>
        </div>
        <div className="push-toggle-action">
          {state === 'unsupported' && <span className="push-muted">{pt ? 'Não suportado neste dispositivo' : 'Not supported here'}</span>}
          {state === 'denied' && <span className="push-muted">{pt ? 'Bloqueado nas permissões' : 'Blocked in settings'}</span>}
          {state === 'default' && (
            <button className="btn btn-primary btn-sm" onClick={enable} disabled={busy}>
              {busy ? '…' : (pt ? 'Ativar' : 'Enable')}
            </button>
          )}
          {state === 'subscribed' && (
            <button className="btn btn-ghost btn-sm" onClick={disable} disabled={busy}>
              {busy ? '…' : (pt ? 'Desativar' : 'Disable')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
