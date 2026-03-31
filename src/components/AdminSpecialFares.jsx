import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../api';
import './AdminSpecialFares.css';

// ─── Status workflow with allowed transitions ──────────────────
const STATUS_CONFIG = {
  new:                  { label: 'Novo',               icon: '●', next: ['qualifying', 'cancelled'] },
  qualifying:           { label: 'Qualificando',       icon: '◉', next: ['offered', 'cancelled'] },
  offered:              { label: 'Oferecido',          icon: '◎', next: ['awaiting_client', 'cancelled'] },
  awaiting_client:      { label: 'Aguardando Cliente', icon: '◷', next: ['accepted', 'cancelled', 'expired'] },
  accepted:             { label: 'Aceito',             icon: '✓', next: ['ready_to_book', 'cancelled'] },
  ready_to_book:        { label: 'Pronto p/ Reservar', icon: '▸', next: ['booking_in_progress', 'cancelled'] },
  booking_in_progress:  { label: 'Em Reserva',         icon: '⟳', next: ['confirmed', 'cancelled'] },
  confirmed:            { label: 'Confirmado',         icon: '✔', next: [] },
  cancelled:            { label: 'Cancelado',          icon: '✕', next: [] },
  expired:              { label: 'Expirado',           icon: '⏱', next: [] },
};

const STATUS_TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Novos' },
  { value: 'qualifying', label: 'Qualificando' },
  { value: 'offered', label: 'Oferecidos' },
  { value: 'awaiting_client', label: 'Aguardando' },
  { value: 'accepted', label: 'Aceitos' },
  { value: 'ready_to_book', label: 'Pronto' },
  { value: 'booking_in_progress', label: 'Em Reserva' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'cancelled', label: 'Cancelados' },
];

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: '#dc2626', bg: '#fef2f2' },
  high:   { label: 'Alta',    color: '#d97706', bg: '#fffbeb' },
  normal: { label: 'Normal',  color: '#6b7280', bg: '#f9fafb' },
  low:    { label: 'Baixa',   color: '#9ca3af', bg: '#f9fafb' },
};

