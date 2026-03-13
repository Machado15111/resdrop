import { useState, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import SubmitBooking from './components/SubmitBooking';
import Dashboard from './components/Dashboard';
import BookingDetail from './components/BookingDetail';
import PriceStrategy from './components/PriceStrategy';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import AdminDashboard from './components/AdminDashboard';
import Account from './components/Account';
import { API } from './api';

function App() {
  const [view, setView] = useState('home');
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  // Per-booking loading/status: { [bookingId]: { state: 'loading'|'success'|'error', message: '' } }
  const [bookingStates, setBookingStates] = useState({});

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('resdrop-user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('resdrop-user', JSON.stringify(user));
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('resdrop-user');
    setBookings([]);
    setStats(null);
    setView('home');
  };

  const fetchBookings = useCallback(async () => {
    if (!currentUser?.email) { setBookings([]); return; }
    try {
      const res = await fetch(`${API}/bookings?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  }, [currentUser?.email]);

  const fetchStats = useCallback(async () => {
    if (!currentUser?.email) { setStats(null); return; }
    try {
      const res = await fetch(`${API}/stats?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
      fetchStats();
    }
  }, [currentUser, fetchBookings, fetchStats]);

  useEffect(() => {
    if (currentUser && view === 'home') {
      setView('dashboard');
    }
    // Redirect to login if accessing protected views without auth
    if (!currentUser && ['dashboard', 'submit', 'detail'].includes(view)) {
      setView('account');
    }
  }, [currentUser, view]);

  const handleSubmitBooking = async (bookingData) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      if (res.status === 403) {
        const err = await res.json();
        alert(err.message || 'Limite do plano atingido. Faca upgrade.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao criar reserva');
        setLoading(false);
        return;
      }
      const newBooking = await res.json();
      setBookings((prev) => [newBooking, ...prev]);
      setSelectedBooking(newBooking);
      setView('detail');
      fetchStats();
      if (currentUser) {
        try {
          const userRes = await fetch(`${API}/users/${currentUser.email}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            setCurrentUser(userData);
            localStorage.setItem('resdrop-user', JSON.stringify(userData));
          }
        } catch {}
      }
    } catch (err) {
      console.error('Failed to submit booking:', err);
      alert('Falha ao criar reserva. Verifique sua conexao.');
    }
    setLoading(false);
  };

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
      const res = await fetch(`${API}/bookings/${bookingId}/check`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        setBookingState(bookingId, 'error', err.message || 'Falha na busca');
        return;
      }
      const updated = await res.json();
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      if (selectedBooking?.id === updated.id) setSelectedBooking(updated);
      fetchStats();

      const exactMatches = (updated.latestResults || []).filter(r => r.isExactMatch);
      if (exactMatches.length > 0 && exactMatches[0].hasDrop) {
        setBookingState(bookingId, 'success', `Economia encontrada: R$${updated.totalSavings}`);
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

  const handleUpdateBooking = async (bookingId, updates) => {
    try {
      const res = await fetch(`${API}/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        return { error: err.error || 'Failed to update' };
      }
      const updated = await res.json();
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      if (selectedBooking?.id === updated.id) setSelectedBooking(updated);
      fetchStats();
      return { success: true };
    } catch (err) {
      return { error: 'Connection error' };
    }
  };

  const openBooking = (booking) => {
    setSelectedBooking(booking);
    setView('detail');
  };

  return (
    <div className="app">
      {view !== 'admin' && (
        <Header
          view={view}
          setView={setView}
          bookingCount={bookings.length}
          currentUser={currentUser}
        />
      )}

      {view === 'home' && !currentUser && (
        <>
          <Hero onGetStarted={() => setView('account')} />
          <HowItWorks />
          <PriceStrategy />
          <Pricing onSelectPlan={() => setView('account')} />
          <Footer />
        </>
      )}

      {view === 'submit' && currentUser && (
        <SubmitBooking
          onSubmit={handleSubmitBooking}
          onBack={() => setView('dashboard')}
          loading={loading}
          userEmail={currentUser?.email || ''}
        />
      )}

      {view === 'dashboard' && currentUser && (
        <Dashboard
          bookings={bookings}
          onSelect={openBooking}
          onRefresh={handleRefreshPrices}
          stats={stats}
          onNewBooking={() => setView('submit')}
          currentUser={currentUser}
          bookingStates={bookingStates}
        />
      )}

      {view === 'detail' && currentUser && selectedBooking && (
        <BookingDetail
          booking={selectedBooking}
          onBack={() => setView('dashboard')}
          onRefresh={handleRefreshPrices}
          onUpdate={handleUpdateBooking}
          bookingState={bookingStates[selectedBooking.id]}
        />
      )}

      {view === 'pricing' && (
        <>
          <Pricing onSelectPlan={() => setView('account')} />
          <Footer />
        </>
      )}

      {view === 'account' && (
        <Account
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onBack={() => currentUser ? setView('dashboard') : setView('home')}
        />
      )}

      {view === 'admin' && (
        <AdminDashboard onBack={() => setView('dashboard')} />
      )}
    </div>
  );
}

export default App;
