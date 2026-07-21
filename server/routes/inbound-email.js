import { Router } from 'express';
import crypto from 'crypto';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import * as db from '../db.js';
import { isAiParserConfigured, extractBookingFromDocument } from '../aiParser.js';

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
    /(?:your (?:stay|reservation|booking) at|sua (?:reserva|estadia) (?:no|na|em)|confirmation for (?:hotel)?|confirma[çc][ãa]o para (?:hotel)?|confirma[çc][ãa]o de reserva (?:no|na|em)|reserva (?:no|na|em))\s+([A-Z0-9\s&'.-]{3,80})/i,
    /(?:hotel|pousada|resort|hostel|property|accommodation|propriedade)\s+([A-Z0-9\s&'.-]{3,80})/i,
  ];
  for (const p of hotelPatterns) {
    const m = combined.match(p);
    if (m) {
      let name = m[1].trim().split(/[,\n\r|]/)[0].trim();
      if (name.length > 3 && name.length < 100) {
        fields.hotelName = name;
        confidence.hotelName = 0.7;
        break;
      }
    }
  }

  const checkinPatterns = [
    /(?:check[\s-]*in|entrada|chegada)\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/i,
    /(?:check[\s-]*in|entrada|chegada)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
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
    /(?:check[\s-]*out|sa[íi]da|partida)\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/i,
    /(?:check[\s-]*out|sa[íi]da|partida)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) y = '20' + y;
    if (!isNaN(parseInt(d)) && !isNaN(parseInt(m)) && !isNaN(parseInt(y)) && y.length === 4) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
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
  // 1. Deterministic text extraction from email subject + body
  const det = extractBookingFromEmail(textContent, subject);
  let extractedData = { ...det.fields };
  let confidenceScores = { ...det.confidence };

  // 2. Extract PDF & Image attachments (Screenshots/Vouchers)
  if (attachments && attachments.length > 0) {
    const allowedMIMEs = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validAttachments = attachments.filter(a => allowedMIMEs.includes(a.contentType));

    for (const attachment of validAttachments) {
      try {
        if (attachment.contentType === 'application/pdf' && attachment.content) {
          const pdfText = await extractTextFromPdf(attachment.content);
          if (pdfText) {
            const pdfDet = extractBookingFromEmail(pdfText, subject);
            for (const [key, val] of Object.entries(pdfDet.fields)) {
              if (val && (!extractedData[key] || (pdfDet.confidence[key] || 0) > (confidenceScores[key] || 0))) {
                extractedData[key] = val;
                confidenceScores[key] = pdfDet.confidence[key] || 0.75;
              }
            }
          }
        }
        if (isAiParserConfigured()) {
          const aiResult = await parseBookingDocumentWithAI(attachment.content, attachment.contentType, attachment.filename);
          if (aiResult && aiResult.fields) {
            for (const [key, val] of Object.entries(aiResult.fields)) {
              if (val && (!extractedData[key] || (aiResult.confidence?.[key] || 0) > (confidenceScores[key] || 0))) {
                extractedData[key] = val;
                confidenceScores[key] = aiResult.confidence?.[key] || 0.85;
              }
            }
          }
        }
      } catch (attErr) {
        console.warn(`[Inbound Processing] Attachment extraction warning: ${attErr.message}`);
      }
    }
  }

  // 3. Fallback AI parser on raw text if essential fields are still missing
  const essential = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];
  const missingEssential = essential.filter(f => !extractedData[f]);

  if (missingEssential.length > 0 && isAiParserConfigured()) {
    try {
      const textAiResult = await parseBookingDocumentWithAI(Buffer.from(textContent, 'utf8'), 'text/plain');
      if (textAiResult && textAiResult.fields) {
        for (const [key, val] of Object.entries(textAiResult.fields)) {
          if (val && !extractedData[key]) {
            extractedData[key] = val;
            confidenceScores[key] = textAiResult.confidence?.[key] || 0.7;
          }
        }
      }
    } catch (aiErr) {
      console.warn(`[Inbound Processing] Text AI parser warning: ${aiErr.message}`);
    }
  }

  const finalMissing = essential.filter(f => !extractedData[f]);
  const importStatus = finalMissing.length === 0 ? 'READY_FOR_CONFIRMATION' : 'NEEDS_REVIEW';

  // 4. Create InboundEmail record in DB (resilient)
  let inboundRecord = null;
  try {
    inboundRecord = await dbClient.createInboundEmail({
      messageId,
      senderEmail,
      subject,
      status: 'PROCESSING',
      contentHash,
    });
  } catch (dbErr) {
    console.warn('[Inbound Processing] DB createInboundEmail warning:', dbErr.message);
  }

  const inboundEmailId = inboundRecord ? inboundRecord.id : null;

  // 5. Look up user by email
  let user = null;
  try {
    const getUserFn = dbClient.getUserByEmail || dbClient.getUser;
    user = getUserFn ? await getUserFn.call(dbClient, senderEmail) : null;
  } catch (uErr) {
    console.warn('[Inbound Processing] DB getUser warning:', uErr.message);
  }

  if (user) {
    // Registered User Flow
    let bookingImport = null;
    try {
      bookingImport = await dbClient.createBookingImport({
        inboundEmailId,
        userEmail: user.email,
        source: attachments.length > 0 ? (attachments[0].contentType.includes('pdf') ? 'pdf_upload' : 'image_upload') : 'inbound_email',
        extractedData,
        confidenceData: confidenceScores,
        missingFields: finalMissing,
        status: importStatus,
      });
    } catch (impErr) {
      console.warn('[Inbound Processing] DB createBookingImport warning:', impErr.message);
    }

    const importId = bookingImport ? bookingImport.id : `imp-${Date.now()}`;
    const reviewUrl = `${baseUrl}/dashboard?reviewImport=${importId}`;
    const lang = user.country === 'BR' || user.currency === 'BRL' || senderEmail.endsWith('.br') || extractedData.currency === 'BRL' ? 'pt' : 'en';

    const emailSubject = lang === 'pt'
      ? `Recebemos sua reserva do ${extractedData.hotelName || 'hotel'} — ResDrop`
      : `We received your booking for ${extractedData.hotelName || 'hotel'} — ResDrop`;

    const htmlEmail = renderResdropEmailTemplate({
      headline: lang === 'pt' ? 'Recebemos sua confirmação de reserva!' : 'We received your booking confirmation!',
      greeting: lang === 'pt' ? `Olá ${user.name || 'Viajante'},` : `Hello ${user.name || 'Traveler'},`,
      bodyParagraphs: lang === 'pt'
        ? [
            'Recebemos sua reserva enviada por e-mail e preparamos os dados para o monitoramento 24/7.',
            'Por favor, revise os dados abaixo e confirme para iniciar a busca automática de menores preços.',
          ]
        : [
            'We received your forwarded hotel confirmation and prepared your 24/7 price monitoring.',
            'Please review the details below and confirm to activate automatic price drop monitoring.',
          ],
      extractedBooking: extractedData,
      ctaText: lang === 'pt' ? 'Revisar & Ativar Monitoramento' : 'Review & Enable Monitoring',
      ctaUrl: reviewUrl,
      footerNote: lang === 'pt' ? 'O monitoramento começará imediatamente após a sua confirmação.' : 'Monitoring starts immediately after your confirmation.',
      lang,
    });

    const textCopy = lang === 'pt'
      ? `Olá ${user.name || 'Viajante'},\n\nRecebemos sua reserva do ${extractedData.hotelName || 'hotel'}.\nPara revisar e ativar o monitoramento, acesse:\n${reviewUrl}`
      : `Hello ${user.name || 'Traveler'},\n\nWe received your booking for ${extractedData.hotelName || 'hotel'}.\nTo review and enable monitoring, visit:\n${reviewUrl}`;

    await sendReplyEmail(user.email, emailSubject, htmlEmail, textCopy);
    if (inboundEmailId) {
      try {
        await dbClient.updateInboundEmail(inboundEmailId, { status: 'PROCESSED', processedAt: new Date().toISOString() });
      } catch {}
    }
    return { status: 'processed', importId, userEmail: user.email };
  } else {
    // Unregistered User Flow (Welcome Email)
    let bookingImport = null;
    try {
      bookingImport = await dbClient.createBookingImport({
        inboundEmailId,
        source: attachments.length > 0 ? (attachments[0].contentType.includes('pdf') ? 'pdf_upload' : 'image_upload') : 'inbound_email',
        extractedData,
        confidenceData: confidenceScores,
        missingFields: finalMissing,
        status: importStatus,
      });
    } catch (impErr) {
      console.warn('[Inbound Processing] DB createBookingImport warning:', impErr.message);
    }

    const importId = bookingImport ? bookingImport.id : `imp-${Date.now()}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHashVal = hashToken(rawToken);
    const expiryHours = parseInt(process.env.INBOUND_IMPORT_TOKEN_EXPIRY_HOURS || '72', 10);
    const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();

    try {
      await dbClient.createPendingImportToken({
        bookingImportId: importId,
        email: senderEmail,
        tokenHash: tokenHashVal,
        expiresAt,
      });
    } catch (tokErr) {
      console.warn('[Inbound Processing] DB createPendingImportToken warning:', tokErr.message);
    }

    const signupUrl = `${baseUrl}/signup?token=${rawToken}`;
    const isPt = senderEmail.endsWith('.br') || extractedData.currency === 'BRL';
    const lang = isPt ? 'pt' : 'en';

    const welcomeSubject = lang === 'pt'
      ? `Bem-vindo ao ResDrop! Crie sua conta para ativar o monitoramento`
      : `Welcome to ResDrop! Create your account to enable price monitoring`;

    const htmlWelcomeEmail = renderResdropEmailTemplate({
      headline: lang === 'pt' ? 'Sua reserva de hotel foi recebida!' : 'Your hotel booking was received!',
      greeting: lang === 'pt' ? 'Olá!' : 'Hello!',
      bodyParagraphs: lang === 'pt'
        ? [
            'Obrigado por utilizar o ResDrop! Recebemos a sua confirmação de hotel encaminhada por e-mail.',
            'O ResDrop monitora 24 horas por dia os preços das diárias. Quando o valor do seu hotel cair, nós avisamos você imediatamente para você remarcar e economizar.',
            'Para ativar o monitoramento gratuito da sua primeira reserva, crie sua conta no botão abaixo:',
          ]
        : [
            'Thank you for using ResDrop! We received your forwarded hotel confirmation email.',
            'ResDrop monitors hotel rates 24/7. When your hotel price drops, we alert you instantly so you can rebook and save.',
            'To enable free price monitoring for your reservation, create your account using the button below:',
          ],
      extractedBooking: extractedData,
      ctaText: lang === 'pt' ? 'Criar Conta & Ativar Monitoramento' : 'Create Account & Enable Monitoring',
      ctaUrl: signupUrl,
      footerNote: lang === 'pt' ? 'Sem cartão de crédito. Cancele a qualquer momento.' : 'No credit card required. Cancel anytime.',
      lang,
    });

    const welcomeTextCopy = lang === 'pt'
      ? `Bem-vindo ao ResDrop!\n\nRecebemos sua reserva do ${extractedData.hotelName || 'hotel'}.\nPara ativar o monitoramento automático de queda de preço, crie sua conta no link:\n${signupUrl}`
      : `Welcome to ResDrop!\n\nWe received your booking for ${extractedData.hotelName || 'hotel'}.\nTo enable automatic price drop monitoring, create your account at:\n${signupUrl}`;

    await sendReplyEmail(senderEmail, welcomeSubject, htmlWelcomeEmail, welcomeTextCopy);
    if (inboundEmailId) {
      try {
        await dbClient.updateInboundEmail(inboundEmailId, { status: 'PROCESSED', processedAt: new Date().toISOString() });
      } catch {}
    }
    return { status: 'processed', importId, senderEmail };
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
      const contentHash = crypto.createHash('sha256').update(rawEmail || `${senderEmail}-${subject}-${text}`).digest('hex');

      // Idempotency check
      const existingByMsg = await dbClient.getInboundEmailByMessageId(msgId);
      const existingByHash = await dbClient.getInboundEmailByHash(contentHash);
      if (existingByMsg || existingByHash) {
        return res.status(200).json({ status: 'ignored_duplicate', messageId: msgId });
      }

      const parsedAttachments = Array.isArray(attachments) ? attachments.map(a => ({
        filename: a.filename || 'attachment',
        contentType: a.contentType || a.type || 'application/octet-stream',
        content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content || '', 'base64'),
      })) : [];

      const result = await processInboundEmailPayload({
        senderEmail,
        subject: subject || '',
        textContent: text || sanitizeHtmlText(html || ''),
        attachments: parsedAttachments,
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
