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
            <div className="auth-icon-wrap">
              <IconMail size={24} />
            </div>
            <h1>{t('account.forgotPassword')}</h1>
            <p className="auth-subtitle">
              {lang === 'pt'
                ? 'Digite seu e-mail e enviaremos um link para redefinir sua senha.'
                : 'Enter your email and we\'ll send you a link to reset your password.'}
            </p>

            {forgotSent ? (
              <div className="forgot-success">
                <div className="success-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p>{t('login.emailSent')}</p>
                <button className="account-submit" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
                  {t('login.backToLogin')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label className="form-label">{t('account.email')}</label>
                  <div className="input-wrap">
                    <span className="input-icon"><IconMail size={18} /></span>
                    <input
                      className="form-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      required
                    />
                  </div>
                </div>
                {error && <p className="account-error">{error}</p>}
                <button className="account-submit gold" type="submit" disabled={loading}>
                  {loading ? 'Aguarde...' : t('login.send')}
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
          <div className="auth-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h1>{t('account.loginTitle')}</h1>
          <p className="auth-subtitle">
            {lang === 'pt'
              ? 'Bem-vindo de volta. Acesse sua conta.'
              : 'Welcome back. Sign in to your account.'}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('account.email')}</label>
              <div className="input-wrap">
                <span className="input-icon"><IconMail size={18} /></span>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('login.password')}</label>
              <div className="input-wrap">
                <span className="input-icon"><IconLock size={18} /></span>
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
            </div>
            <div className="forgot-link-wrap">
              <button className="account-link" type="button" onClick={() => setForgotMode(true)}>
                {t('login.forgotPassword')}
              </button>
            </div>
            {error && <p className="account-error">{error}</p>}
            <button className="account-submit" type="submit" disabled={loading}>
              {loading ? 'Aguarde...' : t('account.login')}
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
