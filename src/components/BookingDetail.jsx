import { useState } from 'react';
import { useI18n } from '../i18n';
import { IconArrowLeft, IconHotel, IconRefresh } from './Icons';
import SavingsConfirmationModal from './SavingsConfirmationModal';
import './BookingDetail.css';

function BookingDetail({ booking, onBack, onRefresh, onUpdate, bookingState, onConfirmSavings, onDismissSavings }) {
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
      roomTypeCustom: booking.roomTypeCustom || '',
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
    savings_found: { label: t('dash.savingsFound'), cls: 'badge-success' },
    lower_fare_found: { label: t('savings.lowerFareFound'), cls: 'badge-success' },
    confirmed_savings: { label: t('savings.confirmedBadge'), cls: 'badge-confirmed' },
    dismissed: { label: t('savings.dismissedBadge'), cls: 'badge-muted' },
    monitoring: { label: t('dash.monitoring'), cls: 'badge-info' },
    booked: { label: t('detail.rebooked'), cls: 'badge-accent' },
    expired: { label: t('detail.expired'), cls: 'badge-muted' },
  };
  const st = statusConfig[booking.status] || statusConfig.monitoring;

  const hasUnconfirmedSavings = (booking.status === 'lower_fare_found' || booking.status === 'savings_found') &&
    (booking.potentialSavings > 0 || booking.totalSavings > 0);

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
            {hasUnconfirmedSavings ? (
              <div className="detail-savings-highlight unconfirmed">
                <span className="savings-label">{t('savings.potentialSavings')}</span>
                <span className="savings-amount">R${(booking.potentialSavings || booking.totalSavings).toFixed(0)}</span>
              </div>
            ) : booking.status === 'confirmed_savings' && booking.totalSavings > 0 ? (
              <div className="detail-savings-highlight confirmed">
                <span className="savings-label">{t('savings.confirmedBadge')}</span>
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
                  {t('detail.edit')}
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="btn btn-ghost btn-xs" onClick={cancelEditing} disabled={saving}>
                    {t('account.cancel')}
                  </button>
                  <button className="btn btn-primary btn-xs" onClick={saveEdits} disabled={saving}>
                    {saving ? '...' : t('detail.save')}
                  </button>
                </div>
              )}
            </div>

            <div className="info-rows">
              {editing ? (
                <>
                  <EditRow label={t('detail.hotel')} value={editForm.hotelName} onChange={v => handleEditChange('hotelName', v)} />
                  <EditRow label={t('detail.destination')} value={editForm.destination} onChange={v => handleEditChange('destination', v)} />
                  <EditRow label={t('detail.checkin')} value={editForm.checkinDate} onChange={v => handleEditChange('checkinDate', v)} type="date" />
                  <EditRow label={t('detail.checkout')} value={editForm.checkoutDate} onChange={v => handleEditChange('checkoutDate', v)} type="date" />
                  <div className="info-row">
                    <span className="info-label">{t('detail.room')}</span>
                    <select className="edit-input" value={editForm.roomType} onChange={e => handleEditChange('roomType', e.target.value)}>
                      {[
                        { value: 'Standard Room', pt: 'Quarto Standard', en: 'Standard Room' },
                        { value: 'Superior Room', pt: 'Quarto Superior', en: 'Superior Room' },
                        { value: 'Classic Room', pt: 'Quarto Cl\u00e1ssico', en: 'Classic Room' },
                        { value: 'Classic King', pt: 'Cl\u00e1ssico King', en: 'Classic King' },
                        { value: 'Classic Twin', pt: 'Cl\u00e1ssico Twin', en: 'Classic Twin' },
                        { value: 'Deluxe Room', pt: 'Quarto Deluxe', en: 'Deluxe Room' },
                        { value: 'Grand Deluxe Room', pt: 'Quarto Grand Deluxe', en: 'Grand Deluxe Room' },
                        { value: 'Luxury Room', pt: 'Quarto Luxo', en: 'Luxury Room' },
                        { value: 'Premier Room', pt: 'Quarto Premier', en: 'Premier Room' },
                        { value: 'Prestige Room', pt: 'Quarto Prestige', en: 'Prestige Room' },
                        { value: 'Studio Room', pt: 'Quarto Studio', en: 'Studio Room' },
                        { value: 'Family Room', pt: 'Quarto Fam\u00edlia', en: 'Family Room' },
                        { value: 'Twin Room', pt: 'Quarto Twin', en: 'Twin Room' },
                        { value: 'King Room', pt: 'Quarto King', en: 'King Room' },
                        { value: 'Junior Suite', pt: 'Su\u00edte J\u00fanior', en: 'Junior Suite' },
                        { value: 'Suite', pt: 'Su\u00edte', en: 'Suite' },
                        { value: 'Executive Suite', pt: 'Su\u00edte Executiva', en: 'Executive Suite' },
                        { value: 'One Bedroom Suite', pt: 'Su\u00edte Um Quarto', en: 'One Bedroom Suite' },
                        { value: 'Two Bedroom Suite', pt: 'Su\u00edte Dois Quartos', en: 'Two Bedroom Suite' },
                        { value: 'Connecting Room', pt: 'Quarto Conectado', en: 'Connecting Room' },
                        { value: 'Accessible Room', pt: 'Quarto Acess\u00edvel', en: 'Accessible Room' },
                        { value: 'Other', pt: 'Outro', en: 'Other' },
                      ].map(rt => (
                        <option key={rt.value} value={rt.value}>{lang === 'pt' ? rt.pt : rt.en}</option>
                      ))}
                    </select>
                  </div>
                  {editForm.roomType === 'Other' && (
                    <EditRow label={t('detail.customType')} value={editForm.roomTypeCustom || ''} onChange={v => handleEditChange('roomTypeCustom', v)} />
                  )}
                  <EditRow label={t('detail.confirmation')} value={editForm.confirmationNumber} onChange={v => handleEditChange('confirmationNumber', v)} />
                  <EditRow label={t('detail.originalPrice')} value={editForm.originalPrice} onChange={v => handleEditChange('originalPrice', v)} type="number" />
                  <EditRow label={t('detail.guest')} value={editForm.guestName} onChange={v => handleEditChange('guestName', v)} />
                  <div className="info-row">
                    <span className="info-label">{t('detail.rateType')}</span>
                    <select className="edit-input" value={editForm.rateType} onChange={e => handleEditChange('rateType', e.target.value)}>
                      <option value="total">{t('submit.totalStay')}</option>
                      <option value="per_night">{t('submit.perNight')}</option>
                    </select>
                  </div>
                  <div className="info-row info-row-notes">
                    <span className="info-label">{t('detail.notes')}</span>
                    <textarea className="edit-textarea" value={editForm.notes} onChange={e => handleEditChange('notes', e.target.value)} rows={2} placeholder={t('detail.notesPlaceholder')} />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label={t('detail.checkin')} value={formatDate(booking.checkinDate)} />
                  <InfoRow label={t('detail.checkout')} value={formatDate(booking.checkoutDate)} />
                  <InfoRow label={t('detail.duration')} value={`${nights} ${nights !== 1 ? t('common.nights') : t('common.night')}`} />
                  <InfoRow label={t('detail.room')} value={booking.roomType === 'Other' && booking.roomTypeCustom ? booking.roomTypeCustom : booking.roomType} />
                  <InfoRow label={t('detail.confirmation')} value={booking.confirmationNumber} mono />
                  {booking.guestName && <InfoRow label={t('detail.guest')} value={booking.guestName} />}
                  {booking.rateType && booking.rateType !== 'total' && (
                    <InfoRow label={t('detail.rateType')} value={
                      booking.rateType === 'per_night' ? t('submit.perNight') : booking.rateType
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
                  {booking.notes && <InfoRow label={t('detail.notes')} value={booking.notes} />}
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
                {t('detail.lastChecked')} {formatDate(booking.lastChecked)} {formatTime(booking.lastChecked)}
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
                    <p>{t('detail.noQuotes')}</p>
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
              <h3 className="detail-card-title">{t('detail.changeHistory')}</h3>
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

        {/* Savings confirmation banner */}
        {hasUnconfirmedSavings && (
          <div className="confirm-savings-banner">
            <div className="rebook-content">
              <h3>{t('detail.readyToSave')} R${(booking.potentialSavings || booking.totalSavings).toFixed(0)}?</h3>
              <p>
                {t('detail.rebookSteps')}{' '}
                <strong>{booking.confirmationNumber}</strong>.
              </p>
            </div>
            <button className="btn btn-accent btn-lg" onClick={() => setShowConfirmModal(true)}>
              {t('savings.confirmBtn')}
            </button>
          </div>
        )}

        {/* Confirmed savings badge */}
        {booking.status === 'confirmed_savings' && (
          <div className="confirmed-banner">
            <span className="confirmed-icon">&#10003;</span>
            <span>{t('savings.confirmedBadge')} — R${booking.totalSavings?.toFixed(0)}</span>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <SavingsConfirmationModal
          booking={booking}
          onConfirm={async (data) => {
            await onConfirmSavings(booking.id, data);
            setShowConfirmModal(false);
          }}
          onDismiss={async (data) => {
            await onDismissSavings(booking.id, data);
            setShowConfirmModal(false);
          }}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
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
