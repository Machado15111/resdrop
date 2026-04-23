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
const BASE_URL = 'https://resdrop.app';

// ─── Security: HTML-escape user inputs ────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Language + Currency helpers ──────────────────────────────
export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function detectLang(user) {
  if (!user) return 'en';
  if (user.lang) return user.lang;
  if (user.currency === 'BRL' || user.country === 'BR') return 'pt';
  return 'en';
}

const CURRENCY_SYMBOLS = { BRL: 'R$', USD: '$', EUR: '€', GBP: '£' };
const CURRENCY_LOCALES  = { BRL: 'pt-BR', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' };

function fmtPrice(amount, currency = 'USD') {
  const sym    = CURRENCY_SYMBOLS[currency] || currency;
  const locale = CURRENCY_LOCALES[currency]  || 'en-US';
  return `${sym}${Number(amount).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr, lang = 'en') {
  if (!dateStr) return '—';
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
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
  white:    '#FFFFFF',
  bg:       '#F5F5F0',
  text:     '#1C1916',
  textMuted:'#4A4540',
  textLight:'#9A9490',
  border:   '#E8E3DA',
  red:      '#C1292E',
};

// ─── Shared HTML layout ────────────────────────────────────────
function layout(title, bodyHtml, preheader = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ''}

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.bg};">
<tr><td style="padding:48px 16px;" align="center">

<!-- Outer container -->
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

<!-- Logo row -->
<tr><td style="padding:0 0 24px;" align="center">
  <table cellpadding="0" cellspacing="0" role="presentation"><tr>
    <td style="font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1;">
      <span style="color:${C.green700};">Res</span><span style="color:${C.gold};">Drop</span>
    </td>
  </tr></table>
</td></tr>

<!-- Card -->
<tr><td style="background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(15,46,31,0.07);border:1px solid ${C.border};">

<!-- Card body -->
<tr><td style="padding:48px 48px 40px;">
${bodyHtml}
</td></tr>

<!-- Card footer -->
<tr><td style="padding:24px 48px 32px;border-top:1px solid ${C.border};text-align:center;">
  <p style="margin:0 0 8px;font-size:12px;color:${C.textLight};line-height:1.6;">
    <a href="${BASE_URL}" style="color:${C.green600};text-decoration:none;font-weight:600;">resdrop.app</a>
    &nbsp;·&nbsp;
    <a href="mailto:hello@resdrop.app" style="color:${C.textLight};text-decoration:none;">hello@resdrop.app</a>
  </p>
  <p style="margin:0;font-size:11px;color:#CED4DA;line-height:1.5;">
    &copy; ${new Date().getFullYear()} ResDrop. All rights reserved.
  </p>
</td></tr>

</td></tr>
<!-- /Card -->

</table>
<!-- /Outer container -->

</td></tr>
</table>
</body></html>`;
}

// ─── UI primitives ─────────────────────────────────────────────
function btn(href, label, variant = 'primary') {
  const bg = variant === 'gold'
    ? `background:${C.gold};`
    : `background:${C.green600};`;
  return `
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:32px 0 8px;">
  <tr>
    <td style="${bg}border-radius:8px;padding:14px 32px;">
      <a href="${href}" style="color:${C.white};text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.2px;display:inline-block;line-height:1;">${label}</a>
    </td>
  </tr>
</table>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 12px;color:${C.green900};font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.25;">${text}</h1>`;
}

function sub(text) {
  return `<p style="margin:0 0 28px;color:${C.textMuted};font-size:15px;line-height:1.65;">${text}</p>`;
}

function p(text) {
  return `<p style="margin:0 0 16px;color:${C.text};font-size:15px;line-height:1.7;">${text}</p>`;
}

function pSmall(text) {
  return `<p style="margin:0 0 12px;color:${C.textLight};font-size:13px;line-height:1.6;">${text}</p>`;
}

function divider() {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;"><tr><td style="border-top:1px solid ${C.border};"></td></tr></table>`;
}

function infoCard(rows) {
  const rowsHtml = rows.map(([label, value], i) => {
    const border = i < rows.length - 1 ? `border-bottom:1px solid ${C.green50};` : '';
    return `<tr>
      <td style="padding:11px 16px;color:${C.textMuted};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;${border}">${label}</td>
      <td style="padding:11px 16px;color:${C.green900};font-size:14px;font-weight:500;text-align:right;${border}">${value}</td>
    </tr>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.green50};border:1px solid ${C.green100};border-radius:10px;margin:20px 0;overflow:hidden;">${rowsHtml}</table>`;
}

function savingsCard(original, found, savings, source, currency) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;border-radius:10px;overflow:hidden;border:1px solid ${C.green100};">
  <tr>
    <td style="background:${C.green50};padding:20px 24px;text-align:center;border-right:1px solid ${C.green100};width:50%;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:${C.textLight};text-transform:uppercase;letter-spacing:0.1em;">Your rate</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${C.textMuted};text-decoration:line-through;">${fmtPrice(original, currency)}</p>
    </td>
    <td style="background:${C.green900};padding:20px 24px;text-align:center;width:50%;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:${C.green300};text-transform:uppercase;letter-spacing:0.1em;">Found rate</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${C.green400};">${fmtPrice(found, currency)}</p>
      ${source ? `<p style="margin:6px 0 0;font-size:11px;color:${C.green400};opacity:0.8;">via ${esc(source)}</p>` : ''}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="background:${C.green600};padding:14px 24px;text-align:center;">
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;">Savings</p>
      <p style="margin:0;font-size:26px;font-weight:800;color:${C.white};letter-spacing:-0.5px;">${fmtPrice(savings, currency)}</p>
    </td>
  </tr>
</table>`;
}

function stepList(steps) {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0 28px;">
    ${steps.map((step, i) => `<tr>
      <td style="vertical-align:top;padding:0 14px 14px 0;">
        <div style="width:26px;height:26px;border-radius:50%;background:${C.green50};border:1.5px solid ${C.green200};color:${C.green700};font-size:12px;font-weight:800;text-align:center;line-height:26px;min-width:26px;">${i + 1}</div>
      </td>
      <td style="vertical-align:top;padding:3px 0 14px;color:${C.textMuted};font-size:14px;line-height:1.6;">${step}</td>
    </tr>`).join('')}
  </table>`;
}

// ─── Send helper ───────────────────────────────────────────────
async function send(to, subject, html) {
  const client = getResend();
  if (!client) {
    console.warn('[Email] Resend not configured — skipping:', subject);
    return null;
  }
  try {
    const result = await client.emails.send({ from: FROM, to, subject, html });
    console.log(`[Email] ✓ "${subject}" → ${to}`);
    return result;
  } catch (err) {
    console.error(`[Email] ✗ "${subject}" → ${to}:`, err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Public email functions
// ═══════════════════════════════════════════════════════════════

// ─── Welcome ──────────────────────────────────────────────────
export async function sendWelcomeEmail(to, name, user = {}) {
  const lang     = detectLang(user);
  const userName = esc(name) || (lang === 'pt' ? 'Viajante' : 'Traveler');

  const copy = {
    en: {
      subject: `Welcome to ResDrop, ${userName}`,
      preheader: 'Your hotel bookings are now under watch.',
      heading: `Welcome, ${userName}.`,
      sub: 'ResDrop monitors your hotel reservations after you book. When a better equivalent rate appears, you\'ll know immediately.',
      howTitle: 'How it works:',
      steps: [
        'Add a confirmed, refundable hotel booking to your account',
        'We check rates on the hotel\'s site, Expedia, Booking.com and partner sources — three times a day',
        'If a lower equivalent rate appears, you receive an alert with the source, rate, and cancellation terms',
      ],
      cta: 'Add Your First Booking',
      note: 'We never rebook automatically. Every decision is yours.',
    },
    pt: {
      subject: `Bem-vindo ao ResDrop, ${userName}`,
      preheader: 'Suas reservas de hotel estão sendo monitoradas.',
      heading: `Bem-vindo, ${userName}.`,
      sub: 'O ResDrop monitora suas reservas de hotel depois que você reserva. Quando uma tarifa equivalente melhor aparecer, você saberá imediatamente.',
      howTitle: 'Como funciona:',
      steps: [
        'Adicione uma reserva de hotel confirmada e com cancelamento gratuito',
        'Verificamos as tarifas no site do hotel, Expedia, Booking.com e fontes parceiras — três vezes por dia',
        'Se uma tarifa equivalente menor aparecer, você recebe um alerta com a fonte, o valor e as condições de cancelamento',
      ],
      cta: 'Adicionar Primeira Reserva',
      note: 'Nunca remarcamos automaticamente. Cada decisão é sua.',
    },
  }[lang];

  const html = layout(copy.subject, `
    ${h1(copy.heading)}
    ${sub(copy.sub)}
    ${p(`<strong>${copy.howTitle}</strong>`)}
    ${stepList(copy.steps)}
    ${btn(`${BASE_URL}/submit`, copy.cta, 'gold')}
    ${divider()}
    ${pSmall(copy.note)}
  `, copy.preheader);

  return send(to, copy.subject, html);
}

// ─── Booking created ──────────────────────────────────────────
export async function sendBookingCreated(to, name, booking, user = {}) {
  const lang     = detectLang(user);
  const currency = user?.currency || booking.currency || 'USD';
  const userName = esc(name) || (lang === 'pt' ? 'Viajante' : 'Traveler');
  const hotel    = esc(booking.hotelName || booking.hotel_name || '');
  const checkin  = fmtDate(booking.checkinDate || booking.checkin_date, lang);
  const checkout = fmtDate(booking.checkoutDate || booking.checkout_date, lang);
  const price    = fmtPrice(booking.originalPrice || booking.original_price || 0, currency);
  const bookingUrl = `${BASE_URL}/bookings/${booking.id}`;

  const copy = {
    en: {
      subject: `Monitoring started — ${hotel}`,
      preheader: `We're watching rates for ${hotel}.`,
      heading: 'Monitoring started.',
      sub: `We're now tracking prices for your stay at <strong>${hotel}</strong>. We'll notify you the moment a better equivalent rate appears.`,
      labels: ['Hotel', 'Check-in', 'Check-out', 'Your rate'],
      values: [hotel, checkin, checkout, price],
      what: 'What we check:',
      sources: 'The hotel\'s official site, Expedia, Booking.com, and supported partner sources — three times a day, every day until your check-in.',
      cta: 'View Booking',
      note: 'We only alert you for equivalent rooms with the same or better cancellation terms.',
    },
    pt: {
      subject: `Monitoramento iniciado — ${hotel}`,
      preheader: `Estamos acompanhando as tarifas de ${hotel}.`,
      heading: 'Monitoramento iniciado.',
      sub: `Estamos acompanhando as tarifas da sua estadia no <strong>${hotel}</strong>. Você será notificado assim que uma tarifa equivalente melhor aparecer.`,
      labels: ['Hotel', 'Check-in', 'Check-out', 'Sua tarifa'],
      values: [hotel, checkin, checkout, price],
      what: 'O que verificamos:',
      sources: 'O site oficial do hotel, Expedia, Booking.com e fontes parceiras suportadas — três vezes por dia, todos os dias até o seu check-in.',
      cta: 'Ver Reserva',
      note: 'Alertamos apenas para quartos equivalentes com as mesmas condições ou melhores de cancelamento.',
    },
  }[lang];

  const rows = copy.labels.map((label, i) => [label, copy.values[i]]);

  const html = layout(copy.subject, `
    ${h1(copy.heading)}
    ${sub(copy.sub)}
    ${infoCard(rows)}
    ${p(`<strong>${copy.what}</strong> ${copy.sources}`)}
    ${btn(bookingUrl, copy.cta)}
    ${divider()}
    ${pSmall(copy.note)}
  `, copy.preheader);

  return send(to, copy.subject, html);
}

// ─── Price drop alert ──────────────────────────────────────────
export async function sendPriceDropAlert(to, name, booking, user = {}) {
  const lang     = detectLang(user);
  const currency = user?.currency || booking.currency || 'USD';
  const userName = esc(name) || (lang === 'pt' ? 'Viajante' : 'Traveler');
  const hotel    = esc(booking.hotelName || booking.hotel_name || '');
  const savings  = booking.potentialSavings || (booking.originalPrice - booking.bestPrice) || 0;
  const pct      = booking.originalPrice > 0 ? Math.round(savings / booking.originalPrice * 100) : 0;
  const bookingUrl = `${BASE_URL}/bookings/${booking.id}`;

  const copy = {
    en: {
      subject: `Rate drop found — save ${fmtPrice(savings, currency)} on ${hotel}`,
      preheader: `A ${pct}% lower rate is available for your stay at ${hotel}.`,
      heading: 'A lower rate appeared.',
      sub: `Hi ${userName}, we found a better equivalent rate for your upcoming stay at <strong>${hotel}</strong>.`,
      tableRows: [
        ['Hotel', hotel],
        ['Check-in', fmtDate(booking.checkinDate, lang)],
        ['Check-out', fmtDate(booking.checkoutDate, lang)],
        ['Rate savings', `${pct}% lower`],
      ],
      action: 'This is your opportunity. Review the full details in your dashboard and decide whether to act.',
      cta: 'Review This Rate Drop',
      note: 'Rates can change. We recommend reviewing promptly. We never rebook without your explicit action.',
    },
    pt: {
      subject: `Queda de tarifa encontrada — economize ${fmtPrice(savings, currency)} no ${hotel}`,
      preheader: `Uma tarifa ${pct}% menor está disponível para sua estadia no ${hotel}.`,
      heading: 'Uma tarifa menor apareceu.',
      sub: `Olá ${userName}, encontramos uma tarifa equivalente melhor para sua próxima estadia no <strong>${hotel}</strong>.`,
      tableRows: [
        ['Hotel', hotel],
        ['Check-in', fmtDate(booking.checkinDate, lang)],
        ['Check-out', fmtDate(booking.checkoutDate, lang)],
        ['Economia', `${pct}% menor`],
      ],
      action: 'Esta é a sua oportunidade. Revise os detalhes no seu painel e decida se quer agir.',
      cta: 'Revisar Esta Queda de Tarifa',
      note: 'Tarifas podem mudar. Recomendamos revisar rapidamente. Nunca remarcamos sem sua ação explícita.',
    },
  }[lang];

  const html = layout(copy.subject, `
    ${h1(copy.heading)}
    ${sub(copy.sub)}
    ${savingsCard(booking.originalPrice, booking.bestPrice, savings, booking.bestSource, currency)}
    ${infoCard(copy.tableRows)}
    ${p(copy.action)}
    ${btn(bookingUrl, copy.cta, 'gold')}
    ${divider()}
    ${pSmall(copy.note)}
  `, copy.preheader);

  return send(to, copy.subject, html);
}

// ─── Savings confirmed ────────────────────────────────────────
export async function sendSavingsConfirmed(to, name, booking, confirmation, user = {}) {
  const lang     = detectLang(user);
  const currency = user?.currency || booking.currency || 'USD';
  const userName = esc(name) || (lang === 'pt' ? 'Viajante' : 'Traveler');
  const hotel    = esc(booking.hotelName || booking.hotel_name || '');
  const savings  = confirmation?.savings || booking.totalSavings || booking.potentialSavings || 0;

  const copy = {
    en: {
      subject: `Savings confirmed — ${fmtPrice(savings, currency)} on ${hotel}`,
      preheader: `Your savings of ${fmtPrice(savings, currency)} have been confirmed.`,
      heading: 'Savings confirmed.',
      sub: `Congratulations, ${userName}. Your savings on <strong>${hotel}</strong> have been verified and recorded.`,
      tableRows: [
        ['Hotel', hotel],
        ['Check-in', fmtDate(booking.checkinDate, lang)],
        ['Check-out', fmtDate(booking.checkoutDate, lang)],
        ...(confirmation?.notes ? [['Notes', esc(confirmation.notes)]] : []),
      ],
      cta: 'View My Bookings',
    },
    pt: {
      subject: `Economia confirmada — ${fmtPrice(savings, currency)} no ${hotel}`,
      preheader: `Sua economia de ${fmtPrice(savings, currency)} foi confirmada.`,
      heading: 'Economia confirmada.',
      sub: `Parabéns, ${userName}. Sua economia no <strong>${hotel}</strong> foi verificada e registrada.`,
      tableRows: [
        ['Hotel', hotel],
        ['Check-in', fmtDate(booking.checkinDate, lang)],
        ['Check-out', fmtDate(booking.checkoutDate, lang)],
        ...(confirmation?.notes ? [['Observações', esc(confirmation.notes)]] : []),
      ],
      cta: 'Ver Minhas Reservas',
    },
  }[lang];

  const savingsBanner = `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;border-radius:10px;overflow:hidden;">
  <tr><td style="background:${C.green600};padding:24px 32px;text-align:center;">
    <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;">${lang === 'pt' ? 'Economia confirmada' : 'Confirmed savings'}</p>
    <p style="margin:0;font-size:32px;font-weight:800;color:${C.white};letter-spacing:-1px;">${fmtPrice(savings, currency)}</p>
  </td></tr>
</table>`;

  const html = layout(copy.subject, `
    ${h1(copy.heading)}
    ${sub(copy.sub)}
    ${savingsBanner}
    ${infoCard(copy.tableRows)}
    ${btn(`${BASE_URL}/dashboard`, copy.cta)}
  `, copy.preheader);

  return send(to, copy.subject, html);
}

// ─── Password reset ───────────────────────────────────────────
export async function sendPasswordReset(to, name, resetUrl, user = {}) {
  const lang     = detectLang(user);
  const userName = esc(name) || '';

  const copy = {
    en: {
      subject: 'Reset your ResDrop password',
      preheader: 'Your password reset link — expires in 1 hour.',
      heading: 'Reset your password.',
      sub: `${userName ? `Hi ${userName}, we` : 'We'} received a request to reset the password for this ResDrop account.`,
      cta: 'Set New Password',
      fallback: "If the button doesn't work, paste this link into your browser:",
      note: 'This link expires in 1 hour. If you didn\'t request this, you can safely ignore this email — your account has not been changed.',
    },
    pt: {
      subject: 'Redefinir sua senha do ResDrop',
      preheader: 'Seu link de redefinição de senha — expira em 1 hora.',
      heading: 'Redefinir sua senha.',
      sub: `${userName ? `Olá ${userName}, recebemos` : 'Recebemos'} uma solicitação para redefinir a senha desta conta do ResDrop.`,
      cta: 'Definir Nova Senha',
      fallback: 'Se o botão não funcionar, cole este link no seu navegador:',
      note: 'Este link expira em 1 hora. Se você não solicitou isso, pode ignorar este email — sua conta não foi alterada.',
    },
  }[lang];

  const html = layout(copy.subject, `
    ${h1(copy.heading)}
    ${sub(copy.sub)}
    ${btn(resetUrl, copy.cta)}
    ${divider()}
    ${pSmall(copy.fallback)}
    <p style="margin:0 0 16px;font-size:12px;color:${C.green600};word-break:break-all;line-height:1.5;">${esc(resetUrl)}</p>
    ${pSmall(copy.note)}
  `, copy.preheader);

  return send(to, copy.subject, html);
}

// ─── Admin notification ────────────────────────────────────────
export async function sendAdminNotification(subject, body) {
  const html = layout(`Admin: ${subject}`, `
    <div style="display:inline-block;background:${C.gold};border-radius:4px;padding:4px 10px;margin-bottom:20px;">
      <p style="margin:0;font-size:10px;font-weight:800;color:${C.green900};text-transform:uppercase;letter-spacing:0.1em;">Admin Alert</p>
    </div>
    ${h1(esc(subject))}
    <div style="color:${C.text};font-size:14px;line-height:1.7;">${body}</div>
  `);
  return send(ADMIN_EMAIL, `[ResDrop Admin] ${subject}`, html);
}
