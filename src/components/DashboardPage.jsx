import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../api';
import { getCached, setCached, dedupedFetch, invalidatePrefix } from '../lib/dataCache';
import Dashboard from './Dashboard';
import BulkImportModal from './BulkImportModal';
import ImportReviewModal from './ImportReviewModal';

const BOOKINGS_KEY = 'bookings:list';
const STATS_KEY = 'bookings:stats';

function DashboardPage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Seed from cache so returning to the dashboard paints instantly instead of
  // showing an empty list while the request is in flight.
  const [bookings, setBookings] = useState(() => getCached(BOOKINGS_KEY) ?? []);
  const [stats, setStats] = useState(() => getCached(STATS_KEY) ?? null);
  const [bookingStates, setBookingStates] = useState({});
  const [showImport, setShowImport] = useState(false);

  const reviewImportId = searchParams.get('reviewImport');

  const fetchBookings = useCallback(async () => {
    try {
      // dedupedFetch collapses concurrent callers into a single request.
      const data = await dedupedFetch(BOOKINGS_KEY, async () => {
        const res = await authFetch(`${API}/bookings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  }, [authFetch]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await dedupedFetch(STATS_KEY, async () => {
        const res = await authFetch(`${API}/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [authFetch]);

  const rawToken = searchParams.get('token');

  useEffect(() => {
    if (!rawToken) return;
    authFetch(`${API}/inbound/pending-import/attach`, {
      method: 'POST',
      body: JSON.stringify({ token: rawToken }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.importId) {
          setSearchParams({ reviewImport: data.importId }, { replace: true });
        }
      })
      .catch(err => console.error('Failed attaching token in DashboardPage:', err));
  }, [rawToken, authFetch, setSearchParams]);

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

  // Export bookings as CSV/JSON — triggers a file download
  const handleExport = async (format = 'csv') => {
    try {
      const res = await authFetch(`${API}/bookings/export?format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resdrop-bookings.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Bulk import — returns the API result so the modal can show a summary
  const handleImport = async (bookingsToImport) => {
    const res = await authFetch(`${API}/bookings/bulk-import`, {
      method: 'POST',
      body: JSON.stringify({ bookings: bookingsToImport }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Import failed');
    }
    await fetchBookings();
    fetchStats();
    return data;
  };

  // Apply a change to local state AND the shared cache together, so navigating
  // away and back does not resurrect a stale copy of the list.
  const applyBookings = useCallback((next) => {
    setBookings(next);
    setCached(BOOKINGS_KEY, next);
  }, []);

  // Archive / unarchive a booking — optimistic so the card updates instantly.
  const handleArchive = async (booking) => {
    const newStatus = booking.status === 'archived' ? 'monitoring' : 'archived';
    const snapshot = bookings;
    applyBookings(bookings.map(b => (b.id === booking.id ? { ...b, status: newStatus } : b)));
    try {
      const res = await authFetch(`${API}/bookings/${booking.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      // Reconcile the optimistic row with the saved record by stable id.
      applyBookings((getCached(BOOKINGS_KEY) ?? snapshot).map(b => (b.id === updated.id ? updated : b)));
      invalidatePrefix('bookings:stats');
      fetchStats();
    } catch (err) {
      console.error('Archive failed:', err);
      applyBookings(snapshot); // roll back on failure
    }
  };

  // Delete a booking permanently (confirmation happens in the card via t()).
  // Optimistic: the card disappears immediately instead of waiting on the API.
  const handleDelete = async (booking) => {
    const snapshot = bookings;
    applyBookings(bookings.filter(b => b.id !== booking.id));
    try {
      const res = await authFetch(`${API}/bookings/${booking.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      invalidatePrefix('bookings:stats');
      fetchStats();
    } catch (err) {
      console.error('Delete failed:', err);
      applyBookings(snapshot); // restore the card if the server rejected it
    }
  };

  const handleCloseReview = () => {
    searchParams.delete('reviewImport');
    setSearchParams(searchParams, { replace: true });
  };

  const handleReviewSuccess = (newBooking) => {
    fetchBookings();
    fetchStats();
    handleCloseReview();
    if (newBooking) {
      setBookingState(newBooking.id, 'success', 'Monitoramento ativado!');
    }
  };

  return (
    <>
      <Dashboard
        bookings={bookings}
        onSelect={openBooking}
        onRefresh={handleRefreshPrices}
        stats={stats}
        onNewBooking={() => navigate('/submit')}
        onViewAnalytics={() => navigate('/analytics')}
        onExport={handleExport}
        onImport={() => setShowImport(true)}
        onArchive={handleArchive}
        onDelete={handleDelete}
        currentUser={user}
        bookingStates={bookingStates}
      />
      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}
      {reviewImportId && (
        <ImportReviewModal
          importId={reviewImportId}
          onClose={handleCloseReview}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  );
}

export default DashboardPage;
