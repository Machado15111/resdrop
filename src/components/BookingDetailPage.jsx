import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { API } from '../api';
import BookingDetail from './BookingDetail';
import './BookingDetailPage.css';

// How many usable photos a hotelData blob carries (0 for a metadata-only match).
const galleryImages = (hd) => (Array.isArray(hd?.images) ? hd.images.filter(Boolean).length : 0);

// First usable photo URL — tolerates legacy {url}/{urlHd} objects.
const firstImageUrl = (hd) => {
  const raw = (hd?.images || []).find(Boolean);
  return typeof raw === 'string' ? raw : (raw?.urlHd || raw?.url || '');
};

// Booking mutations (/check, PUT) return the booking WITHOUT hotelData — the
// gallery/imagery lives in a separate store and is attached only by GET /:id and
// the progressive /hotel call. Replacing the booking wholesale would blank the
// already-loaded gallery (the classic "image vanishes after Atualizar Preços"),
// so keep whichever side actually has photos and never let an empty gallery
// overwrite a populated one. This is what "freezes" the picture on the client.
const mergeHotelData = (prev, next) => {
  const hotelData = galleryImages(next?.hotelData) > 0
    ? next.hotelData
    : (galleryImages(prev?.hotelData) > 0 ? prev.hotelData : (next?.hotelData ?? prev?.hotelData ?? null));
  return {
    ...next,
    hotelData,
    nuiteeHotelId: next?.nuiteeHotelId ?? prev?.nuiteeHotelId ?? null,
  };
};

// Never let a slow upstream trap the user on the loading screen: each stage
// resolves (with whatever it has) once its budget is spent.
const IMAGE_TIMEOUT_MS = 6000;
const PRICE_TIMEOUT_MS = 25000;

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

// Decode the hero image before revealing the page so it never pops in blank.
const preloadImage = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve();
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  });

