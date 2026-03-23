import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../api';
import BookingDetail from './BookingDetail';

function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [booking, setBooking] = useState(null);
  const [bookingState, setBookingState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await authFetch(`${API}/bookings/${id}`);
        if (res.ok) {
          setBooking(await res.json());
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch {
        navigate('/dashboard', { replace: true });
      }
      setLoading(false);
    };
    fetchBooking();
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
      setBooking(updated);
      setBookingState({ state: 'success', message: 'Precos verificados' });
      setTimeout(() => setBookingState(null), 3000);
    } catch {
      setBookingState({ state: 'error', message: 'Erro de conexao' });
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
      setBooking(updated);
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
        // Re-fetch booking to get updated status
        const bookingRes = await authFetch(`${API}/bookings/${bookingId}`);
        if (bookingRes.ok) setBooking(await bookingRes.json());
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
        if (bookingRes.ok) setBooking(await bookingRes.json());
      }
    } catch (err) {
      console.error('Failed to dismiss savings:', err);
    }
  };

  if (loading) return null;
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
