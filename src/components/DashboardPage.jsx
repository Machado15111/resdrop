import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../api';
import Dashboard from './Dashboard';
import BulkImportModal from './BulkImportModal';
import ImportReviewModal from './ImportReviewModal';

function DashboardPage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [bookingStates, setBookingStates] = useState({});
  const [showImport, setShowImport] = useState(false);

  const reviewImportId = searchParams.get('reviewImport');

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

  // Archive / unarchive a booking
  const handleArchive = async (booking) => {
    const newStatus = booking.status === 'archived' ? 'monitoring' : 'archived';
    try {
      const res = await authFetch(`${API}/bookings/${booking.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      }
    } catch (err) {
      console.error('Archive failed:', err);
    }
  };

  // Delete a booking permanently (confirmation happens in the card via t())
  const handleDelete = async (booking) => {
    try {
      const res = await authFetch(`${API}/bookings/${booking.id}`, { method: 'DELETE' });
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== booking.id));
        fetchStats();
      }
    } catch (err) {
      console.error('Delete failed:', err);
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
