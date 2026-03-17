import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { IconMail, IconLock } from './Icons';
import { API } from '../api';
import './Account.css';

function Login() {
  const { t, lang } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError(t('login.enterEmail'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setForgotSent(true);
    } catch {
      setError(t('login.connectionError'));
    }
    setLoading(false);
  };

  if (forgotMode) {
    return (
      <div className="account-page">
        <div className="container">
          <div className="account-auth-card">
            <h1>{t('account.forgotPassword')}</h1>

            {forgotSent ? (
              <div className="forgot-success">
                <p>{t('login.emailSent')}</p>
                <button className="btn btn-primary btn-lg account-submit" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
                  {t('login.backToLogin')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
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
                  {t('login.send')}
                </button>
                <p className="account-toggle">
                  <button className="account-link" type="button" onClick={() => setForgotMode(false)}>
                    {t('login.backToLogin')}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="container">
        <div className="account-auth-card">
          <h1>{t('account.loginTitle')}</h1>

          <form onSubmit={handleSubmit}>
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
            <div className="form-group">
              <label className="form-label">{t('login.password')}</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                required
                minLength={6}
              />
            </div>
            <div className="forgot-link-wrap">
              <button className="account-link" type="button" onClick={() => setForgotMode(true)}>
                {t('login.forgotPassword')}
              </button>
            </div>
            {error && <p className="account-error">{error}</p>}
            <button className="btn btn-accent btn-lg account-submit" type="submit" disabled={loading}>
              {loading ? '...' : t('account.login')}
            </button>
          </form>

          <p className="account-toggle">
            {t('account.noAccount')}{' '}
            <Link to="/signup" className="account-link">{t('account.signup')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
