import { useState } from 'react';
import { useI18n } from '../i18n';
import { IconArrowLeft, IconMail, IconUpload, IconArrowRight, IconShield, IconChevronDown } from './Icons';
import DocumentUpload from './DocumentUpload';
import './SubmitBooking.css';
import { API } from '../api';

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
  { value: 'Other', pt: 'Outro', en: 'Other' },
];

const PREFERENCES = [
  { value: 'sea_view', pt: 'Vista Mar', en: 'Sea View' },
  { value: 'high_floor', pt: 'Andar Alto', en: 'High Floor' },
  { value: 'lowest_category', pt: 'Categoria Mais Baixa', en: 'Lowest Category' },
  { value: 'suite', pt: 'Su\u00edte', en: 'Suite' },
  { value: 'junior_suite', pt: 'Su\u00edte J\u00fanior', en: 'Junior Suite' },
];

function SubmitBooking({ onSubmit, onBack, loading, error, userEmail }) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState('form');
  const [emailContent, setEmailContent] = useState('');
  const [hotelSuggestions, setHotelSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [form, setForm] = useState({
    hotelName: '',
    destination: '',
    checkinDate: '',
    checkoutDate: '',
    roomType: 'Standard Room',
    roomTypeCustom: '',
    originalPrice: '',
    taxesIncluded: false,
    rateType: 'total',
    preferences: [],
    guestName: '',
    confirmationNumber: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    if (name === 'checkinDate' && updated.checkoutDate && updated.checkoutDate <= value) {
      updated.checkoutDate = '';
    }
    setForm(updated);
  };

  const searchHotels = async (query) => {
    if (query.length < 2) { setHotelSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await fetch(`${API}/hotels/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setHotelSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      console.error('Hotel search failed:', err);
    }
  };

  const handleHotelChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, hotelName: value });
    searchHotels(value);
  };

  const selectHotel = (hotel) => {
    setForm({ ...form, hotelName: hotel.name, destination: hotel.destination });
    setShowSuggestions(false);
  };

  const togglePreference = (value) => {
    setForm(prev => ({
      ...prev,
      preferences: prev.preferences.includes(value)
        ? prev.preferences.filter(p => p !== value)
        : [...prev.preferences, value],
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!form.hotelName || !form.checkinDate || !form.checkoutDate || !form.originalPrice || !form.roomType) return;
    // If "Other" selected but no custom text, don't submit
    if (form.roomType === 'Other' && !form.roomTypeCustom.trim()) return;
    const submitData = { ...form };
    if (submitData.roomType !== 'Other') {
      delete submitData.roomTypeCustom;
    }
    onSubmit(submitData);
  };

  const [emailStatus, setEmailStatus] = useState(null);

  const handleEmailParse = async () => {
    if (!emailContent.trim()) return;
    setEmailStatus('parsing');
    try {
      const res = await fetch(`${API}/bookings/from-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawEmail: emailContent, email: userEmail }),
      });
      const data = await res.json();

      if (data.status === 'created' && data.booking) {
        setEmailStatus('parsed');
        window.location.reload();
        return;
      }

      if (data.parsed) {
        const p = data.parsed;
        setForm(prev => ({
          ...prev,
          hotelName: p.hotelName || prev.hotelName,
          destination: p.destination || prev.destination,
          checkinDate: p.checkinDate || prev.checkinDate,
          checkoutDate: p.checkoutDate || prev.checkoutDate,
          roomType: p.roomType || prev.roomType,
          originalPrice: p.originalPrice || prev.originalPrice,
          confirmationNumber: p.confirmationNumber || prev.confirmationNumber,
          guestName: p.guestName || prev.guestName,
        }));
        setEmailStatus('parsed');
        setMode('form');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setEmailStatus('error');
      try {
        const res2 = await fetch(`${API}/parse-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailContent }),
        });
        const parsed = await res2.json();
        setForm(prev => ({ ...prev, ...parsed }));
        setMode('form');
      } catch {}
    }
  };

  return (
    <div className="submit-page">
      <div className="container">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          <IconArrowLeft size={16} />
          {t('submit.back')}
        </button>

        <div className="submit-card">
          <div className="submit-header">
            <h1>{t('submit.title')}</h1>
            <p>{t('submit.subtitle')}</p>
          </div>

          <div className="submit-mode-toggle">
            <button
              className={`mode-btn ${mode === 'form' ? 'active' : ''}`}
              onClick={() => setMode('form')}
            >
              <IconUpload size={16} />
              {t('submit.manualEntry')}
            </button>
            <button
              className={`mode-btn ${mode === 'email' ? 'active' : ''}`}
              onClick={() => setMode('email')}
            >
              <IconMail size={16} />
              {t('submit.pasteEmail')}
            </button>
            <button
              className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
              onClick={() => setMode('upload')}
            >
              <IconUpload size={16} />
              {t('submit.uploadDoc')}
            </button>
          </div>

          {mode === 'upload' ? (
            <DocumentUpload onSubmit={onSubmit} userEmail={userEmail} onBack={() => setMode('form')} />
          ) : mode === 'email' ? (
            <div className="email-parse-section animate-in">
              <label className="form-label">{t('submit.pasteLabel')}</label>
              <textarea
                className="email-textarea"
                placeholder={lang === 'pt'
                  ? 'Exemplo:\nHotel: Grand Plaza Barcelona\nCheck-in: 2026-04-15\nCheck-out: 2026-04-19\nQuarto: Deluxe King Suite\nTotal: R$892\nConfirma\u00e7\u00e3o: CONF-ABC123\nH\u00f3spede: John Smith'
                  : 'Example:\nHotel: Grand Plaza Barcelona\nCheck-in: 2026-04-15\nCheck-out: 2026-04-19\nRoom: Deluxe King Suite\nTotal: $892\nConfirmation: CONF-ABC123\nGuest: John Smith'}
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={10}
              />
              <button
                className="btn btn-primary parse-btn"
                onClick={handleEmailParse}
                disabled={!emailContent.trim() || emailStatus === 'parsing'}
              >
                {emailStatus === 'parsing' ? t('submit.parsing') :
                 emailStatus === 'error' ? t('submit.tryAgain') :
                 t('submit.parseBtn')}
              </button>
              {emailStatus === 'parsed' && (
                <p className="parse-success">{t('submit.parsedSuccess')}</p>
              )}
              {emailStatus === 'error' && (
                <p className="parse-error">{t('submit.parseError')}</p>
              )}
            </div>
          ) : (
            <form className="booking-form animate-in" onSubmit={handleFormSubmit}>
              {/* Hotel name with autocomplete */}
              <div className="form-group full hotel-autocomplete">
                <label className="form-label">{t('submit.hotelName')}</label>
                <input
                  className="form-input"
                  type="text"
                  name="hotelName"
                  placeholder="e.g., Copacabana Palace"
                  value={form.hotelName}
                  onChange={handleHotelChange}
                  onFocus={() => form.hotelName.length >= 2 && hotelSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  autoComplete="off"
                  required
                />
                {showSuggestions && (
                  <ul className="hotel-suggestions">
                    {hotelSuggestions.map((hotel, i) => (
                      <li key={i} onMouseDown={() => selectHotel(hotel)}>
                        <span className="hs-name">{hotel.name}</span>
                        <span className="hs-dest">{hotel.destination}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Dates */}
              <div className="form-dates">
                <div className="form-group">
                  <label className="form-label">{t('submit.checkin')}</label>
                  <input
                    className="form-input"
                    type="date"
                    name="checkinDate"
                    value={form.checkinDate}
                    onChange={handleChange}
                    min={today}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('submit.checkout')}</label>
                  <input
                    className="form-input"
                    type="date"
                    name="checkoutDate"
                    value={form.checkoutDate}
                    onChange={handleChange}
                    min={form.checkinDate || today}
                    required
                  />
                </div>
              </div>

              {/* Room type — REQUIRED */}
              <div className="form-group">
                <label className="form-label">{t('submit.roomType')} *</label>
                <select
                  className="form-input"
                  name="roomType"
                  value={form.roomType}
                  onChange={handleChange}
                  required
                >
                  {ROOM_TYPES.map(rt => (
                    <option key={rt.value} value={rt.value}>
                      {lang === 'pt' ? rt.pt : rt.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom room type (when "Other" selected) */}
              {form.roomType === 'Other' && (
                <div className="form-group animate-in">
                  <label className="form-label">{t('submit.roomTypeCustom')} *</label>
                  <input
                    className="form-input"
                    type="text"
                    name="roomTypeCustom"
                    placeholder={lang === 'pt' ? 'Ex: Bangal\u00f4 Premium' : 'e.g., Premium Bungalow'}
                    value={form.roomTypeCustom}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              {/* Price + Rate type */}
              <div className="form-price-row">
                <div className="form-group form-group-price">
                  <label className="form-label">{t('submit.totalPrice')}</label>
                  <input
                    className="form-input"
                    type="number"
                    name="originalPrice"
                    placeholder="e.g., 892"
                    value={form.originalPrice}
                    onChange={handleChange}
                    required
                    min="1"
                    step="0.01"
                  />
                </div>
                <div className="form-group form-group-rate">
                  <label className="form-label">{t('submit.rateType')}</label>
                  <div className="rate-type-toggle">
                    <button
                      type="button"
                      className={`rate-pill ${form.rateType === 'per_night' ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, rateType: 'per_night' }))}
                    >
                      {t('submit.perNight')}
                    </button>
                    <button
                      type="button"
                      className={`rate-pill ${form.rateType === 'total' ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, rateType: 'total' }))}
                    >
                      {t('submit.totalStay')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Taxes included checkbox */}
              <label className="taxes-checkbox">
                <input
                  type="checkbox"
                  checked={form.taxesIncluded}
                  onChange={(e) => setForm(prev => ({ ...prev, taxesIncluded: e.target.checked }))}
                />
                <span>{t('submit.taxesIncluded')}</span>
              </label>

              {/* Preferences */}
              <div className="form-group preferences-section">
                <label className="form-label">{t('submit.preferences')}</label>
                <div className="preferences-grid">
                  {PREFERENCES.map(pref => (
                    <button
                      key={pref.value}
                      type="button"
                      className={`pref-pill ${form.preferences.includes(pref.value) ? 'active' : ''}`}
                      onClick={() => togglePreference(pref.value)}
                    >
                      {lang === 'pt' ? pref.pt : pref.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional fields toggle */}
              <button
                type="button"
                className="optional-toggle"
                onClick={() => setShowOptional(!showOptional)}
              >
                <IconChevronDown size={16} className={`optional-chevron ${showOptional ? 'open' : ''}`} />
                {t('submit.moreDetails')}
              </button>

              {showOptional && (
                <div className="optional-fields animate-in">
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">{t('submit.destination')}</label>
                      <input
                        className="form-input"
                        type="text"
                        name="destination"
                        placeholder="e.g., Rio de Janeiro"
                        value={form.destination}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('submit.guestName')}</label>
                      <input
                        className="form-input"
                        type="text"
                        name="guestName"
                        placeholder="e.g., John Smith"
                        value={form.guestName}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('submit.confirmation')}</label>
                      <input
                        className="form-input"
                        type="text"
                        name="confirmationNumber"
                        placeholder="e.g., CONF-ABC123"
                        value={form.confirmationNumber}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Trust note */}
              <div className="form-note">
                <IconShield size={16} />
                <span>{t('submit.freeCancel')}</span>
              </div>

              {error && <p className="form-error" style={{color: '#C1292E', marginBottom: '16px', textAlign: 'center', fontWeight: '500'}}>{error}</p>}
              <button
                className="btn btn-primary btn-lg submit-btn"
                type="submit"
                disabled={loading || !form.hotelName || !form.checkinDate || !form.checkoutDate || !form.originalPrice || !form.roomType || (form.roomType === 'Other' && !form.roomTypeCustom.trim())}
              >
                {loading ? (
                  <span className="loading-pulse">{t('submit.searching')}</span>
                ) : (
                  <>
                    {t('submit.startMonitoring')}
                    <IconArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubmitBooking;
