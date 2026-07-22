import * as cheerio from 'cheerio';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { createWorker } from 'tesseract.js';
import { simpleParser } from 'mailparser';

// Month name → number (English + Portuguese, matched on first 3 letters).
const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  fev: 2, abr: 4, mai: 5, ago: 8, set: 9, out: 10, dez: 12,
};

// Hotel brand/chain tokens — real confirmations name the property by brand
// ("IBIS SOFIA AIRPORT") without the literal word "hotel".
const HOTEL_BRANDS = [
  'ibis', 'novotel', 'mercure', 'pullman', 'sofitel', 'fairmont', 'raffles',
  'marriott', 'courtyard', 'sheraton', 'westin', 'renaissance', 'ritz-carlton',
  'ritz carlton', 'hilton', 'hampton', 'doubletree', 'conrad', 'waldorf',
  'hyatt', 'regency', 'radisson', 'accor', 'copacabana palace', 'four seasons',
  'intercontinental', 'crowne plaza', 'holiday inn', 'kempinski', 'kimpton',
  'le meridien', 'st regis', 'st. regis', 'w hotel', 'wyndham', 'ramada',
  'best western', 'fasano', 'tivoli', 'pestana', 'melia', 'meliá',
];

/**
 * ─── Text Normalization Helpers ─────────────────────────────────────
 */

// Hard cap on text we run regexes over — protects against ReDoS / memory blowups
// from a maliciously large document body.
const MAX_TEXT_CHARS = 2_000_000;

export function stripQuotedForwardBlocks(text) {
  if (!text || typeof text !== 'string') return '';
  if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS);
  return text
    .replace(/^>.*$/gm, '')
    .replace(/---+ Forwarded message +---[\s\S]*/i, '')
    .replace(/De:[\s\S]*?Data:[\s\S]*?Assunto:[\s\S]*/i, '')
    .replace(/From:[\s\S]*?Date:[\s\S]*?Subject:[\s\S]*/i, '')
    .trim();
}

