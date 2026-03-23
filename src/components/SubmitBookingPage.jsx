import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../api';
import SubmitBooking from './SubmitBooking';

function SubmitBookingPage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (bookingData) => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API}/bookings`, {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
      if (res.status === 403) {
        const err = await res.json();
        setError(err.message || 'Limite do plano atingido. Faca upgrade.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Erro ao criar reserva');
        setLoading(false);
        return;
      }
      const newBooking = await res.json();
      navigate(`/bookings/${newBooking.id}`);
    } catch (err) {
      console.error('Failed to submit booking:', err);
      setError('Falha ao criar reserva. Verifique sua conexao.');
    }
    setLoading(false);
  };

  return (
    <SubmitBooking
      onSubmit={handleSubmit}
      onBack={() => navigate('/dashboard')}
      loading={loading}
      error={error}
      userEmail={user?.email || ''}
    />
  );
}

export default SubmitBookingPage;
