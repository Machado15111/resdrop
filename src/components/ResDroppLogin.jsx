import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import './ResDroppLogin.css';

function IcLogo() {
  return (
    <img src="/resdrop-logo.png" alt="" width={26} height={26}
      style={{ display: 'block', objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
  );
}

function IcEye({ visible }) {
  return visible ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function ResDroppLogin() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang, setLang } = useI18n();
  const pt = lang === 'pt';

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const reviewImportParam = searchParams.get('reviewImport');
  const tokenParam = searchParams.get('token');

  const handleLogin = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);

      if (tokenParam) {
        try {
          const authToken = localStorage.getItem('token');
          const attachRes = await fetch(`${API}/inbound/pending-import/attach`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ token: tokenParam }),
          });
          if (attachRes.ok) {
            const attachData = await attachRes.json();
            if (attachData.importId) {
              navigate(`/dashboard?reviewImport=${attachData.importId}`, { replace: true });
              setLoading(false);
              return;
            }
          }
        } catch (attachErr) {
          console.error('Failed attaching token on login:', attachErr);
        }
      }

      if (reviewImportParam) {
        navigate(`/dashboard?reviewImport=${reviewImportParam}`, { replace: true });
        setLoading(false);
        return;
      }

      navigate(user.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.message || (pt ? 'E-mail ou senha incorretos.' : 'Incorrect email or password.'));
    }
    setLoading(false);
  };

  const handleForgot = async e => {
    e.preventDefault();
    if (!email) { setError(pt ? 'Digite seu e-mail primeiro.' : 'Please enter your email address first.'); return; }
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
      setError(pt ? 'Erro de conexão. Tente novamente.' : 'Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="rdpl">
      {/* Minimal nav */}
      <nav className="rdpl-nav">
        <div className="rdpl-nav__inner">
          <Link to="/" className="rdpl-nav__logo">
            <IcLogo />
            <span>ResDrop</span>
          </Link>
          <div className="rdpl-nav__right">
            <div className="rdpl-lang" role="group" aria-label={pt ? 'Idioma' : 'Language'}>
              <button
                className={`rdpl-lang__opt${!pt ? ' rdpl-lang__opt--active' : ''}`}
                onClick={() => setLang('en')}
                aria-pressed={!pt}
              >EN</button>
              <button
                className={`rdpl-lang__opt${pt ? ' rdpl-lang__opt--active' : ''}`}
                onClick={() => setLang('pt')}
                aria-pressed={pt}
              >PT</button>
            </div>
            <span className="rdpl-nav__hint">{pt ? 'Novo no ResDrop?' : 'New to ResDrop?'}</span>
            <Link to="/signup" className="rdpl-nav__signup">{pt ? 'Criar conta' : 'Create account'}</Link>
          </div>
        </div>
      </nav>

      {/* Card */}
      <main className="rdpl-main">
        <div className="rdpl-card">

          {forgotMode ? (
            <>
              <div className="rdpl-card__hd">
                <h1 className="rdpl-card__title">{pt ? 'Redefinir sua senha' : 'Reset your password'}</h1>
                <p className="rdpl-card__sub">
                  {pt ? 'Digite seu e-mail e enviaremos um link de redefinição.' : 'Enter your email and we will send you a reset link.'}
                </p>
              </div>

              {forgotSent ? (
                <div className="rdpl-success">
                  <div className="rdpl-success__icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p className="rdpl-success__msg">
                    {pt ? 'Se esse endereço estiver no nosso sistema, você receberá um e-mail em breve.' : 'If that address is in our system, you will receive an email shortly.'}
                  </p>
                  <button
                    className="rdpl-link rdpl-link--block"
                    onClick={() => { setForgotMode(false); setForgotSent(false); }}
                  >
                    {pt ? '← Voltar ao login' : '← Back to sign in'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} noValidate>
                  <div className="rdpl-field">
                    <label className="rdpl-label">{pt ? 'E-mail' : 'Email'}</label>
                    <input
                      className="rdpl-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={pt ? 'voce@exemplo.com' : 'you@example.com'}
                      autoComplete="email"
                      required
                    />
                  </div>
                  {error && <p className="rdpl-error">{error}</p>}
                  <button className="rdpl-submit" type="submit" disabled={loading}>
                    {loading ? (pt ? 'Enviando…' : 'Sending…') : (pt ? 'Enviar link de redefinição' : 'Send reset link')}
                  </button>
                  <p className="rdpl-toggle">
                    <button className="rdpl-link" type="button" onClick={() => setForgotMode(false)}>
                      {pt ? '← Voltar ao login' : '← Back to sign in'}
                    </button>
                  </p>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="rdpl-card__hd">
                <h1 className="rdpl-card__title">{pt ? 'Bem-vindo de volta.' : 'Welcome back.'}</h1>
                <p className="rdpl-card__sub">
                  {pt ? 'Entre para ver suas reservas monitoradas e alertas.' : 'Sign in to see your tracked bookings and alerts.'}
                </p>
              </div>

              <form onSubmit={handleLogin} noValidate>
                <div className="rdpl-field">
                  <label className="rdpl-label">{pt ? 'E-mail' : 'Email'}</label>
                  <input
                    className="rdpl-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={pt ? 'voce@exemplo.com' : 'you@example.com'}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="rdpl-field">
                  <div className="rdpl-label-row">
                    <label className="rdpl-label">{pt ? 'Senha' : 'Password'}</label>
                    <button
                      type="button"
                      className="rdpl-link rdpl-link--sm"
                      onClick={() => setForgotMode(true)}
                    >
                      {pt ? 'Esqueceu a senha?' : 'Forgot password?'}
                    </button>
                  </div>
                  <div className="rdpl-pass-wrap">
                    <input
                      className="rdpl-input rdpl-input--pass"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={pt ? 'Sua senha' : 'Your password'}
                      autoComplete="current-password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="rdpl-eye"
                      onClick={() => setShowPass(v => !v)}
                      aria-label={showPass ? (pt ? 'Ocultar senha' : 'Hide password') : (pt ? 'Mostrar senha' : 'Show password')}
                    >
                      <IcEye visible={showPass} />
                    </button>
                  </div>
                </div>

                {error && <p className="rdpl-error">{error}</p>}

                <button className="rdpl-submit" type="submit" disabled={loading}>
                  {loading ? (pt ? 'Entrando…' : 'Signing in…') : (pt ? 'Entrar' : 'Sign in')}
                </button>
              </form>

              <p className="rdpl-toggle">
                {pt ? 'Não tem uma conta?' : "Don't have an account?"}{' '}
                <Link to="/signup" className="rdpl-link">{pt ? 'Crie uma grátis' : 'Create one free'}</Link>
              </p>
            </>
          )}
        </div>

        <p className="rdpl-trust">
          {pt ? 'Nunca remarcamos sem a sua aprovação.' : 'We never rebook without your approval.'}
        </p>
      </main>
    </div>
  );
}
