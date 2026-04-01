import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { IconLock } from './Icons';
import { API } from '../api';
import './Account.css';

function ResetPassword() {
  const { lang } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const pt = lang === 'pt';

  if (!token) {
    return (
      <div className="account-page">
        <div className="container">
          <div className="account-auth-card">
            <div className="auth-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <IconLock size={24} />
            </div>
            <h1>{pt ? 'Link invalido' : 'Invalid link'}</h1>
            <p className="auth-subtitle">
              {pt
                ? 'Este link de redefinicao de senha e invalido ou expirou. Solicite um novo link.'
                : 'This password reset link is invalid or has expired. Please request a new one.'}
            </p>
            <button className="account-submit" onClick={() => navigate('/login')}>
              {pt ? 'Voltar ao login' : 'Back to login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="account-page">
        <div className="container">
          <div className="account-auth-card">
            <div className="auth-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1>{pt ? 'Senha atualizada!' : 'Password updated!'}</h1>
            <p className="auth-subtitle">
              {pt
                ? 'Sua senha foi redefinida com sucesso. Faca login com sua nova senha.'
                : 'Your password has been successfully reset. Sign in with your new password.'}
            </p>
            <button className="account-submit" onClick={() => navigate('/login')}>
              {pt ? 'Ir para login' : 'Go to login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(pt ? 'A senha deve ter pelo menos 6 caracteres.' : 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError(pt ? 'As senhas nao coincidem.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (pt ? 'Erro ao redefinir senha.' : 'Failed to reset password.'));
      } else {
        setSuccess(true);
      }
    } catch {
      setError(pt ? 'Erro de conexao. Tente novamente.' : 'Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="account-page">
      <div className="container">
        <div className="account-auth-card">
          <div className="auth-icon-wrap">
            <IconLock size={24} />
          </div>
          <h1>{pt ? 'Nova senha' : 'Set new password'}</h1>
          <p className="auth-subtitle">
            {pt
              ? 'Digite sua nova senha abaixo.'
              : 'Enter your new password below.'}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{pt ? 'Nova senha' : 'New password'}</label>
              <div className="input-wrap">
                <span className="input-icon"><IconLock size={18} /></span>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={pt ? 'Minimo 6 caracteres' : 'Minimum 6 characters'}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{pt ? 'Confirmar senha' : 'Confirm password'}</label>
              <div className="input-wrap">
                <span className="input-icon"><IconLock size={18} /></span>
                <input
                  className="form-input"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={pt ? 'Repita a senha' : 'Repeat password'}
                  required
                  minLength={6}
                />
              </div>
            </div>
            {error && <p className="account-error">{error}</p>}
            <button className="account-submit gold" type="submit" disabled={loading}>
              {loading
                ? (pt ? 'Aguarde...' : 'Please wait...')
                : (pt ? 'Redefinir senha' : 'Reset password')}
            </button>
            <p className="account-toggle">
              <a href="/login" className="account-link">
                {pt ? 'Voltar ao login' : 'Back to login'}
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