export function htmlToText(htmlStr) {
  if (!htmlStr || typeof htmlStr !== 'string') return '';
  if (htmlStr.length > MAX_TEXT_CHARS) htmlStr = htmlStr.slice(0, MAX_TEXT_CHARS);
  try {
    const $ = cheerio.load(htmlStr);
    $('script, style, iframe, object, embed, noscript').remove();
    let text = $('body').length ? $('body').text() : $.text();
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    // Malformed HTML → fall back to a crude tag strip rather than throwing.
    return htmlStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  if (str.length > MAX_TEXT_CHARS) str = str.slice(0, MAX_TEXT_CHARS);
  try {
    return str.normalize('NFC').replace(/\r\n|\r/g, '\n').trim();
  } catch {
    return str.replace(/\r\n|\r/g, '\n').trim();
  }
}

// Validate a y/m/d triple and reject impossible dates (month 13, Feb 30, day 32,
// years outside a sane travel window). Returns YYYY-MM-DD or null.
function finalizeYmd(y, m, d) {
  const yi = parseInt(y, 10), mi = parseInt(m, 10), di = parseInt(d, 10);
  if (!Number.isFinite(yi) || !Number.isFinite(mi) || !Number.isFinite(di)) return null;
  if (yi < 1900 || yi > 2100) return null;
  if (mi < 1 || mi > 12) return null;
  if (di < 1 || di > 31) return null;
  // Real-calendar check (rejects Feb 30, Apr 31, etc.)
  const dt = new Date(Date.UTC(yi, mi - 1, di));
  if (dt.getUTCFullYear() !== yi || dt.getUTCMonth() !== mi - 1 || dt.getUTCDate() !== di) return null;
  return `${yi}-${String(mi).padStart(2, '0')}-${String(di).padStart(2, '0')}`;
}

export function normalizeDate(dateStr) {
  if (dateStr == null || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean || clean.length > 40) return null; // ReDoS / junk guard
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return finalizeYmd(clean.slice(0, 4), clean.slice(5, 7), clean.slice(8, 10));

  // YYYY/MM/DD or YYYY-MM-DD
  const yfirst = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (yfirst) return finalizeYmd(yfirst[1], yfirst[2], yfirst[3]);

  // DD/MM/YYYY, MM/DD/YYYY, or 2-digit-year variants
  const numeric = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (numeric) {
    let [, a, b, y] = numeric;
    if (y.length === 2) y = '20' + y;
    const ai = parseInt(a, 10), bi = parseInt(b, 10);
    let day = a, mon = b;
    if (ai > 12 && bi <= 12) { day = a; mon = b; }        // unambiguously DD/MM
    else if (ai <= 12 && bi > 12) { mon = a; day = b; }   // unambiguously US MM/DD
    // else ambiguous → default to DD/MM (Brazilian/European)
    return finalizeYmd(y, mon, day);
  }

  const monthNum = (name) => MONTHS[name.toLowerCase().slice(0, 3)] || null;

  // Month-name first: "Jul 22, 2026" / "July 22 2026" / "Jul 22nd, 2026"
  const mFirst = clean.match(/^([A-Za-zçÇ]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (mFirst) {
    const m = monthNum(mFirst[1]);
    if (m) return finalizeYmd(mFirst[3], m, mFirst[2]);
  }

  // Day first: "22 Jul 2026" / "22 de julho de 2026"
  const dName = clean.match(/^(\d{1,2})(?:º|o)?\s+(?:de\s+)?([A-Za-zçÇ]{3,})\.?\s+(?:de\s+)?(\d{4})$/i);
  if (dName) {
    const m = monthNum(dName[2]);
    if (m) return finalizeYmd(dName[3], m, dName[1]);
  }

  return null;
}

export function parsePrice(str) {
  if (str == null || (typeof str !== 'number' && typeof str !== 'string')) return null;
  const sane = (v) => (Number.isFinite(v) && v > 0 && v < 100_000_000 ? v : null);
  if (typeof str === 'number') return sane(str);
  if (/-\s*\d/.test(str)) return null; // explicit negative amount → reject before stripping the sign
  const clean = str.replace(/[^\d.,]/g, '').trim();
  if (!clean) return null;
  let val;
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    val = lastComma > lastDot
      ? parseFloat(clean.replace(/\./g, '').replace(',', '.'))
      : parseFloat(clean.replace(/,/g, ''));
  } else if (clean.includes(',')) {
    val = parseFloat(clean.replace(',', '.'));
  } else {
    val = parseFloat(clean);
  }
  return sane(val);
}

export function parseCurrency(str) {
  if (!str) return 'USD';
  const upper = str.toUpperCase();
  if (upper.includes('BRL') || upper.includes('R$')) return 'BRL';
  if (upper.includes('EUR') || upper.includes('€')) return 'EUR';
  if (upper.includes('GBP') || upper.includes('£')) return 'GBP';
  if (upper.includes('USD') || upper.includes('$')) return 'USD';
  return 'USD';
}

/**
 * ─── Provider Specific Templates ─────────────────────────────────────
 */

function extractBookingComTemplate(text) {
  if (!/booking\.com/i.test(text)) return null;
  const fields = {};
  const confidence = {};

  const refMatch = text.match(/(?:confirmation|confirma[çc][ãa]o|booking\s*number|n[°o]\s*da\s*reserva)\s*[:.]?\s*(\d{8,15})/i);
  if (refMatch) {
    fields.bookingReference = refMatch[1];
    confidence.bookingReference = 0.95;
    fields.bookingSource = 'Booking.com';
  }

  const hotelMatch = text.match(/(?:you're\s*going\s*to|reserva\s*em|hotel|pousada)\s*[:.]?\s*([A-Z0-9\s&'.-]{3,80})/i);
  if (hotelMatch) {
    fields.hotelName = hotelMatch[1].trim();
    confidence.hotelName = 0.9;
  }

  return Object.keys(fields).length > 0 ? { fields, confidence } : null;
}

function extractExpediaTemplate(text) {
  if (!/expedia/i.test(text)) return null;
  const fields = {};
  const confidence = {};

  const refMatch = text.match(/(?:itinerary|itinérario|confirmation)\s*#?\s*[:.]?\s*(\d{10,16})/i);
  if (refMatch) {
    fields.bookingReference = refMatch[1];
    confidence.bookingReference = 0.95;
    fields.bookingSource = 'Expedia';
  }

  return Object.keys(fields).length > 0 ? { fields, confidence } : null;
}

function extractAgodaTemplate(text) {
  if (!/agoda/i.test(text)) return null;
  const fields = {};
  const confidence = {};

  const refMatch = text.match(/(?:booking\s*id|n[°o]\s*da\s*reserva)\s*[:.]?\s*(\d{7,12})/i);
  if (refMatch) {
    fields.bookingReference = refMatch[1];
    confidence.bookingReference = 0.95;
    fields.bookingSource = 'Agoda';
  }

  return Object.keys(fields).length > 0 ? { fields, confidence } : null;
}

function extractChainTemplate(text) {
  const chains = [
    { name: 'Marriott', regex: /marriott|courtyard|sheraton|westin|ritz-carlton/i },
    { name: 'Hilton', regex: /hilton|doubletree|hampton\s*inn|conrad|curio/i },
    { name: 'Accor', regex: /accor|ibis|novotel|mercure|pullman|fairmont|sofitel/i },
    { name: 'Hotels.com', regex: /hotels\.com/i },
  ];

  for (const chain of chains) {
    if (chain.regex.test(text)) {
      const confMatch = text.match(/(?:confirma[çc][ãa]o|confirmation|number|n[°o]|code|pin)\s*[:.]?\s*([A-Z0-9\-]{5,15})/i);
      if (confMatch) {
        return {
          fields: {
            bookingReference: confMatch[1],
            bookingSource: chain.name,
          },
          confidence: {
            bookingReference: 0.9,
            bookingSource: 0.9,
          },
        };
      }
    }
  }

  return null;
}

/**
 * ─── Generic Regex Parser ───────────────────────────────────────────
 */

export function extractGenericFields(text) {
  const fields = {};
  const confidence = {};
  const clean = normalizeText(text);

  // 1. Hotel Name
  const hotelPatterns = [
    // "IBIS SOFIA AIRPORT - 1 nights" / "Hotel X - 3 noites" (high precision)
    /(?:^|\n)\s*([A-Z0-9][A-Za-zÀ-ÿ0-9&'.\- ]{2,60}?)\s*[-–—]\s*\d+\s*(?:nights?|noites?)\b/i,
    // Title-case property name ENDING in a hotel-type word ("Rosslyn Central Park
    // Hotel"). Every word must be capitalized, so filler like "your reservation at
    // Hotel" can't match.
    /(?:^|\n)[ \t]*((?:[A-ZÀ-Ý][A-Za-zÀ-ÿ0-9&'.\-]+[ ]){1,5}(?:Hotel|Resort|Inn|Suites?|Palace|Lodge|Pousada|Hostel|Plaza|Towers?|Residence))\b/,
    /(?:nome do hotel|hotel name|hospedagem|estadia em|stay at|reservation at|reserva no|reserva na|reserva em)\s*[:.]?\s*([A-Z0-9][A-Za-z0-9\s&'.-]{2,80})/i,
    // Labeled at line start ("Hotel: X"), skipping label-like words after it.
    /(?:^|\n)\s*(?:hotel|pousada|resort|hostel|accommodation|propriedade)\s*(?:name|nome)?\s*[:.]?\s*(?!program\b|details\b|detalhes\b|commission\b|available\b|only\s|rate\b|room\sonly)([A-Z0-9][A-Za-zÀ-ÿ0-9&'.\- ]{2,60})/i,
    /(?:reserva\s*(?:no|na|em|do|da)|booking\s*at|reservation\s*at)\s+([A-Z0-9\s&'.-]{3,80})/i,
    /([A-Z0-9\s&'.-]{3,60})\s*[-–|]\s*(?:confirma[çc][ãa]o|confirmation|reserva|booking)/i,
  ];
  const HOTEL_NAME_BLOCK = /^(confirmation|confirma[çc][ãa]o|reserva|booking|detalhes|details|sua estadia|program|commission|hotel program|room only rate|best available|available room|only rate|guaranteed rate|pricing breakdown|room description|hotel details|sales info)$/i;
  for (const p of hotelPatterns) {
    const m = clean.match(p);
    if (m) {
      const name = m[1].trim().split(/[,\n\r|]/)[0].trim();
      if (name.length > 3 && name.length < 100 && !HOTEL_NAME_BLOCK.test(name) && !/\b(commission|only rate)\b/i.test(name)) {
        fields.hotelName = name;
        confidence.hotelName = 0.85;
        break;
      }
    }
  }

  // 1b. Brand fallback — a line naming a known chain (e.g. "IBIS SOFIA AIRPORT")
  if (!fields.hotelName) {
    for (const line of clean.split('\n')) {
      const l = line.trim();
      if (l.length < 3 || l.length > 70) continue;
      const low = l.toLowerCase();
      if (HOTEL_BRANDS.some(b => low.includes(b))) {
        const name = l.replace(/\s*[-–—]\s*\d+\s*(?:nights?|noites?).*$/i, '').replace(/\s{2,}/g, ' ').trim();
        if (name.length >= 3 && name.length <= 70) {
          fields.hotelName = name;
          confidence.hotelName = 0.9;
          break;
        }
      }
    }
  }

  // 2. Check-in Date
  const checkinPatterns = [
    /(?:check[\s-]*in|entrada|chegada|arrival)[^\r\n:]*?[:.]?[ \t]*(?:[A-Za-zçÇ]{3,9}\.?,?[ \t]+)?(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
    /(?:check[\s-]*in|entrada|chegada|arrival)[^\r\n:]*?[:.]?[ \t]*(?:[A-Za-zçÇ]{3,9}\.?,?[ \t]+)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:check[\s-]*in|entrada|chegada|arrival)[^\r\n:]*?[:.]?[ \t]*(?:[A-Za-zçÇ]{3,9}\.?,?[ \t]+)?([A-Za-zçÇ]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /(?:check[\s-]*in|entrada|chegada|arrival)[^\r\n:]*?[:.]?[ \t]*(?:[A-Za-zçÇ]{3,9}\.?,?[ \t]+)?(\d{1,2}\s+(?:de\s+)?[A-Za-zçÇ]{3,9}\.?\s+(?:de\s+)?\d{4})/i,
  ];
  for (const p of checkinPatterns) {
    const m = clean.match(p);
    if (m) {
      const norm = normalizeDate(m[1]);
      if (norm) {
        fields.checkIn = norm;
        fields.checkinDate = norm;
        confidence.checkIn = 0.85;
        confidence.checkinDate = 0.85;
        break;
      }
    }
  }

  // 3. Check-out Date
  const checkoutPatterns = [
    /(?:check[\s-]*out|sa[íi]da|partida|departure)[^\r\n:]*?[:.]?[ \t]*(?:[A-Za-zçÇ]{3,9}\.?,?[ \t]+)?(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
    /(?:check[\s-]*out|sa[íi]da|partida|departure)[^\r\n:]*?[:.]?[ \t]*(?:[A-Za-zçÇ]{3,9}\.?,?[ \t]+)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:check[\s-]*out|sa[íi]da|partida|departure)[^\r\n:]*?[:.]?[ \t]*(?:[A-Za-zçÇ]{3,9}\.?,?[ \t]+)?([A-Za-zçÇ]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /(?:check[\s-]*out|sa[íi]da|partida|departure)[^\r\n:]*?[:.]?[ \t]*(?:[A-Za-zçÇ]{3,9}\.?,?[ \t]+)?(\d{1,2}\s+(?:de\s+)?[A-Za-zçÇ]{3,9}\.?\s+(?:de\s+)?\d{4})/i,
  ];
  for (const p of checkoutPatterns) {
    const m = clean.match(p);
    if (m) {
      const norm = normalizeDate(m[1]);
      if (norm) {
        fields.checkOut = norm;
        fields.checkoutDate = norm;
        confidence.checkOut = 0.85;
        confidence.checkoutDate = 0.85;
        break;
      }
    }
  }

  // 4. Total Price & Currency
  const pricePatterns = [
    /(?:total|valor|amount|price|pre[çc]o|di[áa]ria)\s*[:.]?\s*[\r\n]*\s*(?:R\$|USD|BRL|EUR|GBP|\$|€|£)?\s*([\d.,]+)/i,
    /(?:R\$|USD|BRL|EUR|GBP)\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:BRL|USD|EUR|GBP)/i,
  ];
  for (const p of pricePatterns) {
    const m = clean.match(p);
    if (m) {
      const price = parsePrice(m[1]);
      if (price !== null && price > 0) {
        fields.totalPrice = price;
        fields.originalPrice = price;
        confidence.totalPrice = 0.8;
        confidence.originalPrice = 0.8;
        break;
      }
    }
  }

  const currMatch = clean.match(/(USD|BRL|EUR|GBP|R\$|\$|€|£)/i);
  if (currMatch) {
    fields.currency = parseCurrency(currMatch[1]);
    confidence.currency = 0.9;
  }

  // 5. Booking Reference / Confirmation Number
  const confPatterns = [
    /(?:n[úo]mero\s*d[ao]\s*confirma[çc][ãa]o|n[°o]\s*d[ao]\s*confirma[çc][ãa]o|c[óo]digo\s*d[ao]\s*reserva|n[°o]\s*d[ao]\s*reserva|confirmation\s*number|confirmation\s*code|booking\s*number|booking\s*id|confirma[çc][ãa]o|confirmation)[^\r\n:]*[:#.]?[ \t]*([A-Z0-9\-]{4,25})/i,
    /code[^\r\n:]*[:.]?[ \t]*([A-Z0-9\-]{5,20})/i,
  ];
  for (const p of confPatterns) {
    const m = clean.match(p);
    if (m && !/^(confirmation|confirmação|reserva|booking|details)$/i.test(m[1])) {
      fields.bookingReference = m[1].trim();
      fields.confirmationNumber = m[1].trim();
      confidence.bookingReference = 0.85;
      confidence.confirmationNumber = 0.85;
      break;
    }
  }

  // 6. Guest Name — accepts ALL-CAPS names ("PERVAIZ KHAN") and agency
  // "Prepared for" headers; [ \t]+ keeps the match from bleeding onto the next line.
  const NAME = "([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'.-]+(?:[ \\t]+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'.-]+){1,3})";
  const guestPatterns = [
    new RegExp(`(?:guest|h[óo]spede)\\s*[:.]?\\s*${NAME}`, 'i'),
    new RegExp(`(?:prepared\\s*for|preparado\\s*para|passageiro|passenger)\\s*[:.]?\\s*${NAME}`, 'i'),
    new RegExp(`(?:sr\\.|sra\\.|mr\\.|mrs\\.|ms\\.)\\s*${NAME}`, 'i'),
    new RegExp(`(?:nome|name)\\s*[:.]?\\s*${NAME}`, 'i'),
  ];
  for (const p of guestPatterns) {
    const m = clean.match(p);
    if (m) {
      fields.guestName = m[1].trim();
      confidence.guestName = 0.7;
      break;
    }
  }

  // 6b. Destination / City (feeds Nuitée hotel matching)
  const destMatch = clean.match(/(?:destino|destination|cidade|city|localiza[çc][ãa]o|location)\s*[:.]?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{1,58})/i);
  if (destMatch) {
    const dest = destMatch[1].trim().split(/[\n\r|,]/)[0].trim();
    if (dest.length > 1 && !/^(destino|destination|cidade|city|location)$/i.test(dest)) {
      fields.destination = dest;
      fields.city = dest;
      confidence.destination = 0.7;
      confidence.city = 0.7;
    }
  }

  // 7. Room Type & Meal Plan — prefer explicit "Room description", and never
  // capture rate-plan phrasing like "ROOM ONLY RATE" as a room type.
  const roomMatch =
    clean.match(/room\s*description\s*[:.]?\s*([^\n\r]{3,60})/i) ||
    clean.match(/(?:room\s*type|tipo\s*(?:de\s*)?quarto)\s*[:.]?\s*([^\n\r,]{3,50})/i) ||
    clean.match(/\b(?:quarto|room)\s*[:.]?\s*((?!only\s*rate|available|best\s)[^\n\r,]{3,50})/i);
  if (roomMatch && !/^(only rate|available|rate|best available)/i.test(roomMatch[1].trim())) {
    fields.roomType = roomMatch[1].trim();
    confidence.roomType = 0.65;
  }

  const mealMatch = clean.match(/(?:caf[eé]\s*da\s*manh[aã]|breakfast|meal\ plan|regime)\s*[:.]?\s*([^\n\r,]{3,50})/i);
  if (mealMatch) {
    fields.mealPlan = mealMatch[1].trim();
    confidence.mealPlan = 0.7;
  }

  // 8. Refundable & Cancellation
  if (/n[aã]o\s*reembols[aá]vel|non-refundable/i.test(clean)) {
    fields.refundable = false;
    confidence.refundable = 0.9;
  } else if (/reembols[aá]vel|refundable|cancelamento\s*gr[aá]tis|free\s*cancellation/i.test(clean)) {
    fields.refundable = true;
    confidence.refundable = 0.85;
  }

  const cancelPolicyMatch = clean.match(/(?:cancelamento|cancellation|cancellation\s*policy)\s*[:.]?\s*([^\n\r]{10,120})/i);
  if (cancelPolicyMatch) {
    fields.cancellationPolicyText = cancelPolicyMatch[1].trim();
    confidence.cancellationPolicyText = 0.75;
  }

  // 9. Adults, Children, Rooms — bounded so a typo like "99999 adults" can't poison the record
  const occInt = (s, max) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
  };
  const adultMatch = clean.match(/(\d{1,3})\s*(?:adultos?|adults?)/i);
  if (adultMatch) {
    const n = occInt(adultMatch[1], 30);
    if (n !== null) { fields.adults = n; confidence.adults = 0.8; }
  }

  const childMatch = clean.match(/(\d{1,3})\s*(?:crian[çc]as?|children|kids?)/i);
  if (childMatch) {
    const n = occInt(childMatch[1], 30);
    if (n !== null) { fields.children = n; confidence.children = 0.8; }
  }

  const roomsMatch = clean.match(/(\d{1,3})\s*(?:quartos?|rooms?)/i);
  if (roomsMatch) {
    const n = occInt(roomsMatch[1], 50);
    if (n !== null) { fields.rooms = n; confidence.rooms = 0.8; }
  }

  // Sanity: check-out must be strictly after check-in. Lower confidence so the
  // review UI flags it (the route also keeps such a booking out of active monitoring).
  if (fields.checkinDate && fields.checkoutDate && fields.checkoutDate <= fields.checkinDate) {
    confidence.checkoutDate = Math.min(confidence.checkoutDate || 0.5, 0.3);
  }

  return { fields, confidence };
}

/**
 * ─── Local OCR via Tesseract.js (Zero AI tokens) ────────────────────
 */

// Race a promise against a timeout so a malformed image/PDF can never hang a worker.
function withTimeout(promise, ms, onTimeout) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(onTimeout); } }, ms);
    Promise.resolve(promise).then(
      (v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } },
      () => { if (!done) { done = true; clearTimeout(t); resolve(onTimeout); } },
    );
  });
}

const OCR_TIMEOUT_MS = (parseInt(process.env.LOCAL_OCR_TIMEOUT_SECONDS, 10) || 60) * 1000;
const PDF_TIMEOUT_MS = (parseInt(process.env.PDF_PARSE_TIMEOUT_SECONDS, 10) || 30) * 1000;
const MAX_OCR_BYTES = 20 * 1024 * 1024; // don't OCR absurdly large images

export async function runLocalOcr(imageBuffer) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) return '';
  if (imageBuffer.length > MAX_OCR_BYTES) {
    console.warn('[Local OCR] Skipping oversized image buffer:', imageBuffer.length);
    return '';
  }
  let worker = null;
  try {
    const run = (async () => {
      worker = await createWorker('eng+por');
      const ret = await worker.recognize(imageBuffer);
      return ret?.data?.text || '';
    })();
    return await withTimeout(run, OCR_TIMEOUT_MS, '');
  } catch (err) {
    console.warn('[Local OCR] Tesseract extraction warning:', err.message);
    return '';
  } finally {
    if (worker) { try { await worker.terminate(); } catch {} }
  }
}

/**
 * ─── Document File Parsers (PDF, DOCX, XLSX/CSV, ICS, MSG, EML) ───────
 */

export async function parsePdfBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return '';
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const text = await withTimeout(parser.getText().then(r => r?.text || ''), PDF_TIMEOUT_MS, '');
      return text || '';
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err) {
    console.warn('[PDF Extractor] Failed to extract text layer:', err.message);
    return '';
  }
}

export async function parseDocxBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return '';
  try {
    const res = await mammoth.extractRawText({ buffer });
    return res.value || '';
  } catch (err) {
    console.warn('[DOCX Extractor] Failed to extract DOCX:', err.message);
    return '';
  }
}

const XLSX_MAX_ROWS = 5000;
const XLSX_MAX_COLS = 100;
const XLSX_MAX_SHEETS = 20;

export function parseXlsxBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return '';
  try {
    // dense:false + cellFormula:false so we never evaluate embedded formulas.
    const workbook = xlsx.read(buffer, { type: 'buffer', cellFormula: false, cellHTML: false });
    let text = '';
    for (const sheetName of (workbook.SheetNames || []).slice(0, XLSX_MAX_SHEETS)) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet || !sheet['!ref']) continue;
      // Clamp the range so a "cell bomb" (e.g. A1:XFD1048576) can't exhaust memory.
      try {
        const range = xlsx.utils.decode_range(sheet['!ref']);
        range.e.r = Math.min(range.e.r, XLSX_MAX_ROWS);
        range.e.c = Math.min(range.e.c, XLSX_MAX_COLS);
        sheet['!ref'] = xlsx.utils.encode_range(range);
      } catch {}
      text += xlsx.utils.sheet_to_csv(sheet) + '\n';
    }
    return text;
  } catch (err) {
    console.warn('[XLSX Extractor] Failed to extract spreadsheet:', err.message);
    return '';
  }
}

