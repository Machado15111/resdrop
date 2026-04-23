import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import { IconArrowRight, IconCheck, IconUser, IconHeart, IconFamily, IconBriefcase, IconGlobe } from './Icons';
import PhoneCountrySelect from './PhoneCountrySelect';
import './Onboarding.css';
import { useNavigate } from 'react-router-dom';

const TRAVELER_TYPES = [
  { id: 'solo', icon: IconUser, pt: 'Solo', en: 'Solo' },
  { id: 'couple', icon: IconHeart, pt: 'Casal', en: 'Couple' },
  { id: 'family', icon: IconFamily, pt: 'Fam\u00edlia', en: 'Family' },
  { id: 'business', icon: IconBriefcase, pt: 'Neg\u00f3cios', en: 'Business' },
  { id: 'frequent', icon: IconGlobe, pt: 'Viajante frequente', en: 'Frequent traveler' },
];


const COUNTRIES_LIST = [
  { value: 'BR', pt: 'Brasil', en: 'Brazil' },
  { value: 'US', pt: 'Estados Unidos', en: 'United States' },
  { value: 'GB', pt: 'Reino Unido', en: 'United Kingdom' },
  { value: 'PT', pt: 'Portugal', en: 'Portugal' },
  { value: 'ES', pt: 'Espanha', en: 'Spain' },
  { value: 'FR', pt: 'Fran\u00e7a', en: 'France' },
  { value: 'DE', pt: 'Alemanha', en: 'Germany' },
  { value: 'IT', pt: 'It\u00e1lia', en: 'Italy' },
  { value: 'JP', pt: 'Jap\u00e3o', en: 'Japan' },
  { value: 'AU', pt: 'Austr\u00e1lia', en: 'Australia' },
  { value: 'AE', pt: 'Emirados \u00c1rabes', en: 'UAE' },
  { value: 'IN', pt: '\u00cdndia', en: 'India' },
];

