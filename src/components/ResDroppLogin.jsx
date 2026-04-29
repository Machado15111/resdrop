import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.message || 'Incorrect email or password.');
    }
    setLoading(false);
  };

  const handleForgot = async e => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address first.'); return; }
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
      setError('Connection error. Please try again.');
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
            <span className="rdpl-nav__hint">New to ResDrop?</span>
            <Link to="/signup" className="rdpl-nav__signup">Create account</Link>
          </div>
        </div>
      </nav>

      {/* Card */}
      <main className="rdpl-main">
        <div className="rdpl-card">

          {forgotMode ? (
            <>
              <div className="rdpl-card__hd">
                <h1 className="rdpl-card__title">Reset your password</h1>
                <p className="rdpl-card__sub">
                  Enter your email and we will send you a reset link.
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
                    If that address is in our system, you will receive an email shortly.
                  </p>
                  <button
                    className="rdpl-link rdpl-link--block"
                    onClick={() => { setForgotMode(false); setForgotSent(false); }}
                  >
                    ← Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} noValidate>
                  <div className="rdpl-field">
                    <label className="rdpl-label">Email</label>
                    <input
                      className="rdpl-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  {error && <p className="rdpl-error">{error}</p>}
                  <button className="rdpl-submit" type="submit" disabled={loading}>
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                  <p className="rdpl-toggle">
                    <button className="rdpl-link" type="button" onClick={() => setForgotMode(false)}>
                      ← Back to sign in
                    </button>
                  </p>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="rdpl-card__hd">
                <h1 className="rdpl-card__title">Welcome back.</h1>
                <p className="rdpl-card__sub">
                  Sign in to see your tracked bookings and alerts.
                </p>
              </div>

              <form onSubmit={handleLogin} noValidate>
                <div className="rdpl-field">
                  <label className="rdpl-label">Email</label>
                  <input
                    className="rdpl-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="rdpl-field">
                  <div className="rdpl-label-row">
                    <label className="rdpl-label">Password</label>
                    <button
                      type="button"
                      className="rdpl-link rdpl-link--sm"
                      onClick={() => setForgotMode(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="rdpl-pass-wrap">
                    <input
                      className="rdpl-input rdpl-input--pass"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Your password"
                      autoComplete="current-password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="rdpl-eye"
                      onClick={() => setShowPass(v => !v)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      <IcEye visible={showPass} />
                    </button>
                  </div>
                </div>

                {error && <p className="rdpl-error">{error}</p>}

                <button className="rdpl-submit" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="rdpl-toggle">
                Don't have an account?{' '}
                <Link to="/signup" className="rdpl-link">Create one free</Link>
              </p>
            </>
          )}
        </div>

        <p className="rdpl-trust">
          We never rebook without your approval.
        </p>
      </main>
    </div>
  );
}
