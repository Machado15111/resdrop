import { useState, useEffect } from 'react';
import { API } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { IconHotel, IconSearch, IconClock, IconAlertCircle, IconCheck, IconExternalLink, IconSparkles } from './Icons';
import './HotelDetailsModal.css';

export default function HotelDetailsModal({ hotelId: initialHotelId, onClose }) {
  const { authFetch } = useAuth();
  const [hotelId, setHotelId] = useState(initialHotelId || '');
  const [queryInput, setQueryInput] = useState(initialHotelId || '');
  const [loading, setLoading] = useState(Boolean(initialHotelId));
  const [error, setError] = useState(null);
  const [hotelData, setHotelData] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); // overview, rooms, policies, rates

  // Rate search state
  const [checkin, setCheckin] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [checkout, setCheckout] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 17);
    return d.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState('USD');
  const [rateSearching, setRateSearching] = useState(false);
  const [ratesResult, setRatesResult] = useState(null);
  const [ratesError, setRatesError] = useState(null);

  const fetchDetails = async (idToFetch) => {
    if (!idToFetch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setRatesResult(null);
    try {
      const res = await authFetch(`${API}/nuitee/hotel/${encodeURIComponent(idToFetch)}`, {
        headers: { 'accept': 'application/json' }
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Hotel data unavailable for ID "${idToFetch}"`);
      }
      setHotelData(json.data);
      setActiveImageIdx(0);
    } catch (err) {
      console.error('[HotelDetailsModal] fetch error:', err);
      setError(err.message);
      setHotelData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialHotelId) {
      fetchDetails(initialHotelId);
    }
  }, [initialHotelId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (queryInput.trim()) {
      setHotelId(queryInput.trim());
      fetchDetails(queryInput.trim());
    }
  };

  const handleFetchRates = async () => {
    if (!hotelId || !checkin || !checkout) return;
    setRateSearching(true);
    setRatesError(null);
    try {
      const res = await authFetch(`${API}/nuitee/rates`, {
        method: 'POST',
        body: JSON.stringify({
          hotelIds: [hotelId],
          checkin,
          checkout,
          occupancies: [{ adults: 2 }],
          currency,
          maxRatesPerHotel: 5
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch live rates');
      }
      setRatesResult(json.data);
    } catch (err) {
      console.error('[HotelDetailsModal] rate search error:', err);
      setRatesError(err.message);
    } finally {
      setRateSearching(false);
    }
  };

  const renderStars = (num) => {
    const count = Math.min(5, Math.max(0, parseInt(num, 10) || 0));
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  };

  const images = hotelData?.hotelImages || [];
  const activeImage = images[activeImageIdx] || (images.length > 0 ? images[0] : null);

  return (
    <div className="nuitee-modal-overlay" onClick={onClose}>
      <div className="nuitee-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Bar */}
        <div className="nuitee-modal-header">
          <div className="nuitee-header-left">
            <div className="nuitee-badge-sandbox">
              <span className="nuitee-pulse-dot"></span>
              Nuitée Sandbox Live API
            </div>
            <h2 className="nuitee-modal-title">Hotel Details Explorer</h2>
          </div>
          
          <button className="nuitee-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Quick Search ID Bar */}
        <form className="nuitee-search-bar" onSubmit={handleSearchSubmit}>
          <div className="nuitee-search-input-wrap">
            <IconSearch size={16} />
            <input
              type="text"
              className="nuitee-search-input"
              placeholder="Enter LiteAPI Hotel ID (e.g. lp3803c)..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-nuitee-search" disabled={loading}>
            {loading ? 'Fetching...' : 'Load Hotel'}
          </button>
        </form>

        {/* Modal Content Body */}
        <div className="nuitee-modal-body">
          {loading && (
            <div className="nuitee-loading-state">
              <div className="nuitee-spinner"></div>
              <p>Loading essential hotel details from Nuitée API...</p>
            </div>
          )}

          {error && !loading && (
            <div className="nuitee-error-state">
              <IconAlertCircle size={32} />
              <h4>Unable to load hotel</h4>
              <p>{error}</p>
              <button className="btn-secondary" onClick={() => fetchDetails(hotelId)}>
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && hotelData && (
            <>
              {/* Hotel Main Hero Card */}
              <div className="nuitee-hero-section">
                <div className="nuitee-hero-info">
                  <div className="nuitee-title-row">
                    <h1 className="nuitee-hotel-name">{hotelData.name}</h1>
                    {hotelData.starRating > 0 && (
                      <span className="nuitee-stars" title={`${hotelData.starRating} Star Hotel`}>
                        {renderStars(hotelData.starRating)}
                      </span>
                    )}
                  </div>

                  <p className="nuitee-address-line">
                    <span>📍 {hotelData.address ? `${hotelData.address}, ` : ''}{hotelData.city || ''}{hotelData.country ? `, ${hotelData.country.toUpperCase()}` : ''}</span>
                    {hotelData.location?.latitude && hotelData.location?.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${hotelData.location.latitude},${hotelData.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nuitee-map-link"
                      >
                        View Map <IconExternalLink size={12} />
                      </a>
                    )}
                  </p>

                  <div className="nuitee-ratings-bar">
                    {hotelData.rating && (
                      <div className="nuitee-rating-badge">
                        <span className="nuitee-rating-score">{hotelData.rating}</span>
                        <span className="nuitee-rating-label">Guest Rating</span>
                      </div>
                    )}
                    {hotelData.reviewCount > 0 && (
                      <span className="nuitee-review-count">({hotelData.reviewCount.toLocaleString()} reviews)</span>
                    )}
                    {hotelData.hotelType && (
                      <span className="nuitee-type-tag">{hotelData.hotelType}</span>
                    )}
                  </div>
                </div>

                {/* Times & Refund Status */}
                <div className="nuitee-times-card">
                  <div className="nuitee-time-item">
                    <span className="nuitee-time-label">Check-in</span>
                    <span className="nuitee-time-val">{hotelData.checkinCheckoutTimes?.checkin || hotelData.checkinCheckoutTimes?.checkinStart || '03:00 PM'}</span>
                  </div>
                  <div className="nuitee-time-divider"></div>
                  <div className="nuitee-time-item">
                    <span className="nuitee-time-label">Check-out</span>
                    <span className="nuitee-time-val">{hotelData.checkinCheckoutTimes?.checkout || hotelData.checkinCheckoutTimes?.checkoutEnd || '11:00 AM'}</span>
                  </div>
                </div>
              </div>

              {/* Photos Gallery */}
              {images.length > 0 && (
                <div className="nuitee-gallery-wrapper">
                  <div className="nuitee-main-photo-frame">
                    <img
                      src={activeImage?.url || activeImage?.hd_url || activeImage?.failoverPhoto}
                      alt={activeImage?.caption || hotelData.name}
                      className="nuitee-main-photo"
                      onError={(e) => {
                        if (activeImage?.failoverPhoto) e.target.src = activeImage.failoverPhoto;
                      }}
                    />
                    {activeImage?.caption && (
                      <span className="nuitee-photo-caption">{activeImage.caption}</span>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div className="nuitee-thumbnails-list">
                      {images.slice(0, 10).map((img, idx) => (
                        <button
                          key={idx}
                          className={`nuitee-thumb-btn ${idx === activeImageIdx ? 'active' : ''}`}
                          onClick={() => setActiveImageIdx(idx)}
                        >
                          <img src={img.url || img.failoverPhoto} alt={img.caption || `Photo ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="nuitee-tabs">
                <button
                  className={`nuitee-tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview & Facilities
                </button>
                <button
                  className={`nuitee-tab ${activeTab === 'rooms' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rooms')}
                >
                  Rooms ({hotelData.rooms?.length || 0})
                </button>
                <button
                  className={`nuitee-tab ${activeTab === 'policies' ? 'active' : ''}`}
                  onClick={() => setActiveTab('policies')}
                >
                  Policies & Cancellation
                </button>
                <button
                  className={`nuitee-tab ${activeTab === 'rates' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rates')}
                >
                  <IconSparkles size={14} style={{ marginRight: 4 }} />
                  Live Rates Search
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="nuitee-tab-content">
                  {/* Description */}
                  {hotelData.hotelDescription && (
                    <div className="nuitee-section-box">
                      <h3 className="nuitee-section-title">About the Property</h3>
                      <div
                        className="nuitee-html-description"
                        dangerouslySetInnerHTML={{ __html: hotelData.hotelDescription }}
                      />
                    </div>
                  )}

                  {/* Facilities */}
                  {(hotelData.hotelFacilities?.length > 0 || hotelData.facilities?.length > 0) && (
                    <div className="nuitee-section-box">
                      <h3 className="nuitee-section-title">Hotel Facilities & Amenities</h3>
                      <div className="nuitee-facilities-grid">
                        {(hotelData.facilities?.length > 0
                          ? hotelData.facilities.map(f => f.name)
                          : hotelData.hotelFacilities
                        ).map((facilityName, i) => (
                          <div key={i} className="nuitee-facility-pill">
                            <IconCheck size={14} className="nuitee-check-icon" />
                            <span>{facilityName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sentiment Analysis / Review Highlights */}
                  {hotelData.sentiment_analysis && (
                    <div className="nuitee-section-box">
                      <h3 className="nuitee-section-title">Guest Review Highlights</h3>
                      <div className="nuitee-sentiment-grid">
                        {hotelData.sentiment_analysis.pros?.length > 0 && (
                          <div className="nuitee-sentiment-col pros">
                            <h5>👍 Pros</h5>
                            <ul>
                              {hotelData.sentiment_analysis.pros.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {hotelData.sentiment_analysis.cons?.length > 0 && (
                          <div className="nuitee-sentiment-col cons">
                            <h5>👎 Cons</h5>
                            <ul>
                              {hotelData.sentiment_analysis.cons.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Rooms */}
              {activeTab === 'rooms' && (
                <div className="nuitee-tab-content">
                  {!hotelData.rooms || hotelData.rooms.length === 0 ? (
                    <p className="nuitee-empty-text">No detailed room breakdown available for this hotel.</p>
                  ) : (
                    <div className="nuitee-rooms-list">
                      {hotelData.rooms.map((room, rIdx) => (
                        <div key={room.id || rIdx} className="nuitee-room-card">
                          <div className="nuitee-room-header">
                            <div>
                              <h4 className="nuitee-room-title">{room.roomName}</h4>
                              {room.description && <p className="nuitee-room-desc">{room.description}</p>}
                            </div>
                            <div className="nuitee-room-meta">
                              {room.roomSizeSquare && (
                                <span className="nuitee-room-tag">📐 {room.roomSizeSquare} {room.roomSizeUnit || 'sqm'}</span>
                              )}
                              {room.maxOccupancy && (
                                <span className="nuitee-room-tag">👥 Max {room.maxOccupancy} Guests</span>
                              )}
                            </div>
                          </div>

                          {/* Room Bed Types */}
                          {room.bedTypes?.length > 0 && (
                            <div className="nuitee-room-beds">
                              <strong>Beds:</strong>{' '}
                              {room.bedTypes.map((b, bi) => `${b.quantity}x ${b.bedType}`).join(', ')}
                            </div>
                          )}

                          {/* Room Photos */}
                          {room.photos?.length > 0 && (
                            <div className="nuitee-room-photos">
                              {room.photos.slice(0, 4).map((p, pi) => (
                                <img key={pi} src={p.url || p.failoverPhoto} alt={p.imageDescription || room.roomName} />
                              ))}
                            </div>
                          )}

                          {/* Room Amenities */}
                          {room.roomAmenities?.length > 0 && (
                            <div className="nuitee-room-amenities">
                              {room.roomAmenities.slice(0, 12).map((a, ai) => (
                                <span key={ai} className="nuitee-mini-pill">{a.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Policies & Cancellation */}
              {activeTab === 'policies' && (
                <div className="nuitee-tab-content">
                  {/* Cancellation Rules */}
                  <div className="nuitee-section-box">
                    <h3 className="nuitee-section-title">Cancellation Policy</h3>
                    {hotelData.cancellationPolicies ? (
                      <div className="nuitee-policy-card">
                        <div className="nuitee-policy-badge-row">
                          <span className={`nuitee-cancel-badge ${hotelData.cancellationPolicies.refundableTag === 'RFN' ? 'refundable' : 'non-refundable'}`}>
                            {hotelData.cancellationPolicies.refundableTag === 'RFN' ? '✅ Refundable Rate Available' : '⚠️ Non-Refundable Policy'}
                          </span>
                        </div>

                        {hotelData.cancellationPolicies.cancelPolicyInfos?.length > 0 ? (
                          <div className="nuitee-policy-timeline">
                            {hotelData.cancellationPolicies.cancelPolicyInfos.map((pol, pi) => (
                              <div key={pi} className="nuitee-policy-item">
                                <div className="nuitee-policy-icon"><IconClock size={16} /></div>
                                <div className="nuitee-policy-details">
                                  <strong>After {new Date(pol.cancelTime).toLocaleString()}:</strong>
                                  <p>Cancellation fee will be <strong>{pol.amount} {pol.currency || 'USD'}</strong></p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="nuitee-subtext">Cancellation terms are determined dynamically during live rate booking.</p>
                        )}
                      </div>
                    ) : (
                      <p className="nuitee-subtext">No standard cancellation policy provided for static view.</p>
                    )}
                  </div>

                  {/* Important Information */}
                  {hotelData.hotelImportantInformation && (
                    <div className="nuitee-section-box warning-box">
                      <h3 className="nuitee-section-title">⚠️ Important Guest Information</h3>
                      <div
                        className="nuitee-important-info"
                        dangerouslySetInnerHTML={{ __html: hotelData.hotelImportantInformation }}
                      />
                    </div>
                  )}

                  {/* General Hotel Policies */}
                  {hotelData.policies?.length > 0 && (
                    <div className="nuitee-section-box">
                      <h3 className="nuitee-section-title">Hotel Rules & Policies</h3>
                      <div className="nuitee-general-policies">
                        {hotelData.policies.map((pol, pi) => (
                          <div key={pi} className="nuitee-policy-row">
                            <strong>{pol.name}:</strong> <span>{pol.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Live Rates Search */}
              {activeTab === 'rates' && (
                <div className="nuitee-tab-content">
                  <div className="nuitee-rates-widget">
                    <h3 className="nuitee-section-title">Search Live Rates (Nuitée Sandbox API)</h3>
                    <p className="nuitee-subtext">Fetch real-time room availability and prices directly from Nuitée LiteAPI sandbox.</p>

                    <div className="nuitee-rates-form">
                      <div className="nuitee-form-group">
                        <label>Check-in Date</label>
                        <input
                          type="date"
                          value={checkin}
                          onChange={(e) => setCheckin(e.target.value)}
                        />
                      </div>

                      <div className="nuitee-form-group">
                        <label>Check-out Date</label>
                        <input
                          type="date"
                          value={checkout}
                          onChange={(e) => setCheckout(e.target.value)}
                        />
                      </div>

                      <div className="nuitee-form-group">
                        <label>Currency</label>
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                          <option value="USD">USD ($)</option>
                          <option value="BRL">BRL (R$)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>

                      <div className="nuitee-form-group align-end">
                        <button
                          className="btn-primary btn-search-rates"
                          onClick={handleFetchRates}
                          disabled={rateSearching}
                        >
                          {rateSearching ? 'Searching...' : 'Search Live Rates'}
                        </button>
                      </div>
                    </div>

                    {ratesError && (
                      <div className="nuitee-rates-error">
                        <IconAlertCircle size={18} />
                        <span>{ratesError}</span>
                      </div>
                    )}

                    {ratesResult && (
                      <div className="nuitee-rates-results">
                        <h4>Search Results</h4>
                        {(!ratesResult.hotels || ratesResult.hotels.length === 0) && (!ratesResult.data || ratesResult.data.length === 0) ? (
                          <div className="nuitee-no-rates">
                            No rates returned for these dates in Sandbox mode. Try alternate dates or test hotel ID `lp3803c`.
                          </div>
                        ) : (
                          <div className="nuitee-rate-list">
                            {(ratesResult.hotels || ratesResult.data || []).map((h, i) => (
                              <div key={i} className="nuitee-rate-card">
                                <h5>{h.name || hotelData.name}</h5>
                                {h.rates?.map((rate, rIdx) => (
                                  <div key={rIdx} className="nuitee-rate-item">
                                    <div className="nuitee-rate-info">
                                      <span className="nuitee-rate-name">{rate.name || rate.roomName || 'Standard Room'}</span>
                                      {rate.boardName && <span className="nuitee-board">{rate.boardName}</span>}
                                      {rate.cancellationPolicies?.refundableTag === 'RFN' && (
                                        <span className="nuitee-tag-green">Refundable</span>
                                      )}
                                    </div>
                                    <div className="nuitee-rate-price">
                                      <span className="nuitee-amount">{rate.retailRate?.total?.[0]?.amount || rate.price || rate.totalRate} {rate.currency || currency}</span>
                                      <span className="nuitee-per-night">total stay</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="nuitee-modal-footer">
          <span className="nuitee-footer-info">
            Provider: <strong>Nuitée LiteAPI v3.0</strong> ({hotelData ? `ID: ${hotelData.id}` : ''})
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