function Onboarding() {
  const { t, lang } = useI18n();
  const { user, authFetch, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState({
    travelerType: '',
    preferredEmail: user?.email || '',
    currency: user?.currency || 'BRL',
    alertsEnabled: true,
    // Step 3 fields
    phoneCountryCode: '+55',
    phoneNumber: '',
    dateOfBirth: '',
    country: 'BR',
    marketingOptIn: true,
  });

  const totalSteps = 3;

  useEffect(() => {
    fetch(`${API}/currencies`)
      .then(res => res.json())
      .then(data => setCurrencies(data))
      .catch(() => {
        setCurrencies([
          { code: 'BRL', label: 'R$' },
          { code: 'USD', label: '$' },
          { code: 'EUR', label: '\u20ac' },
          { code: 'GBP', label: '\u00a3' },
        ]);
      });
  }, []);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const payload = {
        travelerType: form.travelerType,
        preferredEmail: form.preferredEmail,
        currency: form.currency,
        alertsEnabled: form.alertsEnabled,
      };
      // Include step 3 fields if provided
      if (form.phoneNumber) {
        payload.phone = `${form.phoneCountryCode} ${form.phoneNumber}`;
      }
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.country) payload.country = form.country;
      payload.marketingOptIn = form.marketingOptIn;

      const res = await authFetch(`${API}/auth/onboarding`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        updateUser({ ...updated, onboardingCompleted: true });
        navigate('/submit', { state: { fromOnboarding: true } });
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || (lang === 'pt' ? 'Falha ao salvar' : 'Failed to save'));
      }
    } catch (err) {
      console.error('Onboarding failed:', err);
      setError(lang === 'pt' ? 'Erro de conexão' : 'Connection error');
    }
    setLoading(false);
  };

  const canProceed = () => {
    if (step === 0) return !!form.travelerType;
    return true;
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleComplete();
  };

  return (
    <div className="onboarding-page">
      <div className="container">
        <div className="onboarding-card">
          {/* Progress */}
          <div className="onboarding-progress">
            <div className={`progress-dot ${step >= 0 ? 'active' : ''} ${step > 0 ? 'done' : ''}`}>
              {step > 0 ? <IconCheck size={12} /> : '1'}
            </div>
            <div className="progress-line">
              <div className={`progress-line-fill ${step > 0 ? 'filled' : ''}`} />
            </div>
            <div className={`progress-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
              {step > 1 ? <IconCheck size={12} /> : '2'}
            </div>
            <div className="progress-line">
              <div className={`progress-line-fill ${step > 1 ? 'filled' : ''}`} />
            </div>
            <div className={`progress-dot ${step >= 2 ? 'active' : ''}`}>
              3
            </div>
          </div>

          {/* Step 1: Traveler type + email */}
          {step === 0 && (
            <div className="onboarding-step animate-in">
              <div className="onboarding-step-header">
                <h1>{t('onboarding.step1Title')}</h1>
                <p>{t('onboarding.step1Subtitle')}</p>
              </div>

              <div className="traveler-grid">
                {TRAVELER_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      className={`traveler-option ${form.travelerType === type.id ? 'selected' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, travelerType: type.id }))}
                    >
                      <span className="traveler-icon"><Icon size={18} /></span>
                      <span className="traveler-label">{lang === 'pt' ? type.pt : type.en}</span>
                      {form.travelerType === type.id && (
                        <span className="traveler-check"><IconCheck size={14} /></span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="onboarding-email-section">
                <label className="form-label">
                  {t('onboarding.emailLabel')}
                </label>
                <input
                  className="form-input"
                  type="email"
                  value={form.preferredEmail}
                  onChange={e => setForm(prev => ({ ...prev, preferredEmail: e.target.value }))}
                  placeholder="voce@exemplo.com"
                />
                <p className="form-hint">
                  {t('onboarding.emailHint')}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 1 && (
            <div className="onboarding-step animate-in">
              <div className="onboarding-step-header">
                <h1>{t('onboarding.step2Title')}</h1>
                <p>{t('onboarding.step2Subtitle')}</p>
              </div>

              <div className="currency-section">
                <label className="form-label">
                  {t('onboarding.currencyLabel')}
                </label>
                <div className="currency-pills">
                  {currencies.map(c => (
                    <button
                      key={c.code}
                      className={`currency-pill ${form.currency === c.code ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, currency: c.code }))}
                    >
                      {c.label} {c.code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="alerts-section">
                <div
                  className="alert-toggle-row"
                  onClick={() => setForm(prev => ({ ...prev, alertsEnabled: !prev.alertsEnabled }))}
                >
                  <div className="alert-toggle-info">
                    <span className="alert-toggle-title">
                      {t('onboarding.alertsTitle')}
                    </span>
                    <span className="alert-toggle-desc">
                      {t('onboarding.alertsDesc')}
                    </span>
                  </div>
                  <div className={`ios-toggle ${form.alertsEnabled ? 'on' : ''}`}>
                    <div className="ios-toggle-knob" />
                  </div>
                </div>
                <p className="toggle-trust-note">
                  {t('onboarding.alertsTrust')}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Additional info (optional) */}
          {step === 2 && (
            <div className="onboarding-step animate-in">
              <div className="onboarding-step-header">
                <h1>{t('onboarding.step3Title')}</h1>
                <p>{t('onboarding.step3Subtitle')}</p>
              </div>

              <div className="step3-form">
                <div className="form-group">
                  <label className="form-label">{t('onboarding.phoneLabel')}</label>
                  <PhoneCountrySelect
                    countryCode={form.phoneCountryCode}
                    number={form.phoneNumber}
                    onChange={({ countryCode, number }) =>
                      setForm(prev => ({ ...prev, phoneCountryCode: countryCode, phoneNumber: number }))
                    }
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">{t('onboarding.dobLabel')}</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('onboarding.countryLabel')}</label>
                    <select
                      className="form-input"
                      value={form.country}
                      onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
                    >
                      {COUNTRIES_LIST.map(c => (
                        <option key={c.value} value={c.value}>
                          {lang === 'pt' ? c.pt : c.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="alerts-section">
                  <div
                    className="alert-toggle-row"
                    onClick={() => setForm(prev => ({ ...prev, marketingOptIn: !prev.marketingOptIn }))}
                  >
                    <div className="alert-toggle-info">
                      <span className="alert-toggle-title">
                        {t('onboarding.marketingLabel')}
                      </span>
                      <span className="alert-toggle-desc">
                        {t('onboarding.marketingDesc')}
                      </span>
                    </div>
                    <div className={`ios-toggle ${form.marketingOptIn ? 'on' : ''}`}>
                      <div className="ios-toggle-knob" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <p style={{ color: '#b91c1c', fontSize: '0.9rem', textAlign: 'center', marginTop: 16 }}>{error}</p>
          )}

          {/* Actions */}
          <div className="onboarding-actions">
            {step > 0 && (
              <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
                {t('common.back')}
              </button>
            )}
            {step === 2 && (
              <button
                className="btn btn-ghost"
                onClick={handleComplete}
                disabled={loading}
              >
                {t('onboarding.skipStep')}
              </button>
            )}
            <button
              className="btn btn-accent btn-lg onboarding-cta"
              onClick={next}
              disabled={!canProceed() || loading}
            >
              {step === totalSteps - 1
                ? (loading ? '...' : (lang === 'pt' ? 'Concluir e Ir para o Painel' : 'Finish & Go to Dashboard'))
                : t('onboarding.nextCta')}
              <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
