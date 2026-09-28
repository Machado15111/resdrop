import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { useAsyncData } from '../hooks/useAsyncData';
import { API } from '../api';
import {
  IconBed, IconHotel, IconCalendar, IconClock, IconPlus, IconX,
  IconRefresh, IconCheck, IconMapPin, IconUsers, IconArrowRight, IconAlertCircle,
} from './Icons';
import './Watches.css';

/**
 * Availability watches — "tell me when a room opens up".
 *
 * The counterpart to booking monitoring: here the traveller has NO reservation
 * because the hotel is sold out, and wants to know the moment that changes.
 */
function Watches() {
  const { authFetch } = useAuth();
  const { lang } = useI18n();
  const pt = lang === 'pt';

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Distinguishes "we have not looked yet" from "we looked and this hotel is
  // not in our list" — only the second deserves a note under the field.
  const [searchedTerm, setSearchedTerm] = useState('');
  const searchTimer = useRef(null);
  const [form, setForm] = useState({
    hotelName: '', destination: '', checkinDate: '', checkoutDate: '', guests: 2, note: '',
  });

  const loadWatches = useCallback(async (signal) => {
    const res = await authFetch(`${API}/availability-watches`, { signal });
    if (!res.ok) throw new Error(`availability-watches responded ${res.status}`);
    return await res.json();
  }, [authFetch]);

  const { data, loading, reload } = useAsyncData(loadWatches, {
    initialData: { watches: [], limit: 0, active: 0, canCreate: false },
  });

  const watches = data.watches || [];
  const active = watches.filter(w => w.status === 'watching' || w.status === 'available');
  const past = watches.filter(w => w.status === 'expired' || w.status === 'cancelled');

  const today = new Date().toISOString().split('T')[0];
  const setField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  // Hotel autocomplete. Debounced so a fast typist does not fire a request per
  // keystroke, and the timer is cleared on unmount.
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const onHotelChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, hotelName: value }));
    clearTimeout(searchTimer.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchedTerm('');
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/hotels/search?q=${encodeURIComponent(value.trim())}`);
        const found = res.ok ? await res.json() : [];
        setSuggestions(Array.isArray(found) ? found : []);
        setShowSuggestions(Array.isArray(found) && found.length > 0);
        setSearchedTerm(value.trim());
      } catch {
        // A failed lookup must not block the form: the hotel name is free text
        // and the monitor searches by whatever string is saved.
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);
  };

  const pickHotel = (hotel) => {
    setForm(prev => ({
      ...prev,
      hotelName: hotel.name,
      destination: hotel.destination || prev.destination,
    }));
    setShowSuggestions(false);
    setSearchedTerm('');
  };

  // The catalogue is a convenience, not a gate. citizenM is simply not in it,
  // and the watch works anyway, so say that instead of leaving a dead field.
  const noMatch = searchedTerm.length >= 3
    && suggestions.length === 0
    && form.hotelName.trim() === searchedTerm;

  const fmtDate = (d) => {
    if (!d) return '';
    // Parse as a plain date: `new Date('2027-01-10')` is UTC midnight, which
    // renders as the 9th anywhere west of Greenwich.
    const [y, m, day] = String(d).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString(pt ? 'pt-BR' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const fmtWhen = (iso) => {
    if (!iso) return pt ? 'ainda não verificado' : 'not checked yet';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 2) return pt ? 'agora mesmo' : 'just now';
    if (mins < 60) return pt ? `há ${mins} min` : `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return pt ? `há ${hrs}h` : `${hrs}h ago`;
    return pt ? `há ${Math.round(hrs / 24)}d` : `${Math.round(hrs / 24)}d ago`;
  };

  const fmtMoney = (value, currency) => {
    if (value === null || value === undefined) return null;
    try {
      return new Intl.NumberFormat(pt ? 'pt-BR' : 'en-US', {
        style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currency || ''} ${value}`;
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await authFetch(`${API}/availability-watches`, {
        method: 'POST',
        body: JSON.stringify({ ...form, guests: Number(form.guests) || 2 }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (body.error === 'watch_limit') {
          setFormError(pt
            ? `Seu plano permite ${body.limit} alerta${body.limit === 1 ? '' : 's'} ativo${body.limit === 1 ? '' : 's'}. Cancele um ou mude de plano.`
            : `Your plan allows ${body.limit} active watch${body.limit === 1 ? '' : 'es'}. Cancel one or change your plan.`);
        } else if (body.error === 'duplicate_watch') {
          setFormError(pt
            ? 'Você já está acompanhando este hotel para estas datas.'
            : 'You are already watching this hotel for these dates.');
        } else if (Array.isArray(body.errors) && body.errors.length) {
          setFormError(body.errors.join(' · '));
        } else {
          setFormError(pt ? 'Não foi possível criar o alerta.' : 'Could not create the watch.');
        }
        return;
      }

      setForm({ hotelName: '', destination: '', checkinDate: '', checkoutDate: '', guests: 2, note: '' });
      setShowForm(false);
      await reload();
    } catch {
      setFormError(pt ? 'Erro de conexão.' : 'Connection error.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (watch) => {
    const ok = window.confirm(pt
      ? `Parar de acompanhar ${watch.hotelName}?`
      : `Stop watching ${watch.hotelName}?`);
    if (!ok) return;
    await authFetch(`${API}/availability-watches/${watch.id}`, { method: 'DELETE' });
    await reload();
  };

  const handleCheckNow = async (watch) => {
    setCheckingId(watch.id);
    try {
      await authFetch(`${API}/availability-watches/${watch.id}/check`, { method: 'POST' });
      await reload();
    } finally {
      setCheckingId(null);
    }
  };

  const canCreate = data.canCreate !== false;

  const statusBadge = (watch) => {
    if (watch.status === 'available') {
      return <span className="watch-badge watch-badge-open"><IconCheck size={12} />{pt ? 'Disponível' : 'Available'}</span>;
    }
    if (watch.status === 'cancelled') {
      return <span className="watch-badge watch-badge-off">{pt ? 'Cancelado' : 'Cancelled'}</span>;
    }
    if (watch.status === 'expired') {
      return <span className="watch-badge watch-badge-off">{pt ? 'Encerrado' : 'Ended'}</span>;
    }
    return <span className="watch-badge watch-badge-watching"><IconClock size={12} />{pt ? 'Acompanhando' : 'Watching'}</span>;
  };

  if (loading) return null;

  return (
    <div className="watches-page">
      <div className="container">
        <div className="watches-header">
          <div>
            <h1>{pt ? 'Avise-me quando abrir' : 'Tell me when it opens'}</h1>
            <p className="watches-subtitle">
              {pt
                ? 'Para o hotel que você quer e está esgotado. Verificamos as tarifas a cada poucas horas e avisamos assim que um quarto aparecer.'
                : 'For the hotel you want when it is sold out. We check rates every few hours and tell you the moment a room appears.'}
            </p>
          </div>
          {!showForm && (
            <button
              className="btn btn-primary watches-add"
              onClick={() => { setShowForm(true); setFormError(null); }}
              disabled={!canCreate}
              title={canCreate ? '' : (pt ? 'Limite do plano atingido' : 'Plan limit reached')}
            >
              <IconPlus size={16} />
              {pt ? 'Novo alerta' : 'New watch'}
            </button>
          )}
        </div>

        {data.limit > 0 && (
          <p className="watches-quota">
            {pt
              ? `${data.active} de ${data.limit} alerta${data.limit === 1 ? '' : 's'} ativo${data.limit === 1 ? '' : 's'}`
              : `${data.active} of ${data.limit} active watch${data.limit === 1 ? '' : 'es'}`}
            {!canCreate && (
              <span className="watches-quota-full">
                {pt ? ' · cancele um para criar outro' : ' · cancel one to add another'}
              </span>
            )}
          </p>
        )}

        {showForm && (
          <form className="watch-form" onSubmit={handleCreate}>
            <div className="watch-form-grid">
              <label className="watch-field watch-field-wide watch-field-autocomplete">
                <span>{pt ? 'Hotel' : 'Hotel'}</span>
                <input
                  type="text" required value={form.hotelName} onChange={onHotelChange}
                  onFocus={() => setShowSuggestions(suggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  autoComplete="off"
                  placeholder={pt ? 'Ex.: Copacabana Palace' : 'e.g. Copacabana Palace'}
                />
                {showSuggestions && (
                  <ul className="watch-suggestions">
                    {suggestions.map((hotel, i) => (
                      // onMouseDown, not onClick: blur fires first and would
                      // close the list before the click ever lands.
                      <li key={`${hotel.name}-${i}`} onMouseDown={() => pickHotel(hotel)}>
                        <span className="ws-name">{hotel.name}</span>
                        <span className="ws-dest">{hotel.destination}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {noMatch && (
                  <small className="watch-field-hint">
                    {pt
                      ? 'Não está na nossa lista — tudo bem, pode continuar. Vamos procurar exatamente por este nome.'
                      : 'Not in our list — that is fine, go ahead. We will search for exactly this name.'}
                  </small>
                )}
              </label>
              <label className="watch-field watch-field-wide">
                <span>{pt ? 'Cidade (opcional)' : 'City (optional)'}</span>
                <input
                  type="text" value={form.destination} onChange={setField('destination')}
                  placeholder={pt ? 'Ex.: Rio de Janeiro' : 'e.g. Rio de Janeiro'}
                />
              </label>
              <label className="watch-field">
                <span>{pt ? 'Check-in' : 'Check-in'}</span>
                <input type="date" required min={today} value={form.checkinDate} onChange={setField('checkinDate')} />
              </label>
              <label className="watch-field">
                <span>{pt ? 'Check-out' : 'Check-out'}</span>
                <input type="date" required min={form.checkinDate || today} value={form.checkoutDate} onChange={setField('checkoutDate')} />
              </label>
              <label className="watch-field">
                <span>{pt ? 'Hóspedes' : 'Guests'}</span>
                <input type="number" min="1" max="16" value={form.guests} onChange={setField('guests')} />
              </label>
            </div>

            {formError && <p className="watch-form-error">{formError}</p>}

            <div className="watch-form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setFormError(null); }}>
                {pt ? 'Cancelar' : 'Cancel'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (pt ? 'Criando...' : 'Creating...') : (pt ? 'Começar a acompanhar' : 'Start watching')}
              </button>
            </div>
          </form>
        )}

        {active.length === 0 && !showForm && (
          <div className="watches-empty">
            <IconBed size={40} />
            <h3>{pt ? 'Nenhum alerta ativo' : 'No active watches'}</h3>
            <p>
              {pt
                ? 'Quando um hotel que você quer estiver esgotado, crie um alerta aqui em vez de ficar conferindo o site.'
                : 'When a hotel you want is sold out, add a watch here instead of checking the site yourself.'}
            </p>
            {/* The empty state is where someone actually is when they need to
                create their first watch — leaving the only button up in the
                header made them go looking for it. */}
            <button
              className="btn btn-primary watches-empty-cta"
              onClick={() => { setShowForm(true); setFormError(null); }}
              disabled={!canCreate}
            >
              <IconPlus size={16} />
              {pt ? 'Criar meu primeiro alerta' : 'Create my first watch'}
            </button>
          </div>
        )}

        <div className="watches-list">
          {[...active, ...past].map((watch) => (
            <article key={watch.id} className={`watch-card ${watch.status === 'available' ? 'watch-card-open' : ''} ${past.includes(watch) ? 'watch-card-past' : ''}`}>
              <div className="watch-card-main">
                <div className="watch-card-head">
                  <h3><IconHotel size={15} /> {watch.hotelName}</h3>
                  {statusBadge(watch)}
                </div>

                <div className="watch-meta">
                  <span><IconCalendar size={13} /> {fmtDate(watch.checkinDate)} → {fmtDate(watch.checkoutDate)}</span>
                  {watch.destination && <span><IconMapPin size={13} /> {watch.destination}</span>}
                  <span><IconUsers size={13} /> {watch.guests}</span>
                </div>

                {watch.status === 'available' && (
                  <div className="watch-found">
                    <p className="watch-found-title">
                      {pt ? 'Abriu um quarto' : 'A room opened up'}
                      {watch.foundPrice ? ` — ${pt ? 'a partir de' : 'from'} ${fmtMoney(watch.foundPrice, watch.foundCurrency)}` : ''}
                    </p>
                    <p className="watch-found-meta">
                      {[watch.foundRoomType, watch.foundSource].filter(Boolean).join(' · ')}
                    </p>
                    {watch.foundLink && (
                      <a className="watch-found-link" href={watch.foundLink} target="_blank" rel="noopener noreferrer">
                        {pt ? 'Ver a tarifa' : 'See the rate'} <IconArrowRight size={13} />
                      </a>
                    )}
                  </div>
                )}

                {watch.needsReview && watch.status === 'watching' && (
                  <p className="watch-review">
                    <IconAlertCircle size={13} />
                    {pt
                      ? 'Não encontramos nenhuma tarifa deste hotel até agora. Confira se o nome está como aparece no site da reserva.'
                      : 'We have not found any rate for this hotel yet. Check that the name matches how the booking site spells it.'}
                  </p>
                )}

                <p className="watch-footnote">
                  {pt ? 'Última verificação' : 'Last check'}: {fmtWhen(watch.lastChecked)}
                  {(watch.status === 'watching' || watch.status === 'available') && (
                    <> · {pt ? `a cada ${watch.cadenceHours}h` : `every ${watch.cadenceHours}h`}</>
                  )}
                </p>
              </div>

              {(watch.status === 'watching' || watch.status === 'available') && (
                <div className="watch-actions">
                  <button
                    className="watch-action"
                    onClick={() => handleCheckNow(watch)}
                    disabled={checkingId === watch.id}
                    title={pt ? 'Verificar agora' : 'Check now'}
                  >
                    <IconRefresh size={14} />
                    {checkingId === watch.id ? (pt ? 'Verificando...' : 'Checking...') : (pt ? 'Verificar' : 'Check')}
                  </button>
                  <button
                    className="watch-action watch-action-danger"
                    onClick={() => handleCancel(watch)}
                    title={pt ? 'Parar de acompanhar' : 'Stop watching'}
                  >
                    <IconX size={14} />
                    {pt ? 'Parar' : 'Stop'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Watches;
