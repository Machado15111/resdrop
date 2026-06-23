// AI-powered booking-confirmation parser.
// Uses Claude's native vision (images/screenshots) and PDF support to read a
// booking confirmation and extract structured fields — replacing the brittle
// regex parser and enabling image/screenshot uploads (which had no OCR before).

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-4-8';

let client = null;
function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

export function isAiParserConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// JSON schema for structured outputs. All fields nullable so the model can omit
// what isn't present in the document, but every key is required + additionalProperties:false
// (a structured-outputs requirement).
const BOOKING_SCHEMA = {
  type: 'object',
  properties: {
    hotelName: { type: ['string', 'null'], description: 'Hotel/property name' },
    destination: { type: ['string', 'null'], description: 'City and country, e.g. "Tokyo, Japan"' },
    checkinDate: { type: ['string', 'null'], description: 'Check-in date as YYYY-MM-DD' },
    checkoutDate: { type: ['string', 'null'], description: 'Check-out date as YYYY-MM-DD' },
    roomType: { type: ['string', 'null'], description: 'Room type/category, e.g. "Deluxe Room"' },
    originalPrice: { type: ['number', 'null'], description: 'Total price paid, as a number (no currency symbol)' },
    currency: { type: ['string', 'null'], description: 'ISO currency code, e.g. USD, BRL, EUR' },
    guestName: { type: ['string', 'null'], description: 'Primary guest name' },
    confirmationNumber: { type: ['string', 'null'], description: 'Booking/confirmation/reservation number' },
    cancellationPolicy: {
      type: ['string', 'null'],
      enum: ['free_cancellation', 'non_refundable', null],
      description: 'free_cancellation if refundable/free cancellation is mentioned; non_refundable if explicitly non-refundable; null if unclear',
    },
    bookingSource: {
      type: ['string', 'null'],
      description: 'OTA/platform the booking was made on, e.g. booking.com, expedia, airbnb, agoda, hotels.com, or the hotel name if booked direct',
    },
  },
  required: [
    'hotelName', 'destination', 'checkinDate', 'checkoutDate', 'roomType',
    'originalPrice', 'currency', 'guestName', 'confirmationNumber',
    'cancellationPolicy', 'bookingSource',
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You extract hotel booking details from a confirmation document (email, PDF, or screenshot).
Read carefully and return only what the document actually states — never invent or guess values.
Dates must be YYYY-MM-DD. If a field is not present or you are unsure, return null for it.
For originalPrice, return the total amount paid for the whole stay as a plain number.`;

function mediaTypeFor(mimetype) {
  if (mimetype === 'image/jpg') return 'image/jpeg';
  return mimetype;
}

/**
 * Extract booking fields from a document buffer using Claude.
 * @param {Buffer} buffer - the file bytes
 * @param {string} mimetype - application/pdf | image/png | image/jpeg | image/jpg
 * @returns {Promise<{fields: object, confidence: object}>}
 */
export async function extractBookingFromDocument(buffer, mimetype) {
  const anthropic = getClient();
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY not configured');

  const base64 = buffer.toString('base64');

  let documentBlock;
  if (mimetype === 'application/pdf') {
    documentBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    };
  } else {
    documentBlock = {
      type: 'image',
      source: { type: 'base64', media_type: mediaTypeFor(mimetype), data: base64 },
    };
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: BOOKING_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [
          documentBlock,
          { type: 'text', text: 'Extract the booking details from this confirmation.' },
        ],
      },
    ],
  });

  // output_config.format guarantees the first text block is valid JSON for our schema.
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text content in AI response');

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error('AI response was not valid JSON');
  }

  // Drop null/empty fields and assign a confidence score to each populated field.
  const fields = {};
  const confidence = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === '') continue;
    fields[key] = value;
    confidence[key] = 0.9; // vision/document extraction is high-confidence; user confirms in review
  }

  return { fields, confidence };
}
