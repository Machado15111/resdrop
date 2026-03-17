import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import { IconArrowRight, IconCheck, IconUser, IconHeart, IconFamily, IconBriefcase, IconGlobe } from './Icons';
import PhoneCountrySelect from './PhoneCountrySelect';
import './Onboarding.css';

const TRAVELER_TYPES = [
  { id: 'solo', icon: IconUser, pt: 'Solo', en: 'Solo' },
  { id: 'couple', icon: IconHeart, pt: 'Casal', en: 'Couple' },
  { id: 'family', icon: IconFamily, pt: 'Fam\u00edlia', en: 'Family' },
  { id: 'business', icon: IconBriefcase, pt: 'Neg\u00f3cios', en: 'Business' },
  { id: 'frequent', icon: IconGlobe, pt: 'Viajante frequente', en: 'Frequent traveler' },
];

const ROOM_TYPES = [
  { value: 'Standard Room', pt: 'Quarto Standard', en: 'Standard Room' },
  { value: 'Superior Room', pt: 'Quarto Superior', en: 'Superior Room' },
  { value: 'Classic Room', pt: 'Quarto Cl\u00e1ssico', en: 'Classic Room' },
  { value: 'Classic King', pt: 'Cl\u00e1ssico King', en: 'Classic King' },
  { value: 'Classic Twin', pt: 'Cl\u00e1ssico Twin', en: 'Classic Twin' },
  { value: 'Deluxe Room', pt: 'Quarto Deluxe', en: 'Deluxe Room' },
  { value: 'Grand Deluxe Room', pt: 'Quarto Grand Deluxe', en: 'Grand Deluxe Room' },
  { value: 'Luxury Room', pt: 'Quarto Luxo', en: 'Luxury Room' },
  { value: 'Premier Room', pt: 'Quarto Premier', en: 'Premier Room' },
  { value: 'Prestige Room', pt: 'Quarto Prestige', en: 'Prestige Room' },
  { value: 'Studio Room', pt: 'Quarto Studio', en: 'Studio Room' },
  { value: 'Family Room', pt: 'Quarto Fam\u00edlia', en: 'Family Room' },
  { value: 'Twin Room', pt: 'Quarto Twin', en: 'Twin Room' },
  { value: 'King Room', pt: 'Quarto King', en: 'King Room' },
  { value: 'Junior Suite', pt: 'Su\u00edte J\u00fanior', en: 'Junior Suite' },
  { value: 'Suite', pt: 'Su\u00edte', en: 'Suite' },
  { value: 'Executive Suite', pt: 'Su\u00edte Executiva', en: 'Executive Suite' },
  { value: 'One Bedroom Suite', pt: 'Su\u00edte Um Quarto', en: 'One Bedroom Suite' },
  { value: 'Two Bedroom Suite', pt: 'Su\u00edte Dois Quartos', en: 'Two Bedroom Suite' },
  { value: 'Connecting Room', pt: 'Quarto Conectado', en: 'Connecting Room' },
  { value: 'Accessible Room', pt: 'Quarto Acess\u00edvel', en: 'Accessible Room' },
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
    preferredRoomType: 'Standard Room',
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
      if (form.preferredRoomType) payload.preferredRoomType = form.preferredRoomType;
      payload.marketingOptIn = form.marketingOptIn;

      const res = await authFetch(`${API}/auth/onboarding`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        updateUser(updated);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Onboarding failed:', err);
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

                <div className="form-group">
                  <label className="form-label">{t('onboarding.roomPrefLabel')}</label>
                  <select
                    className="form-input"
                    value={form.preferredRoomType}
                    onChange={e => setForm(prev => ({ ...prev, preferredRoomType: e.target.value }))}
                  >
                    {ROOM_TYPES.map(rt => (
                      <option key={rt.value} value={rt.value}>
                        {lang === 'pt' ? rt.pt : rt.en}
                      </option>
                    ))}
                  </select>
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
                ? (loading ? '...' : t('onboarding.finishCta'))
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
