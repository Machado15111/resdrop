import { useState, useRef, useCallback, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { IconArrowLeft, IconMail, IconUpload, IconArrowRight, IconShield, IconChevronDown, IconCheck, IconX } from './Icons';
import './SubmitBooking.css';
import { API } from '../api';

const ROOM_TYPES = [
  { value: 'Standard Room', pt: 'Quarto Standard', en: 'Standard Room' },
  { value: 'Superior Room', pt: 'Quarto Superior', en: 'Superior Room' },
  { value: 'Deluxe Room', pt: 'Quarto Deluxe', en: 'Deluxe Room' },
  { value: 'Junior Suite', pt: 'Suíte Júnior', en: 'Junior Suite' },
  { value: 'Studio', pt: 'Studio', en: 'Studio' },
  { value: 'Suite', pt: 'Suíte', en: 'Suite' },
  { value: 'Penthouse', pt: 'Penthouse', en: 'Penthouse' },
  { value: 'Other', pt: 'Outro', en: 'Other' },
];

const PREFERENCES = [
  { value: 'sea_view', pt: 'Vista Mar', en: 'Sea View' },
  { value: 'high_floor', pt: 'Andar Alto', en: 'High Floor' },
  { value: 'lowest_category', pt: 'Categoria Mais Baixa', en: 'Lowest Category' },
  { value: 'suite', pt: 'Suíte', en: 'Suite' },
  { value: 'junior_suite', pt: 'Suíte Júnior', en: 'Junior Suite' },
];

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

// Intake step constants
const STEP_INTAKE = 'intake';
const STEP_PROCESSING = 'processing';
const STEP_REVIEW = 'review';
const STEP_MANUAL = 'manual';

function SubmitBooking({ onSubmit, onBack, loading, error: externalError, userEmail }) {
  const { t, lang } = useI18n();
  const { authFetch } = useAuth();
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);

  const [step, setStep] = useState(STEP_INTAKE);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [sourceType, setSourceType] = useState(null); // 'file', 'paste', 'manual'
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
    cancellationPolicy: 'free_cancellation',
  });

  const [hotelSuggestions, setHotelSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showForwardEmail, setShowForwardEmail] = useState(false);
  const [forwardAddress, setForwardAddress] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Fetch inbound email address
  useEffect(() => {
    if (showForwardEmail && !forwardAddress) {
      authFetch(`${API}/inbound/address`)
        .then(res => res.json())
        .then(data => setForwardAddress(data.primary || data.address || 'reservas@resdrop.app'))
        .catch(() => setForwardAddress('reservas@resdrop.app'));
    }
  }, [showForwardEmail]);

  const copyForwardAddress = () => {
    navigator.clipboard.writeText(forwardAddress || 'reservas@resdrop.app');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  // --- Drag & Drop ---
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropzoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processFile(dropped);
    }
  }, []);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  // --- Process file (PDF/image) ---
  const processFile = async (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setSourceType('file');
    setStep(STEP_PROCESSING);
    setProcessingStatus(lang === 'pt' ? 'Enviando documento...' : 'Uploading document...');

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);

      setProcessingStatus(lang === 'pt' ? 'Extraindo dados da reserva...' : 'Extracting booking data...');

      const res = await authFetch(`${API}/bookings/from-document`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || (lang === 'pt' ? 'Falha no upload' : 'Upload failed'));
        setStep(STEP_INTAKE);
        return;
      }

      const data = await res.json();
      setDocumentId(data.documentId);
      setConfidenceScores(data.confidenceScores || {});

      setProcessingStatus(lang === 'pt' ? 'Preparando revisão...' : 'Preparing review...');

      // Pre-fill form
      const extracted = data.extractedData || {};
      setForm(prev => ({
        ...prev,
        hotelName: extracted.hotelName || '',
        destination: extracted.destination || '',
        checkinDate: extracted.checkinDate || '',
        checkoutDate: extracted.checkoutDate || '',
        roomType: extracted.roomType || 'Standard Room',
        originalPrice: extracted.originalPrice || '',
        guestName: extracted.guestName || '',
        confirmationNumber: extracted.confirmationNumber || '',
      }));

      setTimeout(() => setStep(STEP_REVIEW), 600);
    } catch (err) {
      console.error('Upload error:', err);
      setError(lang === 'pt' ? 'Erro de conexão' : 'Connection error');
      setStep(STEP_INTAKE);
    }
  };

  // --- Process pasted text/email ---
  const processPastedText = async () => {
    if (!pasteText.trim()) return;
    setSourceType('paste');
    setStep(STEP_PROCESSING);
    setProcessingStatus(lang === 'pt' ? 'Analisando texto...' : 'Analyzing text...');
    setError(null);

    try {
      const res = await fetch(`${API}/bookings/from-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawEmail: pasteText, email: userEmail }),
      });
      if (!res.ok) {
        throw new Error(`Primary endpoint failed with status ${res.status}`);
      }
      const data = await res.json();

      if (data.status === 'created' && data.booking) {
        setProcessingStatus(lang === 'pt' ? 'Reserva criada!' : 'Booking created!');
        setTimeout(() => window.location.reload(), 800);
        return;
      }

      // Try to extract data from any response shape
      const p = data.parsed || data.extractedData || data;
      const hasAnyData = p.hotelName || p.checkinDate || p.checkoutDate || p.originalPrice || p.confirmationNumber;

      if (hasAnyData) {
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
        // If we have enough data for review, go there; otherwise manual form
        const hasRequired = p.hotelName && p.checkinDate && p.checkoutDate && p.originalPrice;
        setTimeout(() => setStep(hasRequired ? STEP_REVIEW : STEP_MANUAL), 600);
      } else {
        setError(lang === 'pt'
          ? 'Não foi possível extrair dados. Preencha o formulário abaixo.'
          : 'Could not extract data. Please fill in the form below.');
        setSourceType('manual');
        setStep(STEP_MANUAL);
      }
    } catch (err) {
      console.error('Parse error:', err);
      // Fallback to secondary endpoint
      try {
        const res2 = await fetch(`${API}/parse-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailContent: pasteText }),
        });
        const parsed = await res2.json();
        const fallbackFields = {};
        // Only merge known booking fields to avoid polluting state
        for (const key of ['hotelName', 'destination', 'checkinDate', 'checkoutDate', 'roomType', 'originalPrice', 'confirmationNumber', 'guestName']) {
          if (parsed[key]) fallbackFields[key] = parsed[key];
        }
        setForm(prev => ({ ...prev, ...fallbackFields }));
        const hasRequired = fallbackFields.hotelName && fallbackFields.checkinDate && fallbackFields.checkoutDate && fallbackFields.originalPrice;
        setTimeout(() => setStep(hasRequired ? STEP_REVIEW : STEP_MANUAL), 400);
      } catch {
        setError(lang === 'pt' ? 'Erro ao analisar. Preencha o formulário abaixo.' : 'Parse error. Please fill in the form below.');
        setSourceType('manual');
        setStep(STEP_MANUAL);
      }
    }
  };

  // --- Hotel autocomplete ---
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

  // --- Form handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    // Clear checkout if it's on or before the new checkin date
    if (name === 'checkinDate' && updated.checkoutDate && updated.checkoutDate <= value) {
      updated.checkoutDate = '';
    }
    // Prevent negative prices at input level
    if (name === 'originalPrice' && value !== '' && parseFloat(value) < 0) {
      return;
    }
    setForm(updated);
  };

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const togglePreference = (value) => {
    setForm(prev => ({
      ...prev,
      preferences: prev.preferences.includes(value)
        ? prev.preferences.filter(p => p !== value)
        : [...prev.preferences, value],
    }));
  };

  // --- Submit from review or manual form ---
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.hotelName || !form.checkinDate || !form.checkoutDate || !form.originalPrice) return;
    if (form.roomType === 'Other' && !form.roomTypeCustom.trim()) return;

    setError(null);
    setDuplicateWarning(null);
    
    // Validate price is positive
    const price = parseFloat(form.originalPrice);
    if (isNaN(price) || price <= 0) {
      setError(lang === 'pt' ? 'O preço deve ser maior que zero.' : 'Price must be greater than zero.');
      return;
    }

    // Validate checkout is strictly after checkin
    if (form.checkoutDate <= form.checkinDate) {
      setError(lang === 'pt'
        ? 'A data de check-out deve ser posterior à data de check-in.'
        : 'Check-out date must be after check-in date.');
      return;
    }

    // If we have a documentId, create booking via document route
    if (documentId) {
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
          return;
        }

        if (!res.ok) {
          const err = await res.json();
          setError(err.error || (lang === 'pt' ? 'Falha ao criar reserva' : 'Failed to create booking'));
          return;
        }

        const data = await res.json();
        if (onSubmit) onSubmit(data.booking);
      } catch (err) {
        setError(lang === 'pt' ? 'Erro de conexão' : 'Connection error');
      }
      return;
    }

    // Regular form submit
    const submitData = { ...form };
    if (submitData.roomType !== 'Other') {
      delete submitData.roomTypeCustom;
    }
    onSubmit(submitData);
  };

  // --- Reset to intake ---
  const resetToIntake = () => {
    setStep(STEP_INTAKE);
    setFile(null);
    setError(null);
    setDocumentId(null);
    setConfidenceScores({});
    setDuplicateWarning(null);
    setSourceType(null);
    setProcessingStatus('');
  };

  return (
    <div className="submit-page">
      <div className="submit-bg-shapes" aria-hidden="true">
        <div className="submit-shape submit-shape-1" />
        <div className="submit-shape submit-shape-2" />
        <div className="submit-shape submit-shape-3" />
      </div>

      <div className="submit-centered">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          <IconArrowLeft size={16} />
          {t('submit.back')}
        </button>

        <div className="submit-card">
          <div className="submit-header">
            <div className="submit-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h1>{t('submit.title')}</h1>
            <p>{t('submit.subtitle')}</p>
          </div>

          <div className="submit-refundable-notice">
            <IconShield size={16} />
            <span>{lang === 'pt'
              ? 'Este serviço funciona apenas com reservas que possuem cancelamento gratuito. Reservas não reembolsáveis não se beneficiam do monitoramento.'
              : 'This service works only with free cancellation bookings. Non-refundable bookings do not benefit from monitoring.'
            }</span>
          </div>

          {/* ═══ STEP: INTAKE ═══ */}
          {step === STEP_INTAKE && (
            <div className="intake-flow animate-in">
              {/* Drop zone */}
              <div
                ref={dropzoneRef}
                className={`intake-dropzone ${isDragging ? 'intake-dropzone-active' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div className="intake-dropzone-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="12" y2="12" />
                    <line x1="15" y1="15" x2="12" y2="12" />
                  </svg>
                </div>
                <p className="intake-dropzone-title">
                  {lang === 'pt'
                    ? 'Arraste seu comprovante de reserva aqui'
                    : 'Drop your booking confirmation here'}
                </p>
                <p className="intake-dropzone-subtitle">
                  {lang === 'pt'
                    ? 'ou clique para selecionar um arquivo'
                    : 'or click to select a file'}
                </p>
                <div className="intake-formats">
                  <span className="intake-format-pill">PDF</span>
                  <span className="intake-format-pill">PNG</span>
                  <span className="intake-format-pill">JPG</span>
                  <span className="intake-format-pill">Screenshot</span>
                </div>
              </div>

              {/* What we can read */}
              <div className="intake-capabilities">
                <p className="intake-capabilities-title">
                  {lang === 'pt' ? 'O que podemos ler:' : 'What we can read:'}
                </p>
                <div className="intake-capabilities-list">
                  <span>
                    <IconCheck size={14} />
                    {lang === 'pt' ? 'PDF de confirmação' : 'Confirmation PDF'}
                  </span>
                  <span>
                    <IconCheck size={14} />
                    {lang === 'pt' ? 'Screenshot da reserva' : 'Booking screenshot'}
                  </span>
                  <span>
                    <IconCheck size={14} />
                    {lang === 'pt' ? 'Email de confirmação' : 'Confirmation email'}
                  </span>
                  <span>
                    <IconCheck size={14} />
                    {lang === 'pt' ? 'Texto copiado' : 'Copied text'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="intake-divider">
                <span>{lang === 'pt' ? 'ou' : 'or'}</span>
              </div>

              {/* Paste text toggle */}
              {!showPaste && !showForwardEmail ? (
                <div className="intake-alt-actions">
                  <button className="intake-alt-btn" onClick={() => setShowPaste(true)}>
                    <IconMail size={16} />
                    {lang === 'pt' ? 'Colar email ou texto de confirmação' : 'Paste confirmation email or text'}
                  </button>
                  <button className="intake-alt-btn" onClick={() => setShowForwardEmail(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 17 20 12 15 7" />
                      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                    </svg>
                    {lang === 'pt' ? 'Encaminhar email de confirmação' : 'Forward confirmation email'}
                  </button>
                  <button className="intake-alt-btn" onClick={() => { setSourceType('manual'); setStep(STEP_MANUAL); }}>
                    <IconUpload size={16} />
                    {lang === 'pt' ? 'Preencher manualmente' : 'Enter manually'}
                  </button>
                </div>
              ) : (
                <div className="intake-paste-area animate-in">
                  <label className="intake-paste-label">
                    {lang === 'pt'
                      ? 'Cole o email de confirmação, texto copiado ou dados da reserva:'
                      : 'Paste your confirmation email, copied text, or booking details:'}
                  </label>
                  <textarea
                    className="intake-textarea"
                    placeholder={lang === 'pt'
                      ? 'Cole aqui o conteúdo do email de confirmação do hotel, ou os dados da reserva em qualquer formato...'
                      : 'Paste your hotel confirmation email content, or booking details in any format...'}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={8}
                    autoFocus
                  />
                  <div className="intake-paste-actions">
                    <button
                      className="intake-paste-cancel"
                      onClick={() => { setShowPaste(false); setPasteText(''); }}
                    >
                      {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      className="intake-paste-submit"
                      onClick={processPastedText}
                      disabled={!pasteText.trim()}
                    >
                      {lang === 'pt' ? 'Analisar e Extrair' : 'Analyze & Extract'}
                      <IconArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Forward email panel */}
              {showForwardEmail && !showPaste && (
                <div className="intake-forward-area animate-in">
                  <div className="intake-forward-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 17 20 12 15 7" />
                      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                    </svg>
                    <span>
                      {lang === 'pt'
                        ? 'Encaminhe o email de confirmação do hotel para:'
                        : 'Forward your hotel confirmation email to:'}
                    </span>
                  </div>
                  <div className="intake-forward-address-box">
                    <code className="intake-forward-address">
                      {forwardAddress || 'reservas@resdrop.app'}
                    </code>
                    <span className="intake-forward-alt">
                      {lang === 'pt' ? 'ou' : 'or'} <code>reservations@resdrop.app</code>
                    </span>
                    <button className="intake-forward-copy" onClick={copyForwardAddress}>
                      {copiedEmail ? (
                        <>
                          <IconCheck size={14} />
                          {lang === 'pt' ? 'Copiado!' : 'Copied!'}
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          {lang === 'pt' ? 'Copiar' : 'Copy'}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="intake-forward-steps">
                    <div className="intake-forward-step">
                      <span className="intake-forward-step-num">1</span>
                      <span>{lang === 'pt'
                        ? 'Abra o email de confirmação do hotel no seu email'
                        : 'Open the hotel confirmation email in your inbox'}</span>
                    </div>
                    <div className="intake-forward-step">
                      <span className="intake-forward-step-num">2</span>
                      <span>{lang === 'pt'
                        ? 'Encaminhe para o endereço acima'
                        : 'Forward it to the address above'}</span>
                    </div>
                    <div className="intake-forward-step">
                      <span className="intake-forward-step-num">3</span>
                      <span>{lang === 'pt'
                        ? 'Extraímos os dados automaticamente e notificamos você'
                        : 'We extract the data automatically and notify you'}</span>
                    </div>
                  </div>
                  <p className="intake-forward-note">
                    <IconShield size={14} />
                    {lang === 'pt'
                      ? 'Use o mesmo email cadastrado no ResDrop. Emails de remetentes não cadastrados são descartados.'
                      : 'Use the same email registered on ResDrop. Emails from unregistered senders are discarded.'}
                  </p>
                  <button
                    className="intake-paste-cancel"
                    onClick={() => setShowForwardEmail(false)}
                  >
                    {lang === 'pt' ? 'Voltar' : 'Back'}
                  </button>
                </div>
              )}

              {error && <p className="intake-error">{error}</p>}
            </div>
          )}

          {/* ═══ STEP: PROCESSING ═══ */}
          {step === STEP_PROCESSING && (
            <div className="processing-state animate-in">
              <div className="processing-animation">
                <div className="processing-ring" />
                <div className="processing-ring processing-ring-2" />
                <div className="processing-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
              </div>
              <p className="processing-status">{processingStatus}</p>
              {file && (
                <p className="processing-file">{file.name}</p>
              )}
              <div className="processing-steps">
                <ProcessingStep
                  label={lang === 'pt' ? 'Documento recebido' : 'Document received'}
                  done={true}
                />
                <ProcessingStep
                  label={lang === 'pt' ? 'Extraindo informações' : 'Extracting information'}
                  done={processingStatus.includes('Preparando') || processingStatus.includes('Preparing')}
                  active={!processingStatus.includes('Preparando') && !processingStatus.includes('Preparing')}
                />
                <ProcessingStep
                  label={lang === 'pt' ? 'Preparando revisão' : 'Preparing review'}
                  done={false}
                  active={processingStatus.includes('Preparando') || processingStatus.includes('Preparing')}
                />
              </div>
            </div>
          )}

          {/* ═══ STEP: REVIEW ═══ */}
          {step === STEP_REVIEW && (
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
                  disabled={loading || !form.hotelName.trim() || !form.checkinDate || !form.checkoutDate || !form.originalPrice || parseFloat(form.originalPrice) <= 0 || form.checkoutDate <= form.checkinDate}
                >
                  {loading ? (
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
          )}

          {/* ═══ STEP: MANUAL FORM ═══ */}
          {step === STEP_MANUAL && (
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
                    <input
                      className="form-input"
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

                {/* Taxes included */}
                <label className="taxes-checkbox">
                  <input
                    type="checkbox"
                    checked={form.taxesIncluded}
                    onChange={(e) => setForm(prev => ({ ...prev, taxesIncluded: e.target.checked }))}
                  />
                  <span>{t('submit.taxesIncluded')}</span>
                </label>

                {/* PNR / Confirmation Number */}
                <div className="form-group pnr-field-main">
                  <label className="form-label">
                    {t('submit.confirmationCode') || (lang === 'pt' ? 'Código de Confirmação (PNR)' : 'Confirmation Code (PNR)')}
                    <span className="field-hint">
                      {lang === 'pt' ? 'Opcional, mas muito recomendado para o hotel.' : 'Optional, but highly recommended.'}
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
                  disabled={loading || !form.hotelName.trim() || !form.checkinDate || !form.checkoutDate || !form.originalPrice || parseFloat(form.originalPrice) <= 0 || form.checkoutDate <= form.checkinDate || !form.roomType || (form.roomType === 'Other' && !form.roomTypeCustom.trim())}
                >
                  {loading ? (
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
          )}
        </div>
      </div>
    </div>
  );
}

// --- Review Field Component ---
function ReviewField({ label, value, onChange, confidence, type = 'text', required, lang }) {
  const level = confidence != null ? getConfidenceLevel(confidence) : null;

  return (
    <div className="review-field">
      <div className="review-field-header">
        <label>{label}{required ? ' *' : ''}</label>
        {level && (
          <span
            className={`review-confidence review-confidence-${level}`}
            style={{ color: CONFIDENCE_COLORS[level] }}
          >
            {level === 'high' ? (lang === 'pt' ? 'Alta' : 'High') :
             level === 'medium' ? (lang === 'pt' ? 'Média' : 'Med') :
             (lang === 'pt' ? 'Baixa' : 'Low')}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`review-input ${level ? `review-input-${level}` : ''} ${!value && required ? 'review-input-empty' : ''}`}
        required={required}
      />
    </div>
  );
}

// --- Processing Step Indicator ---
function ProcessingStep({ label, done, active }) {
  return (
    <div className={`processing-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
      <div className="processing-step-dot">
        {done && <IconCheck size={10} />}
      </div>
      <span>{label}</span>
    </div>
  );
}

export default SubmitBooking;
