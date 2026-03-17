import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../api';
import SubmitBooking from './SubmitBooking';

function SubmitBookingPage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (bookingData) => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/bookings`, {
        method: 'POST',
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
      navigate(`/bookings/${newBooking.id}`);
    } catch (err) {
      console.error('Failed to submit booking:', err);
      alert('Falha ao criar reserva. Verifique sua conexao.');
    }
    setLoading(false);
  };

  return (
    <SubmitBooking
      onSubmit={handleSubmit}
      onBack={() => navigate('/dashboard')}
      loading={loading}
      userEmail={user?.email || ''}
    />
  );
}

export default SubmitBookingPage;
