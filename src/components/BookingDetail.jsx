import { useState } from 'react';
import { useI18n } from '../i18n';
import { IconArrowLeft, IconHotel, IconRefresh } from './Icons';
import SavingsConfirmationModal from './SavingsConfirmationModal';
import PhotoLightbox from './PhotoLightbox';
import PriceTrends from './PriceTrends';
import { formatCurrency } from '../currency';
import { nightsBetween, formatStayDate, formatInstantDate, formatInstantTime } from '../dates';
import './BookingDetail.css';

// "2h ago" / "3d ago" style relative time for the monitoring stats.
function relativeTime(dateStr, pt) {
  if (!dateStr) return pt ? '—' : '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (!Number.isFinite(diff) || diff < 0) return pt ? 'agora' : 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return pt ? 'agora' : 'just now';
  if (m < 60) return pt ? `há ${m} min` : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return pt ? `há ${h} h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return pt ? `há ${d} d` : `${d}d ago`;
}

// Hotel images are URL strings; tolerate legacy {url}/{urlHd} objects too.
const imgUrl = (img) => (typeof img === 'string' ? img : (img?.urlHd || img?.url || ''));

// Room types offered by the edit dropdown. Module-scope so the editor can also
// ASK whether a stored value is one of them — a booking imported from a
// confirmation carries the hotel's own wording ("Deluxe Room, Balcony (or
// Terrace)"), which is not in this list. A <select> given an unknown value
// silently displays its FIRST option, so opening the editor showed "Standard
// Room" and saving overwrote the real room — losing the field that decides
// whether a rate is comparable at all.
const ROOM_TYPES = [
  { value: 'Standard Room', pt: 'Quarto Standard', en: 'Standard Room' },
  { value: 'Superior Room', pt: 'Quarto Superior', en: 'Superior Room' },
  { value: 'Classic Room', pt: 'Quarto Clássico', en: 'Classic Room' },
  { value: 'Classic King', pt: 'Clássico King', en: 'Classic King' },
  { value: 'Classic Twin', pt: 'Clássico Twin', en: 'Classic Twin' },
  { value: 'Deluxe Room', pt: 'Quarto Deluxe', en: 'Deluxe Room' },
  { value: 'Grand Deluxe Room', pt: 'Quarto Grand Deluxe', en: 'Grand Deluxe Room' },
  { value: 'Luxury Room', pt: 'Quarto Luxo', en: 'Luxury Room' },
  { value: 'Premier Room', pt: 'Quarto Premier', en: 'Premier Room' },
  { value: 'Prestige Room', pt: 'Quarto Prestige', en: 'Prestige Room' },
  { value: 'Studio Room', pt: 'Quarto Studio', en: 'Studio Room' },
  { value: 'Family Room', pt: 'Quarto Família', en: 'Family Room' },
  { value: 'Twin Room', pt: 'Quarto Twin', en: 'Twin Room' },
  { value: 'King Room', pt: 'Quarto King', en: 'King Room' },
  { value: 'Junior Suite', pt: 'Suíte Júnior', en: 'Junior Suite' },
  { value: 'Suite', pt: 'Suíte', en: 'Suite' },
  { value: 'Executive Suite', pt: 'Suíte Executiva', en: 'Executive Suite' },
  { value: 'One Bedroom Suite', pt: 'Suíte Um Quarto', en: 'One Bedroom Suite' },
  { value: 'Two Bedroom Suite', pt: 'Suíte Dois Quartos', en: 'Two Bedroom Suite' },
  { value: 'Connecting Room', pt: 'Quarto Conectado', en: 'Connecting Room' },
  { value: 'Accessible Room', pt: 'Quarto Acessível', en: 'Accessible Room' },
  { value: 'Other', pt: 'Outro', en: 'Other' },
];

// Currencies a reservation can be held in. Rates are quoted in whichever one
// the booking carries, so this must be editable — a booking saved in the wrong
// currency otherwise had no way back.
const CURRENCIES = ['USD', 'BRL', 'EUR', 'GBP'];

// Nuitée descriptions arrive as HTML — render as plain text, capped for the card.
const stripHtml = (s) => {
  if (!s) return '';
  const text = String(s).replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 320 ? text.slice(0, 317).trimEnd() + '…' : text;
};

function BookingDetail({ booking, onBack, onRefresh, onUpdate, bookingState, onConfirmSavings, onDismissSavings }) {
  const { t, lang } = useI18n();
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  // Render every price in the currency the booking was actually saved in.
  const fmt = (amount, curr) => formatCurrency(amount, curr || booking.currency || 'USD');
  const nights = nightsBetween(booking.checkinDate, booking.checkoutDate);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  // Index of the photo the full-screen lightbox opens at (null = closed).
  const [lightboxIdx, setLightboxIdx] = useState(null);
  // The stored originalPrice is the value as entered; rateType says whether that
  // value is per-night or the stay total. Derive both representations correctly.
  const isPerNight = booking.rateType === 'per_night';
  const totalPrice = isPerNight ? booking.originalPrice * nights : booking.originalPrice;
  const perNightPrice = isPerNight
    ? booking.originalPrice
    : (nights > 0 ? booking.originalPrice / nights : booking.originalPrice);
  // Default the headline to how the user entered it.
  const [priceDisplay, setPriceDisplay] = useState(isPerNight ? 'pernight' : 'total');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isLoading = bookingState?.state === 'loading';
  const isSuccess = bookingState?.state === 'success';
  const isError = bookingState?.state === 'error';

  // Stay dates are calendar days (never shift); everything else is a real
  // moment shown in the viewer's zone. See src/dates.js.
  const formatDate = (dateStr) => formatStayDate(dateStr, locale);
  const formatMoment = (dateStr) => formatInstantDate(dateStr, locale);
  const formatTime = (dateStr) => formatInstantTime(dateStr, locale);

  const startEditing = () => {
    const knownRoomType = ROOM_TYPES.some(rt => rt.value === booking.roomType);
    setEditForm({
      hotelName: booking.hotelName,
      destination: booking.destination,
      checkinDate: booking.checkinDate,
      checkoutDate: booking.checkoutDate,
      // A room the dropdown doesn't list (the hotel's own wording, e.g. "Deluxe
      // Room, Balcony (or Terrace)") must survive editing: park it under
      // "Other" with the original text kept, instead of letting the select fall
      // back to its first option and silently rewrite the room on save.
      roomType: knownRoomType ? booking.roomType : 'Other',
      roomTypeCustom: knownRoomType
        ? (booking.roomTypeCustom || '')
        : (booking.roomTypeCustom || booking.roomType || ''),
      originalPrice: booking.originalPrice,
      currency: booking.currency || 'USD',
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
    received: { label: t('dash.received'), cls: 'badge-pending' },
    processing: { label: t('dash.processing'), cls: 'badge-pending' },
    needs_review: { label: t('dash.needsReview'), cls: 'badge-warning' },
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

  // One-tap rebook (item 5): the cheapest exact-hotel result that carries a
  // bookable/affiliate link — the direct path to actually capture the saving.
  const rebook = (() => {
    const results = Array.isArray(booking.latestResults) ? booking.latestResults : [];
    const withLink = results.filter(r => (r.affiliateLink || r.link) && r.totalPrice > 0);
    if (!withLink.length) return null;
    const exact = withLink.filter(r => r.isExactMatch);
    const pick = (exact.length ? exact : withLink).sort((a, b) => a.totalPrice - b.totalPrice)[0];
    return pick ? { url: pick.affiliateLink || pick.link, source: pick.source, price: pick.totalPrice } : null;
  })();

  // Hotel gallery/info section — defined here so it can render at the TOP of the
  // page (right under the header) instead of at the bottom.
  const hotelSection = (() => {
    const hd = booking.hotelData || {};
    const images = Array.isArray(hd.images) ? hd.images.map(imgUrl).filter(Boolean) : [];
    const gallery = images.slice(0, 3);
    const extra = images.length - gallery.length;
    const amenities = Array.isArray(hd.amenities) ? hd.amenities.filter(Boolean).slice(0, 6) : [];
    const star = Math.round(hd.star || 0);
    const rating = Number(hd.rating) || 0;
    const reviews = Number(hd.reviews) || 0;
    const desc = stripHtml(hd.description);
    const coords = hd.coords;
    // A small bounding box around the point for the OpenStreetMap embed (free,
    // keyless, official — no Google Maps API key needed).
    const mapSrc = coords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.012}%2C${coords.lat - 0.008}%2C${coords.lng + 0.012}%2C${coords.lat + 0.008}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`
      : null;
    return (
      <div className="detail-card hotel-reference-card">
        <h3 className="detail-card-title">{lang === 'pt' ? 'Informações do Hotel' : 'Hotel Information'}</h3>
        {gallery.length > 0 ? (
          <div className="hotel-gallery">
            {gallery.map((img, idx) => (
              <button className="hg-cell" key={idx} onClick={() => setLightboxIdx(idx)} aria-label={`${lang === 'pt' ? 'Foto' : 'Photo'} ${idx + 1}`}>
                <img src={img} alt={`${booking.hotelName} ${idx + 1}`} loading="lazy" />
                {idx === gallery.length - 1 && extra > 0 && (
                  <span className="hg-more">+{extra} {lang === 'pt' ? 'fotos' : 'photos'}</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="hotel-img-placeholder">
            <IconHotel size={48} />
            <span>{booking.hotelName}</span>
          </div>
        )}
        <div className="hotel-ref-cols">
          <div className="hotel-ref-main">
            <div className="hotel-badges">
              {star >= 5 && <span className="hotel-badge-lux">{lang === 'pt' ? 'Luxo' : 'Luxury'}</span>}
              {star > 0 && <span className="hotel-stars">{'★'.repeat(star)}</span>}
              {rating > 0 && (
                <span className="hotel-rating">
                  <b>{rating.toFixed(1)}</b>
                  {reviews > 0 && (
                    <span className="hotel-rating-count">
                      {reviews.toLocaleString(locale)} {lang === 'pt' ? 'avaliações' : 'reviews'}
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="hotel-name-lg">{booking.hotelName}</div>
            {desc && <p className="hotel-desc">{desc}</p>}
            {amenities.length > 0 && (
              <>
                <div className="hotel-amen-title">{lang === 'pt' ? 'Comodidades' : 'Amenities'}</div>
                <div className="hotel-amenities">
                  {amenities.map((a, i) => <span className="hotel-amen" key={i}>{a}</span>)}
                </div>
              </>
            )}
          </div>
          <aside className="hotel-ref-area">
            <div className="hotel-area-title">{lang === 'pt' ? 'Explore a região' : 'Explore the area'}</div>
            {mapSrc ? (
              <div className="hotel-map">
                <div className="hotel-map-clip">
                  <iframe
                    className="hotel-map-frame"
                    title={lang === 'pt' ? 'Mapa do hotel' : 'Hotel map'}
                    src={mapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="hotel-map-foot">
                  {hd.address && <span className="hotel-map-addr">{hd.address}</span>}
                  <span className="hotel-map-credit">© OpenStreetMap</span>
                </div>
              </div>
            ) : (
              hd.address && <p className="hotel-ref-address">📍 {hd.address}, {booking.destination}</p>
            )}
          </aside>
        </div>
        <div className="hotel-ref-disclaimer">
          {lang === 'pt'
            ? 'As informações e imagens do hotel são exibidas como referência. As condições válidas da reserva são as informadas na confirmação original.'
            : 'Hotel information and images are shown for reference. The valid booking conditions are those stated in the original confirmation.'}
        </div>
      </div>
    );
  })();

  // ── Monitoring & market snapshot (items 4, 6, 8) ──────────────────────
  // Honest, data-backed signals: how often we've checked, the lowest price we've
  // seen for these dates, savings so far, and when a drop last happened.
  const monitorSection = (() => {
    const ph = Array.isArray(booking.priceHistory) ? booking.priceHistory.filter(p => p && p.price > 0) : [];
    const lowest = ph.length ? Math.min(...ph.map(p => p.price)) : null;
    const latest = ph.length ? ph[ph.length - 1].price : null;
    const first = ph.length ? ph[0].price : null;
    const saved = booking.status === 'confirmed_savings' ? (booking.totalSavings || 0) : 0;
    const potential = booking.potentialSavings || booking.totalSavings || 0;
    const lastDrop = [...(booking.alerts || [])].reverse().find(a => a?.type === 'price_drop');
    // Verdict vs. the price the user is holding.
    let verdict = null;
    if (lowest != null) {
      const base = totalPrice;
      if (lowest < base * 0.985) {
        const pct = Math.round(((base - lowest) / base) * 100);
        verdict = { cls: 'down', text: lang === 'pt'
          ? `Já vimos ${fmt(lowest)} para suas datas — ${pct}% abaixo do que você pagou. Continuamos de olho.`
          : `We've seen ${fmt(lowest)} for your dates — ${pct}% below what you paid. We're still watching.` };
      } else if (first != null && latest != null && latest > first * 1.02) {
        verdict = { cls: 'up', text: lang === 'pt'
          ? 'Os preços para suas datas estão subindo — bom ter reservado quando reservou.'
          : 'Prices for your dates are trending up — good that you booked when you did.' };
      } else {
        verdict = { cls: 'flat', text: lang === 'pt'
          ? 'Os preços estão estáveis. Avisamos assim que caírem.'
          : 'Prices are holding steady. We\'ll alert you the moment they drop.' };
      }
    }
    const stats = [
      { label: lang === 'pt' ? 'Verificações' : 'Checks', value: `${booking.checkCount || 0}×` },
      { label: lang === 'pt' ? 'Última' : 'Last checked', value: relativeTime(booking.lastChecked, lang === 'pt') },
      { label: lang === 'pt' ? 'Menor visto' : 'Lowest seen', value: lowest != null ? fmt(lowest) : '—' },
      { label: saved > 0 ? (lang === 'pt' ? 'Economizado' : 'Saved') : (lang === 'pt' ? 'Economia potencial' : 'Potential'), value: (saved || potential) > 0 ? fmt(saved || potential) : '—', accent: true },
    ];
    return (
      <div className="detail-card monitor-card">
        <div className="monitor-grid">
          {stats.map((s, i) => (
            <div className="monitor-stat" key={i}>
              <span className="ms-label">{s.label}</span>
              <span className={`ms-value ${s.accent ? 'accent' : ''}`}>{s.value}</span>
            </div>
          ))}
        </div>
        {verdict && <div className={`monitor-verdict ${verdict.cls}`}>{verdict.text}</div>}
        {lastDrop && (
          <div className="monitor-lastdrop">
            {lang === 'pt' ? 'Última queda' : 'Last price drop'}: {relativeTime(lastDrop.date, lang === 'pt')}
          </div>
        )}
      </div>
    );
  })();

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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <span className={`badge ${st.cls}`}>{st.label}</span>
              </div>
            </div>
          </div>
          <div className="detail-status-area">
            {hasUnconfirmedSavings ? (
              <div className="detail-savings-highlight unconfirmed">
                <span className="savings-label">{t('savings.potentialSavings')}</span>
                <span className="savings-amount">{fmt(booking.potentialSavings || booking.totalSavings)}</span>
              </div>
            ) : booking.status === 'confirmed_savings' && booking.totalSavings > 0 ? (
              <div className="detail-savings-highlight confirmed">
                <span className="savings-label">{t('savings.confirmedBadge')}</span>
                <span className="savings-amount">{fmt(booking.totalSavings)}</span>
              </div>
            ) : (
              <div className="detail-monitoring-active">
                <span className="badge badge-info badge-lg">
                  {t('detail.monitoringPrices')}
                </span>
                {booking.lastChecked && (
                  <span className="detail-last-check">
                    {t('detail.lastChecked')} {formatMoment(booking.lastChecked)} {formatTime(booking.lastChecked)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hotel gallery/info — shown at the top of the page */}
        {hotelSection}

        {/* Monitoring & market snapshot */}
        {monitorSection}

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
                      {ROOM_TYPES.map(rt => (
                        <option key={rt.value} value={rt.value}>{lang === 'pt' ? rt.pt : rt.en}</option>
                      ))}
                    </select>
                  </div>
                  {editForm.roomType === 'Other' && (
                    <EditRow label={t('detail.customType')} value={editForm.roomTypeCustom || ''} onChange={v => handleEditChange('roomTypeCustom', v)} />
                  )}
                  <EditRow label={t('detail.confirmation')} value={editForm.confirmationNumber} onChange={v => handleEditChange('confirmationNumber', v)} />
                  <EditRow label={t('detail.originalPrice')} value={editForm.originalPrice} onChange={v => handleEditChange('originalPrice', v)} type="number" />
                  <div className="info-row">
                    <span className="info-label">{lang === 'pt' ? 'Moeda' : 'Currency'}</span>
                    <select className="edit-input" value={editForm.currency} onChange={e => handleEditChange('currency', e.target.value)}>
                      {CURRENCIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
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
                      <span className="info-value price">{fmt(priceDisplay === 'pernight' ? perNightPrice : totalPrice)}</span>
                      <button
                        className="btn-price-toggle"
                        onClick={() => setPriceDisplay(p => p === 'total' ? 'pernight' : 'total')}
                      >
                        {priceDisplay === 'total'
                          ? `${lang === 'pt' ? '/noite' : '/night'}: ${fmt(perNightPrice)}`
                          : `total: ${fmt(totalPrice)}`}
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
                {t('detail.lastChecked')} {formatMoment(booking.lastChecked)} {formatTime(booking.lastChecked)}
                {booking.checkCount > 0 && <span className="check-count"> ({booking.checkCount}x)</span>}
              </p>
            )}

            {(() => {
              const results = booking.latestResults || [];
              // Only ever show quotes for the SAME hotel the user booked. Never
              // fall back to nearby/other-hotel results — showing an unrelated
              // property's rate as a "quote" is misleading (that was the
              // "getting it from anywhere" bug). No match → show the empty state.
              const displayResults = results.filter(r => r.isExactMatch !== false);

              if (displayResults.length === 0) {
                return (
                  <div className="no-results">
                    <p>{t('detail.noQuotes')}</p>
                  </div>
                );
              }

              const anyTaxData = displayResults.some(r => r.hasTaxData && r.totalBeforeTax);
              return (
                <div className="results-list">
                  {anyTaxData && (
                    <p className="results-tax-note">{t('detail.taxNote')}</p>
                  )}
                  {displayResults.map((result, i) => (
                    <div
                      className={`result-row ${result.hasDrop ? 'has-savings' : ''} ${i === 0 && result.hasDrop ? 'best' : ''}`}
                      key={`${result.sourceId}-${i}`}
                    >
                      <div className="result-source">
                        {/* Sources without a mark render the app's own hotel
                            glyph rather than an emoji, so the row keeps its
                            rhythm without a stray pictograph. */}
                        <span className="result-logo">
                          {result.sourceLogo || <IconHotel size={22} />}
                        </span>
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
                          {fmt(result.pricePerNight, result.currency)}{t('common.perNight')}
                        </div>
                        <div className="result-total">
                          {fmt(result.totalPrice, result.currency)}
                          <span className="result-total-label"> {t('common.total')} · {t('detail.withTax')}</span>
                        </div>
                        {result.hasTaxData && result.totalBeforeTax ? (
                          <div className="result-total-beforetax">
                            {fmt(result.totalBeforeTax, result.currency)} <span className="result-total-label">{t('detail.beforeTax')}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="result-action">
                        {result.hasDrop ? (
                          <>
                            <span className="result-savings">
                              {t('common.save')} {fmt(result.savings, result.currency)} ({result.savingsPercent}%)
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
                        {formatMoment(alert.date)} - {formatTime(alert.date)}
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
            {(!booking.priceHistory || booking.priceHistory.length === 0) ? (
              <p className="detail-empty-note">
                {lang === 'pt'
                  ? 'Ainda não há histórico de preços. Registramos um ponto sempre que encontramos uma tarifa comparável do mesmo quarto e política.'
                  : 'No price history yet. We record a point whenever we find a comparable rate for the same room and policy.'}
              </p>
            ) : (
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
                            entry.price < totalPrice
                              ? 'var(--accent)'
                              : entry.price > totalPrice
                              ? '#ef4444'
                              : 'var(--primary)',
                        }}
                      />
                    </div>
                    <div className="ph-details">
                      <span className="ph-price">{fmt(entry.price)}</span>
                      <span className="ph-source">{entry.source}</span>
                      <span className="ph-date">
                        {formatInstantDate(entry.date, locale, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
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
              <h3>{t('detail.readyToSave')} {fmt(booking.potentialSavings || booking.totalSavings)}?</h3>
              <p>
                {t('detail.rebookSteps')}{' '}
                <strong>{booking.confirmationNumber}</strong>.
              </p>
            </div>
            <div className="rebook-actions">
              {rebook && (
                <a
                  className="btn btn-lg btn-rebook"
                  href={rebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {lang === 'pt' ? `Reservar em ${rebook.source}` : `Rebook on ${rebook.source}`} — {fmt(rebook.price)}
                </a>
              )}
              <button className="btn btn-accent btn-lg" onClick={() => setShowConfirmModal(true)}>
                {t('savings.confirmBtn')}
              </button>
            </div>
          </div>
        )}

        {/* Confirmed savings badge */}
        {booking.status === 'confirmed_savings' && (
          <div className="confirmed-banner">
            <span className="confirmed-icon">&#10003;</span>
            <span>{t('savings.confirmedBadge')} — {fmt(booking.totalSavings)}</span>
          </div>
        )}

          {/* Price Trends (paid feature; server enforces entitlement + cost cap) */}
        <div style={{ marginTop: 20 }}>
          <PriceTrends
            hotelIds={booking.nuiteeHotelId ? [booking.nuiteeHotelId] : []}
            checkin={booking.checkinDate}
            checkout={booking.checkoutDate}
            currency={booking.currency || 'USD'}
          />
        </div>
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

      {lightboxIdx !== null && (
        <PhotoLightbox
          images={(booking.hotelData?.images || []).map(imgUrl).filter(Boolean)}
          startIndex={lightboxIdx}
          alt={booking.hotelName}
          onClose={() => setLightboxIdx(null)}
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
