import { useState } from 'react';
import { useI18n } from '../i18n';
import { IconArrowLeft, IconMail, IconUpload, IconArrowRight, IconShield } from './Icons';
import './SubmitBooking.css';
import { API } from '../api';

function SubmitBooking({ onSubmit, onBack, loading, userEmail }) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState('form');
  const [emailContent, setEmailContent] = useState('');
  const [hotelSuggestions, setHotelSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState({
    hotelName: '',
    destination: '',
    checkinDate: '',
    checkoutDate: '',
    roomType: 'Standard Room',
    originalPrice: '',
    guestName: '',
    confirmationNumber: '',
    email: userEmail || '',
  });

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    // If checkin changes and checkout is before it, reset checkout
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!form.hotelName || !form.checkinDate || !form.checkoutDate || !form.originalPrice) return;
    onSubmit(form);
  };

  const [emailStatus, setEmailStatus] = useState(null); // null | 'parsing' | 'parsed' | 'error'

  const handleEmailParse = async () => {
    if (!emailContent.trim()) return;
    setEmailStatus('parsing');
    try {
      // Try the email-to-booking workflow
      const res = await fetch('${API}/bookings/from-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawEmail: emailContent, email: form.email || userEmail }),
      });
      const data = await res.json();

      if (data.status === 'created' && data.booking) {
        // Fully extracted — created automatically
        setEmailStatus('parsed');
        // Redirect to the new booking (reload bookings)
        window.location.reload();
        return;
      }

      // Incomplete — fill form with whatever was extracted
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
      // Fallback: basic parse
      try {
        const res2 = await fetch('${API}/parse-email', {
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

        <div className="submit-header">
          <h1 className="section-title">{t('submit.title')}</h1>
          <p className="section-subtitle">{t('submit.subtitle')}</p>
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
        </div>

        {mode === 'email' ? (
          <div className="email-parse-section animate-in">
            <div className="email-box">
              <label className="form-label">{t('submit.pasteLabel')}</label>
              <textarea
                className="email-textarea"
                placeholder={`Exemplo:\nHotel: Grand Plaza Barcelona\nCheck-in: 2026-04-15\nCheck-out: 2026-04-19\nQuarto: Deluxe King Suite\nTotal: R$892\nConfirmacao: CONF-ABC123\nHospede: John Smith`}
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={12}
              />
              <button
                className="btn btn-primary"
                onClick={handleEmailParse}
                disabled={!emailContent.trim() || emailStatus === 'parsing'}
              >
                {emailStatus === 'parsing' ? (lang === 'pt' ? 'Analisando...' : 'Parsing...') :
                 emailStatus === 'error' ? (lang === 'pt' ? 'Tentar novamente' : 'Try again') :
                 t('submit.parseBtn')}
              </button>
              {emailStatus === 'parsed' && (
                <p style={{ fontSize: 13, color: 'var(--emerald-dark)', marginTop: 8 }}>
                  {lang === 'pt' ? 'Dados extraidos! Revise e complete o formulario.' : 'Data extracted! Review and complete the form.'}
                </p>
              )}
              {emailStatus === 'error' && (
                <p style={{ fontSize: 13, color: '#dc2626', marginTop: 8 }}>
                  {lang === 'pt' ? 'Erro ao analisar. Cole o email completo e tente novamente.' : 'Parse error. Paste the full email and try again.'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <form className="booking-form animate-in" onSubmit={handleFormSubmit}>
            <div className="form-grid">
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

              <div className="form-group">
                <label className="form-label">{t('submit.destination')}</label>
                <input
                  className="form-input"
                  type="text"
                  name="destination"
                  placeholder="e.g., Rio de Janeiro, Brasil"
                  value={form.destination}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('submit.roomType')}</label>
                <select
                  className="form-input"
                  name="roomType"
                  value={form.roomType}
                  onChange={handleChange}
                >
                  <option>Standard Room</option>
                  <option>Deluxe Room</option>
                  <option>Deluxe Twin Room</option>
                  <option>Superior Room</option>
                  <option>Deluxe King Suite</option>
                  <option>Junior Suite</option>
                  <option>Executive Suite</option>
                  <option>Family Room</option>
                  <option>Penthouse</option>
                </select>
              </div>

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

              <div className="form-group">
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

              <div className="form-group">
                <label className="form-label">{t('submit.emailAlerts')}</label>
                <input
                  className="form-input"
                  type="email"
                  name="email"
                  placeholder="voce@exemplo.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-note">
              <IconShield size={16} />
              <span>{t('submit.freeCancel')}</span>
            </div>

            <button
              className="btn btn-accent btn-lg submit-btn"
              type="submit"
              disabled={loading || !form.hotelName || !form.checkinDate || !form.checkoutDate || !form.originalPrice}
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
  );
}

export default SubmitBooking;
