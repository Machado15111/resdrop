import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { IconArrowLeft, IconShield } from './Icons';
import './SubmitBooking.css';
import { API } from '../api';
import { STEP_INTAKE, STEP_PROCESSING, STEP_REVIEW, STEP_MANUAL } from './submitBooking/constants';
import IntakeStep from './submitBooking/IntakeStep';
import ProcessingPanel from './submitBooking/ProcessingPanel';
import ReviewStep from './submitBooking/ReviewStep';
import ManualStep from './submitBooking/ManualStep';

function SubmitBooking({ onSubmit, onBack, loading, error: externalError, userEmail }) {
  const { t, lang } = useI18n();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  // Synchronous re-entrancy guard: refs update immediately (no re-render round-trip),
  // so rapid double/quadruple clicks can't fire the handler more than once.
  const submittingRef = useRef(false);

  const [step, setStep] = useState(STEP_INTAKE);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [, setSourceType] = useState(null); // 'file', 'paste', 'manual'
  const [showOptional, setShowOptional] = useState(false);

  const [form, setForm] = useState({
    hotelName: '',
    destination: '',
    checkinDate: '',
    checkoutDate: '',
    roomType: 'Standard Room',
    roomTypeCustom: '',
    originalPrice: '',
    currency: 'BRL',
    taxesIncluded: true,
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
    // authFetch is stable and the !forwardAddress guard makes the extra run a
    // no-op, so the honest dependency list costs nothing here.
  }, [showForwardEmail, forwardAddress, authFetch]);

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

  // Not memoised, unlike its three siblings above: it calls processFile, which
  // closes over `lang`. With useCallback([]) this kept the processFile from the
  // first render, so a dropped file after a language switch narrated its
  // progress in the old language. A plain function always sees the current one
  // — and costs nothing, since IntakeStep re-renders with its parent anyway.
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processFile(dropped);
    }
  };

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
      const res = await authFetch(`${API}/bookings/from-email`, {
        method: 'POST',
        body: JSON.stringify({ rawEmail: pasteText, email: userEmail }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setError(data.message || (lang === 'pt' ? 'Reserva duplicada já existe.' : 'Duplicate booking already exists.'));
        setSourceType('manual');
        setStep(STEP_MANUAL);
        return;
      }

      if (data.status === 'ACTIVE_MONITORING' && data.booking?.id) {
        setProcessingStatus(lang === 'pt' ? 'Reserva criada e monitoramento ativo!' : 'Booking created and monitoring active!');
        setTimeout(() => navigate(`/bookings/${data.booking.id}`), 600);
        return;
      }

      const b = data.booking || data.parsed || {};
      const hasAnyData = b.hotelName || b.checkIn || b.checkinDate || b.checkOut || b.checkoutDate || b.totalPrice || b.originalPrice || b.bookingReference || b.confirmationNumber;

      if (hasAnyData) {
        setForm(prev => ({
          ...prev,
          hotelName: b.hotelName || prev.hotelName,
          destination: b.city || b.destination || prev.destination,
          checkinDate: b.checkIn || b.checkinDate || prev.checkinDate,
          checkoutDate: b.checkOut || b.checkoutDate || prev.checkoutDate,
          roomType: b.roomType || prev.roomType,
          originalPrice: b.totalPrice || b.originalPrice || prev.originalPrice,
          confirmationNumber: b.bookingReference || b.confirmationNumber || prev.confirmationNumber,
          guestName: b.guestName || prev.guestName,
        }));
        const missing = data.missingFields || [];
        setTimeout(() => setStep(missing.length === 0 ? STEP_REVIEW : STEP_MANUAL), 600);
      } else {
        setError(lang === 'pt'
          ? 'Não foi possível extrair dados. Preencha o formulário abaixo.'
          : 'Could not extract data. Please fill in the form below.');
        setSourceType('manual');
        setStep(STEP_MANUAL);
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError(lang === 'pt' ? 'Erro ao analisar. Preencha o formulário abaixo.' : 'Parse error. Please fill in the form below.');
      setSourceType('manual');
      setStep(STEP_MANUAL);
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
    // Re-entrancy guard — bail immediately if a submit is already in flight.
    if (submittingRef.current) return;
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

    // Lock the handler for the duration of the async work. Reset in `finally`
    // so the user can retry after an error, but never fire twice in flight.
    submittingRef.current = true;
    setSubmitting(true);

    try {
      // If we have a documentId, create booking via document route
      if (documentId) {
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
        // Booking already created — navigate directly, don't re-POST
        navigate(`/bookings/${data.booking.id}`);
        return;
      }

      // Regular form submit — parent owns the request; await it so the guard
      // stays locked until the parent resolves (success navigates away, error
      // flips `loading` back off).
      const submitData = { ...form };
      if (submitData.roomType !== 'Other') {
        delete submitData.roomTypeCustom;
      }
      await onSubmit(submitData);
    } catch {
      setError(lang === 'pt' ? 'Erro de conexão' : 'Connection error');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
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
            <IntakeStep
              copiedEmail={copiedEmail}
              copyForwardAddress={copyForwardAddress}
              dropzoneRef={dropzoneRef}
              error={error}
              fileInputRef={fileInputRef}
              forwardAddress={forwardAddress}
              handleDragEnter={handleDragEnter}
              handleDragLeave={handleDragLeave}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleFileSelect={handleFileSelect}
              isDragging={isDragging}
              pasteText={pasteText}
              processPastedText={processPastedText}
              setPasteText={setPasteText}
              setShowForwardEmail={setShowForwardEmail}
              setShowPaste={setShowPaste}
              setSourceType={setSourceType}
              setStep={setStep}
              showForwardEmail={showForwardEmail}
              showPaste={showPaste}
            />
          )}

          {/* ═══ STEP: PROCESSING ═══ */}
          {step === STEP_PROCESSING && (
            <ProcessingPanel
              file={file}
              processingStatus={processingStatus}
            />
          )}

          {/* ═══ STEP: REVIEW ═══ */}
          {step === STEP_REVIEW && (
            <ReviewStep
              confidenceScores={confidenceScores}
              duplicateWarning={duplicateWarning}
              error={error}
              externalError={externalError}
              form={form}
              handleFieldChange={handleFieldChange}
              handleSubmit={handleSubmit}
              loading={loading}
              resetToIntake={resetToIntake}
              submitting={submitting}
            />
          )}

          {/* ═══ STEP: MANUAL FORM ═══ */}
          {step === STEP_MANUAL && (
            <ManualStep
              error={error}
              externalError={externalError}
              form={form}
              handleChange={handleChange}
              handleHotelChange={handleHotelChange}
              handleSubmit={handleSubmit}
              hotelSuggestions={hotelSuggestions}
              loading={loading}
              resetToIntake={resetToIntake}
              selectHotel={selectHotel}
              setForm={setForm}
              setShowOptional={setShowOptional}
              setShowSuggestions={setShowSuggestions}
              showOptional={showOptional}
              showSuggestions={showSuggestions}
              submitting={submitting}
              today={today}
              togglePreference={togglePreference}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Review Field Component ---

export default SubmitBooking;
