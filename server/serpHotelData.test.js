import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHotelInfoFromDetail, parseGoogleHotelsResults } from './serpApi.js';
import { serpFallbackHotel, hotelKeyFor } from './enrichment.js';
import { marketDataPoint } from './priceHistory.js';

// ─── Task 1: SerpApi hotelInfo extraction ────────────────────────────

test('extractHotelInfoFromDetail: pulls images/star/coords/address/amenities', () => {
  const info = extractHotelInfoFromDetail({
    type: 'hotel',
    extracted_hotel_class: 5,
    address: '10 South St, New York',
    gps_coordinates: { latitude: 40.701, longitude: -74.011 },
    description: 'A luxury members club and hotel.',
    amenities: ['Spa', 'Pool'],
    images: [
      { thumbnail: 'https://img/thumb1.jpg', original_image: 'https://img/orig1.jpg' },
      { thumbnail: 'https://img/thumb2.jpg' },
    ],
  });
  assert.ok(info, 'should return hotel info');
  assert.equal(info.source, 'google');
  // Prefers original_image, falls back to thumbnail; plain URL strings.
  assert.deepEqual(info.images, ['https://img/orig1.jpg', 'https://img/thumb2.jpg']);
  assert.equal(info.star, 5);
  assert.deepEqual(info.coords, { lat: 40.701, lng: -74.011 });
  assert.equal(info.address, '10 South St, New York');
  assert.deepEqual(info.amenities, ['Spa', 'Pool']);
});

test('extractHotelInfoFromDetail: caps images at 12', () => {
  const images = Array.from({ length: 20 }, (_, i) => ({ original_image: `https://img/${i}.jpg` }));
  const info = extractHotelInfoFromDetail({ images });
  assert.equal(info.images.length, 12);
});

test('extractHotelInfoFromDetail: null when nothing usable (no images/coords/address)', () => {
  assert.equal(extractHotelInfoFromDetail({ type: 'hotel', name: 'x' }), null);
  assert.equal(extractHotelInfoFromDetail(null), null);
});

test('extractHotelInfoFromDetail: keeps location-only info even with no photos', () => {
  const info = extractHotelInfoFromDetail({ gps_coordinates: { latitude: 1, longitude: 2 } });
  assert.ok(info);
  assert.equal(info.images.length, 0);
  assert.deepEqual(info.coords, { lat: 1, lng: 2 });
});

test('parseGoogleHotelsResults: attaches .hotelInfo on a FORMAT A detail page', () => {
  const detailData = {
    type: 'hotel',
    name: 'Casa Cipriani New York',
    overall_rating: 4.7,
    reviews: 123,
    extracted_hotel_class: 5,
    address: '10 South St, New York',
    gps_coordinates: { latitude: 40.701, longitude: -74.011 },
    description: 'Luxury.',
    amenities: ['Spa'],
    images: [{ original_image: 'https://img/orig1.jpg' }],
    prices: [
      { source: 'Booking.com', total_rate: { extracted_lowest: 1200 }, rate_per_night: { extracted_lowest: 400 }, link: 'https://booking.com/x' },
    ],
    properties: [],
  };
  const booking = { hotelName: 'Casa Cipriani New York', checkinDate: '2026-08-01', checkoutDate: '2026-08-04', roomType: '', taxesIncluded: true };
  const res = parseGoogleHotelsResults(detailData, 1500, booking);
  assert.ok(Array.isArray(res));
  assert.ok(res.length >= 1, 'should parse the trusted vendor price');
  assert.ok(res.hotelInfo, 'array should carry salvaged hotelInfo');
  assert.equal(res.hotelInfo.source, 'google');
  assert.deepEqual(res.hotelInfo.images, ['https://img/orig1.jpg']);
  assert.equal(res.hotelInfo.star, 5);
});

test('parseGoogleHotelsResults: no .hotelInfo on a FORMAT B search list', () => {
  const listData = {
    properties: [
      { name: 'Some Hotel', total_rate: { extracted_lowest: 800 }, link: 'https://booking.com/y', property_token: 't1' },
    ],
  };
  const booking = { hotelName: 'Some Hotel', checkinDate: '2026-08-01', checkoutDate: '2026-08-04', roomType: '', taxesIncluded: true };
  const res = parseGoogleHotelsResults(listData, 1000, booking);
  assert.equal(res.hotelInfo, undefined, 'list results carry no hotel-level imagery');
});

// ─── Task 2: resolveBookingHotel SerpApi fallback (pure decision) ─────

test('serpFallbackHotel: returns hotelData for a SERP_FALLBACK mapping with images', () => {
  const mapping = { source: 'serpapi', status: 'SERP_FALLBACK', matchScore: 0, hotelData: { name: 'X', images: ['a.jpg'] } };
  const hotel = serpFallbackHotel(mapping);
  assert.ok(hotel);
  assert.equal(hotel.name, 'X');
});

test('serpFallbackHotel: ignores a Nuitée VERIFIED mapping (Nuitée wins upstream)', () => {
  const mapping = { source: 'nuitee', status: 'VERIFIED', hotelData: { nuiteeHotelId: 'lp1', images: ['a.jpg'] } };
  assert.equal(serpFallbackHotel(mapping), null);
});

test('serpFallbackHotel: null when SerpApi mapping has no images', () => {
  assert.equal(serpFallbackHotel({ source: 'serpapi', status: 'SERP_FALLBACK', hotelData: { images: [] } }), null);
  assert.equal(serpFallbackHotel(null), null);
  assert.equal(serpFallbackHotel({ source: 'serpapi', hotelData: null }), null);
});

test('hotelKeyFor: normalizes case/accents so store and read keys match', () => {
  const a = hotelKeyFor({ hotelName: 'Casa Cipriani', city: 'New York', country: 'US' });
  const b = hotelKeyFor({ hotelName: 'casa  cipriani', city: 'new york', country: 'us' });
  assert.equal(a, b);
  assert.ok(a.length > 0);
});

// ─── Task 4: priceHistory market data-point ──────────────────────────

test('marketDataPoint: cheapest EXACT-hotel total + its source', () => {
  const results = [
    { isExactMatch: true, totalPrice: 1200, source: 'Booking.com' },
    { isExactMatch: true, totalPrice: 1100, source: 'Expedia' },
    { isExactMatch: false, totalPrice: 900, source: 'Agoda' }, // not exact — ignored
  ];
  const p = marketDataPoint(results, '2026-07-26T00:00:00Z');
  assert.equal(p.price, 1100);
  assert.equal(p.source, 'Expedia');
  assert.equal(p.market, true);
  assert.equal(p.date, '2026-07-26T00:00:00Z');
});

test('marketDataPoint: null when no priced exact-hotel result', () => {
  assert.equal(marketDataPoint([{ isExactMatch: false, totalPrice: 100 }], 'd'), null);
  assert.equal(marketDataPoint([{ isExactMatch: true, totalPrice: 0 }], 'd'), null);
  assert.equal(marketDataPoint([], 'd'), null);
  assert.equal(marketDataPoint(null, 'd'), null);
});
