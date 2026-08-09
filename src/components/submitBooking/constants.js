/**
 * Static option lists and extraction-confidence thresholds for the booking
 * intake flow. Moved out of SubmitBooking.jsx verbatim.
 *
 * Every user-facing label carries both languages ({ en, pt }), per the
 * project's i18n rule — these render directly in the manual-entry form.
 */

export const ROOM_TYPES = [
  { value: 'Standard Room', pt: 'Quarto Standard', en: 'Standard Room' },
  { value: 'Superior Room', pt: 'Quarto Superior', en: 'Superior Room' },
  { value: 'Deluxe Room', pt: 'Quarto Deluxe', en: 'Deluxe Room' },
  { value: 'Junior Suite', pt: 'Suíte Júnior', en: 'Junior Suite' },
  { value: 'Studio', pt: 'Studio', en: 'Studio' },
  { value: 'Suite', pt: 'Suíte', en: 'Suite' },
  { value: 'Penthouse', pt: 'Penthouse', en: 'Penthouse' },
  { value: 'Other', pt: 'Outro', en: 'Other' },
];

export const PREFERENCES = [
  { value: 'sea_view', pt: 'Vista Mar', en: 'Sea View' },
  { value: 'high_floor', pt: 'Andar Alto', en: 'High Floor' },
  { value: 'lowest_category', pt: 'Categoria Mais Baixa', en: 'Lowest Category' },
  { value: 'suite', pt: 'Suíte', en: 'Suite' },
  { value: 'junior_suite', pt: 'Suíte Júnior', en: 'Junior Suite' },
];

export const CONFIDENCE_COLORS = {
  high: '#166534',
  medium: '#92400e',
  low: '#991b1b',
};

/**
 * Bucket an extractor's 0..1 confidence score.
 *
 * These thresholds decide which auto-extracted fields the user is nudged to
 * check before monitoring starts, so they are the difference between a booking
 * monitored against the right hotel and one monitored against the wrong one.
 */
export function getConfidenceLevel(score) {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/** Label for a confidence level, in the user's language. */
export function confidenceLabel(level, lang) {
  const labels = {
    high: { en: 'High', pt: 'Alta' },
    medium: { en: 'Med', pt: 'Média' },
    low: { en: 'Low', pt: 'Baixa' },
  };
  const entry = labels[level];
  if (!entry) return '';
  return lang === 'pt' ? entry.pt : entry.en;
}

// Steps in the intake flow.
export const STEP_INTAKE = 'intake';
export const STEP_PROCESSING = 'processing';
export const STEP_REVIEW = 'review';
export const STEP_MANUAL = 'manual';
