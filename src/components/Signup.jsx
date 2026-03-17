import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import './Account.css';

function Signup() {
  const { t, lang } = useI18n();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      await signup({
        email: form.email,
        name: form.name,
        password: form.password,
      });
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
          <h1>{t('account.signupTitle')}</h1>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('account.name')}</label>
              <input
                className="form-input"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="João Silva"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('account.email')}</label>
              <input
                className="form-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="voce@exemplo.com"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('signup.password')}</label>
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
              <div className="form-group">
                <label className="form-label">{t('signup.confirmPassword')}</label>
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

            {error && <p className="account-error">{error}</p>}

            <button className="btn btn-accent btn-lg account-submit" type="submit" disabled={loading}>
              {loading ? '...' : t('account.signup')}
            </button>
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
