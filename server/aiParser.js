// AI-powered booking-confirmation parser.
// Reads an uploaded booking confirmation (PDF, image, or screenshot) and extracts
// structured fields — replacing the brittle regex parser and enabling image/
// screenshot uploads (which previously had no OCR and returned empty fields).
//
// Uses OpenAI:
//   - images/screenshots  -> GPT-4o vision
//   - PDFs                -> text extracted via pdf-parse, then GPT-4o text
// Both paths use Structured Outputs so the response is guaranteed-valid JSON.

const MODEL = 'gpt-4o';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export function isAiParserConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

// JSON schema for OpenAI Structured Outputs. Strict mode requires every property
// in `required` and additionalProperties:false; optional values are expressed as
// nullable so the model can omit what the document doesn't contain.
const BOOKING_SCHEMA = {
  type: 'object',
  properties: {
    hotelName: { type: ['string', 'null'], description: 'Hotel/property name' },
    destination: { type: ['string', 'null'], description: 'City and country, e.g. "Tokyo, Japan"' },
    checkinDate: { type: ['string', 'null'], description: 'Check-in date as YYYY-MM-DD' },
    checkoutDate: { type: ['string', 'null'], description: 'Check-out date as YYYY-MM-DD' },
    roomType: { type: ['string', 'null'], description: 'Room type/category, e.g. "Deluxe Room"' },
    originalPrice: { type: ['number', 'null'], description: 'Total price paid for the whole stay, as a number (no currency symbol)' },
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
      description: 'OTA/platform booked on: booking.com, expedia, airbnb, agoda, hotels.com, or the hotel name if booked direct',
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
Return only what the document actually states — never invent or guess values.
Dates must be formatted YYYY-MM-DD. If a field is not present or you are unsure, return null for it.
For originalPrice, return the total amount paid for the whole stay as a plain number.`;

function mediaTypeFor(mimetype) {
  return mimetype === 'image/jpg' ? 'image/jpeg' : mimetype;
}

async function extractPdfText(buffer) {
  // pdf-parse v2 exports a PDFParse class (not a default function).
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function callOpenAI(userContent) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'booking_extraction', strict: true, schema: BOOKING_SCHEMA },
      },
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');
  return JSON.parse(content);
}

/**
 * Extract booking fields from a document buffer.
 * @param {Buffer} buffer - the file bytes
 * @param {string} mimetype - application/pdf | image/png | image/jpeg | image/jpg
 * @returns {Promise<{fields: object, confidence: object}>}
 */
export async function extractBookingFromDocument(buffer, mimetype) {
  let userContent;

  if (mimetype === 'application/pdf') {
    const text = await extractPdfText(buffer);
    if (!text.trim()) throw new Error('No extractable text in PDF');
    userContent = [
      { type: 'text', text: `Extract the booking details from this confirmation:\n\n${text.slice(0, 12000)}` },
    ];
  } else {
    const dataUrl = `data:${mediaTypeFor(mimetype)};base64,${buffer.toString('base64')}`;
    userContent = [
      { type: 'text', text: 'Extract the booking details from this confirmation.' },
      { type: 'image_url', image_url: { url: dataUrl } },
    ];
  }

  const parsed = await callOpenAI(userContent);

  // Drop null/empty fields and attach a confidence score to each populated one.
  const fields = {};
  const confidence = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === '') continue;
    fields[key] = value;
    confidence[key] = 0.9; // AI extraction is high-confidence; user confirms in review
  }

  return { fields, confidence };
}
