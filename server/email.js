import { Resend } from 'resend';

// ─── Resend client (lazy-init) ─────────────────────────────────
let resend = null;

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM = 'ResDrop <notifications@resdrop.app>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'junior13machadojr@gmail.com';

// ─── Helper ────────────────────────────────────────────────────
export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// ─── Shared HTML layout ────────────────────────────────────────
function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<!-- Header -->
<tr><td style="background:#0F2E1F;padding:28px 32px;text-align:center;">
  <span style="color:#52B788;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Res</span><span style="color:#CBA052;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Drop</span>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px;">
${bodyHtml}
</td></tr>

<!-- Footer -->
<tr><td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
  <p style="margin:0;font-size:12px;color:#999;">ResDrop &mdash; Hotel price monitoring &amp; savings</p>
  <p style="margin:4px 0 0;font-size:12px;color:#bbb;">You received this email because you have a ResDrop account.</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function btn(href, label) {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#52B788;border-radius:8px;padding:14px 28px;">
  <a href="${href}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>
</td></tr></table>`;
}

function heading(text) {
  return `<h2 style="margin:0 0 16px;color:#0F2E1F;font-size:22px;font-weight:700;">${text}</h2>`;
}

function p(text) {
  return `<p style="margin:0 0 14px;color:#333;font-size:15px;line-height:1.6;">${text}</p>`;
}

function card(rows) {
  const rowsHtml = rows.map(([label, value]) =>
    `<tr><td style="padding:8px 12px;color:#666;font-size:13px;font-weight:600;white-space:nowrap;">${label}</td>
     <td style="padding:8px 12px;color:#0F2E1F;font-size:14px;">${value}</td></tr>`
  ).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7faf8;border:1px solid #e0ece5;border-radius:8px;margin:16px 0;">${rowsHtml}</table>`;
}

function savingsBadge(amount) {
  return `<span style="display:inline-block;background:#52B788;color:#fff;font-weight:700;font-size:18px;padding:6px 16px;border-radius:6px;">Save $${amount.toFixed(2)}</span>`;
}

// ─── Send helper (safe wrapper) ────────────────────────────────
async function send(to, subject, html) {
  const client = getResend();
  if (!client) {
    console.warn('[Email] Resend not configured — skipping email:', subject);
    return null;
  }
  try {
    const result = await client.emails.send({ from: FROM, to, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
    return result;
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Public email functions
// ═══════════════════════════════════════════════════════════════

export async function sendWelcomeEmail(to, name) {
  const html = layout('Welcome to ResDrop', `
    ${heading(`Welcome, ${name || 'Traveler'}!`)}
    ${p('Thanks for joining <strong>ResDrop</strong> &mdash; we\'ll keep an eye on your hotel prices so you don\'t have to.')}
    ${p('Here\'s how it works:')}
    <ol style="margin:0 0 14px 20px;color:#333;font-size:15px;line-height:1.8;">
      <li>Add your hotel booking details</li>
      <li>We monitor prices across multiple booking sites</li>
      <li>When we find a lower price, you get notified instantly</li>
    </ol>
    ${p('Start by adding your first booking:')}
    ${btn('https://resdrop.app/bookings/new', 'Add a Booking')}
    ${p('Happy saving!')}
  `);
  return send(to, 'Welcome to ResDrop! 🏨', html);
}

export async function sendPriceDropAlert(to, name, booking) {
  const savings = booking.potentialSavings || (booking.originalPrice - booking.bestPrice);
  const html = layout('Price Drop Found!', `
    ${heading('Great news — price drop found!')}
    ${p(`Hi ${name}, we found a lower price for your upcoming stay:`)}
    ${card([
      ['Hotel', booking.hotelName],
      ['Check-in', booking.checkinDate],
      ['Check-out', booking.checkoutDate],
      ['Original Price', `<span style="text-decoration:line-through;color:#999;">$${Number(booking.originalPrice).toFixed(2)}</span>`],
      ['New Price', `<strong style="color:#52B788;">$${Number(booking.bestPrice).toFixed(2)}</strong> via ${booking.bestSource || 'alternative source'}`],
      ['Your Savings', savingsBadge(savings)],
    ])}
    ${p('Review this price drop in your dashboard and confirm the savings:')}
    ${btn('https://resdrop.app/bookings', 'View Price Drop')}
    ${p('<em style="color:#666;font-size:13px;">Prices are subject to change. We recommend acting quickly to lock in the lower rate.</em>')}
  `);
  return send(to, `💰 Price drop: Save $${savings.toFixed(2)} on ${booking.hotelName}`, html);
}

export async function sendSavingsConfirmed(to, name, booking, confirmation) {
  const savings = confirmation?.savings || booking.potentialSavings || 0;
  const html = layout('Savings Confirmed!', `
    ${heading('Savings confirmed! 🎉')}
    ${p(`Congratulations ${name}, your savings have been confirmed:`)}
    ${card([
      ['Hotel', booking.hotelName],
      ['Check-in', booking.checkinDate],
      ['Check-out', booking.checkoutDate],
      ['Confirmed Savings', savingsBadge(savings)],
      ...(confirmation?.notes ? [['Notes', confirmation.notes]] : []),
    ])}
    ${p('Keep monitoring your other bookings for more savings opportunities.')}
    ${btn('https://resdrop.app/bookings', 'View My Bookings')}
  `);
  return send(to, `✅ Savings of $${savings.toFixed(2)} confirmed — ${booking.hotelName}`, html);
}

export async function sendPasswordReset(to, name, resetUrl) {
  const html = layout('Reset Your Password', `
    ${heading('Password Reset')}
    ${p(`Hi ${name || 'there'}, we received a request to reset your ResDrop password.`)}
    ${p('Click the button below to set a new password:')}
    ${btn(resetUrl, 'Reset Password')}
    ${p('<em style="color:#666;font-size:13px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</em>')}
  `);
  return send(to, 'Reset your ResDrop password', html);
}

export async function sendBookingCreated(to, name, booking) {
  const html = layout('Booking Monitoring Started', `
    ${heading('Monitoring started!')}
    ${p(`Hi ${name || 'Traveler'}, we\'re now tracking prices for your booking:`)}
    ${card([
      ['Hotel', booking.hotelName || booking.hotel_name],
      ['Destination', booking.destination || '—'],
      ['Check-in', booking.checkinDate || booking.checkin_date],
      ['Check-out', booking.checkoutDate || booking.checkout_date],
      ['Original Price', `$${Number(booking.originalPrice || booking.original_price).toFixed(2)}`],
    ])}
    ${p('We\'ll check prices multiple times per day and notify you as soon as we find a lower rate.')}
    ${btn('https://resdrop.app/bookings', 'View My Bookings')}
  `);
  return send(to, `📋 Monitoring started: ${booking.hotelName || booking.hotel_name}`, html);
}

export async function sendAdminNotification(subject, body) {
  const html = layout(`Admin: ${subject}`, `
    ${heading(subject)}
    <div style="color:#333;font-size:14px;line-height:1.6;">${body}</div>
  `);
  return send(ADMIN_EMAIL, `[ResDrop Admin] ${subject}`, html);
}
