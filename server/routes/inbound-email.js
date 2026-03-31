import { Router } from 'express';
import * as db from '../db.js';
import { sendBookingCreated, sendAdminNotification } from '../email.js';

/**
 * Inbound Email Webhook — Resend
 *
 * Resend forwards emails sent to reservas@in.resdrop.app (or similar)
 * as a POST webhook with the full email content.
 *
 * Flow:
 *   1. User forwards their hotel confirmation email to reservas@in.resdrop.app
 *   2. Resend receives it and POSTs the parsed email here
 *   3. We extract booking data from the email body
 *   4. Create a booking in 'needs_review' state
 *   5. Notify the user to review the extracted data
 *
 * Resend inbound webhook payload:
 * {
 *   "type": "email.received",
 *   "data": {
 *     "from": "user@example.com",
 *     "to": ["reservas@in.resdrop.app"],
 *     "subject": "Fwd: Your booking confirmation",
 *     "text": "plain text body",
 *     "html": "<html>body</html>",
 *     "headers": [...],
 *     "attachments": [{ "filename": "...", "content_type": "...", "content": "base64..." }]
 *   }
 * }
 */

// ─── Field extraction from email text ──────────────────────────
function extractBookingFromEmail(text, subject = '') {
  const combined = `${subject}\n${text}`;
  const fields = {};
  const confidence = {};

  // Hotel name
  const hotelPatterns = [
    /(?:hotel|resort|inn|lodge|pousada)\s*[:.]?\s*(.+)/i,
    /(?:property|accommodation|propriedade)\s*[:.]?\s*(.+)/i,
    /(?:nome do hotel|hotel name)\s*[:.]?\s*(.+)/i,
    /(?:your (?:stay|reservation|booking) at)\s+(.+)/i,
    /(?:sua (?:reserva|estadia) (?:no|na|em))\s+(.+)/i,
    /(?:confirmation for)\s+(.+)/i,
    /(?:confirma[çc][ãa]o (?:de reserva )?(?:no|na|em|para|-))\s+(.+)/i,
  ];
  for (const p of hotelPatterns) {
    const m = combined.match(p);
    if (m) {
      let name = m[1].trim().split(/[,\n\r|]/)[0].trim();
      if (name.length > 3 && name.length < 100) {
        fields.hotelName = name;
        confidence.hotelName = 0.65;
        break;
      }
    }
  }

  // Check-in date
  const checkinPatterns = [
    /check[\s-]*in\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/i,
    /check[\s-]*in\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:entrada|arrival|chegada)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:entrada|arrival|chegada)\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/i,
    /check[\s-]*in\s*[:.]?\s*(\w+\s+\d{1,2},?\s*\d{4})/i,
  ];
  for (const p of checkinPatterns) {
    const m = combined.match(p);
    if (m) {
      fields.checkinDate = normalizeDate(m[1]);
      confidence.checkinDate = 0.75;
      break;
    }
  }

  // Check-out date
  const checkoutPatterns = [
    /check[\s-]*out\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/i,
    /check[\s-]*out\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:sa[ií]da|departure|partida)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:sa[ií]da|departure|partida)\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/i,
    /check[\s-]*out\s*[:.]?\s*(\w+\s+\d{1,2},?\s*\d{4})/i,
  ];
  for (const p of checkoutPatterns) {
    const m = combined.match(p);
    if (m) {
      fields.checkoutDate = normalizeDate(m[1]);
      confidence.checkoutDate = 0.75;
      break;
    }
  }

  // Price
  const pricePatterns = [
    /(?:total|valor|amount|price|pre[çc]o)\s*[:.]?\s*R?\$\s*([\d.,]+)/i,
    /R\$\s*([\d.,]+)/,
    /(?:USD|BRL|EUR)\s*([\d.,]+)/i,
    /\$\s*([\d.,]+)/,
  ];
  for (const p of pricePatterns) {
    const m = combined.match(p);
    if (m) {
      const price = parsePrice(m[1]);
      if (price > 0) {
        fields.originalPrice = price;
        confidence.originalPrice = 0.6;
        break;
      }
    }
  }

  // Confirmation number
  const confPatterns = [
    /(?:confirma[çc][ãa]o|confirmation|booking\s*(?:id|number|ref|#))\s*[:.]?\s*([A-Z0-9][\w\-]{3,20})/i,
    /(?:reserva|reservation)\s*(?:#|n[°o]\.?)\s*[:.]?\s*([A-Z0-9][\w\-]{3,20})/i,
    /(?:itinerary|itin[eé]rario)\s*(?:#|n[°o]\.?)?\s*[:.]?\s*([A-Z0-9][\w\-]{3,20})/i,
    /(?:reference|refer[eê]ncia)\s*[:.]?\s*([A-Z0-9][\w\-]{3,20})/i,
  ];
  for (const p of confPatterns) {
    const m = combined.match(p);
    if (m) {
      fields.confirmationNumber = m[1].trim();
      confidence.confirmationNumber = 0.7;
      break;
    }
  }

  // Guest name
  const guestPatterns = [
    /(?:guest|h[óo]spede|nome|name)\s*[:.]?\s*([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+){1,3})/,
    /(?:sr\.|sra\.|mr\.|mrs\.|ms\.)\s*([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+){1,3})/i,
    /(?:dear|prezado|prezada)\s+([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+){0,3})/i,
  ];
  for (const p of guestPatterns) {
    const m = combined.match(p);
    if (m) {
      fields.guestName = m[1].trim();
      confidence.guestName = 0.5;
      break;
    }
  }

  // Room type
  const roomPatterns = [
    /(?:room\s*type|tipo\s*(?:de\s*)?quarto|categoria|category)\s*[:.]?\s*(.+)/i,
    /(?:room|quarto)\s*[:.]?\s*(\w[\w\s]{2,40})/i,
  ];
  for (const p of roomPatterns) {
    const m = combined.match(p);
    if (m) {
      let room = m[1].trim().split(/[\n\r,|]/)[0].trim();
      if (room.length > 2 && room.length < 60) {
        fields.roomType = room;
        confidence.roomType = 0.5;
        break;
      }
    }
  }

  // Destination
  const destPatterns = [
    /(?:destino|destination|cidade|city|localiza[çc][ãa]o|location)\s*[:.]?\s*(.+)/i,
  ];
  for (const p of destPatterns) {
    const m = combined.match(p);
    if (m) {
      let dest = m[1].trim().split(/[\n\r,|]/)[0].trim();
      if (dest.length > 2 && dest.length < 100) {
        fields.destination = dest;
        confidence.destination = 0.5;
        break;
      }
    }
  }

  return { fields, confidence };
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Try English format: March 15, 2024
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {}
  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length !== 3) return dateStr;
  let [d, m, y] = parts;
  if (y.length === 2) y = '20' + y;
  // Brazilian/European: dd/mm/yyyy
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parsePrice(str) {
  if (!str) return 0;
  // Brazilian: 1.234,56
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.'));
  }
  return parseFloat(str.replace(/[^\d.]/g, ''));
}

// Strip HTML tags to get plain text
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
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

// Find the user account matching the sender email
async function findUserByEmail(senderEmail) {
  if (!senderEmail) return null;
  // Normalize: the "from" field may be "Name <email>" format
  const match = senderEmail.match(/<([^>]+)>/) || [null, senderEmail];
  const email = (match[1] || senderEmail).toLowerCase().trim();
  try {
    const user = await db.getUser(email);
    return user;
  } catch {
    return null;
  }
}

export default function inboundEmailRoutes(authMiddleware) {
  const router = Router();

  /**
   * POST /api/webhooks/inbound-email
   *
   * Resend inbound webhook endpoint.
   * No auth middleware — webhook is validated by checking the sender
   * against registered user accounts.
   */
  router.post('/webhooks/inbound-email', async (req, res) => {
    try {
      const payload = req.body;

      // Resend webhook wraps the email data
      const emailData = payload?.data || payload;
      const fromEmail = emailData.from || emailData.sender || '';
      const subject = emailData.subject || '';
      const textBody = emailData.text || '';
      const htmlBody = emailData.html || '';
      const toAddresses = emailData.to || [];

      console.log(`[Inbound] Email received from: ${fromEmail} | Subject: "${subject}" | To: ${JSON.stringify(toAddresses)}`);

      // Get usable text content
      const plainText = textBody || stripHtml(htmlBody);

      if (!plainText || plainText.length < 20) {
        console.warn('[Inbound] Email body too short or empty — skipping');
        return res.status(200).json({ status: 'skipped', reason: 'empty_body' });
      }

      // Find the user account that matches the sender
      const user = await findUserByEmail(fromEmail);

      if (!user) {
        console.warn(`[Inbound] No registered user found for sender: ${fromEmail}`);
        // Still return 200 to acknowledge receipt (prevent retries)
        // Notify admin about unrecognized sender
        await sendAdminNotification(
          'Inbound email from unregistered sender',
          `<p>Email from: <strong>${fromEmail}</strong></p>
           <p>Subject: ${subject}</p>
           <p>No matching user account found. The email was not processed.</p>`
        );
        return res.status(200).json({ status: 'skipped', reason: 'unknown_sender' });
      }

      console.log(`[Inbound] Matched user: ${user.email} (${user.name || 'unnamed'})`);

      // Extract booking data from email content
      const { fields, confidence } = extractBookingFromEmail(plainText, subject);

      console.log(`[Inbound] Extracted fields:`, Object.keys(fields));

      // Determine required fields present
      const requiredFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'];
      const missingRequired = requiredFields.filter(f => !fields[f]);
      const hasEnoughData = missingRequired.length <= 2; // At least hotel + 1 date or price

      // Check for duplicates
      let duplicate = null;
      if (fields.hotelName && fields.checkinDate && fields.checkoutDate) {
        const existingBookings = await db.getBookingsByEmail(user.email);
        duplicate = existingBookings.find(b =>
          b.hotelName?.toLowerCase().includes(fields.hotelName.toLowerCase().substring(0, 10)) &&
          b.checkinDate === fields.checkinDate &&
          b.checkoutDate === fields.checkoutDate &&
          !['expired', 'dismissed'].includes(b.status)
        );
      }

      if (duplicate) {
        console.log(`[Inbound] Duplicate booking detected for ${fields.hotelName} — skipping`);
        return res.status(200).json({
          status: 'duplicate',
          existingBookingId: duplicate.id,
        });
      }

      // Create booking in needs_review state
      const status = missingRequired.length === 0 ? 'monitoring' : 'needs_review';

      const booking = await db.createBooking({
        email: user.email,
        hotelName: fields.hotelName || null,
        destination: fields.destination || null,
        checkinDate: fields.checkinDate || null,
        checkoutDate: fields.checkoutDate || null,
        roomType: fields.roomType || null,
        originalPrice: fields.originalPrice || null,
        confirmationNumber: fields.confirmationNumber || null,
        guestName: fields.guestName || null,
        status,
        alerts: [],
        priceHistory: [],
        latestResults: [],
        rawSource: plainText.substring(0, 5000), // Keep first 5K chars
        parseMethod: 'inbound_email',
        missingFields: missingRequired,
        fieldConfidence: confidence,
      });

      // Log the activity
      await db.logActivity({
        entityType: 'booking',
        entityId: booking.id,
        action: 'created_from_inbound_email',
        actorEmail: user.email,
        details: {
          fromEmail,
          subject,
          extractedFields: Object.keys(fields),
          missingRequired,
          confidence,
          status,
        },
      });

      console.log(`[Inbound] Booking created: ${booking.id} | Status: ${status} | Hotel: ${fields.hotelName || 'unknown'}`);

      // Send notification email to user
      if (status === 'monitoring') {
        await sendBookingCreated(user.email, user.name, {
          hotelName: fields.hotelName,
          destination: fields.destination,
          checkinDate: fields.checkinDate,
          checkoutDate: fields.checkoutDate,
          originalPrice: fields.originalPrice,
        });
      } else {
        // Send a "review needed" email
        await sendInboundReviewEmail(user.email, user.name, fields, missingRequired);
      }

      res.status(200).json({
        status: 'created',
        bookingId: booking.id,
        bookingStatus: status,
        extractedFields: Object.keys(fields),
        missingRequired,
      });
    } catch (err) {
      console.error('[Inbound] Webhook error:', err.message, err.stack);
      // Always return 200 to prevent Resend from retrying
      res.status(200).json({ status: 'error', error: err.message });
    }
  });

  /**
   * GET /api/inbound/address
   * Returns the user's forwarding email address.
   * Authenticated endpoint.
   */
  router.get('/inbound/address', authMiddleware, (req, res) => {
    const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN || 'resdrop.app';
    res.json({
      addresses: [
        `reservas@${inboundDomain}`,
        `reservations@${inboundDomain}`,
      ],
      primary: `reservas@${inboundDomain}`,
    });
  });

  return router;
}

// ─── Review needed email ──────────────────────────────────────
async function sendInboundReviewEmail(to, name, fields, missingFields) {
  const { sendAdminNotification } = await import('../email.js');

  // Use the Resend client directly for this custom email
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const extractedRows = Object.entries(fields)
    .map(([key, value]) => `<tr><td style="padding:6px 12px;color:#666;font-size:13px;font-weight:600;">${key}</td><td style="padding:6px 12px;color:#0F2E1F;font-size:14px;">${value}</td></tr>`)
    .join('');

  const missingList = missingFields.length > 0
    ? `<p style="color:#92400e;font-size:14px;margin:12px 0;padding:12px 16px;background:#fef3c7;border-radius:8px;">Campos pendentes: <strong>${missingFields.join(', ')}</strong></p>`
    : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr><td style="background:#0F2E1F;padding:28px 32px;text-align:center;">
  <span style="color:#52B788;font-size:28px;font-weight:700;">Res</span><span style="color:#CBA052;font-size:28px;font-weight:700;">Drop</span>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 16px;color:#0F2E1F;font-size:22px;font-weight:700;">Reserva recebida por email</h2>
  <p style="margin:0 0 14px;color:#333;font-size:15px;line-height:1.6;">
    Olá ${name || 'Viajante'}, recebemos seu email de confirmação e extraímos os seguintes dados:
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7faf8;border:1px solid #e0ece5;border-radius:8px;margin:16px 0;">
    ${extractedRows}
  </table>
  ${missingList}
  <p style="margin:0 0 14px;color:#333;font-size:15px;line-height:1.6;">
    Acesse seu painel para revisar e completar os dados antes de ativarmos o monitoramento.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#52B788;border-radius:8px;padding:14px 28px;">
    <a href="https://resdrop.app/dashboard" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">Revisar Reserva</a>
  </td></tr></table>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
  <p style="margin:0;font-size:12px;color:#999;">ResDrop — Monitoramento de preços de hotel</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ResDrop <notifications@resdrop.app>',
        to,
        subject: `📋 Reserva recebida: ${fields.hotelName || 'Revise os dados'}`,
        html,
      }),
    });
    console.log(`[Inbound] Review email sent to ${to}`);
  } catch (err) {
    console.error(`[Inbound] Failed to send review email:`, err.message);
  }
}
