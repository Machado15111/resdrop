import { useState } from 'react';
import { useI18n } from '../i18n';
import './SavingsConfirmationModal.css';

const CONFIRMATION_TYPES = [
  { value: 'rebooked', labelKey: 'savings.typeRebooked', descKey: 'savings.typeRebookedDesc' },
  { value: 'hotel_matched', labelKey: 'savings.typeHotelMatched', descKey: 'savings.typeHotelMatchedDesc' },
  { value: 'agent_handled', labelKey: 'savings.typeAgentHandled', descKey: 'savings.typeAgentHandledDesc' },
  { value: 'not_completed', labelKey: 'savings.typeNotCompleted', descKey: 'savings.typeNotCompletedDesc' },
];

function SavingsConfirmationModal({ booking, onConfirm, onDismiss, onClose }) {
  const { t } = useI18n();
  const [confirmationType, setConfirmationType] = useState('');
  const [finalPaidAmount, setFinalPaidAmount] = useState('');
  const [externalConfirmationNumber, setExternalConfirmationNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const potentialSavings = booking.potentialSavings || booking.totalSavings || 0;

  const handleSubmit = async () => {
    if (!confirmationType) return;
    setSubmitting(true);

    if (confirmationType === 'not_completed') {
      await onDismiss({ notes });
    } else {
      await onConfirm({
        confirmationType,
        finalPaidAmount: finalPaidAmount ? parseFloat(finalPaidAmount) : null,
        externalConfirmationNumber: externalConfirmationNumber || null,
        notes: notes || null,
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="scm-overlay" onClick={onClose}>
      <div className="scm-modal" onClick={e => e.stopPropagation()}>
        <div className="scm-header">
          <div>
            <h2>{t('savings.confirmTitle')}</h2>
            <p>{t('savings.confirmSubtitle')}</p>
          </div>
          <button className="scm-close" onClick={onClose}>&times;</button>
        </div>

        <div className="scm-body">
          <div className="scm-savings-preview">
            <span className="scm-sp-label">{t('savings.potentialSavings')}</span>
            <span className="scm-sp-amount">R${potentialSavings.toFixed(0)}</span>
          </div>

          <div className="scm-type-label">{t('savings.howDidYouSave')}</div>
          <div className="scm-type-options">
            {CONFIRMATION_TYPES.map(ct => (
              <label
                key={ct.value}
                className={`scm-type-option ${confirmationType === ct.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="confirmationType"
                  value={ct.value}
                  checked={confirmationType === ct.value}
                  onChange={() => setConfirmationType(ct.value)}
                />
                <div className="scm-type-option-text">
                  <div className="scm-opt-title">{t(ct.labelKey)}</div>
                  <div className="scm-opt-desc">{t(ct.descKey)}</div>
                </div>
              </label>
            ))}
          </div>

          {confirmationType && confirmationType !== 'not_completed' && (
            <div className="scm-fields">
              <div className="scm-field">
                <label>{t('savings.finalAmount')}</label>
                <input
                  type="number"
                  value={finalPaidAmount}
                  onChange={e => setFinalPaidAmount(e.target.value)}
                  placeholder={t('savings.finalAmountPlaceholder')}
                />
              </div>
              <div className="scm-field">
                <label>{t('savings.newConfirmation')}</label>
                <input
                  type="text"
                  value={externalConfirmationNumber}
                  onChange={e => setExternalConfirmationNumber(e.target.value)}
                  placeholder={t('savings.newConfirmationPlaceholder')}
                />
              </div>
              <div className="scm-field">
                <label>{t('savings.notes')}</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('savings.notesPlaceholder')}
                  rows={2}
                />
              </div>
            </div>
          )}

          {confirmationType === 'not_completed' && (
            <div className="scm-fields">
              <div className="scm-field">
                <label>{t('savings.dismissReason')}</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('savings.dismissReasonPlaceholder')}
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="scm-actions">
            <button className="scm-btn-cancel" onClick={onClose} disabled={submitting}>
              {t('account.cancel')}
            </button>
            {confirmationType === 'not_completed' ? (
              <button
                className="scm-btn-dismiss"
                onClick={handleSubmit}
                disabled={!confirmationType || submitting}
              >
                {submitting ? '...' : t('savings.dismissBtn')}
              </button>
            ) : (
              <button
                className="scm-btn-confirm"
                onClick={handleSubmit}
                disabled={!confirmationType || submitting}
              >
                {submitting ? '...' : t('savings.confirmBtn')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SavingsConfirmationModal;
