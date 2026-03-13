import { useState } from 'react';
import { useI18n } from '../i18n';
import { IconUser, IconMail, IconArrowLeft, IconCheck, IconCrown, IconStar, IconZap } from './Icons';
import './Account.css';
import { API } from '../api';

const PLANS = [
  { id: 'free', icon: IconZap, bookings: 1, price: 0 },
  { id: 'viajante', icon: IconStar, bookings: 10, price: 25 },
  { id: 'premium', icon: IconCrown, bookings: 50, price: 100 },
];

const PLAN_NAMES = { free: 'Free', viajante: 'Viajante', premium: 'Premium' };

function Account({ currentUser, onLogin, onLogout, onBack }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = mode === 'login' ? `${API}/auth/login` : `${API}/auth/signup`;
      const body = mode === 'login' ? { email } : { email, name };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao processar');
        setLoading(false);
        return;
      }
      onLogin(data);
    } catch (err) {
      setError('Erro de conexao');
    }
    setLoading(false);
  };

  const handleChangePlan = async (planId) => {
    if (!currentUser || planId === currentUser.plan) return;
    try {
      const res = await fetch(`${API}/users/${currentUser.email}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (res.ok) onLogin(data);
    } catch (err) {
      console.error('Failed to change plan:', err);
    }
  };

  // Logged-in view
  if (currentUser) {
    const userPlan = PLANS.find(p => p.id === currentUser.plan) || PLANS[0];
    return (
      <div className="account-page">
        <div className="container">
          <button className="btn btn-ghost back-btn" onClick={onBack}>
            <IconArrowLeft size={16} />
            {t('common.back')}
          </button>

          <div className="account-profile">
            <div className="account-avatar">
              <IconUser size={32} />
            </div>
            <div className="account-info">
              <h1>{t('account.welcome')}, {currentUser.name}</h1>
              <p className="account-email">{currentUser.email}</p>
              <p className="account-since">{t('account.memberSince')} {new Date(currentUser.joinedAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="account-section">
            <h2>{t('account.planUsage')}</h2>
            <div className="account-usage-card">
              <div className="usage-plan-badge">
                <userPlan.icon size={20} />
                <span>{PLAN_NAMES[currentUser.plan]}</span>
              </div>
              <div className="usage-bar-wrap">
                <div className="usage-label">
                  <span>{t('account.bookingsUsed')}</span>
                  <span>{currentUser.bookings} {t('account.of')} {userPlan.bookings} {t('account.thisMonth')}</span>
                </div>
                <div className="usage-bar">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${Math.min(100, (currentUser.bookings / userPlan.bookings) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="account-section">
            <h2>{t('account.changePlan')}</h2>
            <div className="account-plans-grid">
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`account-plan-card ${currentUser.plan === plan.id ? 'current' : ''}`}
                >
                  <div className="apc-header">
                    <plan.icon size={24} />
                    <span className="apc-name">{PLAN_NAMES[plan.id]}</span>
                  </div>
                  <div className="apc-price">
                    {plan.price === 0 ? (
                      <span className="apc-amount">{t('pricing.free')}</span>
                    ) : (
                      <>
                        <span className="apc-currency">R$</span>
                        <span className="apc-amount">{plan.price}</span>
                        <span className="apc-period">{t('pricing.month')}</span>
                      </>
                    )}
                  </div>
                  <p className="apc-bookings">{plan.bookings} {t('pricing.bookings')}</p>
                  {currentUser.plan === plan.id ? (
                    <button className="btn btn-outline btn-sm" disabled>
                      <IconCheck size={14} />
                      {t('pricing.currentPlan')}
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => handleChangePlan(plan.id)}>
                      {t('account.selectPlan')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-ghost logout-btn" onClick={onLogout}>
            {t('account.logout')}
          </button>
        </div>
      </div>
    );
  }

  // Logged-out view
  return (
    <div className="account-page">
      <div className="container">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          <IconArrowLeft size={16} />
          {t('common.back')}
        </button>

        <div className="account-auth-card">
          <h1>{mode === 'login' ? t('account.loginTitle') : t('account.signupTitle')}</h1>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">{t('account.name')}</label>
                <input
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Joao Silva"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{t('account.email')}</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </div>
            {error && <p className="account-error">{error}</p>}
            <button className="btn btn-accent btn-lg account-submit" type="submit" disabled={loading}>
              {mode === 'login' ? t('account.login') : t('account.signup')}
            </button>
          </form>

          <p className="account-toggle">
            {mode === 'login' ? t('account.noAccount') : t('account.hasAccount')}{' '}
            <button className="account-link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
              {mode === 'login' ? t('account.signup') : t('account.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Account;
