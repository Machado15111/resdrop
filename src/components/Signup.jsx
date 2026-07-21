import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import { IconMail, IconLock } from './Icons';
import './Account.css';

function Signup() {
  const { t, lang } = useI18n();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [pendingInfo, setPendingInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rawToken) return;
    fetch(`${API}/inbound/pending-import?token=${rawToken}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setPendingInfo(data);
          if (data.email) {
            setForm(prev => ({ ...prev, email: data.email }));
          }
        }
      })
      .catch(() => {});
  }, [rawToken]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim()) return t('signup.nameRequired');
    if (!form.email.trim()) return t('signup.emailRequired');
    if (form.password.length < 6) return t('signup.passwordMin');
    if (form.password !== form.confirmPassword) return t('signup.passwordMismatch');
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    try {
      const authResult = await signup({
        email: form.email,
        name: form.name,
        password: form.password,
      });

      if (rawToken) {
        try {
          const authToken = localStorage.getItem('token') || authResult?.token;
          const attachRes = await fetch(`${API}/inbound/pending-import/attach`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ token: rawToken }),
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
          console.error('Failed to attach pending import:', attachErr);
        }
      }

      navigate('/onboarding');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="account-page">
      <div className="container">
        <div className="account-auth-card">
          <div className="auth-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h1>{t('account.signupTitle')}</h1>
          <p className="auth-subtitle">
            {lang === 'pt'
              ? 'Monitore sua primeira reserva de hotel gratuitamente. Sem cartao de credito.'
              : 'Monitor your first hotel booking free. No credit card required.'}
          </p>

          {pendingInfo && (
            <div className="doc-warning-banner" style={{ marginBottom: 20, textAlign: 'left' }}>
              🎉 {lang === 'pt'
                ? 'Reserva recebida por email encontrada! Crie sua conta para ativá-la.'
                : 'Forwarded email booking found! Create your account to enable monitoring.'}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('account.name')}</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  className="form-input"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={lang === 'pt' ? 'João Silva' : 'John Smith'}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('account.email')}</label>
              <div className="input-wrap">
                <span className="input-icon"><IconMail size={18} /></span>
                <input
                  className="form-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={lang === 'pt' ? 'voce@exemplo.com' : 'you@test.com'}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('signup.password')}</label>
                <div className="input-wrap">
                  <span className="input-icon"><IconLock size={18} /></span>
                  <input
                    className="form-input"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={t('signup.passwordPlaceholder')}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('signup.confirmPassword')}</label>
                <div className="input-wrap">
                  <span className="input-icon"><IconLock size={18} /></span>
                  <input
                    className="form-input"
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('signup.confirmPlaceholder')}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Terms acceptance */}
            <div className="form-group">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  required
                  className="form-checkbox"
                />
                <span>
                  {lang === 'pt'
                    ? <>Concordo com os <a href="/terms" target="_blank" rel="noopener" className="account-link">Termos de Servico</a> e a <a href="/privacy" target="_blank" rel="noopener" className="account-link">Politica de Privacidade</a></>
                    : <>I agree to the <a href="/terms" target="_blank" rel="noopener" className="account-link">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener" className="account-link">Privacy Policy</a></>
                  }
                </span>
              </label>
            </div>

            {error && <p className="account-error">{error}</p>}

            <button className="account-submit gold" type="submit" disabled={loading}>
              {loading
                ? (lang === 'pt' ? 'Criando conta...' : 'Creating account...')
                : (lang === 'pt' ? 'Criar conta gratis' : 'Create free account')}
            </button>

            <p className="auth-trust-line">
              {lang === 'pt'
                ? 'Nunca remarcamos sem sua aprovacao. Seus dados sao privados.'
                : 'We never rebook without your approval. Your data is private.'}
            </p>
          </form>

          <p className="account-toggle">
            {t('account.hasAccount')}{' '}
            <Link to="/login" className="account-link">{t('account.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
