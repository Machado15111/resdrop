import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import './DocumentUpload.css';

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

function DocumentUpload({ onSubmit, onBack }) {
  const { lang } = useI18n();
  const { authFetch } = useAuth();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState(null);
  const [importId, setImportId] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Form fields that can be edited after extraction
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

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(selectedFile.type)) {
      setError(lang === 'pt' ? 'Apenas arquivos PDF, PNG, JPG e WEBP são permitidos' : 'Only PDF, PNG, JPG, and WEBP files allowed');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(lang === 'pt' ? 'O arquivo deve ter no máximo 10MB' : 'File must be max 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setExtractedData(null);
    setDocumentId(null);
    setImportId(null);
    setDuplicateWarning(null);

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }, [lang]);

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileSelect(dropped);
  };

  // Clipboard Paste handler
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            handleFileSelect(pastedFile);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('document', file);

      const res = await authFetch(`${API}/bookings/from-document`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Upload failed');
        setUploading(false);
        return;
      }

      const data = await res.json();
      setDocumentId(data.documentId);
      setImportId(data.importId);
      const b = data.booking || data.extractedData || {};
      setExtractedData(b);
      setConfidenceScores(data.confidenceScores || {});

      // Pre-fill form with extracted data from normalized contract
      setForm(prev => ({
        ...prev,
        hotelName: b.hotelName || '',
        destination: b.destination || b.city || '',
        checkinDate: b.checkinDate || b.checkIn || '',
        checkoutDate: b.checkoutDate || b.checkOut || '',
        roomType: b.roomType || 'Standard Room',
        originalPrice: b.originalPrice || b.totalPrice || '',
        currency: b.currency || 'USD',
        guestName: b.guestName || '',
        confirmationNumber: b.confirmationNumber || b.bookingReference || '',
      }));
    } catch {
      setError(lang === 'pt' ? 'Erro de conexão' : 'Connection error');
    }
    setUploading(false);
  };

  // Validation checks for essential fields
  const missingHotelName = !form.hotelName?.trim();
  const missingCheckin = !form.checkinDate;
  const missingCheckout = !form.checkoutDate;
  const missingPrice = !form.originalPrice || parseFloat(form.originalPrice) <= 0;
  const missingCurrency = !form.currency?.trim();

  const isMissingEssential = missingHotelName || missingCheckin || missingCheckout || missingPrice || missingCurrency;

  const handleConfirmBooking = async () => {
    if (isMissingEssential) return;

    setCreating(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      const targetEndpoint = documentId
        ? `${API}/documents/${documentId}/create-booking`
        : `${API}/documents/${importId}/create-booking`;

      const res = await authFetch(targetEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          importId,
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
      if (onSubmit) {
        onSubmit(data.booking);
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
    <div className="doc-upload animate-in">
      {!extractedData ? (
        /* Upload area */
        <div className="doc-upload-area">
          <div
            className="doc-dropzone"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={e => handleFileSelect(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
            <div className="doc-dropzone-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="12" y2="12" />
                <line x1="15" y1="15" x2="12" y2="12" />
              </svg>
            </div>
            <p className="doc-dropzone-text">
              {lang === 'pt'
                ? 'Arraste, selecione um arquivo ou cole (Ctrl+V) sua imagem/PDF'
                : 'Drag, select a file, or paste (Ctrl+V) your image/PDF'}
            </p>
            <p className="doc-dropzone-hint">PDF, PNG, JPG, WEBP (max 10MB)</p>
          </div>

          {file && (
            <div className="doc-file-preview-box">
              {previewUrl && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img src={previewUrl} alt="Preview" style={{ maxHeight: 150, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                </div>
              )}
              <div className="doc-file-preview">
                <span className="doc-file-name">{file.name}</span>
                <span className="doc-file-size">{(file.size / 1024).toFixed(0)} KB</span>
                <button
                  className="doc-upload-btn"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading
                    ? (lang === 'pt' ? 'Extraindo...' : 'Extracting...')
                    : (lang === 'pt' ? 'Extrair Dados' : 'Extract Data')}
                </button>
              </div>
            </div>
          )}

          {error && <p className="doc-error">{error}</p>}
        </div>
      ) : (
        /* Review extracted data */
        <div className="doc-review">
          <div className="doc-review-header">
            <h3>{lang === 'pt' ? 'Revisar Dados da Reserva' : 'Review Booking Details'}</h3>
            <p className="doc-review-hint">
              {lang === 'pt'
                ? 'Revise os campos abaixo. O monitoramento só iniciará após a confirmação.'
                : 'Review fields below. Monitoring will only start after confirmation.'}
            </p>
          </div>

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

          <div className="doc-review-actions">
            <button
              className="doc-btn-back"
              onClick={() => {
                setExtractedData(null);
                setFile(null);
                if (onBack) onBack();
              }}
            >
              {lang === 'pt' ? 'Voltar' : 'Back'}
            </button>
            <button
              className="doc-btn-create"
              onClick={handleConfirmBooking}
              disabled={creating || isMissingEssential}
            >
              {creating
                ? '...'
                : (lang === 'pt' ? 'Confirmar Reserva' : 'Confirm Booking')}
            </button>
          </div>
        </div>
      )}
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

export default DocumentUpload;