function AdminSpecialFares() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [cases, setCases] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [toast, setToast] = useState(null);

  // Booking linking
  const [userBookings, setUserBookings] = useState([]);
  const [showBookingPicker, setShowBookingPicker] = useState(false);

  const [form, setForm] = useState(getEmptyForm());

  function getEmptyForm() {
    return {
      clientEmail: '', clientName: '', clientPhone: '',
      bookingId: '',
      hotelName: '', destination: '',
      checkinDate: '', checkoutDate: '', roomType: '',
      occupancy: '', boardBasis: '',
      originalPrice: '', offeredPrice: '', currency: 'BRL',
      rateType: '', refundable: true,
      cancellationDeadline: '',
      originalSource: '', foundSource: '', supplier: '',
      priority: 'normal', internalNotes: '',
    };
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const fetchCases = useCallback(async () => {
    try {
      const params = activeTab !== 'all' ? `?status=${activeTab}` : '';
      const res = await authFetch(`${API}/special-fares${params}`);
      if (res.ok) setCases(await res.json());
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    }
    setLoading(false);
  }, [authFetch, activeTab]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/special-fares-analytics`);
      if (res.ok) setAnalytics(await res.json());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [authFetch]);

  useEffect(() => { fetchCases(); fetchAnalytics(); }, [fetchCases, fetchAnalytics]);

  // Fetch user bookings when linking
  const fetchBookingsForEmail = async (email) => {
    if (!email || email.length < 3) { setUserBookings([]); return; }
    try {
      const res = await authFetch(`${API}/admin/bookings?search=${encodeURIComponent(email)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setUserBookings(data.bookings || data || []);
      }
    } catch { setUserBookings([]); }
  };

  const handleCreate = async () => {
    try {
      const body = { ...form };
      if (body.originalPrice) body.originalPrice = parseFloat(body.originalPrice);
      if (body.offeredPrice) body.offeredPrice = parseFloat(body.offeredPrice);
      if (!body.bookingId) delete body.bookingId;

      const res = await authFetch(`${API}/special-fares`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setForm(getEmptyForm());
        fetchCases();
        fetchAnalytics();
        showToast('Caso criado com sucesso');
      }
    } catch (err) {
      console.error('Failed to create case:', err);
      showToast('Erro ao criar caso', 'error');
    }
  };

  const handleStatusChange = async (caseId, newStatus) => {
    try {
      const res = await authFetch(`${API}/special-fares/${caseId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        fetchCases();
        fetchAnalytics();
        if (selectedCase?.id === caseId) setSelectedCase(updated);
        showToast(`Status alterado para "${STATUS_CONFIG[newStatus]?.label || newStatus}"`);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('Erro ao alterar status', 'error');
    }
  };

  const handleUpdateNotes = async (caseId, notes) => {
    try {
      const res = await authFetch(`${API}/special-fares/${caseId}`, {
        method: 'PUT',
        body: JSON.stringify({ internalNotes: notes }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedCase?.id === caseId) setSelectedCase(updated);
        showToast('Notas salvas');
      }
    } catch { showToast('Erro ao salvar notas', 'error'); }
  };

  // Link booking to form
  const linkBooking = (booking) => {
    setForm(f => ({
      ...f,
      bookingId: booking.id,
      clientEmail: booking.email || f.clientEmail,
      clientName: booking.guestName || f.clientName,
      hotelName: booking.hotelName || f.hotelName,
      destination: booking.destination || f.destination,
      checkinDate: booking.checkinDate || f.checkinDate,
      checkoutDate: booking.checkoutDate || f.checkoutDate,
      roomType: booking.roomType || f.roomType,
      originalPrice: booking.originalPrice || f.originalPrice,
    }));
    setShowBookingPicker(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  const formatCurrency = (v) => v ? `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';
  const calcSavingsPercent = (orig, offered) => {
    if (!orig || !offered) return '';
    const pct = ((orig - offered) / orig * 100).toFixed(0);
    return pct > 0 ? `-${pct}%` : '';
  };

  // Filter cases by search
  const filteredCases = cases.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.hotelName?.toLowerCase().includes(q) ||
            c.clientName?.toLowerCase().includes(q) ||
            c.clientEmail?.toLowerCase().includes(q) ||
            c.destination?.toLowerCase().includes(q));
  });

  return (
    <div className="asf-page">
      <div className="asf-container">
        {/* Header */}
        <div className="asf-header">
          <div>
            <button className="asf-back" onClick={() => navigate('/admin')}>
              ← Admin Dashboard
            </button>
            <h1>Special Fares</h1>
            <p className="asf-subtitle">Gerenciamento de tarifas especiais para clientes</p>
          </div>
          <button className="asf-btn-create" onClick={() => { setForm(getEmptyForm()); setShowForm(true); }}>
            <span className="asf-btn-icon">+</span>
            Novo Caso
          </button>
        </div>

        {/* KPIs */}
        {analytics && (
          <div className="asf-kpis">
            <div className="asf-kpi">
              <div className="asf-kpi-icon asf-kpi-icon-total">📋</div>
              <div>
                <span className="asf-kpi-value">{analytics.totalCases}</span>
                <span className="asf-kpi-label">Total de Casos</span>
              </div>
            </div>
            <div className="asf-kpi">
              <div className="asf-kpi-icon asf-kpi-icon-confirmed">✔</div>
              <div>
                <span className="asf-kpi-value">{analytics.confirmedCases}</span>
                <span className="asf-kpi-label">Confirmados</span>
              </div>
            </div>
            <div className="asf-kpi">
              <div className="asf-kpi-icon asf-kpi-icon-savings">💰</div>
              <div>
                <span className="asf-kpi-value accent">{formatCurrency(analytics.totalSavings)}</span>
                <span className="asf-kpi-label">Economia Total</span>
              </div>
            </div>
            <div className="asf-kpi">
              <div className="asf-kpi-icon asf-kpi-icon-avg">📊</div>
              <div>
                <span className="asf-kpi-value">{formatCurrency(analytics.avgSavings)}</span>
                <span className="asf-kpi-label">Economia Média</span>
              </div>
            </div>
          </div>
        )}

        {/* Search + Tabs */}
        <div className="asf-toolbar">
          <div className="asf-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por hotel, cliente, destino..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="asf-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              className={`asf-tab ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.value); setLoading(true); }}
            >
              {tab.label}
              {analytics?.byStatus?.[tab.value] > 0 && (
                <span className="asf-tab-count">{analytics.byStatus[tab.value]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Cases list */}
        {loading ? (
          <div className="asf-loading">
            <div className="asf-spinner" />
            Carregando casos...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="asf-empty">
            <div className="asf-empty-icon">📂</div>
            <h3>{searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum caso nesta categoria'}</h3>
            <p>{searchQuery
              ? `Não encontramos casos para "${searchQuery}". Tente outro termo.`
              : 'Crie um novo caso clicando no botão acima.'}</p>
          </div>
        ) : (
          <div className="asf-cases">
            {filteredCases.map(c => (
              <div key={c.id} className="asf-case-card" onClick={() => setSelectedCase(c)}>
                <div className="asf-case-main">
                  <div className="asf-case-hotel">{c.hotelName}</div>
                  <div className="asf-case-details">
                    {c.clientName && <span>{c.clientName}</span>}
                    {c.destination && <><span className="asf-dot">·</span>{c.destination}</>}
                    {c.checkinDate && <><span className="asf-dot">·</span>{formatDate(c.checkinDate)} → {formatDate(c.checkoutDate)}</>}
                    {c.roomType && <><span className="asf-dot">·</span>{c.roomType}</>}
                  </div>
                  {c.bookingId && <span className="asf-linked-badge">🔗 Vinculado</span>}
                </div>
                <div className="asf-case-pricing">
                  {c.originalPrice > 0 && <span className="asf-case-original">{formatCurrency(c.originalPrice)}</span>}
                  {c.offeredPrice > 0 && <span className="asf-case-offered">{formatCurrency(c.offeredPrice)}</span>}
                  {c.savingsAmount > 0 && (
                    <span className="asf-case-savings">
                      -{formatCurrency(c.savingsAmount)}
                      <small>{calcSavingsPercent(c.originalPrice, c.offeredPrice)}</small>
                    </span>
                  )}
                </div>
                <div className="asf-case-meta">
                  <span className={`asf-status-badge status-${c.status}`}>
                    {STATUS_CONFIG[c.status]?.icon} {STATUS_CONFIG[c.status]?.label || c.status}
                  </span>
                  {c.priority && c.priority !== 'normal' && (
                    <span className="asf-priority-badge" style={{
                      color: PRIORITY_CONFIG[c.priority]?.color,
                      background: PRIORITY_CONFIG[c.priority]?.bg,
                    }}>
                      {PRIORITY_CONFIG[c.priority]?.label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ CREATE FORM MODAL ═══ */}
        {showForm && (
          <div className="asf-modal-overlay" onClick={() => setShowForm(false)}>
            <div className="asf-modal asf-modal-wide" onClick={e => e.stopPropagation()}>
              <div className="asf-modal-header">
                <div>
                  <h2>Novo Caso de Tarifa Especial</h2>
                  <p className="asf-modal-hint">Preencha os dados ou vincule a uma reserva existente</p>
                </div>
                <button className="asf-modal-close" onClick={() => setShowForm(false)}>×</button>
              </div>
              <div className="asf-modal-body">
                {/* Link booking button */}
                <div className="asf-link-section">
                  {form.bookingId ? (
                    <div className="asf-linked-booking">
                      <span>🔗 Vinculado à reserva: <strong>{form.hotelName}</strong> ({form.clientEmail})</span>
                      <button onClick={() => setForm(f => ({ ...f, bookingId: '' }))}>Desvincular</button>
                    </div>
                  ) : (
                    <button className="asf-link-btn" onClick={() => setShowBookingPicker(true)}>
                      🔗 Vincular a uma reserva existente
                    </button>
                  )}
                </div>

                {/* Booking picker */}
                {showBookingPicker && (
                  <div className="asf-booking-picker">
                    <input
                      type="text"
                      placeholder="Buscar por email do cliente ou nome do hotel..."
                      onChange={e => fetchBookingsForEmail(e.target.value)}
                      autoFocus
                    />
                    {userBookings.length > 0 && (
                      <div className="asf-booking-list">
                        {userBookings.map(b => (
                          <div key={b.id} className="asf-booking-option" onClick={() => linkBooking(b)}>
                            <strong>{b.hotelName}</strong>
                            <span>{b.email} · {formatDate(b.checkinDate)} → {formatDate(b.checkoutDate)} · {formatCurrency(b.originalPrice)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="asf-booking-picker-close" onClick={() => setShowBookingPicker(false)}>Fechar</button>
                  </div>
                )}

                <div className="asf-form-grid">
                  {/* Cliente */}
                  <div className="asf-form-section">
                    <h3>👤 Cliente</h3>
                    <FormField label="Nome" value={form.clientName} onChange={v => setForm(f => ({ ...f, clientName: v }))} />
                    <FormField label="Email" value={form.clientEmail} onChange={v => {
                      setForm(f => ({ ...f, clientEmail: v }));
                    }} type="email" />
                    <FormField label="Telefone" value={form.clientPhone} onChange={v => setForm(f => ({ ...f, clientPhone: v }))} />
                  </div>

                  {/* Hotel */}
                  <div className="asf-form-section">
                    <h3>🏨 Hotel</h3>
                    <FormField label="Hotel *" value={form.hotelName} onChange={v => setForm(f => ({ ...f, hotelName: v }))} />
                    <FormField label="Destino" value={form.destination} onChange={v => setForm(f => ({ ...f, destination: v }))} />
                    <div className="asf-field-row">
                      <FormField label="Check-in" value={form.checkinDate} onChange={v => setForm(f => ({ ...f, checkinDate: v }))} type="date" />
                      <FormField label="Check-out" value={form.checkoutDate} onChange={v => setForm(f => ({ ...f, checkoutDate: v }))} type="date" />
                    </div>
                    <div className="asf-field-row">
                      <FormField label="Tipo de Quarto" value={form.roomType} onChange={v => setForm(f => ({ ...f, roomType: v }))} />
                      <FormField label="Ocupação" value={form.occupancy} onChange={v => setForm(f => ({ ...f, occupancy: v }))} />
                    </div>
                    <FormField label="Regime de Alimentação" value={form.boardBasis} onChange={v => setForm(f => ({ ...f, boardBasis: v }))} placeholder="Ex: Café da manhã incluso" />
                  </div>

                  {/* Pricing */}
                  <div className="asf-form-section">
                    <h3>💰 Preços</h3>
                    <div className="asf-field-row">
                      <FormField label="Preço Original (R$)" value={form.originalPrice} onChange={v => setForm(f => ({ ...f, originalPrice: v }))} type="number" />
                      <FormField label="Preço Oferecido (R$)" value={form.offeredPrice} onChange={v => setForm(f => ({ ...f, offeredPrice: v }))} type="number" />
                    </div>
                    {form.originalPrice && form.offeredPrice && parseFloat(form.originalPrice) > parseFloat(form.offeredPrice) && (
                      <div className="asf-savings-preview">
                        Economia estimada: <strong>R$ {(parseFloat(form.originalPrice) - parseFloat(form.offeredPrice)).toLocaleString('pt-BR')}</strong>
                        {' '}({calcSavingsPercent(parseFloat(form.originalPrice), parseFloat(form.offeredPrice))})
                      </div>
                    )}
                    <FormField label="Fonte Original" value={form.originalSource} onChange={v => setForm(f => ({ ...f, originalSource: v }))} placeholder="Ex: Booking.com" />
                    <FormField label="Fonte Encontrada" value={form.foundSource} onChange={v => setForm(f => ({ ...f, foundSource: v }))} placeholder="Ex: Hotel direto" />
                    <FormField label="Fornecedor" value={form.supplier} onChange={v => setForm(f => ({ ...f, supplier: v }))} />
                    <div className="asf-field-row">
                      <div className="asf-field">
                        <label>Reembolsável</label>
                        <div className="asf-toggle-row">
                          <button
                            type="button"
                            className={`asf-toggle ${form.refundable ? 'active' : ''}`}
                            onClick={() => setForm(f => ({ ...f, refundable: !f.refundable }))}
                          >
                            {form.refundable ? '✓ Sim' : '✕ Não'}
                          </button>
                        </div>
                      </div>
                      <FormField label="Prazo p/ Cancelamento" value={form.cancellationDeadline} onChange={v => setForm(f => ({ ...f, cancellationDeadline: v }))} type="date" />
                    </div>
                  </div>

                  {/* Admin */}
                  <div className="asf-form-section">
                    <h3>⚙️ Administração</h3>
                    <div className="asf-field">
                      <label>Prioridade</label>
                      <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                    <div className="asf-field">
                      <label>Notas Internas</label>
                      <textarea
                        value={form.internalNotes}
                        onChange={e => setForm(f => ({ ...f, internalNotes: e.target.value }))}
                        rows={4}
                        placeholder="Observações internas da equipe..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="asf-modal-footer">
                <button className="asf-btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="asf-btn-save" onClick={handleCreate} disabled={!form.hotelName}>
                  Criar Caso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CASE DETAIL DRAWER ═══ */}
        {selectedCase && (
          <div className="asf-modal-overlay" onClick={() => setSelectedCase(null)}>
            <div className="asf-drawer" onClick={e => e.stopPropagation()}>
              <div className="asf-drawer-header">
                <div>
                  <span className={`asf-status-badge status-${selectedCase.status}`}>
                    {STATUS_CONFIG[selectedCase.status]?.icon} {STATUS_CONFIG[selectedCase.status]?.label || selectedCase.status}
                  </span>
                  <h2>{selectedCase.hotelName}</h2>
                  <p className="asf-detail-sub">
                    {selectedCase.destination}
                    {selectedCase.clientName && <> · {selectedCase.clientName}</>}
                    {selectedCase.clientEmail && <> ({selectedCase.clientEmail})</>}
                  </p>
                </div>
                <button className="asf-modal-close" onClick={() => setSelectedCase(null)}>×</button>
              </div>

              <div className="asf-drawer-body">
                {/* Comparison Card */}
                <div className="asf-comparison">
                  <div className="asf-comp-card asf-comp-original">
                    <span className="asf-comp-label">Tarifa Original</span>
                    <span className="asf-comp-price">{formatCurrency(selectedCase.originalPrice)}</span>
                    <span className="asf-comp-source">{selectedCase.originalSource || 'Não informado'}</span>
                  </div>
                  <div className="asf-comp-arrow">→</div>
                  <div className="asf-comp-card asf-comp-special">
                    <span className="asf-comp-label">Special Fare</span>
                    <span className="asf-comp-price">{formatCurrency(selectedCase.offeredPrice)}</span>
                    <span className="asf-comp-source">{selectedCase.foundSource || 'Não informado'}</span>
                  </div>
                  {selectedCase.savingsAmount > 0 && (
                    <div className="asf-comp-savings">
                      <span className="asf-comp-savings-value">
                        Economia: {formatCurrency(selectedCase.savingsAmount)}
                      </span>
                      <span className="asf-comp-savings-pct">
                        {calcSavingsPercent(selectedCase.originalPrice, selectedCase.offeredPrice)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Detail Sections */}
                <div className="asf-detail-sections">
                  <div className="asf-detail-section">
                    <h4>Reserva</h4>
                    <div className="asf-detail-grid">
                      <DetailRow label="Check-in" value={formatDate(selectedCase.checkinDate)} />
                      <DetailRow label="Check-out" value={formatDate(selectedCase.checkoutDate)} />
                      <DetailRow label="Quarto" value={selectedCase.roomType || '—'} />
                      <DetailRow label="Ocupação" value={selectedCase.occupancy || '—'} />
                      <DetailRow label="Regime" value={selectedCase.boardBasis || '—'} />
                      <DetailRow label="Reembolsável" value={
                        selectedCase.refundable === true ? '✓ Sim' :
                        selectedCase.refundable === false ? '✕ Não' : '—'
                      } />
                      {selectedCase.cancellationDeadline && (
                        <DetailRow label="Prazo Cancelamento" value={formatDate(selectedCase.cancellationDeadline)} />
                      )}
                    </div>
                  </div>

                  <div className="asf-detail-section">
                    <h4>Fornecedor & Fontes</h4>
                    <div className="asf-detail-grid">
                      <DetailRow label="Fornecedor" value={selectedCase.supplier || '—'} />
                      <DetailRow label="Fonte Original" value={selectedCase.originalSource || '—'} />
                      <DetailRow label="Fonte Encontrada" value={selectedCase.foundSource || '—'} />
                      {selectedCase.bookingConfirmationNumber && (
                        <DetailRow label="Nº Confirmação" value={selectedCase.bookingConfirmationNumber} />
                      )}
                      {selectedCase.bookingId && (
                        <DetailRow label="Reserva Vinculada" value={<span className="asf-linked-badge">🔗 {selectedCase.bookingId.substring(0, 8)}...</span>} />
                      )}
                    </div>
                  </div>

                  <div className="asf-detail-section">
                    <h4>Administração</h4>
                    <div className="asf-detail-grid">
                      <DetailRow label="Prioridade" value={
                        <span className="asf-priority-badge" style={{
                          color: PRIORITY_CONFIG[selectedCase.priority]?.color,
                          background: PRIORITY_CONFIG[selectedCase.priority]?.bg,
                        }}>
                          {PRIORITY_CONFIG[selectedCase.priority]?.label || selectedCase.priority}
                        </span>
                      } />
                      <DetailRow label="Responsável" value={selectedCase.assignedAgent || '—'} />
                      <DetailRow label="Criado em" value={formatDate(selectedCase.createdAt)} />
                      {selectedCase.offeredAt && <DetailRow label="Oferecido em" value={formatDate(selectedCase.offeredAt)} />}
                      {selectedCase.acceptedAt && <DetailRow label="Aceito em" value={formatDate(selectedCase.acceptedAt)} />}
                      {selectedCase.confirmedAt && <DetailRow label="Confirmado em" value={formatDate(selectedCase.confirmedAt)} />}
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="asf-detail-section">
                    <h4>Notas Internas</h4>
                    <NotesEditor
                      value={selectedCase.internalNotes || ''}
                      onSave={(notes) => handleUpdateNotes(selectedCase.id, notes)}
                    />
                  </div>
                </div>

                {/* Status Actions — Progressive */}
                <div className="asf-status-flow">
                  <h4>Workflow</h4>
                  <div className="asf-flow-steps">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const isCurrent = selectedCase.status === key;
                      const isAllowed = STATUS_CONFIG[selectedCase.status]?.next?.includes(key);
                      const isPast = getStatusOrder(key) < getStatusOrder(selectedCase.status);
                      return (
                        <button
                          key={key}
                          className={`asf-flow-step ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''} ${isAllowed ? 'allowed' : ''}`}
                          onClick={() => isAllowed && handleStatusChange(selectedCase.id, key)}
                          disabled={!isAllowed}
                          title={isCurrent ? 'Status atual' : isAllowed ? `Mover para ${config.label}` : ''}
                        >
                          <span className="asf-flow-icon">{config.icon}</span>
                          <span className="asf-flow-label">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`asf-toast asf-toast-${toast.type}`}>
            {toast.type === 'success' ? '✓' : '✕'} {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: status order for progress tracking
function getStatusOrder(status) {
  const order = ['new', 'qualifying', 'offered', 'awaiting_client', 'accepted', 'ready_to_book', 'booking_in_progress', 'confirmed', 'cancelled', 'expired'];
  return order.indexOf(status);
}

function FormField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="asf-field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="asf-detail-row">
      <span className="asf-detail-label">{label}</span>
      <span className="asf-detail-value">{value}</span>
    </div>
  );
}

function NotesEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div className="asf-notes-display" onClick={() => { setDraft(value); setEditing(true); }}>
        {value || <span className="asf-notes-empty">Clique para adicionar notas internas...</span>}
      </div>
    );
  }

  return (
    <div className="asf-notes-edit">
      <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} autoFocus />
      <div className="asf-notes-actions">
        <button onClick={() => setEditing(false)}>Cancelar</button>
        <button className="primary" onClick={() => { onSave(draft); setEditing(false); }}>Salvar</button>
      </div>
    </div>
  );
}

export default AdminSpecialFares;
