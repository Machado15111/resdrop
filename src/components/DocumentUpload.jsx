import { useState, useRef } from 'react';
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

function DocumentUpload({ onSubmit, userEmail, onBack }) {
  const { t, lang } = useI18n();
  const { authFetch } = useAuth();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState(null);
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
    guestName: '',
    confirmationNumber: '',
  });

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setExtractedData(null);
      setDocumentId(null);
      setDuplicateWarning(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setError(null);
      setExtractedData(null);
      setDocumentId(null);
    }
  };

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
      setExtractedData(data.extractedData);
      setConfidenceScores(data.confidenceScores || {});

      // Pre-fill form with extracted data
      setForm(prev => ({
        ...prev,
        hotelName: data.extractedData.hotelName || '',
        destination: data.extractedData.destination || '',
        checkinDate: data.extractedData.checkinDate || '',
        checkoutDate: data.extractedData.checkoutDate || '',
        roomType: data.extractedData.roomType || 'Standard Room',
        originalPrice: data.extractedData.originalPrice || '',
        guestName: data.extractedData.guestName || '',
        confirmationNumber: data.extractedData.confirmationNumber || '',
      }));
    } catch (err) {
      setError('Connection error');
    }
    setUploading(false);
  };

  const handleCreateBooking = async () => {
    if (!form.hotelName || !form.checkinDate || !form.checkoutDate || !form.originalPrice) {
      setError(lang === 'pt' ? 'Preencha os campos obrigatórios' : 'Fill in required fields');
      return;
    }

    setCreating(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      const res = await authFetch(`${API}/documents/${documentId}/create-booking`, {
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
        setError(err.error || 'Failed to create booking');
        setCreating(false);
        return;
      }

      const data = await res.json();
      // Call parent onSubmit to navigate to dashboard
      if (onSubmit) {
        onSubmit(data.booking);
      }
    } catch (err) {
      setError('Connection error');
    }
    setCreating(false);
  };

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

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
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
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
                ? 'Arraste seu PDF ou clique para selecionar'
                : 'Drag your PDF or click to select'}
            </p>
            <p className="doc-dropzone-hint">PDF, PNG, JPG (max 10MB)</p>
          </div>

          {file && (
            <div className="doc-file-preview">
              <span className="doc-file-name">{file.name}</span>
              <span className="doc-file-size">{(file.size / 1024).toFixed(0)} KB</span>
              <button
                className="doc-upload-btn"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading
                  ? (lang === 'pt' ? 'Processando...' : 'Processing...')
                  : (lang === 'pt' ? 'Extrair Dados' : 'Extract Data')}
              </button>
            </div>
          )}

          {error && <p className="doc-error">{error}</p>}
        </div>
      ) : (
        /* Review extracted data */
        <div className="doc-review">
          <div className="doc-review-header">
            <h3>{lang === 'pt' ? 'Dados Extraídos' : 'Extracted Data'}</h3>
            <p className="doc-review-hint">
              {lang === 'pt'
                ? 'Revise e corrija os campos abaixo antes de criar a reserva.'
                : 'Review and correct fields below before creating the booking.'}
            </p>
          </div>

          <div className="doc-review-form">
            <DocField
              label={lang === 'pt' ? 'Hotel *' : 'Hotel *'}
              value={form.hotelName}
              onChange={v => handleFieldChange('hotelName', v)}
              confidence={confidenceScores.hotelName}
            />
            <DocField
              label={lang === 'pt' ? 'Destino' : 'Destination'}
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
            />
            <DocField
              label="Check-out *"
              value={form.checkoutDate}
              onChange={v => handleFieldChange('checkoutDate', v)}
              confidence={confidenceScores.checkoutDate}
              type="date"
            />
            <DocField
              label={lang === 'pt' ? 'Tipo de Quarto' : 'Room Type'}
              value={form.roomType}
              onChange={v => handleFieldChange('roomType', v)}
              confidence={confidenceScores.roomType}
            />
            <DocField
              label={lang === 'pt' ? 'Preço Original *' : 'Original Price *'}
              value={form.originalPrice}
              onChange={v => handleFieldChange('originalPrice', v)}
              confidence={confidenceScores.originalPrice}
              type="number"
            />
            <DocField
              label={lang === 'pt' ? 'Hóspede' : 'Guest'}
              value={form.guestName}
              onChange={v => handleFieldChange('guestName', v)}
              confidence={confidenceScores.guestName}
            />
            <DocField
              label={lang === 'pt' ? 'Confirmação' : 'Confirmation'}
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
            <button className="doc-btn-back" onClick={() => { setExtractedData(null); setFile(null); }}>
              {lang === 'pt' ? 'Voltar' : 'Back'}
            </button>
            <button
              className="doc-btn-create"
              onClick={handleCreateBooking}
              disabled={creating}
            >
              {creating
                ? '...'
                : (lang === 'pt' ? 'Criar Reserva' : 'Create Booking')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocField({ label, value, onChange, confidence, type = 'text' }) {
  const level = confidence != null ? getConfidenceLevel(confidence) : null;

  return (
    <div className="doc-field">
      <div className="doc-field-header">
        <label>{label}</label>
        {level && (
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
        className={level ? `doc-input doc-input-${level}` : 'doc-input'}
      />
    </div>
  );
}

export default DocumentUpload;