function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const { lang } = useI18n();
  const pt = lang === 'pt';
  const [booking, setBooking] = useState(null);
  const [bookingState, setBookingState] = useState(null);
  const [loading, setLoading] = useState(true);
  // What the loading screen is currently waiting on.
  const [phase, setPhase] = useState('booking');
  // Guards the one-shot initial load against React 18 StrictMode double-mount.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    // Pull imagery that the fast booking response didn't include. Returns the
    // hotelData actually applied so the caller can preload the hero image.
    const ensureHotelData = async (data) => {
      if (galleryImages(data.hotelData) > 0) return data.hotelData;
      try {
        const r = await authFetch(`${API}/bookings/${id}/hotel`);
        if (!r.ok) return data.hotelData;
        const h = await r.json();
        if (cancelled || !h?.hotelData) return data.hotelData;
        setBooking(prev => {
          if (!prev) return prev;
          // Never let a late, emptier response clobber a gallery on screen.
          if (galleryImages(prev.hotelData) > 0 && galleryImages(h.hotelData) === 0) return prev;
          return { ...prev, hotelData: h.hotelData, nuiteeHotelId: h.nuiteeHotelId ?? prev.nuiteeHotelId };
        });
        return h.hotelData;
      } catch {
        return data.hotelData;
      }
    };

    // Run the very first price check automatically so the screen never opens on
    // an empty "click Refresh" panel. Gated on lastChecked — once a booking has
    // been checked, revisits reuse the stored quotes and no rate-search quota is
    // spent on a page view (the daily monitor keeps them fresh).
    const ensurePrices = async (data) => {
      if (data.lastChecked) return;
      try {
        const r = await authFetch(`${API}/bookings/${id}/check`, { method: 'POST' });
        if (!r.ok || cancelled) return;
        const updated = await r.json();
        if (cancelled) return;
        setBooking(prev => (prev ? mergeHotelData(prev, updated) : prev));
      } catch { /* keep whatever the booking already had */ }
    };

    const run = async () => {
      let data;
      try {
        const res = await authFetch(`${API}/bookings/${id}`);
        if (!res.ok) {
          navigate('/dashboard', { replace: true });
          return;
        }
        data = await res.json();
      } catch {
        if (!cancelled) navigate('/dashboard', { replace: true });
        return;
      }
      if (cancelled) return;
      setBooking(data);

      // Imagery and the rate search are independent — run them together so the
      // wait is the slower of the two, not their sum.
      setPhase(data.lastChecked ? 'hotel' : 'prices');
      const hotelPromise = withTimeout(ensureHotelData(data), IMAGE_TIMEOUT_MS);
      const pricePromise = withTimeout(ensurePrices(data), PRICE_TIMEOUT_MS);

      const hotelData = await hotelPromise;
      if (!cancelled) await withTimeout(preloadImage(firstImageUrl(hotelData)), IMAGE_TIMEOUT_MS);
      await pricePromise;

      if (!cancelled) setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [id, authFetch, navigate]);

  const handleRefresh = async (bookingId) => {
    setBookingState({ state: 'loading' });
    try {
      const res = await authFetch(`${API}/bookings/${bookingId}/check`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        setBookingState({ state: 'error', message: err.message || 'Falha' });
        return;
      }
      const updated = await res.json();
      setBooking(prev => mergeHotelData(prev, updated));
      setBookingState({ state: 'success', message: pt ? 'Preços verificados' : 'Prices checked' });
      setTimeout(() => setBookingState(null), 3000);
    } catch {
      setBookingState({ state: 'error', message: pt ? 'Erro de conexão' : 'Connection error' });
      setTimeout(() => setBookingState(null), 3000);
    }
  };

  const handleUpdate = async (bookingId, updates) => {
    try {
      const res = await authFetch(`${API}/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        return { error: err.error || 'Failed to update' };
      }
      const updated = await res.json();
      setBooking(prev => mergeHotelData(prev, updated));
      return { success: true };
    } catch {
      return { error: 'Connection error' };
    }
  };

  const handleConfirmSavings = async (bookingId, data) => {
    try {
      const res = await authFetch(`${API}/bookings/${bookingId}/confirm-savings`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        // Re-fetch booking to get updated status (keeping the loaded gallery).
        const bookingRes = await authFetch(`${API}/bookings/${bookingId}`);
        if (bookingRes.ok) {
          const fresh = await bookingRes.json();
          setBooking(prev => mergeHotelData(prev, fresh));
        }
      }
    } catch (err) {
      console.error('Failed to confirm savings:', err);
    }
  };

  const handleDismissSavings = async (bookingId, data) => {
    try {
      const res = await authFetch(`${API}/bookings/${bookingId}/dismiss-savings`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const bookingRes = await authFetch(`${API}/bookings/${bookingId}`);
        if (bookingRes.ok) {
          const fresh = await bookingRes.json();
          setBooking(prev => mergeHotelData(prev, fresh));
        }
      }
    } catch (err) {
      console.error('Failed to dismiss savings:', err);
    }
  };

  if (loading) {
    const label = phase === 'prices'
      ? (pt ? 'Buscando as melhores tarifas…' : 'Searching for the best rates…')
      : (pt ? 'Carregando sua reserva…' : 'Loading your reservation…');
    const hint = phase === 'prices'
      ? (pt ? 'Consultando Booking.com, Expedia e o site oficial do hotel.' : 'Checking Booking.com, Expedia and the hotel’s official site.')
      : (pt ? 'Buscando as informações do hotel.' : 'Fetching the hotel details.');
    return (
      <div className="bdp-loading" role="status" aria-live="polite">
        <div className="bdp-loading-card">
          <div className="bdp-spinner" aria-hidden="true" />
          <p className="bdp-loading-label">{label}</p>
          <p className="bdp-loading-hint">{hint}</p>
        </div>
      </div>
    );
  }
  if (!booking) return null;

  return (
    <BookingDetail
      booking={booking}
      onBack={() => navigate('/dashboard')}
      onRefresh={handleRefresh}
      onUpdate={handleUpdate}
      bookingState={bookingState}
      onConfirmSavings={handleConfirmSavings}
      onDismissSavings={handleDismissSavings}
    />
  );
}

export default BookingDetailPage;
