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

// Security: HTML-escape user inputs before injecting into email templates
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Helper ────────────────────────────────────────────────────
export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// ─── Brand Colors ──────────────────────────────────────────────
const C = {
  green900: '#0F2E1F',
  green800: '#1B4332',
  green700: '#2D6A4F',
  green600: '#40916C',
  green500: '#52B788',
  green400: '#74C69D',
  green300: '#95D5B2',
  green200: '#B7E4C7',
  green100: '#D8F3DC',
  green50:  '#F0FAF4',
  gold:     '#CBA052',
  goldDark: '#B8800A',
  goldLight:'#D4A855',
  white:    '#FFFFFF',
  bg:       '#F5F7F6',
  text:     '#212529',
  textMuted:'#495057',
  textLight:'#868E96',
  border:   '#E9ECEF',
  red:      '#C1292E',
};

// ─── Shared HTML layout ────────────────────────────────────────
function layout(title, bodyHtml, preheader = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ''}

<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td style="padding:40px 16px;" align="center">

<!-- Container -->
<table width="580" cellpadding="0" cellspacing="0" style="background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,46,31,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg, ${C.green900} 0%, ${C.green800} 100%);padding:36px 40px;text-align:center;">
  <table cellpadding="0" cellspacing="0" align="center"><tr>
    <td style="font-size:30px;font-weight:800;letter-spacing:-0.5px;line-height:1;">
      <span style="color:${C.green400};">Res</span><span style="color:${C.gold};">Drop</span>
    </td>
  </tr></table>
  <p style="margin:8px 0 0;font-size:12px;color:${C.green300};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Hotel Price Monitoring</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:40px 40px 32px;">
${bodyHtml}
</td></tr>

<!-- Footer -->
<tr><td style="padding:0 40px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${C.border};"></td></tr></table>
</td></tr>
<tr><td style="padding:24px 40px 32px;text-align:center;">
  <table cellpadding="0" cellspacing="0" align="center"><tr>
    <td style="font-size:18px;font-weight:800;letter-spacing:-0.3px;line-height:1;">
      <span style="color:${C.green500};">Res</span><span style="color:${C.gold};">Drop</span>
    </td>
  </tr></table>
  <p style="margin:12px 0 0;font-size:12px;color:${C.textLight};line-height:1.5;">
    Hotel price monitoring &amp; savings<br>
    <a href="https://resdrop.app" style="color:${C.green600};text-decoration:none;">resdrop.app</a>
  </p>
  <p style="margin:12px 0 0;font-size:11px;color:#CED4DA;line-height:1.4;">
    You received this email because you have a ResDrop account.<br>
    &copy; ${new Date().getFullYear()} ResDrop. All rights reserved.
  </p>
</td></tr>

</table>
<!-- /Container -->

</td></tr>
</table>
</body></html>`;
}

function btn(href, label, variant = 'primary') {
  const bg = variant === 'gold' ? `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)` : `linear-gradient(135deg, ${C.green500} 0%, ${C.green600} 100%)`;
  const bgFallback = variant === 'gold' ? C.gold : C.green500;
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr>
  <td style="background:${bgFallback};background-image:${bg};border-radius:10px;padding:16px 36px;box-shadow:0 2px 8px rgba(15,46,31,0.15);">
    <a href="${href}" style="color:${C.white};text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;display:inline-block;">${label}</a>
  </td>
</tr></table>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 8px;color:${C.green900};font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.3;">${text}</h1>`;
}

function subheading(text) {
  return `<p style="margin:0 0 24px;color:${C.textMuted};font-size:15px;line-height:1.6;">${text}</p>`;
}

function p(text) {
  return `<p style="margin:0 0 16px;color:${C.text};font-size:15px;line-height:1.7;">${text}</p>`;
}

function pMuted(text) {
  return `<p style="margin:0 0 12px;color:${C.textLight};font-size:13px;line-height:1.6;font-style:italic;">${text}</p>`;
}

function divider() {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-top:1px solid ${C.border};"></td></tr></table>`;
}

