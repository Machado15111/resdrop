import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../api';
import Dashboard from './Dashboard';

function DashboardPage() {
  const { user, authFetch, updateUser } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [bookingStates, setBookingStates] = useState({});

  const fetchBookings = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/bookings`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  }, [authFetch]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, [fetchBookings, fetchStats]);

  const setBookingState = (bookingId, state, message = '') => {
    setBookingStates(prev => ({ ...prev, [bookingId]: { state, message } }));
    if (state === 'success' || state === 'error') {
      setTimeout(() => {
        setBookingStates(prev => {
          const next = { ...prev };
          delete next[bookingId];
          return next;
        });
      }, 3000);
    }
  };

  const handleRefreshPrices = async (bookingId) => {
    setBookingState(bookingId, 'loading');
    try {
      const res = await authFetch(`${API}/bookings/${bookingId}/check`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        setBookingState(bookingId, 'error', err.message || 'Falha na busca');
        return;
      }
      const updated = await res.json();
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      fetchStats();

      const exactMatches = (updated.latestResults || []).filter(r => r.isExactMatch);
      if (exactMatches.length > 0 && exactMatches[0].hasDrop) {
        setBookingState(bookingId, 'success', `Economia encontrada: R$${updated.potentialSavings || updated.totalSavings}`);
      } else if (exactMatches.length > 0) {
        setBookingState(bookingId, 'success', 'Precos verificados');
      } else {
        setBookingState(bookingId, 'success', 'Nenhuma cotacao exata encontrada');
      }
    } catch (err) {
      console.error('Failed to refresh prices:', err);
      setBookingState(bookingId, 'error', 'Erro de conexao');
    }
  };

  const openBooking = (booking) => {
    navigate(`/bookings/${booking.id}`);
  };

  return (
    <Dashboard
      bookings={bookings}
      onSelect={openBooking}
      onRefresh={handleRefreshPrices}
      stats={stats}
      onNewBooking={() => navigate('/submit')}
      currentUser={user}
      bookingStates={bookingStates}
    />
  );
}

export default DashboardPage;
