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

  // Fallback to Resend API
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `ResDrop <${process.env.RESEND_FROM || 'notifications@resdrop.app'}>`,
          to,
          subject,
          html: htmlText,
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
    /(?:hotel|resort|inn|lodge|pousada)\s*[:.]?\s*(.+)/i,
    /(?:property|accommodation|propriedade)\s*[:.]?\s*(.+)/i,
    /(?:nome do hotel|hotel name)\s*[:.]?\s*(.+)/i,
    /(?:your (?:stay|reservation|booking) at)\s+(.+)/i,
    /(?:sua (?:reserva|estadia) (?:no|na|em))\s+(.+)/i,
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
    /check[\s-]*in\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/i,
    /check[\s-]*in\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
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
    /check[\s-]*out\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/i,
    /check[\s-]*out\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
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
    /(?:total|valor|amount|price|pre[çc]o)\s*[:.]?\s*R?\$\s*([\d.,]+)/i,
    /(?:USD|BRL|EUR)\s*([\d.,]+)/i,
    /\$\s*([\d.,]+)/,
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

  const currMatch = combined.match(/(USD|BRL|EUR|GBP)/i);
  if (currMatch) {
    fields.currency = currMatch[1].toUpperCase();
    confidence.currency = 0.9;
  }

  const confPatterns = [
    /\b(?:confirma[çc][ãa]o|confirmation|booking|reservation|reserva|itinerary|itinérario|conf|reference|referência|ref)\b\s*(?:reference|referência|number|code|ref|id|#|n[°o]\.?)?\s*[:.#]?\s*([A-Z0-9][\w\-]{3,20})/i,
  ];
  for (const p of confPatterns) {
    const m = combined.match(p);
    if (m) {
      fields.confirmationNumber = m[1].trim();
      confidence.confirmationNumber = 0.8;
      break;
    }
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
            // Mark as seen
            await client.messageFlagsAdd({ uid }, ['\\Seen']);
            continue;
          }

          // Create InboundEmail record in DB
          const inboundRecord = await db.createInboundEmail({
            messageId,
            mailboxUid: uid,
            senderEmail,
            subject,
            status: 'PROCESSING',
            contentHash,
          });

          // Parse raw email structure
          const parsedMail = await simpleParser(message.source);
          const textContent = parsedMail.text || parsedMail.html || '';

          let extractedData = {};
          let confidenceScores = {};
          let deterministicSuccess = false;

          // 1. Deterministic text extraction
          const det = extractBookingFromEmail(textContent, subject);
          extractedData = det.fields;
          confidenceScores = det.confidence;

          const essential = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];
          const missingEssential = essential.filter(f => !extractedData[f]);
          if (missingEssential.length === 0) {
            deterministicSuccess = true;
          }

          // 2. Extract PDF / image attachments if available
          let attachmentBuffer = null;
          let attachmentMime = null;

          if (parsedMail.attachments && parsedMail.attachments.length > 0) {
            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            const validAttachment = parsedMail.attachments.find(a => allowedTypes.includes(a.contentType));
            if (validAttachment) {
              attachmentBuffer = validAttachment.content;
              attachmentMime = validAttachment.contentType;
            }
          }

          // 3. AI fallback if essential missing or attachments exist
          if (!deterministicSuccess && isAiParserConfigured()) {
            try {
              let aiRes = null;
              if (attachmentBuffer && attachmentMime) {
                aiRes = await extractBookingFromDocument(attachmentBuffer, attachmentMime, { source: 'inbound_email' });
              } else if (textContent.length > 30) {
                aiRes = await extractBookingFromDocument(Buffer.from(textContent), 'text/plain', { source: 'inbound_email' });
              }

              if (aiRes) {
                extractedData = { ...extractedData, ...aiRes.fields };
                confidenceScores = { ...confidenceScores, ...aiRes.confidence };
              }
            } catch (err) {
              console.error('[Inbound Poller] AI extraction error:', err.message);
            }
          }

          const missingFields = essential.filter(f => !extractedData[f]);
          const importStatus = missingFields.length === 0 ? 'READY_FOR_CONFIRMATION' : 'NEEDS_REVIEW';

          // Match sender with registered user
          const user = await db.getUser(senderEmail);
          const baseUrl = process.env.APP_BASE_URL || 'https://resdrop.app';

          if (user) {
            // Registered User Flow
            const bookingImport = await db.createBookingImport({
              userEmail: user.email,
              inboundEmailId: inboundRecord.id,
              source: 'inbound_email',
              extractedData,
              confidenceData: confidenceScores,
              missingFields,
              status: importStatus,
            });

            const reviewUrl = `${baseUrl}/dashboard?reviewImport=${bookingImport.id}`;

            const lang = user.country === 'BR' || user.currency === 'BRL' ? 'pt' : 'en';
            const emailSubject = lang === 'pt' ? 'Recebemos sua reserva' : 'We received your booking';

            const ptHtml = `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#0F2E1F;">
                <h2>Olá ${user.name || 'Viajante'},</h2>
                <p>Recebemos sua confirmação de hotel e começamos a preparar o monitoramento.</p>
                <p>Revise os dados extraídos e complete qualquer informação necessária pelo link abaixo:</p>
                <p><a href="${reviewUrl}" style="display:inline-block;padding:12px 24px;background:#52B788;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Revisar Reserva</a></p>
                <p><em>O monitoramento será iniciado após a sua confirmação.</em></p>
                <p>Atenciosamente,<br>Equipe ResDrop</p>
              </div>`;

            const enHtml = `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#0F2E1F;">
                <h2>Hello ${user.name || 'Traveler'},</h2>
                <p>We received your hotel confirmation and started preparing price monitoring.</p>
                <p>Please review the extracted details and complete any missing fields using the link below:</p>
                <p><a href="${reviewUrl}" style="display:inline-block;padding:12px 24px;background:#52B788;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Review Booking Details</a></p>
                <p><em>Monitoring will start after your confirmation.</em></p>
                <p>Best regards,<br>ResDrop Team</p>
              </div>`;

            await sendReplyEmail(
              user.email,
              emailSubject,
              lang === 'pt' ? ptHtml : enHtml,
              `Revisar reserva: ${reviewUrl}`
            );

            await db.updateInboundEmail(inboundRecord.id, {
              status: 'PROCESSED',
              processedAt: new Date().toISOString(),
            });
          } else {
            // Unregistered User Flow
            const bookingImport = await db.createBookingImport({
              inboundEmailId: inboundRecord.id,
              source: 'inbound_email',
              extractedData,
              confidenceData: confidenceScores,
              missingFields,
              status: importStatus,
            });

            // Generate single-use expiring token
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHashVal = hashToken(rawToken);
            const expiryHours = parseInt(process.env.INBOUND_IMPORT_TOKEN_EXPIRY_HOURS || '72', 10);
            const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();

            await db.createPendingImportToken({
              bookingImportId: bookingImport.id,
              email: senderEmail,
              tokenHash: tokenHashVal,
              expiresAt,
            });

            const signupUrl = `${baseUrl}/signup?token=${rawToken}`;

            const ptHtml = `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#0F2E1F;">
                <h2>Crie sua conta para acompanhar sua reserva</h2>
                <p>Recebemos sua confirmação de hotel enviado por email.</p>
                <p>Para ativar o monitoramento automático de menor preço, crie sua conta no ResDrop:</p>
                <p><a href="${signupUrl}" style="display:inline-block;padding:12px 24px;background:#52B788;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Criar Minha Conta</a></p>
                <p>Atenciosamente,<br>Equipe ResDrop</p>
              </div>`;

            const enHtml = `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#0F2E1F;">
                <h2>Create your account to monitor your booking</h2>
                <p>We received your hotel confirmation forwarded via email.</p>
                <p>To enable automatic price drop monitoring, create your ResDrop account below:</p>
                <p><a href="${signupUrl}" style="display:inline-block;padding:12px 24px;background:#52B788;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Create Account</a></p>
                <p>Best regards,<br>ResDrop Team</p>
              </div>`;

            await sendReplyEmail(
              senderEmail,
              'Crie sua conta para acompanhar sua reserva / Create your account to monitor your booking',
              ptHtml,
              `Criar conta: ${signupUrl}`
            );

            await db.updateInboundEmail(inboundRecord.id, {
              status: 'PROCESSED',
              processedAt: new Date().toISOString(),
            });
          }

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

export default function inboundEmailRoutes(authMiddleware) {
  const router = Router();

  /**
   * GET /api/inbound/pending-import
   * Public token validation endpoint when user clicks signup link carrying ?token=
   */
  router.get('/inbound/pending-import', async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ error: 'Token is required' });

      const tHash = hashToken(token);
      const pendingToken = await db.getPendingImportTokenByHash(tHash);

      if (!pendingToken) {
        return res.status(404).json({ error: 'Invalid or expired registration token' });
      }

      const bookingImport = await db.getBookingImport(pendingToken.bookingImportId);
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