export function parseIcsOrJson(str) {
  if (!str || typeof str !== 'string') return '';
  if (str.length > MAX_TEXT_CHARS) str = str.slice(0, MAX_TEXT_CHARS);
  if (str.includes('BEGIN:VCALENDAR') || str.includes('BEGIN:VEVENT')) {
    const summary = str.match(/SUMMARY:(.*)/i)?.[1] || '';
    const desc = str.match(/DESCRIPTION:(.*)/i)?.[1] || '';
    const location = str.match(/LOCATION:(.*)/i)?.[1] || '';
    const dtstart = str.match(/DTSTART:(.*)/i)?.[1] || '';
    const dtend = str.match(/DTEND:(.*)/i)?.[1] || '';
    return `ICS Event: ${summary} | ${desc} | ${location} | Start: ${dtstart} | End: ${dtend}`;
  }
  if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
    try {
      const obj = JSON.parse(str);
      return JSON.stringify(obj);
    } catch {}
  }
  return str;
}

/**
 * ─── Consolidated Extractor Main Function ───────────────────────────
 */

export async function extractBookingFromSource({
  text = '',
  html = '',
  attachments = [],
  subject = '',
  mimetype = '',
  buffer = null,
  depth = 0,
}) {
  const warnings = [];
  let attachmentsProcessed = 0;
  let rawText = text || '';

  // 1. Process HTML if available
  if (html) {
    rawText += '\n' + htmlToText(html);
  }

  // 2. Process primary file buffer if present
  if (buffer && mimetype) {
    const cleanMime = mimetype.toLowerCase();
    if (cleanMime.includes('pdf')) {
      const pdfText = await parsePdfBuffer(buffer);
      if (pdfText.trim().length > 0) {
        rawText += '\n' + pdfText;
      } else {
        // Fallback to local OCR for scanned PDF
        const ocrText = await runLocalOcr(buffer);
        rawText += '\n' + ocrText;
      }
    } else if (cleanMime.includes('wordprocessingml') || cleanMime.includes('msword')) {
      rawText += '\n' + await parseDocxBuffer(buffer);
    } else if (cleanMime.includes('spreadsheetml') || cleanMime.includes('excel') || cleanMime.includes('csv')) {
      rawText += '\n' + parseXlsxBuffer(buffer);
    } else if (cleanMime.startsWith('image/')) {
      rawText += '\n' + await runLocalOcr(buffer);
    }
  }

  // Clean and strip forward blocks
  rawText = stripQuotedForwardBlocks(rawText);

  // 3. Provider template checks
  let templateResult = extractBookingComTemplate(rawText) ||
                       extractExpediaTemplate(rawText) ||
                       extractAgodaTemplate(rawText) ||
                       extractChainTemplate(rawText);

  // 4. Generic parsing
  const genericResult = extractGenericFields(rawText);

  // Merge primary text extraction
  let mergedFields = { ...genericResult.fields, ...(templateResult?.fields || {}) };
  let mergedConfidence = { ...genericResult.confidence, ...(templateResult?.confidence || {}) };

  // 5. Attachment Processing & Recursion (Max depth 2)
  const MAX_ATTACHMENTS = parseInt(process.env.INBOUND_MAX_ATTACHMENTS, 10) || 10;
  const MAX_ATTACHMENT_BYTES = (parseInt(process.env.INBOUND_ATTACHMENT_MAX_SIZE_MB, 10) || 15) * 1024 * 1024;
  const unsafeExtensions = [
    '.exe', '.zip', '.rar', '.7z', '.gz', '.tar', '.bat', '.cmd', '.sh', '.scr',
    '.js', '.mjs', '.jse', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1', '.psm1',
    '.msi', '.dll', '.com', '.jar', '.app', '.dmg', '.pkg', '.deb', '.apk',
    '.svg', '.htm', '.html', '.lnk', '.reg', '.hta',
  ];

  if (Array.isArray(attachments) && attachments.length > 0 && depth < 2) {
    let processedCount = 0;
    for (const att of attachments) {
      if (!att || typeof att !== 'object') continue;
      if (processedCount >= MAX_ATTACHMENTS) {
        warnings.push(`Attachment limit reached (${MAX_ATTACHMENTS}); remaining skipped.`);
        break;
      }
      try {
        const attName = String(att.filename || 'attachment');
        const isUnsafe = unsafeExtensions.some(ext => attName.toLowerCase().endsWith(ext));
        if (isUnsafe) {
          warnings.push(`Skipped unsafe attachment file: ${attName}`);
          continue;
        }
        if (att.content && Buffer.isBuffer(att.content) && att.content.length > MAX_ATTACHMENT_BYTES) {
          warnings.push(`Skipped oversized attachment (${attName}): ${att.content.length} bytes`);
          continue;
        }

        processedCount++;
        attachmentsProcessed++;
        const attMime = att.contentType || 'application/octet-stream';
        let attText = '';
        // For nested .eml we already get structured fields back — merge those
        // directly instead of stringifying and re-parsing them.
        let attExtracted = null;

        if (attMime.includes('pdf') && att.content) {
          attText = await parsePdfBuffer(att.content);
          if (!attText.trim()) attText = await runLocalOcr(att.content);
        } else if (attMime.startsWith('image/') && att.content) {
          attText = await runLocalOcr(att.content);
        } else if ((attMime.includes('word') || attName.endsWith('.docx')) && att.content) {
          attText = await parseDocxBuffer(att.content);
        } else if ((attMime.includes('excel') || attName.endsWith('.xlsx') || attName.endsWith('.csv')) && att.content) {
          attText = parseXlsxBuffer(att.content);
        } else if ((attMime.includes('message/rfc822') || attName.endsWith('.eml')) && att.content) {
          const parsedEml = await simpleParser(att.content);
          const emlSubRes = await extractBookingFromSource({
            text: parsedEml.text || '',
            html: parsedEml.html || '',
            attachments: (parsedEml.attachments || []).map(a => ({ filename: a.filename, contentType: a.contentType, content: a.content })),
            subject: parsedEml.subject || '',
            depth: depth + 1,
          });
          // Merge the nested email's structured result directly.
          attExtracted = { fields: emlSubRes.fields || {}, confidence: emlSubRes.confidence || {} };
          if (Array.isArray(emlSubRes.warnings)) warnings.push(...emlSubRes.warnings);
        }

        // Non-eml sources produced raw text — run the generic parser over it now.
        if (!attExtracted && attText) {
          attExtracted = extractGenericFields(attText);
        }

        if (attExtracted) {
          for (const [key, val] of Object.entries(attExtracted.fields)) {
            if (val) {
              if (!mergedFields[key]) {
                mergedFields[key] = val;
                mergedConfidence[key] = (attExtracted.confidence[key] || 0.7) * 0.9;
              } else if (mergedFields[key] === val) {
                // Cross-source verification boosts confidence to VERY HIGH (0.98)
                mergedConfidence[key] = 0.98;
              } else {
                // Conflict detected
                warnings.push(`Conflicting value for field "${key}": email="${mergedFields[key]}", attachment="${val}"`);
                mergedConfidence[key] = 0.40;
              }
            }
          }
        }
      } catch (attErr) {
        warnings.push(`Failed to parse attachment ${att.filename}: ${attErr.message}`);
      }
    }
  }

  // Ensure mandatory default fields
  if (!mergedFields.currency) mergedFields.currency = 'USD';

  return {
    fields: mergedFields,
    confidence: mergedConfidence,
    warnings,
    attachmentsProcessed,
  };
}