function card(rows) {
  const rowsHtml = rows.map(([label, value], i) => {
    const borderBottom = i < rows.length - 1 ? `border-bottom:1px solid ${C.green50};` : '';
    return `<tr>
      <td style="padding:12px 16px;color:${C.textMuted};font-size:13px;font-weight:600;white-space:nowrap;${borderBottom}">${label}</td>
      <td style="padding:12px 16px;color:${C.green900};font-size:14px;font-weight:500;text-align:right;${borderBottom}">${value}</td>
    </tr>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.green50};border:1px solid ${C.green100};border-radius:12px;margin:20px 0;overflow:hidden;">${rowsHtml}</table>`;
}

function priceCard(originalPrice, newPrice, savings, source) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-radius:12px;overflow:hidden;border:1px solid ${C.green100};">
  <tr>
    <td style="background:${C.green50};padding:20px 24px;text-align:center;border-right:1px solid ${C.green100};width:50%;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:1px;">Your Price</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:${C.textMuted};text-decoration:line-through;">$${Number(originalPrice).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
    </td>
    <td style="background:${C.green900};padding:20px 24px;text-align:center;width:50%;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${C.green300};text-transform:uppercase;letter-spacing:1px;">Found Price</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:${C.green400};">$${Number(newPrice).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
      ${source ? `<p style="margin:4px 0 0;font-size:11px;color:${C.green300};">via ${esc(source)}</p>` : ''}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="background:linear-gradient(135deg, ${C.green500} 0%, ${C.green600} 100%);padding:16px 24px;text-align:center;">
      <p style="margin:0;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">Your Savings</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:${C.white};letter-spacing:-0.5px;">$${Number(savings).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
    </td>
  </tr>
</table>`;
}

function stepsList(steps) {
  return `<table cellpadding="0" cellspacing="0" style="margin:20px 0;">
    ${steps.map((step, i) => `<tr>
      <td style="vertical-align:top;padding:0 14px 16px 0;">
        <div style="width:28px;height:28px;border-radius:50%;background:${C.green50};border:2px solid ${C.green200};color:${C.green700};font-size:13px;font-weight:800;text-align:center;line-height:28px;">${i + 1}</div>
      </td>
      <td style="vertical-align:top;padding:4px 0 16px;color:${C.text};font-size:14px;line-height:1.5;">${step}</td>
    </tr>`).join('')}
  </table>`;
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
  const userName = esc(name) || 'Traveler';
  const html = layout('Welcome to ResDrop', `
    ${heading(`Welcome, ${userName}!`)}
    ${subheading('Thanks for joining ResDrop. We\'ll keep an eye on your hotel prices so you don\'t have to.')}

    ${p('<strong>Here\'s how it works:</strong>')}
    ${stepsList([
      'Add your hotel booking details or forward your confirmation email',
      'We monitor prices across major booking platforms daily',
      'When we find a lower rate, you get notified instantly',
    ])}

    ${p('Ready to start saving? Add your first booking now:')}
    ${btn('https://resdrop.app/submit', 'Add Your First Booking', 'gold')}

    ${divider()}
    ${pMuted('Need help? Just reply to this email and we\'ll get back to you.')}
  `, `Welcome to ResDrop! We'll monitor your hotel prices and find savings.`);
  return send(to, `Welcome to ResDrop, ${userName}!`, html);
}

export async function sendPriceDropAlert(to, name, booking) {
  const savings = booking.potentialSavings || (booking.originalPrice - booking.bestPrice);
  const savingsPercent = booking.originalPrice > 0 ? Math.round(savings / booking.originalPrice * 100) : 0;
  const html = layout('Price Drop Found!', `
    ${heading('Price drop found!')}
    ${subheading(`Hi ${esc(name)}, we found a lower price for your upcoming stay at <strong>${esc(booking.hotelName)}</strong>.`)}

    ${priceCard(booking.originalPrice, booking.bestPrice, savings, booking.bestSource)}

    ${card([
      ['Hotel', esc(booking.hotelName)],
      ['Check-in', esc(booking.checkinDate)],
      ['Check-out', esc(booking.checkoutDate)],
      ['Savings', `${savingsPercent}% lower`],
    ])}

    ${p('Review this price drop in your dashboard:')}
    ${btn('https://resdrop.app/dashboard', 'View Price Drop')}

    ${divider()}
    ${pMuted('Prices are subject to change. We recommend acting quickly to lock in the lower rate.')}
  `, `Save $${savings.toFixed(2)} on ${booking.hotelName}! We found a ${savingsPercent}% lower rate.`);
  return send(to, `Save $${savings.toFixed(2)} on ${booking.hotelName}`, html);
}

export async function sendSavingsConfirmed(to, name, booking, confirmation) {
  const savings = confirmation?.savings || booking.potentialSavings || 0;
  const html = layout('Savings Confirmed!', `
    ${heading('Savings confirmed!')}
    ${subheading(`Congratulations ${esc(name)}, your savings have been verified and confirmed.`)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-radius:12px;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg, ${C.green500} 0%, ${C.green600} 100%);padding:28px 32px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">Confirmed Savings</p>
        <p style="margin:0;font-size:36px;font-weight:800;color:${C.white};letter-spacing:-1px;">$${Number(savings).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
      </td></tr>
    </table>

    ${card([
      ['Hotel', esc(booking.hotelName)],
      ['Check-in', esc(booking.checkinDate)],
      ['Check-out', esc(booking.checkoutDate)],
      ...(confirmation?.notes ? [['Notes', esc(confirmation.notes)]] : []),
    ])}

    ${p('Keep monitoring your other bookings for more savings opportunities.')}
    ${btn('https://resdrop.app/dashboard', 'View My Bookings')}
  `, `You saved $${savings.toFixed(2)} on ${booking.hotelName}!`);
  return send(to, `Savings confirmed: $${savings.toFixed(2)} on ${booking.hotelName}`, html);
}

export async function sendPasswordReset(to, name, resetUrl) {
  const html = layout('Reset Your Password', `
    ${heading('Reset your password')}
    ${subheading(`Hi ${esc(name) || 'there'}, we received a request to reset your ResDrop password.`)}

    ${p('Click the button below to set a new password:')}
    ${btn(resetUrl, 'Reset Password')}

    ${divider()}
    ${pMuted('This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.')}
    ${pMuted(`If the button doesn't work, copy and paste this link into your browser:`)}
    <p style="margin:0;font-size:12px;color:${C.green600};word-break:break-all;line-height:1.5;">${resetUrl}</p>
  `, 'Reset your ResDrop password. This link expires in 1 hour.');
  return send(to, 'Reset your ResDrop password', html);
}

export async function sendBookingCreated(to, name, booking) {
  const hotelName = esc(booking.hotelName || booking.hotel_name);
  const html = layout('Monitoring Started', `
    ${heading('Monitoring started!')}
    ${subheading(`Hi ${esc(name) || 'Traveler'}, we're now tracking prices for your booking.`)}

    ${card([
      ['Hotel', hotelName],
      ['Destination', esc(booking.destination) || '\u2014'],
      ['Check-in', esc(booking.checkinDate || booking.checkin_date)],
      ['Check-out', esc(booking.checkoutDate || booking.checkout_date)],
      ['Original Price', `$${Number(booking.originalPrice || booking.original_price || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
    ])}

    ${p('We\'ll check prices multiple times per day across major booking platforms and notify you as soon as we find a lower rate.')}
    ${btn('https://resdrop.app/dashboard', 'View My Bookings')}

    ${divider()}
    ${pMuted('You can manage your bookings and notification preferences from your dashboard.')}
  `, `We're monitoring prices for ${booking.hotelName || booking.hotel_name}.`);
  return send(to, `Monitoring started: ${booking.hotelName || booking.hotel_name}`, html);
}

export async function sendAdminNotification(subject, body) {
  const html = layout(`Admin: ${subject}`, `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-radius:8px;overflow:hidden;">
      <tr><td style="background:${C.gold};padding:10px 16px;">
        <p style="margin:0;font-size:11px;font-weight:800;color:${C.green900};text-transform:uppercase;letter-spacing:1px;">Admin Notification</p>
      </td></tr>
    </table>
    ${heading(subject)}
    <div style="color:${C.text};font-size:14px;line-height:1.7;">${body}</div>
  `);
  return send(ADMIN_EMAIL, `[ResDrop Admin] ${subject}`, html);
}
