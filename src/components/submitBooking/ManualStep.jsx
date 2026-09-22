/**
 * ManualStep — moved out of SubmitBooking.jsx, which was one 1,085-line
 * component. The JSX is verbatim; every name it used from the parent scope is
 * now a prop under the same name, so the move cannot change behaviour.
 *
 * Typing the booking in by hand — also the fallback when extraction cannot
 * fill the required fields.
 */
import { useI18n } from '../../i18n';
import { IconChevronDown, IconArrowRight, IconArrowLeft, IconShield } from '../Icons';
import { ROOM_TYPES, PREFERENCES } from './constants';

function ManualStep({
  error,
  externalError,
  form,
  handleChange,
  handleHotelChange,
  handleSubmit,
  hotelSuggestions,
  loading,
  resetToIntake,
  selectHotel,
  setForm,
  setShowOptional,
  setShowSuggestions,
  showOptional,
  showSuggestions,
  submitting,
  today,
  togglePreference,
}) {
  const { t, lang } = useI18n();

  return (
      <div className="manual-flow animate-in">
        <div className="manual-header">
          <button className="manual-back-link" onClick={resetToIntake}>
            <IconArrowLeft size={14} />
            {lang === 'pt' ? 'Voltar ao envio rápido' : 'Back to quick submit'}
          </button>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
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
          <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {lang === 'pt' ? 'Por favor, insira as datas no fuso horário local do hotel.' : 'Please enter dates in the hotel\'s local time zone.'}
          </div>
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

          {/* Room type */}
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

          {/* Custom room type */}
          {form.roomType === 'Other' && (
            <div className="form-group animate-in">
              <label className="form-label">{t('submit.roomTypeCustom')} *</label>
              <input
                className="form-input"
                type="text"
                name="roomTypeCustom"
                placeholder={lang === 'pt' ? 'Ex: Bangalô Premium' : 'e.g., Premium Bungalow'}
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-input"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  style={{ width: '80px', padding: '0 8px' }}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  type="number"
                  name="originalPrice"
                  placeholder="e.g., 892"
                  value={form.originalPrice}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>
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

          {/* Taxes included — explicit yes/no */}
          <div className="form-group form-group-taxes">
            <label className="form-label">
              {lang === 'pt' ? 'Impostos incluídos no valor?' : 'Are taxes included in the price?'}
            </label>
            <div className="rate-type-toggle">
              <button
                type="button"
                className={`rate-pill ${form.taxesIncluded ? 'active' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, taxesIncluded: true }))}
              >
                {lang === 'pt' ? 'Sim' : 'Yes'}
              </button>
              <button
                type="button"
                className={`rate-pill ${!form.taxesIncluded ? 'active' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, taxesIncluded: false }))}
              >
                {lang === 'pt' ? 'Não' : 'No'}
              </button>
            </div>
          </div>

          {/* PNR / Confirmation Number */}
          <div className="form-group pnr-field-main">
            <label className="form-label">
              {lang === 'pt' ? 'Código de confirmação' : 'Confirmation code'}
              <span className="field-hint">
                {lang === 'pt' ? 'Opcional — ajuda a identificar sua reserva com precisão.' : 'Optional — helps us match your reservation precisely.'}
              </span>
            </label>
            <input
              className="form-input"
              type="text"
              name="confirmationNumber"
              placeholder="e.g., XYZ123"
              value={form.confirmationNumber}
              onChange={handleChange}
            />
          </div>

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

          {/* Optional fields */}
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
              </div>
            </div>
          )}

          {/* Trust note */}
          <div className="form-note">
            <IconShield size={16} />
            <span>{lang === 'pt'
              ? 'Seus dados estão protegidos. Não acessamos informações financeiras. Monitoramos sem alterar sua reserva.'
              : 'Your data is protected. We do not access financial information. We monitor without changing your booking.'
            }</span>
          </div>

          {(error || externalError) && <p className="form-error-msg">{error || externalError}</p>}

          <button
            className="submit-cta"
            type="submit"
            disabled={loading || submitting || !form.hotelName.trim() || !form.checkinDate || !form.checkoutDate || !form.originalPrice || parseFloat(form.originalPrice) <= 0 || form.checkoutDate <= form.checkinDate || !form.roomType || (form.roomType === 'Other' && !form.roomTypeCustom.trim())}
          >
            {(loading || submitting) ? (
              <span className="loading-pulse">{t('submit.searching')}</span>
            ) : (
              <>
                {t('submit.startMonitoring')}
                <IconArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
  );
}

export default ManualStep;
