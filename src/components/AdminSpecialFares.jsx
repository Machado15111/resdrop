import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../api';
import './AdminSpecialFares.css';

const STATUS_TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Novos' },
  { value: 'qualifying', label: 'Qualificando' },
  { value: 'offered', label: 'Oferecidos' },
  { value: 'awaiting_client', label: 'Aguardando Cliente' },
  { value: 'accepted', label: 'Aceitos' },
  { value: 'ready_to_book', label: 'Pronto p/ Reservar' },
  { value: 'booking_in_progress', label: 'Em Reserva' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'cancelled', label: 'Cancelados' },
];

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f59e0b',
  normal: '#6b7280',
  low: '#9ca3af',
};

function AdminSpecialFares() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [cases, setCases] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [form, setForm] = useState(getEmptyForm());

  function getEmptyForm() {
    return {
      clientEmail: '', clientName: '', clientPhone: '',
      hotelName: '', destination: '',
      checkinDate: '', checkoutDate: '', roomType: '',
      occupancy: '', boardBasis: '',
      originalPrice: '', offeredPrice: '', currency: 'BRL',
      rateType: '', refundable: false,
      originalSource: '', foundSource: '', supplier: '',
      priority: 'normal', internalNotes: '',
    };
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

  useEffect(() => {
    fetchCases();
    fetchAnalytics();
  }, [fetchCases, fetchAnalytics]);

  const handleCreate = async () => {
    try {
      const body = { ...form };
      if (body.originalPrice) body.originalPrice = parseFloat(body.originalPrice);
      if (body.offeredPrice) body.offeredPrice = parseFloat(body.offeredPrice);

      const res = await authFetch(`${API}/special-fares`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setForm(getEmptyForm());
        fetchCases();
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to create case:', err);
    }
  };

  const handleStatusChange = async (caseId, newStatus) => {
    try {
      const res = await authFetch(`${API}/special-fares/${caseId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchCases();
        fetchAnalytics();
        if (selectedCase?.id === caseId) {
          setSelectedCase(await res.json());
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  const formatCurrency = (v) => v ? `R$${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';

  return (
    <div className="asf-page">
      <div className="asf-container">
        <div className="asf-header">
          <div>
            <button className="asf-back" onClick={() => navigate('/admin')}>&larr; Admin</button>
            <h1>Tarifas Especiais</h1>
            <p className="asf-subtitle">Gerenciamento de casos de tarifas especiais para clientes</p>
          </div>
          <button className="asf-btn-create" onClick={() => setShowForm(true)}>
            + Novo Caso
          </button>
        </div>

        {/* Analytics KPIs */}
        {analytics && (
          <div className="asf-kpis">
            <div className="asf-kpi">
              <span className="asf-kpi-value">{analytics.totalCases}</span>
              <span className="asf-kpi-label">Total de Casos</span>
            </div>
            <div className="asf-kpi">
              <span className="asf-kpi-value">{analytics.confirmedCases}</span>
              <span className="asf-kpi-label">Confirmados</span>
            </div>
            <div className="asf-kpi">
              <span className="asf-kpi-value accent">{formatCurrency(analytics.totalSavings)}</span>
              <span className="asf-kpi-label">Economia Total</span>
            </div>
            <div className="asf-kpi">
              <span className="asf-kpi-value">{formatCurrency(analytics.avgSavings)}</span>
              <span className="asf-kpi-label">Economia Média</span>
            </div>
          </div>
        )}

        {/* Status tabs */}
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
          <div className="asf-loading">Carregando...</div>
        ) : cases.length === 0 ? (
          <div className="asf-empty">Nenhum caso encontrado nesta categoria.</div>
        ) : (
          <div className="asf-cases">
            {cases.map(c => (
              <div key={c.id} className="asf-case-card" onClick={() => setSelectedCase(c)}>
                <div className="asf-case-main">
                  <div className="asf-case-hotel">{c.hotelName}</div>
                  <div className="asf-case-details">
                    {c.clientName && <span>{c.clientName}</span>}
                    {c.destination && <><span className="asf-dot">&middot;</span><span>{c.destination}</span></>}
                    {c.checkinDate && <><span className="asf-dot">&middot;</span><span>{formatDate(c.checkinDate)} — {formatDate(c.checkoutDate)}</span></>}
                  </div>
                </div>
                <div className="asf-case-pricing">
                  {c.originalPrice && <span className="asf-case-original">{formatCurrency(c.originalPrice)}</span>}
                  {c.offeredPrice && <span className="asf-case-offered">{formatCurrency(c.offeredPrice)}</span>}
                  {c.savingsAmount > 0 && <span className="asf-case-savings">-{formatCurrency(c.savingsAmount)}</span>}
                </div>
                <div className="asf-case-meta">
                  <span className={`asf-status-badge status-${c.status}`}>{c.status?.replace(/_/g, ' ')}</span>
                  <span className="asf-priority" style={{ color: PRIORITY_COLORS[c.priority] }}>{c.priority}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create form modal */}
        {showForm && (
          <div className="asf-modal-overlay" onClick={() => setShowForm(false)}>
            <div className="asf-modal" onClick={e => e.stopPropagation()}>
              <div className="asf-modal-header">
                <h2>Novo Caso de Tarifa Especial</h2>
                <button className="asf-modal-close" onClick={() => setShowForm(false)}>&times;</button>
              </div>
              <div className="asf-modal-body">
                <div className="asf-form-grid">
                  <div className="asf-form-section">
                    <h3>Cliente</h3>
                    <FormField label="Nome" value={form.clientName} onChange={v => setForm(f => ({ ...f, clientName: v }))} />
                    <FormField label="Email" value={form.clientEmail} onChange={v => setForm(f => ({ ...f, clientEmail: v }))} type="email" />
                    <FormField label="Telefone" value={form.clientPhone} onChange={v => setForm(f => ({ ...f, clientPhone: v }))} />
                  </div>
                  <div className="asf-form-section">
                    <h3>Hotel</h3>
                    <FormField label="Hotel *" value={form.hotelName} onChange={v => setForm(f => ({ ...f, hotelName: v }))} />
                    <FormField label="Destino" value={form.destination} onChange={v => setForm(f => ({ ...f, destination: v }))} />
                    <FormField label="Check-in" value={form.checkinDate} onChange={v => setForm(f => ({ ...f, checkinDate: v }))} type="date" />
                    <FormField label="Check-out" value={form.checkoutDate} onChange={v => setForm(f => ({ ...f, checkoutDate: v }))} type="date" />
                    <FormField label="Tipo de Quarto" value={form.roomType} onChange={v => setForm(f => ({ ...f, roomType: v }))} />
                    <FormField label="Ocupação" value={form.occupancy} onChange={v => setForm(f => ({ ...f, occupancy: v }))} />
                  </div>
                  <div className="asf-form-section">
                    <h3>Preços</h3>
                    <FormField label="Preço Original" value={form.originalPrice} onChange={v => setForm(f => ({ ...f, originalPrice: v }))} type="number" />
                    <FormField label="Preço Oferecido" value={form.offeredPrice} onChange={v => setForm(f => ({ ...f, offeredPrice: v }))} type="number" />
                    <FormField label="Fonte Original" value={form.originalSource} onChange={v => setForm(f => ({ ...f, originalSource: v }))} />
                    <FormField label="Fonte Encontrada" value={form.foundSource} onChange={v => setForm(f => ({ ...f, foundSource: v }))} />
                    <FormField label="Fornecedor" value={form.supplier} onChange={v => setForm(f => ({ ...f, supplier: v }))} />
                  </div>
                  <div className="asf-form-section">
                    <h3>Admin</h3>
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
                      <textarea value={form.internalNotes} onChange={e => setForm(f => ({ ...f, internalNotes: e.target.value }))} rows={3} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="asf-modal-footer">
                <button className="asf-btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="asf-btn-save" onClick={handleCreate} disabled={!form.hotelName}>Criar Caso</button>
              </div>
            </div>
          </div>
        )}

        {/* Case detail modal */}
        {selectedCase && (
          <div className="asf-modal-overlay" onClick={() => setSelectedCase(null)}>
            <div className="asf-modal asf-modal-detail" onClick={e => e.stopPropagation()}>
              <div className="asf-modal-header">
                <div>
                  <h2>{selectedCase.hotelName}</h2>
                  <p className="asf-detail-sub">{selectedCase.destination} &middot; {selectedCase.clientName || selectedCase.clientEmail || 'Sem cliente'}</p>
                </div>
                <button className="asf-modal-close" onClick={() => setSelectedCase(null)}>&times;</button>
              </div>
              <div className="asf-modal-body">
                <div className="asf-detail-grid">
                  <DetailRow label="Status" value={<span className={`asf-status-badge status-${selectedCase.status}`}>{selectedCase.status?.replace(/_/g, ' ')}</span>} />
                  <DetailRow label="Prioridade" value={<span style={{ color: PRIORITY_COLORS[selectedCase.priority] }}>{selectedCase.priority}</span>} />
                  <DetailRow label="Check-in" value={formatDate(selectedCase.checkinDate)} />
                  <DetailRow label="Check-out" value={formatDate(selectedCase.checkoutDate)} />
                  <DetailRow label="Quarto" value={selectedCase.roomType || '—'} />
                  <DetailRow label="Ocupação" value={selectedCase.occupancy || '—'} />
                  <DetailRow label="Preço Original" value={formatCurrency(selectedCase.originalPrice)} />
                  <DetailRow label="Preço Oferecido" value={formatCurrency(selectedCase.offeredPrice)} />
                  <DetailRow label="Economia" value={formatCurrency(selectedCase.savingsAmount)} highlight />
                  <DetailRow label="Fonte Original" value={selectedCase.originalSource || '—'} />
                  <DetailRow label="Fonte Encontrada" value={selectedCase.foundSource || '—'} />
                  <DetailRow label="Fornecedor" value={selectedCase.supplier || '—'} />
                  {selectedCase.internalNotes && <DetailRow label="Notas Internas" value={selectedCase.internalNotes} full />}
                  {selectedCase.bookingConfirmationNumber && <DetailRow label="Confirmação" value={selectedCase.bookingConfirmationNumber} />}
                  <DetailRow label="Criado em" value={formatDate(selectedCase.createdAt)} />
                </div>

                <div className="asf-status-actions">
                  <span className="asf-sa-label">Mudar Status:</span>
                  <div className="asf-sa-buttons">
                    {['new', 'qualifying', 'offered', 'awaiting_client', 'accepted', 'ready_to_book', 'booking_in_progress', 'confirmed', 'cancelled'].map(s => (
                      <button
                        key={s}
                        className={`asf-sa-btn ${selectedCase.status === s ? 'current' : ''}`}
                        onClick={() => handleStatusChange(selectedCase.id, s)}
                        disabled={selectedCase.status === s}
                      >
                        {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text' }) {
  return (
    <div className="asf-field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function DetailRow({ label, value, highlight, full }) {
  return (
    <div className={`asf-detail-row ${full ? 'full' : ''}`}>
      <span className="asf-detail-label">{label}</span>
      <span className={`asf-detail-value ${highlight ? 'highlight' : ''}`}>{value}</span>
    </div>
  );
}

export default AdminSpecialFares;
