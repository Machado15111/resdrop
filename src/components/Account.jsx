import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import { IconUser, IconArrowLeft, IconCheck, IconCrown, IconStar, IconZap, IconPlus, IconTrash } from './Icons';
import './Account.css';

const PLANS = [
  { id: 'free', icon: IconZap, bookings: 1, price: 0 },
  { id: 'viajante', icon: IconStar, bookings: 10, price: 25 },
  { id: 'premium', icon: IconCrown, bookings: 50, price: 100 },
];

const PLAN_NAMES = { free: 'Free', viajante: 'Viajante', premium: 'Premium' };

const ROOM_TYPES = [
  { value: 'Standard Room', pt: 'Quarto Standard', en: 'Standard Room' },
  { value: 'Superior Room', pt: 'Quarto Superior', en: 'Superior Room' },
  { value: 'Classic Room', pt: 'Quarto Clássico', en: 'Classic Room' },
  { value: 'Classic King', pt: 'Clássico King', en: 'Classic King' },
  { value: 'Classic Twin', pt: 'Clássico Twin', en: 'Classic Twin' },
  { value: 'Deluxe Room', pt: 'Quarto Deluxe', en: 'Deluxe Room' },
  { value: 'Grand Deluxe Room', pt: 'Quarto Grand Deluxe', en: 'Grand Deluxe Room' },
  { value: 'Luxury Room', pt: 'Quarto Luxo', en: 'Luxury Room' },
  { value: 'Premier Room', pt: 'Quarto Premier', en: 'Premier Room' },
  { value: 'Prestige Room', pt: 'Quarto Prestige', en: 'Prestige Room' },
  { value: 'Studio Room', pt: 'Quarto Studio', en: 'Studio Room' },
  { value: 'Family Room', pt: 'Quarto Família', en: 'Family Room' },
  { value: 'Twin Room', pt: 'Quarto Twin', en: 'Twin Room' },
  { value: 'King Room', pt: 'Quarto King', en: 'King Room' },
  { value: 'Junior Suite', pt: 'Suíte Júnior', en: 'Junior Suite' },
  { value: 'Suite', pt: 'Suíte', en: 'Suite' },
  { value: 'Executive Suite', pt: 'Suíte Executiva', en: 'Executive Suite' },
  { value: 'One Bedroom Suite', pt: 'Suíte Um Quarto', en: 'One Bedroom Suite' },
  { value: 'Two Bedroom Suite', pt: 'Suíte Dois Quartos', en: 'Two Bedroom Suite' },
  { value: 'Connecting Room', pt: 'Quarto Conectado', en: 'Connecting Room' },
  { value: 'Accessible Room', pt: 'Quarto Acessível', en: 'Accessible Room' },
];

