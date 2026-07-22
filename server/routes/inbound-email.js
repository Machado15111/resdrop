import express, { Router } from 'express';
import crypto from 'crypto';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import * as db from '../db.js';
// No AI on the import path — deterministic extraction only (see extractors/index.js).

/**
 * IMAP Poller & Inbound Email Processing
 */

// Rate limiter map for per-sender limits
const senderRateLimitMap = new Map();
function checkSenderRateLimit(senderEmail) {
  const now = Date.now();
  const entry = senderRateLimitMap.get(senderEmail) || { count: 0, resetAt: now + 3600000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 3600000;
  }
  entry.count++;
  senderRateLimitMap.set(senderEmail, entry);
  return entry.count <= 20; // max 20 emails per hour per sender
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sanitizeHtmlText(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:[^\s"']+/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export function renderResdropEmailTemplate({
  headline,
  greeting,
  bodyParagraphs = [],
  extractedBooking,
  ctaText,
  ctaUrl,
  footerNote = '',
  lang = 'pt',
}) {
  const isPt = lang === 'pt';
  const brandColor = '#52B788';
  const headerBg = '#0A1628';

  const hotelNameText = extractedBooking?.hotelName || (isPt ? 'Reserva de Hotel' : 'Hotel Booking');
  const checkinText = extractedBooking?.checkinDate || (isPt ? 'Check-in a confirmar' : 'Check-in pending');
  const checkoutText = extractedBooking?.checkoutDate || (isPt ? 'Check-out a confirmar' : 'Check-out pending');
  const priceText = extractedBooking?.originalPrice
    ? `${extractedBooking.currency || 'USD'} ${extractedBooking.originalPrice}`
    : (isPt ? 'Valor a confirmar no link' : 'Price to confirm in link');

  const bookingCardHtml = `
    <div style="margin:24px 0;padding:20px;background-color:#F8FAF9;border:1px solid #E2E8F0;border-left:4px solid ${brandColor};border-radius:8px;">
      <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;letter-spacing:1px;color:#0F2E1F;text-transform:uppercase;">
        ${isPt ? 'Resumo da Reserva Encontrada' : 'Extracted Booking Summary'}
      </p>
      <div style="margin-bottom:8px;font-size:15px;color:#0F172A;">
        <strong>${isPt ? 'Hotel' : 'Hotel'}:</strong> ${hotelNameText}
      </div>
      <div style="margin-bottom:8px;font-size:14px;color:#334155;">
        <strong>${isPt ? 'Período' : 'Dates'}:</strong> ${checkinText} ${isPt ? 'até' : 'to'} ${checkoutText}
      </div>
      <div style="font-size:14px;color:#334155;">
        <strong>${isPt ? 'Valor Registrado' : 'Total Price'}:</strong> ${priceText}
      </div>
    </div>
  `;

  const paragraphsHtml = bodyParagraphs
    .map(p => `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${p}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial, Helvetica, sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F1F5F9;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid #E2E8F0;">
          
          <!-- BRAND HEADER WITH OFFICIAL RESDROP LOGO -->
          <tr>
            <td style="background-color:${headerBg};padding:28px 24px;text-align:center;" align="center">
              <a href="https://resdrop.app" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="https://resdrop.app/resdrop-logo-email.png" alt="ResDrop Logo" width="180" height="auto" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;outline:none;" />
              </a>
              <div style="color:#94A3B8;font-size:11px;margin-top:8px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">MONITORAMENTO INTELIGENTE DE HOTÉIS</div>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0F172A;line-height:1.3;">${headline}</h1>
              ${greeting ? `<p style="margin:0 0 16px 0;font-size:15px;font-weight:600;color:#0F172A;">${greeting}</p>` : ''}
              
              ${paragraphsHtml}

              ${bookingCardHtml}

              <!-- CALL TO ACTION BUTTON -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" target="_blank" style="background-color:${brandColor};color:#FFFFFF;display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;box-shadow:0 4px 6px -1px rgba(82, 183, 136, 0.25);">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- PLAIN TEXT LINK FALLBACK -->
              <p style="margin:16px 0 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.4;">
                ${isPt ? 'Se o botão acima não funcionar, copie e cole o link no seu navegador:' : 'If the button above does not work, copy and paste this link into your browser:'}<br>
                <a href="${ctaUrl}" style="color:${brandColor};word-break:break-all;">${ctaUrl}</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#F8FAFC;padding:20px 28px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;font-weight:600;">
                ResDrop &copy; ${new Date().getFullYear()} — ResDrop Inc.
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.4;">
                ${isPt ? 'Você recebeu este e-mail porque uma reserva de hotel foi encaminhada para monitoramento.' : 'You received this email because a hotel reservation was submitted for price monitoring.'}<br>
                ${footerNote || ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendReplyEmail(to, subject, htmlText, textCopy) {
  const from = process.env.INBOUND_EMAIL_ADDRESS || 'reservas@resdrop.app';
  const transporter = getSmtpTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `ResDrop <${from}>`,
        to,
        subject,
        html: htmlText,
        text: textCopy,
      });
      console.log(`[Inbound Poller] Reply sent via SMTP to ${to}`);
      return;
    } catch (err) {
      console.error(`[Inbound Poller] SMTP send failed: ${err.message}`);
    }
  }

  // Fallback to Resend API with plain text copy for anti-spam deliverability
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `ResDrop <${process.env.RESEND_FROM || 'reservas@resdrop.app'}>`,
          to,
          subject,
          html: htmlText,
          text: textCopy,
        }),
      });
      console.log(`[Inbound Poller] Reply sent via Resend to ${to}`);
    } catch (err) {
      console.error(`[Inbound Poller] Resend send failed: ${err.message}`);
    }
  }
}

// Deterministic text parser
export function extractBookingFromEmail(text, subject = '') {
  const combined = `${subject}\n${text}`;
  const fields = {};
  const confidence = {};

  const hotelPatterns = [
    /(?:^|\n)\s*(?:hotel|pousada|resort|hostel|property|accommodation|propriedade)\s*(?:name|nome)?\s*:\s*(.+)/i,
    /(?:hotel|pousada|resort|hostel|property|accommodation|propriedade)\s*(?:name|nome)?\s*:\s*(.+)/i,
    /(?:your (?:stay|reservation|booking) at|sua (?:reserva|estadia) (?:no|na|em)|confirmation for (?:hotel)?|confirma[çc][ãa]o para (?:hotel)?|confirma[çc][ãa]o de reserva (?:no|na|em|do|da)?|reserva (?:no|na|em|do|da)?)\s+([A-Z0-9\s&'.-]{3,80})/i,
    /(?:hotel|pousada|resort|hostel|property|accommodation|propriedade)\s+([A-Z0-9\s&'.-]{3,80})/i,
    /([A-Z0-9\s&'.-]{3,60})\s*[-–|]\s*(?:confirma[çc][ãa]o|confirmation|reserva|booking)/i,
  ];
  for (const p of hotelPatterns) {
    const m = combined.match(p);
    if (m) {
      let name = m[1].trim().split(/[,\n\r|]/)[0].trim();
      // Exclude common header words
      if (name.length > 3 && name.length < 100 && !/^(confirmation|confirmação|reserva|booking|detalhes|sua estadia)$/i.test(name)) {
        fields.hotelName = name;
        confidence.hotelName = 0.7;
        break;
      }
    }
  }

  const checkinPatterns = [
    /(?:check[\s-]*in|entrada|chegada|in)\s*[:.]?\s*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
    /(?:check[\s-]*in|entrada|chegada|in)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  for (const p of checkinPatterns) {
    const m = combined.match(p);
    if (m) {
      fields.checkinDate = normalizeDate(m[1]);
      confidence.checkinDate = 0.8;
      break;
    }
  }

  const checkoutPatterns = [
    /(?:check[\s-]*out|sa[íi]da|partida|out)\s*[:.]?\s*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
    /(?:check[\s-]*out|sa[íi]da|partida|out)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  for (const p of checkoutPatterns) {
    const m = combined.match(p);
    if (m) {
      fields.checkoutDate = normalizeDate(m[1]);
      confidence.checkoutDate = 0.8;
      break;
    }
  }

  const pricePatterns = [
    /(?:total|valor|amount|price|pre[çc]o|di[áa]ria)[^0-9\n]*?([0-9][0-9.,]*)/i,
    /(?:R\$|USD|BRL|EUR)\s*([0-9][0-9.,]*)/i,
    /([0-9][0-9.,]*)\s*(?:BRL|USD|EUR)/i,
  ];
  for (const p of pricePatterns) {
    const m = combined.match(p);
    if (m) {
      const price = parsePrice(m[1]);
      if (price > 0) {
        fields.originalPrice = price;
        confidence.originalPrice = 0.7;
        break;
      }
    }
  }

  const confPatterns = [
    /\b(?:confirma[çc][ãa]o|confirmation|booking|reservation|reserva|itinerary|itinérario|conf|reference|referência|ref)\b[\s\-#:]*(?:confirma[çc][ãa]o|confirmation|itinerary|itinérario|reservation|reserva|reference|referência|number|code|no\.?|id|#|n[°o]\.?|accor|agoda|hyatt|hilton|marriott|expedia|booking)*[\s\-#:]*([A-Z0-9][\w\-]{3,20})/gi,
  ];
  const confFilterWords = ['confirmation', 'confirmed', 'itinerary', 'reservation', 'booking', 'reference', 'code', 'accor', 'hotels', 'for'];
  for (const p of confPatterns) {
    p.lastIndex = 0;
    let m;
    while ((m = p.exec(combined)) !== null) {
      if (m[1] && !confFilterWords.includes(m[1].toLowerCase())) {
        fields.confirmationNumber = m[1];
        confidence.confirmationNumber = 0.8;
        break;
      }
    }
    if (fields.confirmationNumber) break;
  }

  const currMatch = combined.match(/(USD|BRL|EUR|GBP|R\$)/i);
  if (currMatch) {
    fields.currency = currMatch[1].toUpperCase() === 'R$' ? 'BRL' : currMatch[1].toUpperCase();
    confidence.currency = 0.9;
  }

  return { fields, confidence };
}

export function normalizeDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Year first: YYYY/MM/DD or YYYY-MM-DD
  const yfirst = dateStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (yfirst) {
    return `${yfirst[1]}-${yfirst[2].padStart(2, '0')}-${yfirst[3].padStart(2, '0')}`;
  }

  // Day first: DD/MM/YYYY or DD-MM-YYYY
  const dfirst = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dfirst) {
    let [_, d, m, y] = dfirst;
    if (y.length === 2) y = '20' + y;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}

  return dateStr;
}

export function parsePrice(str) {
  if (!str) return 0;
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.'));
  }
  return parseFloat(str.replace(/[^\d.]/g, ''));
}

export async function extractTextFromPdf(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return '';
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err) {
    console.warn('[Inbound PDF Extract] Failed to parse PDF text:', err.message);
    return '';
  }
}

export async function processInboundEmailPayload({
  senderEmail,
  subject,
  textContent,
  attachments = [],
  messageId,
  contentHash,
  dbClient = db,
  baseUrl = process.env.APP_BASE_URL || 'https://resdrop.app',
}) {
  const { extractBookingFromSource } = await import('../extractors/index.js');
  const { enrichHotelData } = await import('../enrichment.js');
  const { createImportResult, buildFailedResult } = await import('../importResult.js');

  // Normalize the envelope sender up front — everything downstream (.endsWith,
  // user lookup, language) assumes a lowercase trimmed string.
  senderEmail = typeof senderEmail === 'string' ? senderEmail.trim().toLowerCase() : '';
  subject = typeof subject === 'string' ? subject : '';
  textContent = typeof textContent === 'string' ? textContent : '';
  attachments = Array.isArray(attachments) ? attachments : [];
  if (!senderEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail)) {
    return buildFailedResult({ source: 'inbound_email', message: 'Missing or invalid sender email' });
  }

  // 1. Task 3: Deterministic extraction from email subject, body, & attachments
  const extraction = await extractBookingFromSource({
    text: textContent,
    subject,
    attachments,
  });

  const extractedData = extraction.fields || {};
  const confidenceScores = extraction.confidence || {};
  const warnings = extraction.warnings || [];

  // 2. Task 4 & 5: Determine required essential fields
  const essentialFields = ['hotelName', 'checkIn', 'checkOut', 'totalPrice', 'currency'];
  const missingFields = essentialFields.filter(
    f => !extractedData[f] && !extractedData[f === 'checkIn' ? 'checkinDate' : f === 'checkOut' ? 'checkoutDate' : f === 'totalPrice' ? 'originalPrice' : f]
  );

  let importStatus = 'NEEDS_INFORMATION';
  if (missingFields.length === 0) {
    const checkinStr = extractedData.checkIn || extractedData.checkinDate;
    const checkoutStr = extractedData.checkOut || extractedData.checkoutDate;
    if (new Date(checkoutStr) > new Date(checkinStr)) {
      importStatus = 'ACTIVE_MONITORING';
    }
  }

  // 3. Task 6: Multi-layered Deduplication Check
  const confNum = extractedData.bookingReference || extractedData.confirmationNumber;
  const hotelName = extractedData.hotelName;
  const checkIn = extractedData.checkIn || extractedData.checkinDate;
  const checkOut = extractedData.checkOut || extractedData.checkoutDate;
  const guestName = extractedData.guestName;

  const existingBookingsRaw = await dbClient.getAllBookings().catch(() => []);
  const existingBookings = Array.isArray(existingBookingsRaw) ? existingBookingsRaw : [];
  const duplicate = existingBookings.find(b => {
    if (confNum && b.confirmationNumber === confNum) return true;
    if (hotelName && checkIn && checkOut &&
        b.hotelName?.toLowerCase() === hotelName.toLowerCase() &&
        b.checkinDate === checkIn &&
        b.checkoutDate === checkOut &&
        (!guestName || b.guestName?.toLowerCase() === guestName.toLowerCase())) {
      return true;
    }
    return false;
  });

  if (duplicate) {
    return createImportResult({
      success: true,
      source: 'inbound_email',
      booking: duplicate,
      hotel: null,
      missingFields: [],
      warnings: ['Duplicate booking ignored'],
      attachmentsProcessed: extraction.attachmentsProcessed || 0,
      status: 'DUPLICATE',
    });
  }

  // 4. Task 7: Enrich Hotel Data
  const enrichment = await enrichHotelData(extractedData);

  // 5. Create InboundEmail record in DB
  let inboundRecord = null;
  try {
    inboundRecord = await dbClient.createInboundEmail({
      messageId,
      senderEmail,
      subject,
      status: importStatus === 'ACTIVE_MONITORING' ? 'PROCESSED' : 'NEEDS_INFORMATION',
      contentHash,
    });
  } catch (dbErr) {
    console.warn('[Inbound Processing] DB createInboundEmail warning:', dbErr.message);
  }

  const inboundEmailId = inboundRecord ? inboundRecord.id : null;

  // 6. Task 6: Envelope sender matching against real ResDrop accounts
  let user = null;
  try {
    const getUserFn = dbClient.getUserByEmail || dbClient.getUser;
    user = getUserFn ? await getUserFn.call(dbClient, senderEmail) : null;
  } catch (uErr) {
    console.warn('[Inbound Processing] DB getUser warning:', uErr.message);
  }

  let createdBooking = null;

  if (user) {
    // Registered User Flow — Auto-create booking
    createdBooking = await dbClient.createBooking({
      ...extractedData,
      email: user.email,
      status: importStatus === 'ACTIVE_MONITORING' ? 'monitoring' : 'needs_information',
      parseMethod: 'deterministic',
    });

    const bookingImport = await dbClient.createBookingImport({
      inboundEmailId,
      userEmail: user.email,
      bookingId: createdBooking.id,
      source: attachments.length > 0 ? (attachments[0].contentType?.includes('pdf') ? 'pdf_upload' : 'image_upload') : 'inbound_email',
      extractedData,
      confidenceData: confidenceScores,
      missingFields,
      status: importStatus,
    });

    const importId = bookingImport ? bookingImport.id : `imp-${Date.now()}`;
    const reviewUrl = `${baseUrl}/dashboard?reviewImport=${importId}`;
    const lang = user.country === 'BR' || user.currency === 'BRL' || senderEmail.endsWith('.br') || extractedData.currency === 'BRL' ? 'pt' : 'en';

    // Task 10: Email replies sent ONLY after DB commit
    const emailSubject = lang === 'pt'
      ? (importStatus === 'ACTIVE_MONITORING' ? `Reserva adicionada ao ResDrop` : `Precisamos de algumas informações da sua reserva`)
      : (importStatus === 'ACTIVE_MONITORING' ? `Booking added to ResDrop` : `We need more information about your booking`);

    const htmlEmail = renderResdropEmailTemplate({
      headline: lang === 'pt' ? 'Reserva recebida com sucesso!' : 'Booking confirmation received!',
      greeting: lang === 'pt' ? `Olá ${user.name || 'Viajante'},` : `Hello ${user.name || 'Traveler'},`,
      bodyParagraphs: lang === 'pt'
        ? [
            importStatus === 'ACTIVE_MONITORING'
              ? 'Sua reserva foi processada e o monitoramento 24/7 de menor preço já está ativo.'
              : `Recebemos sua reserva, mas faltam algumas informações: ${missingFields.join(', ')}.`,
          ]
        : [
            importStatus === 'ACTIVE_MONITORING'
              ? 'Your booking was processed and 24/7 price drop monitoring is now active.'
              : `We received your booking but are missing some details: ${missingFields.join(', ')}.`,
          ],
      extractedBooking: extractedData,
      ctaText: lang === 'pt' ? 'Ver no ResDrop' : 'View in ResDrop',
      ctaUrl: reviewUrl,
      lang,
    });

    const textCopy = lang === 'pt'
      ? `Olá ${user.name || 'Viajante'},\n\nSua reserva do ${extractedData.hotelName || 'hotel'} foi recebida.\nAcesse: ${reviewUrl}`
      : `Hello ${user.name || 'Traveler'},\n\nYour booking for ${extractedData.hotelName || 'hotel'} was received.\nVisit: ${reviewUrl}`;

    await sendReplyEmail(user.email, emailSubject, htmlEmail, textCopy);

    return createImportResult({
      success: true,
      source: 'inbound_email',
      booking: createdBooking,
      hotel: enrichment.hotel,
      missingFields,
      warnings,
      attachmentsProcessed: extraction.attachmentsProcessed || 0,
      status: importStatus,
    });
  } else {
    // Task 6: Unregistered Sender Flow
    const bookingImport = await dbClient.createBookingImport({
      inboundEmailId,
      source: 'inbound_email',
      extractedData,
      confidenceData: confidenceScores,
      missingFields,
      status: importStatus,
    });

    const importId = bookingImport ? bookingImport.id : `imp-${Date.now()}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHashVal = hashToken(rawToken);
    const expiryHours = parseInt(process.env.INBOUND_IMPORT_TOKEN_EXPIRY_HOURS, 10) || 72;
    const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();

    await dbClient.createPendingImportToken({
      bookingImportId: importId,
      email: senderEmail,
      tokenHash: tokenHashVal,
      expiresAt,
    }).catch(() => {});

    const signupUrl = `${baseUrl}/signup?token=${rawToken}`;
    const isPt = senderEmail.endsWith('.br') || extractedData.currency === 'BRL';
    const lang = isPt ? 'pt' : 'en';

    const welcomeSubject = lang === 'pt'
      ? `Bem-vindo ao ResDrop! Crie sua conta para ativar o monitoramento`
      : `Welcome to ResDrop! Create your account to enable price monitoring`;

    const htmlWelcomeEmail = renderResdropEmailTemplate({
      headline: lang === 'pt' ? 'Sua reserva foi recebida!' : 'Your booking was received!',
      greeting: lang === 'pt' ? 'Olá!' : 'Hello!',
      bodyParagraphs: lang === 'pt'
        ? ['Recebemos sua confirmação de reserva. Crie sua conta gratuita para ativar o monitoramento:']
        : ['We received your hotel confirmation. Create your free account to enable price monitoring:'],
      extractedBooking: extractedData,
      ctaText: lang === 'pt' ? 'Criar Conta & Ativar' : 'Create Account & Enable',
      ctaUrl: signupUrl,
      lang,
    });

    const welcomeTextCopy = `Welcome to ResDrop! Create your account at: ${signupUrl}`;
    await sendReplyEmail(senderEmail, welcomeSubject, htmlWelcomeEmail, welcomeTextCopy);

    return createImportResult({
      success: true,
      source: 'inbound_email',
      booking: null,
      hotel: enrichment.hotel,
      missingFields,
      warnings,
      attachmentsProcessed: extraction.attachmentsProcessed || 0,
      status: importStatus,
    });
  }
}

/**
 * Poll IMAP inbox and process new booking confirmation emails
 */
export async function pollInboundEmails() {
  if (process.env.INBOUND_EMAIL_ENABLED !== 'true') {
    return { status: 'disabled' };
  }

  const imapHost = process.env.IMAP_HOST;
  if (!imapHost) {
    console.warn('[Inbound Poller] IMAP_HOST not set — skipping');
    return { status: 'unconfigured' };
  }

  console.log('[Inbound Poller] 📧 Checking mailbox for new confirmations...');

  const client = new ImapFlow({
    host: imapHost,
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASSWORD,
    },
    logger: false,
  });

  let processedCount = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Search for unseen messages
      const messages = client.fetch({ seen: false }, { source: true, uid: true, envelope: true });

      for await (const message of messages) {
        try {
          const uid = message.uid;
          const envelope = message.envelope || {};
          const messageId = envelope.messageId || `uid-${uid}-${Date.now()}`;
          const senderEmail = (envelope.from?.[0]?.address || '').toLowerCase();
          const subject = envelope.subject || '';

          if (!senderEmail) continue;

          // Rate limit check
          if (!checkSenderRateLimit(senderEmail)) {
            console.warn(`[Inbound Poller] Rate limit exceeded for sender: ${senderEmail}`);
            continue;
          }

          // Compute content hash
          const rawSource = message.source ? message.source.toString('utf8') : '';
          const contentHash = crypto.createHash('sha256').update(rawSource || `${messageId}-${subject}`).digest('hex');

          // Idempotency check by messageId or contentHash
          const existingByMsg = await db.getInboundEmailByMessageId(messageId);
          const existingByHash = await db.getInboundEmailByHash(contentHash);

          if (existingByMsg || existingByHash) {
            console.log(`[Inbound Poller] Duplicate email skipped (${messageId})`);
            await client.messageFlagsAdd({ uid }, ['\\Seen']);
            continue;
          }

          // Parse raw email structure
          const parsedMail = await simpleParser(message.source);
          const textContent = parsedMail.text || parsedMail.html || '';

          // Extract PDF / image attachments if available
          const attachments = (parsedMail.attachments || []).map(a => ({
            filename: a.filename || 'attachment',
            contentType: a.contentType || 'application/octet-stream',
            content: a.content,
          }));

          await processInboundEmailPayload({
            senderEmail,
            subject,
            textContent,
            attachments,
            messageId,
            contentHash,
          });

          // Mark message as seen in IMAP
          await client.messageFlagsAdd({ uid }, ['\\Seen']);
          processedCount++;
        } catch (msgErr) {
          console.error(`[Inbound Poller] Error processing message:`, msgErr.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error('[Inbound Poller] Connection/Mailbox error:', err.message);
  }

  console.log(`[Inbound Poller] Processed ${processedCount} new email(s).`);
  return { status: 'completed', processedCount };
}

export default function inboundEmailRoutes(authMiddleware, dbClient = db) {
  const router = Router();
  const rawParser = express.raw({ type: '*/*', limit: '30mb' });

  /**
   * POST /api/inbound/cloudflare-email
   * Public raw RFC822 email endpoint for Cloudflare Email Routing Workers.
   */
  router.post('/inbound/cloudflare-email', rawParser, async (req, res) => {
    try {
      // Secret authentication
      const expectedSecret = process.env.INBOUND_WEBHOOK_SECRET;
      const providedSecret = req.headers['x-inbound-secret'];

      if (expectedSecret) {
        if (!providedSecret || providedSecret !== expectedSecret) {
          return res.status(401).json({ error: 'Unauthorized: invalid or missing X-Inbound-Secret header' });
        }
      } else {
        console.warn('[Cloudflare Inbound] INBOUND_WEBHOOK_SECRET environment variable is not configured');
      }

      // Parse payload body
      let rawBuffer;
      if (Buffer.isBuffer(req.body)) {
        rawBuffer = req.body;
      } else if (typeof req.body === 'string') {
        rawBuffer = Buffer.from(req.body, 'utf-8');
      } else if (req.body && typeof req.body === 'object') {
        if (req.body.raw) {
          rawBuffer = Buffer.from(req.body.raw, 'base64');
        } else if (req.body.rawEmail) {
          rawBuffer = Buffer.from(req.body.rawEmail, 'utf-8');
        }
      }

      if (!rawBuffer || rawBuffer.length === 0) {
        return res.status(400).json({ error: 'Raw email payload is empty or invalid' });
      }

      // Size guard
      const maxMb = parseInt(process.env.INBOUND_EMAIL_MAX_SIZE_MB || '25', 10);
      const maxBytes = maxMb * 1024 * 1024;
      if (rawBuffer.length > maxBytes) {
        return res.status(413).json({ error: `Payload exceeds maximum size of ${maxMb}MB` });
      }

      // Parse raw MIME with simpleParser
      const parsed = await simpleParser(rawBuffer);
      const senderEmail = (parsed.from?.value?.[0]?.address || '').toLowerCase().trim();

      if (!senderEmail) {
        return res.status(400).json({ error: 'Sender email (From) missing in MIME payload' });
      }

      const subject = parsed.subject || '';
      const textContent = parsed.text || sanitizeHtmlText(parsed.html || '');
      const attachments = (parsed.attachments || []).map(a => ({
        filename: a.filename || 'attachment',
        contentType: a.contentType || 'application/octet-stream',
        content: a.content,
      }));

      const messageId = parsed.messageId || `cf-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const contentHash = crypto.createHash('sha256').update(rawBuffer).digest('hex');

      // Idempotency check
      const existingByMsg = await dbClient.getInboundEmailByMessageId(messageId);
      const existingByHash = await dbClient.getInboundEmailByHash(contentHash);
      if (existingByMsg || existingByHash) {
        return res.status(200).json({ status: 'ignored_duplicate', messageId });
      }

      const result = await processInboundEmailPayload({
        senderEmail,
        subject,
        textContent,
        attachments,
        messageId,
        contentHash,
        dbClient,
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error('[Cloudflare Inbound] Processing error:', err.message);
      return res.status(500).json({ error: 'Failed to process Cloudflare raw email' });
    }
  });

  /**
   * POST /api/inbound/webhook
   * Public webhook endpoint for inbound emails (Cloudflare Email Workers, SendGrid, Postmark, Mailgun, or custom forwarders).
   */
  router.post('/inbound/webhook', async (req, res) => {
    try {
      const { from, sender, subject, text, html, attachments, messageId, rawEmail } = req.body;
      const senderEmail = (from || sender || '').toLowerCase().trim();

      if (!senderEmail) {
        return res.status(400).json({ error: 'Sender email (from) is required' });
      }

      const msgId = messageId || `webhook-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const hashInput = typeof rawEmail === 'string' && rawEmail
        ? rawEmail
        : `${senderEmail}-${subject || ''}-${typeof text === 'string' ? text : ''}`;
      const contentHash = crypto.createHash('sha256').update(hashInput).digest('hex');

      // Idempotency check
      const existingByMsg = await dbClient.getInboundEmailByMessageId(msgId);
      const existingByHash = await dbClient.getInboundEmailByHash(contentHash);
      if (existingByMsg || existingByHash) {
        return res.status(200).json({ status: 'ignored_duplicate', messageId: msgId });
      }

      const parsedAttachments = (Array.isArray(attachments) ? attachments : [])
        .filter(a => a && typeof a === 'object')
        .map(a => {
          let content;
          try {
            content = Buffer.isBuffer(a.content)
              ? a.content
              : Buffer.from(typeof a.content === 'string' ? a.content : '', 'base64');
          } catch { content = Buffer.alloc(0); }
          return {
            filename: String(a.filename || 'attachment'),
            contentType: a.contentType || a.type || 'application/octet-stream',
            content,
          };
        });

      // If a raw forwarder (e.g. the Cloudflare Email Worker) sent the full MIME
      // in `rawEmail` but no pre-parsed text/attachments, parse it here so the
      // email body AND attachments (PDFs, etc.) actually reach the extractor.
      let finalText = text || sanitizeHtmlText(html || '');
      let finalAttachments = parsedAttachments;
      let finalSubject = subject || '';
      if (typeof rawEmail === 'string' && rawEmail.length > 0 && (!finalText || finalAttachments.length === 0)) {
        try {
          const parsed = await simpleParser(Buffer.from(rawEmail, 'utf-8'));
          if (!finalText) finalText = parsed.text || sanitizeHtmlText(parsed.html || '');
          if (finalAttachments.length === 0) {
            finalAttachments = (parsed.attachments || []).map(a => ({
              filename: a.filename || 'attachment',
              contentType: a.contentType || 'application/octet-stream',
              content: a.content,
            }));
          }
          if (!finalSubject) finalSubject = parsed.subject || '';
        } catch (e) {
          console.warn('[Inbound Webhook] rawEmail parse warning:', e.message);
        }
      }

      const result = await processInboundEmailPayload({
        senderEmail,
        subject: finalSubject,
        textContent: finalText,
        attachments: finalAttachments,
        messageId: msgId,
        contentHash,
        dbClient,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error('[Inbound Webhook] Processing error:', err.message);
      res.status(500).json({ error: 'Failed to process inbound email webhook' });
    }
  });

  /**
   * GET /api/inbound/pending-import
   * Public token validation endpoint when user clicks signup link carrying ?token=
   */
  router.get('/inbound/pending-import', async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ error: 'Token is required' });

      const tHash = hashToken(token);
      const pendingToken = await dbClient.getPendingImportTokenByHash(tHash);

      if (!pendingToken) {
        return res.status(410).json({ error: 'Invalid, expired, or already used registration token' });
      }

      const bookingImport = await dbClient.getBookingImport(pendingToken.bookingImportId);
      res.json({
        email: pendingToken.email,
        importId: bookingImport?.id,
        extractedData: bookingImport?.extractedData || {},
        missingFields: bookingImport?.missingFields || [],
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to validate token' });
    }
  });

  /**
   * GET /api/inbound/imports/:id
   * Fetch draft booking import details for review by logged-in user.
   */
  router.get('/inbound/imports/:id', authMiddleware, async (req, res) => {
    try {
      const importRecord = await dbClient.getBookingImport(req.params.id);
      if (!importRecord) {
        return res.status(404).json({ error: 'Import record not found' });
      }

      if (importRecord.userEmail && importRecord.userEmail !== req.userEmail) {
        return res.status(403).json({ error: 'Access denied: You do not own this import' });
      }

      res.json(importRecord);
    } catch (err) {
      console.error('[Inbound] Fetch import error:', err.message);
      res.status(500).json({ error: 'Failed to fetch import record' });
    }
  });

  /**
   * POST /api/inbound/imports/:id/confirm
   * Confirm draft booking import into active monitored booking (Authed & Idempotent).
   */
  router.post('/inbound/imports/:id/confirm', authMiddleware, async (req, res) => {
    try {
      const importRecord = await dbClient.getBookingImport(req.params.id);
      if (!importRecord) {
        return res.status(404).json({ error: 'Import record not found' });
      }

      if (importRecord.userEmail && importRecord.userEmail !== req.userEmail) {
        return res.status(403).json({ error: 'Access denied: You do not own this import' });
      }

      // Idempotency: If already confirmed, return existing booking without duplicate creation
      if (importRecord.status === 'CONFIRMED') {
        return res.status(200).json({
          status: 'already_confirmed',
          bookingId: importRecord.bookingId,
          importId: importRecord.id,
        });
      }

      const bookingData = req.body;

      // Essential fields validation
      const essentialFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];
      const missing = essentialFields.filter(f => !bookingData[f]);

      if (missing.length > 0) {
        return res.status(400).json({
          error: 'Missing required essential fields',
          missingFields: missing,
        });
      }

      // Duplicate check (hotel + dates)
      const existingBookings = await dbClient.getBookingsByEmail(req.userEmail);
      const duplicate = existingBookings.find(b =>
        b.hotelName?.toLowerCase() === bookingData.hotelName?.toLowerCase() &&
        b.checkinDate === bookingData.checkinDate &&
        b.checkoutDate === bookingData.checkoutDate &&
        !['expired', 'dismissed'].includes(b.status)
      );

      if (duplicate) {
        return res.status(409).json({
          error: 'A similar booking already exists',
          existingBookingId: duplicate.id,
          existingHotel: duplicate.hotelName,
        });
      }

      // Create active booking in monitoring status
      const booking = await dbClient.createBooking({
        email: req.userEmail,
        hotelName: bookingData.hotelName,
        destination: bookingData.destination || null,
        checkinDate: bookingData.checkinDate,
        checkoutDate: bookingData.checkoutDate,
        roomType: bookingData.roomType || 'Standard Room',
        originalPrice: parseFloat(bookingData.originalPrice),
        currency: (bookingData.currency || 'USD').toUpperCase(),
        guestName: bookingData.guestName || null,
        confirmationNumber: bookingData.confirmationNumber || null,
        status: 'monitoring',
        alerts: [],
        priceHistory: [],
        latestResults: [],
        parseMethod: importRecord.source || 'inbound_email',
      });

      if (!booking) {
        return res.status(500).json({ error: 'Failed to create active booking in database' });
      }

      // Update import record to CONFIRMED
      await dbClient.updateBookingImport(importRecord.id, {
        status: 'CONFIRMED',
        confirmedAt: new Date().toISOString(),
        bookingId: booking.id,
        userEmail: req.userEmail,
      });

      await dbClient.logActivity({
        entityType: 'booking',
        entityId: booking.id,
        action: 'confirmed_from_import',
        actorEmail: req.userEmail,
        details: { importId: importRecord.id, source: importRecord.source },
      });

      res.status(201).json({ status: 'confirmed', booking, importId: importRecord.id });
    } catch (err) {
      console.error('[Inbound] Confirm import error:', err.message);
      res.status(500).json({ error: 'Failed to confirm booking import' });
    }
  });

  /**
   * POST /api/inbound/pending-import/attach
   * Attach pending import to newly registered account using single-use token.
   */
  router.post('/inbound/pending-import/attach', authMiddleware, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'Token is required' });

      const tHash = hashToken(token);
      const pendingToken = await dbClient.getPendingImportTokenByHash(tHash);

      if (!pendingToken) {
        return res.status(410).json({ error: 'Invalid, expired, or already used registration token' });
      }

      const bookingImport = await dbClient.getBookingImport(pendingToken.bookingImportId);
      if (!bookingImport) {
        return res.status(404).json({ error: 'Import record not found' });
      }

      // Link import to logged in user
      await dbClient.updateBookingImport(bookingImport.id, {
        userEmail: req.userEmail,
      });

      // Mark token used
      await dbClient.markPendingImportTokenUsed(pendingToken.id);

      res.json({
        status: 'attached',
        importId: bookingImport.id,
        userEmail: req.userEmail,
        bookingImport,
      });
    } catch (err) {
      console.error('[Inbound] Attach pending import error:', err.message);
      res.status(500).json({ error: 'Failed to attach pending import' });
    }
  });

  /**
   * GET /api/inbound/address
   */
  router.get('/inbound/address', authMiddleware, (req, res) => {
    const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN || 'resdrop.app';
    res.json({
      addresses: [`reservas@${inboundDomain}`],
      primary: `reservas@${inboundDomain}`,
    });
  });

  return router;
}
