/**
 * importResult.js — the ONE normalized result contract for every import path.
 *
 * Root cause this fixes: /bookings/from-document, /bookings/from-email,
 * /parse-email and /inbound/webhook each used to return a different shape, and the
 * frontend guessed with `data.parsed || data.extractedData || data`. That guess-chain
 * silently dropped data. Every import entry point now returns buildImportResult(...)
 * and is checked by validateImportResult(...) at the res.json() boundary.
 *
 * Field names intentionally match the EXISTING ResDrop codebase / DB / forms
 * (hotelName, checkinDate, checkoutDate, originalPrice, currency, ...), not an
 * aspirational schema — consistency with the rest of the app beats renaming.
 */

// Canonical booking field names used across the whole app.
export const BOOKING_FIELDS = [
  'hotelName',
  'destination',
  'checkinDate',
  'checkoutDate',
  'roomType',
  'originalPrice',
  'currency',
  'guestName',
  'confirmationNumber',
];

// Fields required before a booking can move to monitoring.
export const ESSENTIAL_FIELDS = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];

// Allowed status values. Superset so existing DB rows (READY_FOR_CONFIRMATION,
// NEEDS_REVIEW) stay valid alongside the new canonical statuses.
export const IMPORT_STATUS = Object.freeze({
  READY_FOR_CONFIRMATION: 'READY_FOR_CONFIRMATION',
  NEEDS_INFORMATION: 'NEEDS_INFORMATION',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  ACTIVE_MONITORING: 'ACTIVE_MONITORING',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  DUPLICATE: 'DUPLICATE',
});

export const ALLOWED_STATUSES = Object.values(IMPORT_STATUS);
export const createImportResult = buildImportResult;

const VALID_STATUSES = new Set(Object.values(IMPORT_STATUS));

// Aliases → canonical field name (accept the aspirational schema too, so callers
// that produce checkIn/totalPrice/bookingReference still land in the right slot).
const FIELD_ALIASES = {
  checkIn: 'checkinDate',
  checkin: 'checkinDate',
  checkOut: 'checkoutDate',
  checkout: 'checkoutDate',
  totalPrice: 'originalPrice',
  price: 'originalPrice',
  bookingReference: 'confirmationNumber',
  reservationNumber: 'confirmationNumber',
  city: 'destination',
  hotel: 'hotelName',
};

// Identity/passthrough fields kept when a *created DB booking* is passed in (as
// opposed to raw extracted text). Without these the frontend loses booking.id and
// navigates to /bookings/undefined. These are safe because a DB booking is trusted,
// not arbitrary regex output.
const IDENTITY_FIELDS = ['id', 'bookingId', 'status', 'email', 'userEmail', 'userName'];

/**
 * Map arbitrary extracted data onto the canonical booking shape.
 * Only known fields survive — prevents state pollution the frontend used to guard against.
 */
export function normalizeBookingFields(raw = {}) {
  const booking = {};
  // Only plain objects carry named fields — a string/array/number can't.
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return booking;
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === '') continue;
    const canonical = FIELD_ALIASES[key] || key;
    if (BOOKING_FIELDS.includes(canonical) && booking[canonical] === undefined) {
      booking[canonical] = value;
    }
  }
  // Preserve identity fields verbatim so callers passing a real booking keep its id/status.
  for (const f of IDENTITY_FIELDS) {
    if (raw && raw[f] !== undefined && raw[f] !== null && booking[f] === undefined) {
      booking[f] = raw[f];
    }
  }
  return booking;
}

/** Which essential fields are still missing from a booking object. */
export function computeMissingFields(booking = {}) {
  return ESSENTIAL_FIELDS.filter((f) => booking[f] === undefined || booking[f] === null || booking[f] === '');
}

/**
 * Build the normalized result. Callers pass whatever they extracted; this
 * guarantees the exact contract shape every time.
 */
export function buildImportResult({
  source,
  booking = {},
  hotel = null,
  warnings = [],
  attachmentsProcessed = [],
  confidenceScores = {},
  status,
  success,
  duplicateOf = null,
  importId = null,
  documentId = null,
  extra = {},
} = {}) {
  const normalizedBooking = normalizeBookingFields(booking);
  const missingFields = computeMissingFields(normalizedBooking);

  let finalStatus = status;
  if (!finalStatus) {
    if (duplicateOf) finalStatus = IMPORT_STATUS.DUPLICATE;
    else finalStatus = missingFields.length === 0
      ? IMPORT_STATUS.READY_FOR_CONFIRMATION
      : IMPORT_STATUS.NEEDS_INFORMATION;
  }

  // attachmentsProcessed may arrive as an array of descriptors OR a plain count
  // (the extractor returns a number). Keep the contract's array shape but never
  // silently lose the count.
  let attArray = [];
  let attCount = 0;
  if (Array.isArray(attachmentsProcessed)) {
    attArray = attachmentsProcessed;
    attCount = attachmentsProcessed.length;
  } else if (typeof attachmentsProcessed === 'number') {
    attCount = attachmentsProcessed;
  }

  const result = {
    // `extra` (e.g. { documentId, importId }) is spread first so real contract
    // keys below always win and can't be clobbered by a caller.
    ...extra,
    success: success !== undefined ? success : finalStatus !== IMPORT_STATUS.FAILED,
    source: source || 'unknown',
    booking: normalizedBooking,
    hotel: hotel || null,
    missingFields,
    warnings: Array.isArray(warnings) ? warnings : [],
    attachmentsProcessed: attArray,
    attachmentsProcessedCount: attCount,
    status: finalStatus,
    // metadata carried alongside the contract (non-breaking extras)
    confidenceScores: confidenceScores || {},
    // Legacy mirror: several frontend consumers still read `data.extractedData`.
    extractedData: normalizedBooking,
    importId: importId ?? extra.importId ?? null,
    documentId: documentId ?? extra.documentId ?? null,
    duplicateOf,
  };
  return result;
}

/** Build a controlled failure result instead of throwing/hiding the error. */
export function buildFailedResult({ source = 'unknown', message = 'Import failed', warnings = [] } = {}) {
  return buildImportResult({
    source,
    booking: {},
    status: IMPORT_STATUS.FAILED,
    success: false,
    warnings: [...(Array.isArray(warnings) ? warnings : []), message],
  });
}

/**
 * Validate the contract at an integration boundary. Throws on shape drift so
 * bugs surface immediately instead of silently returning a wrong shape.
 * Returns the result unchanged when valid (usable inline: res.json(validateImportResult(r))).
 */
export function validateImportResult(result) {
  const errors = [];
  if (!result || typeof result !== 'object') {
    throw new Error('ImportResult contract violation: result is not an object');
  }
  if (typeof result.success !== 'boolean') errors.push('success must be boolean');
  if (typeof result.source !== 'string' || !result.source) errors.push('source must be a non-empty string');
  if (!result.booking || typeof result.booking !== 'object') errors.push('booking must be an object');
  if (result.hotel !== null && typeof result.hotel !== 'object') errors.push('hotel must be an object or null');
  if (!Array.isArray(result.missingFields)) errors.push('missingFields must be an array');
  if (!Array.isArray(result.warnings)) errors.push('warnings must be an array');
  if (!Array.isArray(result.attachmentsProcessed)) errors.push('attachmentsProcessed must be an array');
  if (!VALID_STATUSES.has(result.status)) errors.push(`status "${result.status}" is not a valid IMPORT_STATUS`);

  if (errors.length > 0) {
    throw new Error(`ImportResult contract violation: ${errors.join('; ')}`);
  }
  return result;
}