function Account() {
  const { t, lang } = useI18n();
  const { user, authFetch, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    preferredRoomType: user?.preferredRoomType || 'Standard Room',
  });
  const [loyaltyPrograms, setLoyaltyPrograms] = useState(
    user?.loyaltyPrograms || []
  );

  const handleChangePlan = async (planId) => {
    if (!user || planId === user.plan) return;
    try {
      const res = await authFetch(`${API}/users/${user.email}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        const data = await res.json();
        updateUser(data);
      }
    } catch (err) {
      console.error('Failed to change plan:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleProfileSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await authFetch(`${API}/profile`, {
        method: 'PUT',
        body: JSON.stringify({
          ...profileForm,
          loyaltyPrograms: loyaltyPrograms.filter(lp => lp.program.trim()),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        updateUser(data);
        setSaveMsg(t('account.profileUpdated'));
        setEditMode(false);
        setTimeout(() => setSaveMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      setSaveMsg(t('account.saveFailed'));
    }
    setSaving(false);
  };

  const addLoyaltyProgram = () => {
    setLoyaltyPrograms(prev => [...prev, { program: '', number: '' }]);
  };

  const removeLoyaltyProgram = (index) => {
    setLoyaltyPrograms(prev => prev.filter((_, i) => i !== index));
  };

  const updateLoyaltyProgram = (index, field, value) => {
    setLoyaltyPrograms(prev => prev.map((lp, i) =>
      i === index ? { ...lp, [field]: value } : lp
    ));
  };

  if (!user) return null;

  const userPlan = PLANS.find(p => p.id === user.plan) || PLANS[0];

  return (
    <div className="account-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <IconArrowLeft size={16} />
          {t('common.back')}
        </button>

        <div className="account-profile">
          <div className="account-avatar">
            <IconUser size={32} />
          </div>
          <div className="account-info">
            <h1>{t('account.welcome')}, {user.name}</h1>
            <p className="account-email">{user.email}</p>
            <p className="account-since">{t('account.memberSince')} {new Date(user.joinedAt).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US')}</p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="account-section">
          <div className="section-header">
            <h2>{t('account.profileTitle')}</h2>
            {!editMode ? (
              <button className="account-link" onClick={() => setEditMode(true)}>
                {t('account.editProfile')}
              </button>
            ) : (
              <div className="edit-actions">
                <button className="btn-ghost" onClick={() => setEditMode(false)} disabled={saving}>
                  {t('account.cancel')}
                </button>
                <button className="btn-primary" onClick={handleProfileSave} disabled={saving}>
                  {saving ? '...' : t('account.saveProfile')}
                </button>
              </div>
            )}
          </div>

          {saveMsg && <p className="save-message">{saveMsg}</p>}

          {editMode ? (
            <div className="profile-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">{t('account.name')}</label>
                  <input
                    className="form-input"
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('account.phone')}</label>
                  <input
                    className="form-input"
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('account.dateOfBirth')}</label>
                  <input
                    className="form-input"
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={e => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('account.preferredRoom')}</label>
                  <select
                    className="form-input"
                    value={profileForm.preferredRoomType}
                    onChange={e => setProfileForm(prev => ({ ...prev, preferredRoomType: e.target.value }))}
                  >
                    {ROOM_TYPES.map(rt => (
                      <option key={rt.value} value={rt.value}>
                        {lang === 'pt' ? rt.pt : rt.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loyalty Programs */}
              <div className="loyalty-section">
                <label className="form-label">{t('account.loyaltyPrograms')}</label>
                {loyaltyPrograms.map((lp, i) => (
                  <div className="loyalty-row" key={i}>
                    <input
                      className="form-input loyalty-input"
                      type="text"
                      value={lp.program}
                      onChange={e => updateLoyaltyProgram(i, 'program', e.target.value)}
                      placeholder={t('account.programName')}
                    />
                    <input
                      className="form-input loyalty-input"
                      type="text"
                      value={lp.number}
                      onChange={e => updateLoyaltyProgram(i, 'number', e.target.value)}
                      placeholder={t('account.loyaltyNumber')}
                    />
                    <button
                      className="btn"
                      onClick={() => removeLoyaltyProgram(i)}
                      title={t('account.remove')}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                ))}
                <button className="add-loyalty" onClick={addLoyaltyProgram}>
                  <IconPlus size={14} />
                  {t('account.addProgram')}
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-display">
              <div className="profile-row">
                <span className="profile-label">{t('account.name')}</span>
                <span className="profile-value">{user.name}</span>
              </div>
              {user.phone && (
                <div className="profile-row">
                  <span className="profile-label">{t('account.phone')}</span>
                  <span className="profile-value">{user.phone}</span>
                </div>
              )}
              {user.dateOfBirth && (
                <div className="profile-row">
                  <span className="profile-label">{t('account.dateOfBirth')}</span>
                  <span className="profile-value">{new Date(user.dateOfBirth).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US')}</span>
                </div>
              )}
              {user.preferredRoomType && (
                <div className="profile-row">
                  <span className="profile-label">{t('account.preferredRoom')}</span>
                  <span className="profile-value">{user.preferredRoomType}</span>
                </div>
              )}
              {user.loyaltyPrograms && user.loyaltyPrograms.length > 0 && (
                <div className="profile-row">
                  <span className="profile-label">{t('account.loyaltyPrograms')}</span>
                  <div className="profile-loyalty-list">
                    {user.loyaltyPrograms.map((lp, i) => (
                      <span key={i} className="loyalty-badge">{lp.program}: {lp.number}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Plan Usage */}
        <div className="account-section">
          <h2>{t('account.planUsage')}</h2>
          <div className="account-usage-card">
            <div className="usage-plan-badge">
              <userPlan.icon size={20} />
              <span>{PLAN_NAMES[user.plan]}</span>
            </div>
            <div className="usage-bar-wrap">
              <div className="usage-label">
                <span>{t('account.bookingsUsed')}</span>
                <span>{user.bookings || user.bookingsCount || 0} {t('account.of')} {userPlan.bookings} {t('account.thisMonth')}</span>
              </div>
              <div className="usage-bar">
                <div
                  className="usage-bar-fill"
                  style={{ width: `${Math.min(100, ((user.bookings || user.bookingsCount || 0) / userPlan.bookings) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Change Plan */}
        <div className="account-section">
          <h2>{t('account.changePlan')}</h2>
          <div className="account-plans-grid">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`account-plan-card ${user.plan === plan.id ? 'current' : ''}`}
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
                {user.plan === plan.id ? (
                  <button className="btn-outline" disabled>
                    <IconCheck size={14} />
                    {t('pricing.currentPlan')}
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => handleChangePlan(plan.id)}>
                    {t('account.selectPlan')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t('account.logout')}
        </button>
      </div>
    </div>
  );
}

export default Account;
