import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import './DocumentUpload.css';
import './ImportReviewModal.css';

const CONFIDENCE_COLORS = {
  high: '#166534',
  medium: '#92400e',
  low: '#991b1b',
};

function getConfidenceLevel(score) {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function ImportReviewModal({ importId, onClose, onSuccess }) {
  const { lang } = useI18n();
  const { authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [confidenceScores, setConfidenceScores] = useState({});

  const [form, setForm] = useState({
    hotelName: '',
    destination: '',
    checkinDate: '',
    checkoutDate: '',
    roomType: 'Standard Room',
    originalPrice: '',
    currency: 'USD',
    guestName: '',
    confirmationNumber: '',
  });

  useEffect(() => {
    let isMounted = true;
    async function loadImport() {
      try {
        setLoading(true);
        const res = await authFetch(`${API}/inbound/imports/${importId}`);
        if (!res.ok) {
          const err = await res.json();
          if (isMounted) setError(err.error || 'Import not found');
          return;
        }
        const data = await res.json();
        if (isMounted && data) {
          const ext = data.extractedData || {};
          setConfidenceScores(data.confidenceData || {});
          setForm({
            hotelName: ext.hotelName || '',
            destination: ext.destination || ext.city || '',
            checkinDate: ext.checkinDate || '',
            checkoutDate: ext.checkoutDate || '',
            roomType: ext.roomType || 'Standard Room',
            originalPrice: ext.originalPrice || '',
            currency: ext.currency || 'USD',
            guestName: ext.guestName || '',
            confirmationNumber: ext.confirmationNumber || '',
          });
        }
      } catch {
        if (isMounted) setError(lang === 'pt' ? 'Erro de conexão' : 'Connection error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (importId) loadImport();
    return () => { isMounted = false; };
  }, [importId, authFetch, lang]);

  // Validation checks for essential fields
  const missingHotelName = !form.hotelName?.trim();
  const missingCheckin = !form.checkinDate;
  const missingCheckout = !form.checkoutDate;
  const missingPrice = !form.originalPrice || parseFloat(form.originalPrice) <= 0;
  const missingCurrency = !form.currency?.trim();

  const isMissingEssential = missingHotelName || missingCheckin || missingCheckout || missingPrice || missingCurrency;

  const handleConfirm = async () => {
    if (isMissingEssential) return;

    setCreating(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      const res = await authFetch(`${API}/inbound/imports/${importId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          originalPrice: parseFloat(form.originalPrice),
        }),
      });

      if (res.status === 409) {
        const dup = await res.json();
        setDuplicateWarning(dup);
        setCreating(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to confirm booking');
        setCreating(false);
        return;
      }

      const data = await res.json();
      if (onSuccess) {
        onSuccess(data.booking);
      }
    } catch {
      setError(lang === 'pt' ? 'Erro de conexão' : 'Connection error');
    }
    setCreating(false);
  };

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const hasLowConfidence = Object.values(confidenceScores).some(score => score < 0.7);

  return (
    <div className="modal-overlay animate-in" onClick={onClose}>
      <div className="import-review-modal" onClick={e => e.stopPropagation()}>
        <div className="import-review-header">
          <div>
            <h2>{lang === 'pt' ? 'Revisar Reserva Recebida' : 'Review Forwarded Booking'}</h2>
            <p className="import-review-subtitle">
              {lang === 'pt'
                ? 'Confira os dados extraídos do seu email antes de iniciar o monitoramento.'
                : 'Check details extracted from your email before starting price monitoring.'}
            </p>
          </div>
          <button className="import-modal-close" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280' }}>
            {lang === 'pt' ? 'Carregando dados da reserva...' : 'Loading booking details...'}
          </div>
        ) : (
          <div className="import-review-body">
            {hasLowConfidence && (
              <div className="doc-warning-banner">
                ⚠️ {lang === 'pt'
                  ? 'Alguns campos foram extraídos com baixa confiança. Por favor, confira com atenção.'
                  : 'Some fields were extracted with low confidence. Please double-check them.'}
              </div>
            )}

            <div className="doc-review-form">
              <DocField
                label={lang === 'pt' ? 'Nome do Hotel *' : 'Hotel Name *'}
                value={form.hotelName}
                onChange={v => handleFieldChange('hotelName', v)}
                confidence={confidenceScores.hotelName}
                isError={missingHotelName}
                errorMessage={lang === 'pt' ? 'Adicione o nome do hotel para continuar.' : 'Add the hotel name to continue.'}
              />
              <DocField
                label={lang === 'pt' ? 'Destino / Cidade' : 'Destination / City'}
                value={form.destination}
                onChange={v => handleFieldChange('destination', v)}
                confidence={confidenceScores.destination}
              />
              <DocField
                label="Check-in *"
                value={form.checkinDate}
                onChange={v => handleFieldChange('checkinDate', v)}
                confidence={confidenceScores.checkinDate}
                type="date"
                isError={missingCheckin}
                errorMessage={lang === 'pt' ? 'Adicione a data de check-in para continuar.' : 'Add the check-in date to continue.'}
              />
              <DocField
                label="Check-out *"
                value={form.checkoutDate}
                onChange={v => handleFieldChange('checkoutDate', v)}
                confidence={confidenceScores.checkoutDate}
                type="date"
                isError={missingCheckout}
                errorMessage={lang === 'pt' ? 'Adicione a data de check-out para continuar.' : 'Add the check-out date to continue.'}
              />
              <DocField
                label={lang === 'pt' ? 'Preço Total *' : 'Total Price *'}
                value={form.originalPrice}
                onChange={v => handleFieldChange('originalPrice', v)}
                confidence={confidenceScores.originalPrice}
                type="number"
                isError={missingPrice}
                errorMessage={lang === 'pt' ? 'Adicione o preço total para continuar.' : 'Add total price to continue.'}
              />
              <DocField
                label={lang === 'pt' ? 'Moeda *' : 'Currency *'}
                value={form.currency}
                onChange={v => handleFieldChange('currency', v.toUpperCase())}
                confidence={confidenceScores.currency}
                isError={missingCurrency}
                errorMessage={lang === 'pt' ? 'Adicione a moeda para continuar.' : 'Add currency to continue.'}
              />
              <DocField
                label={lang === 'pt' ? 'Tipo de Quarto' : 'Room Type'}
                value={form.roomType}
                onChange={v => handleFieldChange('roomType', v)}
                confidence={confidenceScores.roomType}
              />
              <DocField
                label={lang === 'pt' ? 'Hóspede' : 'Guest'}
                value={form.guestName}
                onChange={v => handleFieldChange('guestName', v)}
                confidence={confidenceScores.guestName}
              />
              <DocField
                label={lang === 'pt' ? 'Código de Confirmação' : 'Confirmation Code'}
                value={form.confirmationNumber}
                onChange={v => handleFieldChange('confirmationNumber', v)}
                confidence={confidenceScores.confirmationNumber}
              />
            </div>

            {duplicateWarning && (
              <div className="doc-duplicate-warning">
                <strong>{lang === 'pt' ? 'Reserva semelhante encontrada!' : 'Similar booking found!'}</strong>
                <p>{duplicateWarning.existingHotel} — {lang === 'pt' ? 'já existe uma reserva com mesmas datas.' : 'a booking with the same dates already exists.'}</p>
              </div>
            )}

            {error && <p className="doc-error">{error}</p>}

            <div className="import-modal-actions">
              <button className="doc-btn-back" onClick={onClose}>
                {lang === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                className="doc-btn-create"
                onClick={handleConfirm}
                disabled={creating || isMissingEssential}
              >
                {creating
                  ? '...'
                  : (lang === 'pt' ? 'Ativar Monitoramento' : 'Enable Monitoring')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocField({ label, value, onChange, confidence, type = 'text', isError = false, errorMessage = '' }) {
  const level = confidence != null ? getConfidenceLevel(confidence) : null;

  let inputClass = 'doc-input';
  if (isError) {
    inputClass += ' doc-input-error';
  } else if (level) {
    inputClass += ` doc-input-${level}`;
  }

  return (
    <div className="doc-field">
      <div className="doc-field-header">
        <label>{label}</label>
        {!isError && level && (
          <span
            className={`doc-confidence doc-confidence-${level}`}
            style={{ color: CONFIDENCE_COLORS[level] }}
          >
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={inputClass}
      />
      {isError && errorMessage && (
        <span className="doc-field-error-msg">{errorMessage}</span>
      )}
    </div>
  );
}

export default ImportReviewModal;
