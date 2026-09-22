/**
 * ReviewStep — moved out of SubmitBooking.jsx, which was one 1,085-line
 * component. The JSX is verbatim; every name it used from the parent scope is
 * now a prop under the same name, so the move cannot change behaviour.
 *
 * What the extractor found, field by field, with its confidence — the last
 * stop before monitoring starts.
 */
import { useI18n } from '../../i18n';
import { IconCheck, IconArrowRight, IconShield } from '../Icons';
import ReviewField from './ReviewField';

function ReviewStep({
  confidenceScores,
  duplicateWarning,
  error,
  externalError,
  form,
  handleFieldChange,
  handleSubmit,
  loading,
  resetToIntake,
  submitting,
}) {
  const { t, lang } = useI18n();

  return (
      <div className="review-flow animate-in">
        <div className="review-header">
          <div className="review-header-badge">
            <IconCheck size={14} />
            {lang === 'pt' ? 'Dados extraídos' : 'Data extracted'}
          </div>
          <p className="review-header-hint">
            {lang === 'pt'
              ? 'Revise os campos abaixo. Corrija qualquer informação antes de iniciar o monitoramento.'
              : 'Review the fields below. Correct any information before starting monitoring.'}
          </p>
        </div>

        <div className="review-form">
          <ReviewField
            label={lang === 'pt' ? 'Hotel' : 'Hotel'}
            value={form.hotelName}
            onChange={v => handleFieldChange('hotelName', v)}
            confidence={confidenceScores.hotelName}
            required
            lang={lang}
          />
          <ReviewField
            label={lang === 'pt' ? 'Destino' : 'Destination'}
            value={form.destination}
            onChange={v => handleFieldChange('destination', v)}
            confidence={confidenceScores.destination}
            lang={lang}
          />
          <div className="review-row">
            <ReviewField
              label="Check-in"
              value={form.checkinDate}
              onChange={v => handleFieldChange('checkinDate', v)}
              confidence={confidenceScores.checkinDate}
              type="date"
              required
              lang={lang}
            />
            <ReviewField
              label="Check-out"
              value={form.checkoutDate}
              onChange={v => handleFieldChange('checkoutDate', v)}
              confidence={confidenceScores.checkoutDate}
              type="date"
              required
              lang={lang}
            />
          </div>
          <div className="review-row">
            <ReviewField
              label={lang === 'pt' ? 'Tipo de Quarto' : 'Room Type'}
              value={form.roomType}
              onChange={v => handleFieldChange('roomType', v)}
              confidence={confidenceScores.roomType}
              lang={lang}
            />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flex: 1 }}>
              <div style={{ flex: 1 }}>
                <ReviewField
                  label={lang === 'pt' ? 'Valor Pago' : 'Price Paid'}
                  value={form.originalPrice}
                  onChange={v => handleFieldChange('originalPrice', v)}
                  confidence={confidenceScores.originalPrice}
                  type="number"
                  required
                  lang={lang}
                />
              </div>
              <div className="review-field" style={{ width: '80px', marginTop: 0 }}>
                <div className="review-field-header"><label>{lang === 'pt' ? 'Moeda' : 'Currency'}</label></div>
                <select 
                  className="review-input" 
                  value={form.currency} 
                  onChange={(e) => handleFieldChange('currency', e.target.value)}
                  style={{ padding: '0.5rem' }}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
          </div>
          <div className="review-row">
            <ReviewField
              label={lang === 'pt' ? 'Hóspede' : 'Guest'}
              value={form.guestName}
              onChange={v => handleFieldChange('guestName', v)}
              confidence={confidenceScores.guestName}
              lang={lang}
            />
            <ReviewField
              label={lang === 'pt' ? 'Confirmação' : 'Confirmation'}
              value={form.confirmationNumber}
              onChange={v => handleFieldChange('confirmationNumber', v)}
              confidence={confidenceScores.confirmationNumber}
              lang={lang}
            />
          </div>
        </div>

        {duplicateWarning && (
          <div className="review-duplicate">
            <strong>{lang === 'pt' ? 'Reserva semelhante encontrada' : 'Similar booking found'}</strong>
            <p>{duplicateWarning.existingHotel} — {lang === 'pt' ? 'já existe uma reserva com mesmas datas.' : 'a booking with the same dates already exists.'}</p>
          </div>
        )}

        {(error || externalError) && <p className="review-error">{error || externalError}</p>}

        <div className="review-trust">
          <IconShield size={14} />
          <span>{lang === 'pt'
            ? 'Seus dados estão protegidos. Não acessamos informações financeiras.'
            : 'Your data is protected. We do not access financial information.'
          }</span>
        </div>

        <div className="review-actions">
          <button className="review-back-btn" onClick={resetToIntake}>
            {lang === 'pt' ? 'Voltar' : 'Back'}
          </button>
          <button
            className="review-submit-btn"
            onClick={handleSubmit}
            disabled={loading || submitting || !form.hotelName.trim() || !form.checkinDate || !form.checkoutDate || !form.originalPrice || parseFloat(form.originalPrice) <= 0 || form.checkoutDate <= form.checkinDate}
          >
            {(loading || submitting) ? (
              <span className="loading-pulse">{t('submit.searching')}</span>
            ) : (
              <>
                {t('submit.startMonitoring')}
                <IconArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
  );
}

export default ReviewStep;
