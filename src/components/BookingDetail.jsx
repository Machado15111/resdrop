import { useState } from 'react';
import { useI18n } from '../i18n';
import { IconArrowLeft, IconHotel, IconRefresh } from './Icons';
import './BookingDetail.css';

function BookingDetail({ booking, onBack, onRefresh, onUpdate, bookingState }) {
  const { t, lang } = useI18n();
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const nights = Math.ceil(
    (new Date(booking.checkoutDate) - new Date(booking.checkinDate)) /
      (1000 * 60 * 60 * 24)
  );

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState('total');

  const isLoading = bookingState?.state === 'loading';
  const isSuccess = bookingState?.state === 'success';
  const isError = bookingState?.state === 'error';

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

  const startEditing = () => {
    setEditForm({
      hotelName: booking.hotelName,
      destination: booking.destination,
      checkinDate: booking.checkinDate,
      checkoutDate: booking.checkoutDate,
      roomType: booking.roomType,
      originalPrice: booking.originalPrice,
      confirmationNumber: booking.confirmationNumber,
      guestName: booking.guestName || '',
      notes: booking.notes || '',
      rateType: booking.rateType || 'total',
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm({});
  };

  const saveEdits = async () => {
    setSaving(true);
    const result = await onUpdate(booking.id, editForm);
    setSaving(false);
    if (result?.success) {
      setEditing(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const statusConfig = {
    savings_found: { label: lang === 'pt' ? 'Economia encontrada' : 'Savings found', cls: 'badge-success' },
    monitoring: { label: lang === 'pt' ? 'Monitorando' : 'Monitoring', cls: 'badge-info' },
    booked: { label: lang === 'pt' ? 'Re-reservado' : 'Rebooked', cls: 'badge-accent' },
    expired: { label: lang === 'pt' ? 'Expirado' : 'Expired', cls: 'badge-muted' },
  };
  const st = statusConfig[booking.status] || statusConfig.monitoring;

  return (
    <div className="detail-page">
      <div className="container">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          <IconArrowLeft size={16} />
          {t('detail.back')}
        </button>

        <div className="detail-header">
          <div className="detail-hotel-info">
            <div className="detail-icon-wrap"><IconHotel size={28} /></div>
            <div>
              <h1 className="detail-hotel-name">{booking.hotelName}</h1>
              <p className="detail-dest">{booking.destination}</p>
              <span className={`badge ${st.cls}`} style={{ marginTop: 6, display: 'inline-block' }}>{st.label}</span>
            </div>
          </div>
          <div className="detail-status-area">
            {booking.status === 'savings_found' && booking.totalSavings > 0 ? (
              <div className="detail-savings-highlight">
                <span className="savings-label">{t('detail.totalSavings')}</span>
                <span className="savings-amount">R${booking.totalSavings.toFixed(0)}</span>
              </div>
            ) : (
              <span className="badge badge-info badge-lg">
                {t('detail.monitoringPrices')}
              </span>
            )}
          </div>
        </div>

        <div className="detail-grid">
          {/* Booking info card */}
          <div className="detail-card booking-info-card">
            <div className="detail-card-header">
              <h3 className="detail-card-title">{t('detail.reservationDetails')}</h3>
              {!editing ? (
                <button className="btn btn-ghost btn-xs" onClick={startEditing}>
                  {lang === 'pt' ? 'Editar' : 'Edit'}
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="btn btn-ghost btn-xs" onClick={cancelEditing} disabled={saving}>
                    {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button className="btn btn-primary btn-xs" onClick={saveEdits} disabled={saving}>
                    {saving ? '...' : (lang === 'pt' ? 'Salvar' : 'Save')}
                  </button>
                </div>
              )}
            </div>

            <div className="info-rows">
              {editing ? (
                <>
                  <EditRow label={lang === 'pt' ? 'Hotel' : 'Hotel'} value={editForm.hotelName} onChange={v => handleEditChange('hotelName', v)} />
                  <EditRow label={lang === 'pt' ? 'Destino' : 'Destination'} value={editForm.destination} onChange={v => handleEditChange('destination', v)} />
                  <EditRow label={t('detail.checkin')} value={editForm.checkinDate} onChange={v => handleEditChange('checkinDate', v)} type="date" />
                  <EditRow label={t('detail.checkout')} value={editForm.checkoutDate} onChange={v => handleEditChange('checkoutDate', v)} type="date" />
                  <div className="info-row">
                    <span className="info-label">{t('detail.room')}</span>
                    <select className="edit-input" value={editForm.roomType} onChange={e => handleEditChange('roomType', e.target.value)}>
                      <option>Standard Room</option>
                      <option>Deluxe Room</option>
                      <option>Deluxe Twin Room</option>
                      <option>Superior Room</option>
                      <option>Deluxe King Suite</option>
                      <option>Junior Suite</option>
                      <option>Executive Suite</option>
                      <option>Family Room</option>
                      <option>Penthouse</option>
                    </select>
                  </div>
                  <EditRow label={t('detail.confirmation')} value={editForm.confirmationNumber} onChange={v => handleEditChange('confirmationNumber', v)} />
                  <EditRow label={t('detail.originalPrice')} value={editForm.originalPrice} onChange={v => handleEditChange('originalPrice', v)} type="number" />
                  <EditRow label={lang === 'pt' ? 'Hospede' : 'Guest'} value={editForm.guestName} onChange={v => handleEditChange('guestName', v)} />
                  <div className="info-row">
                    <span className="info-label">{lang === 'pt' ? 'Tipo de tarifa' : 'Rate type'}</span>
                    <select className="edit-input" value={editForm.rateType} onChange={e => handleEditChange('rateType', e.target.value)}>
                      <option value="total">{lang === 'pt' ? 'Preco total' : 'Total price'}</option>
                      <option value="pernight">{lang === 'pt' ? 'Por noite' : 'Per night'}</option>
                      <option value="refundable">{lang === 'pt' ? 'Reembolsavel' : 'Refundable'}</option>
                      <option value="nonrefundable">{lang === 'pt' ? 'Nao-reembolsavel' : 'Non-refundable'}</option>
                    </select>
                  </div>
                  <div className="info-row info-row-notes">
                    <span className="info-label">{lang === 'pt' ? 'Notas' : 'Notes'}</span>
                    <textarea className="edit-textarea" value={editForm.notes} onChange={e => handleEditChange('notes', e.target.value)} rows={2} placeholder={lang === 'pt' ? 'Observacoes...' : 'Notes...'} />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label={t('detail.checkin')} value={formatDate(booking.checkinDate)} />
                  <InfoRow label={t('detail.checkout')} value={formatDate(booking.checkoutDate)} />
                  <InfoRow label={t('detail.duration')} value={`${nights} ${nights !== 1 ? t('common.nights') : t('common.night')}`} />
                  <InfoRow label={t('detail.room')} value={booking.roomType} />
                  <InfoRow label={t('detail.confirmation')} value={booking.confirmationNumber} mono />
                  {booking.guestName && <InfoRow label={lang === 'pt' ? 'Hospede' : 'Guest'} value={booking.guestName} />}
                  {booking.rateType && booking.rateType !== 'total' && (
                    <InfoRow label={lang === 'pt' ? 'Tipo de tarifa' : 'Rate type'} value={
                      { pernight: lang === 'pt' ? 'Por noite' : 'Per night', refundable: lang === 'pt' ? 'Reembolsavel' : 'Refundable', nonrefundable: lang === 'pt' ? 'Nao-reembolsavel' : 'Non-refundable' }[booking.rateType] || booking.rateType
                    } />
                  )}
                  <div className="info-row">
                    <span className="info-label">{t('detail.originalPrice')}</span>
                    <div className="price-display-toggle">
                      <span className="info-value price">R${booking.originalPrice}</span>
                      <button
                        className="btn-price-toggle"
                        onClick={() => setPriceDisplay(p => p === 'total' ? 'pernight' : 'total')}
                      >
                        {priceDisplay === 'total' ? `/noite: R$${(booking.originalPrice / nights).toFixed(0)}` : `total: R$${booking.originalPrice}`}
                      </button>
                    </div>
                  </div>
                  {booking.notes && <InfoRow label={lang === 'pt' ? 'Notas' : 'Notes'} value={booking.notes} />}
                </>
              )}
            </div>
          </div>

          {/* Price comparison results */}
          <div className="detail-card results-card">
            <div className="results-header">
              <h3 className="detail-card-title">{t('detail.priceComparison')}</h3>
              <button
                className={`btn btn-sm ${isSuccess ? 'btn-success-state' : isError ? 'btn-error-state' : 'btn-outline'}`}
                onClick={() => onRefresh(booking.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-pulse">{t('detail.checking')}</span>
                ) : isSuccess ? (
                  <span>&#10003; {bookingState?.message || 'OK'}</span>
                ) : isError ? (
                  <span>&#10007; {bookingState?.message || 'Erro'}</span>
                ) : (
                  <><IconRefresh size={14} /> {t('detail.refreshPrices')}</>
                )}
              </button>
            </div>
            {booking.lastChecked && (
              <p className="results-updated">
                {lang === 'pt' ? 'Verificado:' : 'Last checked:'} {formatDate(booking.lastChecked)} {formatTime(booking.lastChecked)}
                {booking.checkCount > 0 && <span className="check-count"> ({booking.checkCount}x)</span>}
              </p>
            )}

            {(() => {
              const results = booking.latestResults || [];
              const exactMatches = results.filter(r => r.isExactMatch);
              const hasResults = exactMatches.length > 0;

              if (!hasResults && results.length === 0) {
                return (
                  <div className="no-results">
                    <p>{t('detail.noPriceData')}</p>
                  </div>
                );
              }

              if (!hasResults) {
                return (
                  <div className="no-results">
                    <p>{lang === 'pt'
                      ? 'Nenhuma cotacao encontrada para este hotel. Clique em "Atualizar" para buscar novamente.'
                      : 'No quotes found for this hotel. Click "Refresh" to search again.'}</p>
                  </div>
                );
              }

              return (
                <div className="results-list">
                  {exactMatches.map((result, i) => (
                    <div
                      className={`result-row ${result.hasDrop ? 'has-savings' : ''} ${i === 0 && result.hasDrop ? 'best' : ''}`}
                      key={`${result.sourceId}-${i}`}
                    >
                      <div className="result-source">
                        <span className="result-logo">{result.sourceLogo}</span>
                        <div>
                          <div className="result-source-name">{result.source}</div>
                          <div className="result-perks">
                            {result.freeCancellation && (
                              <span className="result-perk green">{t('detail.freeCancellation')}</span>
                            )}
                            {result.breakfastIncluded && (
                              <span className="result-perk blue">{t('detail.breakfastIncluded')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="result-pricing">
                        <div className="result-pn">
                          R${result.pricePerNight}{t('common.perNight')}
                        </div>
                        <div className="result-total">
                          R${result.totalPrice}
                          <span className="result-total-label"> {t('common.total')}</span>
                        </div>
                      </div>
                      <div className="result-action">
                        {result.hasDrop ? (
                          <>
                            <span className="result-savings">
                              {t('common.save')} R${result.savings} ({result.savingsPercent}%)
                            </span>
                            {(result.affiliateLink || result.link) ? (
                              <a href={result.affiliateLink || result.link} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm">
                                {t('detail.rebook')} &rarr;
                              </a>
                            ) : (
                              <button className="btn btn-accent btn-sm" disabled>
                                {t('detail.rebook')} &rarr;
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="result-no-savings">{t('detail.noSavings')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Alerts timeline */}
          <div className="detail-card alerts-card">
            <h3 className="detail-card-title">{t('detail.alertHistory')}</h3>
            {booking.alerts && booking.alerts.length > 0 ? (
              <div className="alerts-timeline">
                {[...booking.alerts].reverse().map((alert) => (
                  <div className="alert-item" key={alert.id}>
                    <div className={`alert-dot ${
                      alert.type === 'price_drop' ? 'dot-drop' :
                      alert.type === 'price_increase' ? 'dot-increase' :
                      alert.type === 'price_same' ? 'dot-same' : ''
                    }`} />
                    <div className="alert-content">
                      <div className="alert-message">{alert.message}</div>
                      <div className="alert-time">
                        {formatDate(alert.date)} - {formatTime(alert.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-alerts">
                <p>{t('detail.noAlerts')}</p>
              </div>
            )}
          </div>

          {/* Price history chart */}
          <div className="detail-card history-card">
            <h3 className="detail-card-title">{t('detail.priceHistory')}</h3>
            <div className="price-history-list">
              {booking.priceHistory.map((entry, i) => {
                const maxPrice = Math.max(...booking.priceHistory.map(e => e.price));
                return (
                  <div className="ph-entry" key={i}>
                    <div className="ph-bar-container">
                      <div
                        className="ph-bar"
                        style={{
                          width: `${(entry.price / maxPrice) * 100}%`,
                          background:
                            entry.price < booking.originalPrice
                              ? 'var(--accent)'
                              : entry.price > booking.originalPrice
                              ? '#ef4444'
                              : 'var(--primary)',
                        }}
                      />
                    </div>
                    <div className="ph-details">
                      <span className="ph-price">R${entry.price}</span>
                      <span className="ph-source">{entry.source}</span>
                      <span className="ph-date">
                        {new Date(entry.date).toLocaleDateString(locale)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change history (audit trail) */}
          {booking.changeHistory && booking.changeHistory.length > 0 && (
            <div className="detail-card history-card">
              <h3 className="detail-card-title">{lang === 'pt' ? 'Historico de alteracoes' : 'Change history'}</h3>
              <div className="change-history-list">
                {[...booking.changeHistory].reverse().slice(0, 10).map((change, i) => (
                  <div className="change-entry" key={i}>
                    <span className="change-field">{change.field}</span>
                    <span className="change-arrow">{String(change.from || '—')} &rarr; {String(change.to)}</span>
                    <span className="change-date">{new Date(change.at).toLocaleDateString(locale)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rebooking instructions */}
        {booking.status === 'savings_found' && booking.totalSavings > 0 && (
          <div className="rebook-banner">
            <div className="rebook-content">
              <h3>{t('detail.readyToSave')} R${booking.totalSavings.toFixed(0)}?</h3>
              <p>
                {t('detail.rebookSteps')}{' '}
                <strong>{booking.confirmationNumber}</strong>.
              </p>
            </div>
            <button className="btn btn-accent btn-lg">
              {t('detail.startRebooking')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className={`info-value ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  );
}

function EditRow({ label, value, onChange, type = 'text' }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <input
        className="edit-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export default BookingDetail;
