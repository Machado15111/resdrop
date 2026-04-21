import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ResDroppLanding.css';

/* ═══════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════ */

/* Original ResDrop logo mark — shield with price-drop signal */
const ResDropLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M11 8h2" />
    <path d="M12 8v1.5" />
    <path d="M8 14.5a4 4 0 0 1 8 0" />
    <line x1="7" y1="14.5" x2="17" y2="14.5" />
    <line x1="6" y1="16.5" x2="18" y2="16.5" />
  </svg>
);

const Ic = {
  Check: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  TrendDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
      <polyline points="17 18 23 18 23 12"/>
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Bookmark: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Dollar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Globe: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Mobile: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  Zap: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Layers: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Arrow: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Star: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  LockSm: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Twitter: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  Instagram: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  ),
  Linkedin: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════ */
function Nav({ scrolled, mobileOpen, setMobileOpen }) {
  return (
    <>
      <nav className={`rdp-nav${scrolled ? ' rdp-nav--scrolled' : ''}`}>
        <div className="rdp-nav__inner">
          <Link to="/" className="rdp-nav__logo">
            <span className="rdp-nav__logo-icon"><ResDropLogo size={22} /></span>
            <span className="rdp-nav__logo-text">ResDrop</span>
          </Link>

          <div className="rdp-nav__links">
            <a href="#how-it-works" className="rdp-nav__link">How it works</a>
            <a href="#features"     className="rdp-nav__link">Features</a>
            <a href="#savings"      className="rdp-nav__link">Savings</a>
            <a href="#faq"          className="rdp-nav__link">FAQ</a>
          </div>

          <div className="rdp-nav__actions">
            <Link to="/login"  className="rdp-nav__login">Log in</Link>
            <Link to="/signup" className="rdp-btn rdp-btn--primary" style={{ textDecoration: 'none' }}>
              Start Free
            </Link>
          </div>

          <button className="rdp-nav__hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div className={`rdp-nav__mobile-menu${mobileOpen ? ' rdp-nav__mobile-menu--open' : ''}`}>
        {['#how-it-works','#features','#savings','#faq'].map((href, i) => (
          <a key={href} href={href} className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>
            {['How it works','Features','Savings','FAQ'][i]}
          </a>
        ))}
        <div className="rdp-nav__mobile-divider" />
        <Link to="/login" className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>Log in</Link>
        <div className="rdp-nav__mobile-cta" style={{ marginTop: 12 }}>
          <Link to="/signup" className="rdp-btn rdp-btn--primary rdp-btn--lg"
            style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            Start Tracking Free
          </Link>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   HERO  — TripSuite-style: text left, app bleeds right
   ═══════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="rdp-hero">
      <div className="rdp-hero__wrap">

        {/* LEFT */}
        <div className="rdp-hero__left">
          <div className="rdp-hero__kicker">
            <span className="rdp-hero__kicker-dot" />
            Live rate monitoring
          </div>

          <h1 className="rdp-hero__h1">
            Booked.<br />
            Now let your<br />
            <em>rate improve.</em>
          </h1>

          <p className="rdp-hero__sub">
            ResDrop monitors your hotel reservation around the clock.
            When a lower refundable rate becomes available, we alert you
            immediately so you can rebook and keep every dollar of the difference.
          </p>

          <div className="rdp-hero__actions">
            <Link to="/signup" className="rdp-btn rdp-btn--primary rdp-btn--lg" style={{ textDecoration: 'none' }}>
              Start Tracking Free
              <span className="rdp-btn__arrow"><Ic.Arrow /></span>
            </Link>
            <a href="#how-it-works" className="rdp-btn rdp-btn--outline rdp-btn--lg">
              See how it works
            </a>
          </div>

          <div className="rdp-hero__trust">
            {['No credit card needed', 'We never rebook without you', 'Free to start'].map((t, i, arr) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="rdp-hero__trust-item">
                  <span className="rdp-hero__trust-check"><Ic.Check /></span>
                  {t}
                </div>
                {i < arr.length - 1 && <span className="rdp-hero__trust-divider" />}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — app window bleeds off screen */}
        <div className="rdp-hero__right">
          <div className="rdp-hero__app-wrap">
            <div className="rdp-hero__app">
              {/* title bar */}
              <div className="rdp-hero__app-bar">
                <span className="rdp-hero__app-bar-dot" />
                <span className="rdp-hero__app-bar-dot" />
                <span className="rdp-hero__app-bar-dot" />
              </div>

              {/* app body */}
              <div className="rdp-hero__app-body">
                {/* sidebar */}
                <aside className="rdp-hero__sidebar">
                  <div className="rdp-hero__sidebar-head">
                    <div className="rdp-hero__sidebar-brand">
                      <span className="rdp-hero__sidebar-brand-icon">
                        <ResDropLogo size={18} />
                      </span>
                      ResDrop
                    </div>
                  </div>
                  <nav className="rdp-hero__sidebar-nav">
                    {[
                      { Icon: Ic.Bookmark, label: 'My Bookings', on: true },
                      { Icon: Ic.Bell,     label: 'Alerts',      on: false },
                      { Icon: Ic.BarChart, label: 'Savings',     on: false },
                    ].map(item => (
                      <div key={item.label} className={`rdp-hero__nav-item${item.on ? ' rdp-hero__nav-item--on' : ''}`}>
                        <item.Icon />
                        {item.label}
                      </div>
                    ))}
                  </nav>
                  <div className="rdp-hero__sidebar-foot">
                    <div className="rdp-hero__avatar">S</div>
                    <span className="rdp-hero__user-name">Sofia M.</span>
                  </div>
                </aside>

                {/* main */}
                <div className="rdp-hero__main">
                  <div className="rdp-hero__main-head">
                    <span className="rdp-hero__main-title">Tracked Bookings</span>
                  </div>

                  <div className="rdp-hero__kpis">
                    {[
                      { label: 'Monitoring', value: '3' },
                      { label: 'Total Saved', value: '$412', green: true },
                      { label: 'Alerts', value: '7' },
                    ].map(k => (
                      <div className="rdp-hero__kpi" key={k.label}>
                        <div className="rdp-hero__kpi-label">{k.label}</div>
                        <div className={`rdp-hero__kpi-value${k.green ? ' rdp-hero__kpi-value--green' : ''}`}>{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Alert */}
                  <div className="rdp-hero__alert">
                    <div className="rdp-hero__alert-badge"><Ic.TrendDown /></div>
                    <div>
                      <div className="rdp-hero__alert-title">Price Drop Detected</div>
                      <div className="rdp-hero__alert-text">Park Hyatt Tokyo · Rate dropped from $478 to $389/night</div>
                    </div>
                    <button className="rdp-hero__alert-btn">Rebook</button>
                  </div>

                  {/* Booking rows */}
                  <div className="rdp-hero__rows">
                    {[
                      { hotel: 'Park Hyatt Tokyo',  dates: 'Mar 14–17', rate: '$389/nt' },
                      { hotel: 'Rosewood London',   dates: 'Apr 2–5',   rate: '$620/nt' },
                      { hotel: 'Bvlgari Hotel Milan', dates: 'Apr 19–22', rate: '$890/nt' },
                    ].map(b => (
                      <div className="rdp-hero__row" key={b.hotel}>
                        <div className="rdp-hero__row-info">
                          <div className="rdp-hero__row-hotel">{b.hotel}</div>
                          <div className="rdp-hero__row-dates">{b.dates}</div>
                        </div>
                        <div className="rdp-hero__row-right">
                          <div className="rdp-hero__row-rate">{b.rate}</div>
                          <div className="rdp-hero__row-badge">
                            <span className="rdp-hero__row-badge-dot" />
                            Monitoring
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   PLATFORMS STRIP
   ═══════════════════════════════════════════════════════ */
const platforms = [
  'Marriott','Hilton','Hyatt','IHG','Accor','Wyndham',
  'Expedia','Booking.com','Hotels.com',
];

function Platforms() {
  return (
    <div className="rdp-platforms">
      <div className="rdp-platforms__inner">
        <span className="rdp-platforms__label">Monitors rates at</span>
        <div className="rdp-platforms__sep" />
        <div className="rdp-platforms__list">
          {platforms.map(p => (
            <span className="rdp-platforms__item" key={p}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════ */
const hiwSteps = [
  {
    num: '01', Icon: Ic.Bookmark,
    title: 'Add your booking',
    text: 'Paste in your hotel name, dates, and the rate you paid. Setup takes under a minute.',
  },
  {
    num: '02', Icon: Ic.Eye,
    title: 'We monitor 24/7',
    text: 'Our system checks refundable rates around the clock, across every major platform and the hotel directly.',
  },
  {
    num: '03', Icon: Ic.Bell,
    title: 'Get alerted instantly',
    text: 'The moment a lower refundable rate appears, you receive a clear, immediate notification.',
  },
  {
    num: '04', Icon: Ic.Dollar,
    title: 'Rebook and save',
    text: 'You rebook at the new rate, cancel the original, and keep every dollar of the difference.',
  },
];

function HowItWorks() {
  return (
    <section className="rdp-hiw" id="how-it-works">
      <div className="rdp-container">
        <div className="rdp-hiw__header">
          <div className="rdp-eyebrow rdp-eyebrow--center">How it works</div>
          <h2 className="rdp-h2 rdp-h2--center">Set it once. Save indefinitely.</h2>
          <p className="rdp-body-lead rdp-body-lead--center" style={{ maxWidth: 460, margin: '0 auto' }}>
            ResDrop runs quietly in the background. You stay in full control.
            We only alert; you decide whether to act.
          </p>
        </div>
        <div className="rdp-hiw__steps">
          {hiwSteps.map(s => (
            <div className="rdp-hiw__step" key={s.num}>
              <div className="rdp-hiw__num">{s.num}</div>
              <div className="rdp-hiw__icon"><s.Icon /></div>
              <div className="rdp-hiw__title">{s.title}</div>
              <p className="rdp-hiw__text">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════════════ */
const features = [
  { Icon: Ic.Clock,    title: '24/7 rate monitoring',       text: 'Our system checks hotel rates continuously. Nights, weekends, holidays. You never have to look.' },
  { Icon: Ic.Zap,      title: 'Instant price-drop alerts',  text: 'When a better refundable rate appears, you are notified within minutes via email or in-app.', accent: true },
  { Icon: Ic.Globe,    title: 'Broad platform coverage',    text: 'We track rates at all major hotel chains, Expedia, Booking.com, Hotels.com, and the hotel directly.' },
  { Icon: Ic.Layers,   title: 'Track multiple bookings',    text: 'Monitor every upcoming reservation from one clean dashboard. No limit on the number of hotels.' },
  { Icon: Ic.BarChart, title: 'Savings overview',           text: 'A clear view of every price drop found, every alert sent, and every dollar recovered over time.' },
  { Icon: Ic.Shield,   title: 'Privacy-first design',       text: 'We monitor rates. Nothing else. No access to your loyalty accounts, payment details, or reservations.' },
  { Icon: Ic.Mobile,   title: 'Built for mobile',           text: 'Alerts and your full dashboard work perfectly on any device, anywhere in the world.' },
  { Icon: Ic.TrendDown, title: 'Refundable rates only',     text: 'We only surface rates you can actually use. No non-refundable traps. No surprises.' },
];

function Features() {
  return (
    <section className="rdp-features" id="features">
      <div className="rdp-container">
        <div className="rdp-features__header">
          <div>
            <div className="rdp-eyebrow">Features</div>
            <h2 className="rdp-h2">Every tool you need.<br />Nothing you don't.</h2>
          </div>
          <p className="rdp-body-lead" style={{ maxWidth: 360 }}>
            ResDrop is purpose-built for one thing: making sure you never pay more
            than necessary for a hotel you have already booked.
          </p>
        </div>
        <div className="rdp-features__grid">
          {features.map((f, i) => (
            <div className={`rdp-feat-card${f.accent ? ' rdp-feat-card--accent' : ''}`} key={i}>
              <div className="rdp-feat-card__icon"><f.Icon /></div>
              <h3 className="rdp-feat-card__title">{f.title}</h3>
              <p className="rdp-feat-card__text">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD SHOWCASE
   ═══════════════════════════════════════════════════════ */
function Dashboard() {
  return (
    <section className="rdp-dash">
      <div className="rdp-container">
        <div className="rdp-dash__header">
          <div className="rdp-eyebrow rdp-eyebrow--center rdp-eyebrow--inv">Dashboard</div>
          <h2 className="rdp-h2 rdp-h2--inv rdp-h2--center">Your savings, in one view</h2>
          <p className="rdp-body-lead rdp-body-lead--inv rdp-body-lead--center" style={{ maxWidth: 480, margin: '0 auto' }}>
            A clean, focused interface. No clutter. Just your bookings,
            their current rates, and every saving found.
          </p>
        </div>

        <div className="rdp-dash__browser">
          <div className="rdp-dash-bar">
            <div className="rdp-dash-bar__dots">
              <span className="rdp-dash-bar__dot" />
              <span className="rdp-dash-bar__dot" />
              <span className="rdp-dash-bar__dot" />
            </div>
            <div className="rdp-dash-bar__url">
              <Ic.LockSm /> &nbsp;app.resdrop.com/bookings
            </div>
          </div>

          <div className="rdp-full-app">
            <aside className="rdp-full-sidebar">
              <div className="rdp-full-sidebar__head">
                <div className="rdp-full-sidebar__brand">
                  <ResDropLogo size={17} />
                  ResDrop
                </div>
              </div>
              <nav className="rdp-full-sidebar__nav">
                {[
                  { Icon: Ic.Bookmark, label: 'My Bookings', on: true,  badge: null },
                  { Icon: Ic.Bell,     label: 'Alerts',      on: false, badge: '2', alert: true },
                  { Icon: Ic.Dollar,   label: 'Savings',     on: false, badge: null },
                  { Icon: Ic.Shield,   label: 'Account',     on: false, badge: null },
                ].map(item => (
                  <div key={item.label} className={`rdp-full-nav-item${item.on ? ' rdp-full-nav-item--on' : ''}`}>
                    <item.Icon />
                    {item.label}
                    {item.badge && (
                      <span className={`rdp-full-badge${item.alert ? ' rdp-full-badge--alert' : ''}`}>{item.badge}</span>
                    )}
                  </div>
                ))}
              </nav>
            </aside>

            <div className="rdp-full-main">
              <div className="rdp-full-main__top">
                <div className="rdp-full-main__title">My Bookings</div>
                <button className="rdp-full-main__add"><Ic.Plus /> Add booking</button>
              </div>

              <div className="rdp-full-kpis">
                {[
                  { label: 'Tracked',    val: '4',    sub: 'Active reservations' },
                  { label: 'Monitoring', val: '3',    sub: 'Checking now' },
                  { label: 'Total Saved', val: '$412', sub: 'All time', green: true },
                  { label: 'Alerts Sent', val: '9',   sub: 'Past 90 days' },
                ].map(k => (
                  <div className="rdp-full-kpi" key={k.label}>
                    <div className="rdp-full-kpi__label">{k.label}</div>
                    <div className={`rdp-full-kpi__val${k.green ? ' rdp-full-kpi__val--green' : ''}`}>{k.val}</div>
                    <div className="rdp-full-kpi__sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              <div className="rdp-full-alert">
                <div className="rdp-full-alert__icon"><Ic.TrendDown /></div>
                <div className="rdp-full-alert__msg">
                  Price drop found on Park Hyatt Tokyo <span>· $89/night less than your current booking.</span>
                </div>
                <button className="rdp-full-alert__cta">View &amp; Rebook</button>
              </div>

              <div className="rdp-full-table-head">
                <span>Hotel</span>
                <span>Dates</span>
                <span>Rate/night</span>
                <span>Saved</span>
                <span>Status</span>
              </div>

              <div className="rdp-full-rows">
                {[
                  { name: 'Park Hyatt Tokyo',    loc: 'Tokyo, Japan',   bg: '#1A3A2E', init: 'PH', dates: 'Mar 14–17', rate: '$389', saved: '$267', status: 'Drop found', blue: true },
                  { name: 'Rosewood London',     loc: 'London, UK',     bg: '#2B3D34', init: 'RL', dates: 'Apr 2–5',   rate: '$620', saved: '—',    status: 'Monitoring' },
                  { name: 'Bvlgari Hotel Milan', loc: 'Milan, Italy',   bg: '#2D4A3E', init: 'BV', dates: 'Apr 19–22', rate: '$890', saved: '—',    status: 'Monitoring' },
                  { name: 'Aman Tokyo',          loc: 'Tokyo, Japan',   bg: '#1B3D2D', init: 'AT', dates: 'May 5–8',   rate: '$1,140', saved: '$145', status: 'Saved', blue: true },
                ].map(b => (
                  <div className="rdp-full-row" key={b.name}>
                    <div className="rdp-full-row__hotel">
                      <div className="rdp-full-row__thumb" style={{ background: b.bg }}>{b.init}</div>
                      <div>
                        <div className="rdp-full-row__name">{b.name}</div>
                        <div className="rdp-full-row__loc">{b.loc}</div>
                      </div>
                    </div>
                    <div className="rdp-full-row__dates">{b.dates}</div>
                    <div className="rdp-full-row__rate">{b.rate}</div>
                    <div className="rdp-full-row__saved">{b.saved}</div>
                    <div className={`rdp-full-row__status${b.blue ? ' rdp-full-row__status--saved' : ' rdp-full-row__status--active'}`}>
                      <span className="rdp-full-row__status-dot" />
                      {b.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SAVINGS EXAMPLES  — large, photography-led cards
   Note on images: Unsplash photos selected for each hotel's
   visual identity. onError falls back to branded color block.
   ═══════════════════════════════════════════════════════ */
const savingsData = [
  {
    hotel:    'Park Hyatt Tokyo',
    location: 'Tokyo, Japan',
    room:     'Park Room, City View',
    old: '$478', new_: '$389', nights: 3, saved: '$267',
    // Tokyo city skyline from a luxury high-rise — fits Park Hyatt's iconic views
    img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=700&q=80',
    bg: '#1A3A2E',
  },
  {
    hotel:    'Rosewood London',
    location: 'London, United Kingdom',
    room:     'Deluxe Room, Garden View',
    old: '$680', new_: '$595', nights: 4, saved: '$340',
    // Classic elegant hotel interior — European luxury
    img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700&q=80',
    bg: '#2B3D34',
  },
  {
    hotel:    'Bvlgari Hotel Milan',
    location: 'Milan, Italy',
    room:     'Junior Suite',
    old: '$990', new_: '$780', nights: 3, saved: '$630',
    // Contemporary Italian luxury suite
    img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=700&q=80',
    bg: '#2D4A3E',
  },
];

function Savings() {
  return (
    <section className="rdp-savings" id="savings">
      <div className="rdp-container">
        <div className="rdp-savings__header">
          <div>
            <div className="rdp-eyebrow">Real savings</div>
            <h2 className="rdp-h2">What ResDrop finds for you</h2>
          </div>
          <p className="rdp-body-lead" style={{ maxWidth: 300 }}>
            These are the types of rate improvements our users act on every week.
          </p>
        </div>

        <div className="rdp-savings__grid">
          {savingsData.map(s => (
            <div className="rdp-save-card" key={s.hotel}>
              <div className="rdp-save-card__img-wrap">
                <img
                  src={s.img}
                  alt={s.hotel}
                  className="rdp-save-card__img"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
                <div className="rdp-save-card__img-fallback" style={{ background: s.bg, display: 'none' }}>
                  {s.hotel}
                </div>
                <div className="rdp-save-card__badge">
                  <span className="rdp-save-card__badge-dot" />
                  Price Drop Found
                </div>
                <div className="rdp-save-card__photo-savings">
                  <div className="rdp-save-card__photo-amt">{s.saved}</div>
                  <div className="rdp-save-card__photo-label">saved</div>
                </div>
              </div>
              <div className="rdp-save-card__body">
                <div className="rdp-save-card__hotel">{s.hotel}</div>
                <div className="rdp-save-card__location">{s.location} · {s.room}</div>
                <div className="rdp-save-card__rates">
                  <div className="rdp-save-card__rate-col">
                    <div className="rdp-save-card__rate-label">Was</div>
                    <div className="rdp-save-card__rate-val rdp-save-card__rate-val--old">{s.old}</div>
                  </div>
                  <div className="rdp-save-card__arrow">→</div>
                  <div className="rdp-save-card__rate-col">
                    <div className="rdp-save-card__rate-label">Now</div>
                    <div className="rdp-save-card__rate-val rdp-save-card__rate-val--new">{s.new_}</div>
                  </div>
                </div>
                <div className="rdp-save-card__footer">
                  <span className="rdp-save-card__nights">{s.nights} nights</span>
                  <span className="rdp-save-card__total">
                    <span className="rdp-save-card__total-label">Saved</span>
                    {s.saved}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   BENEFITS
   ═══════════════════════════════════════════════════════ */
const benefits = [
  { Icon: Ic.Clock,    title: 'Stop checking manually',          text: 'The average traveler checks hotel prices 4 to 6 times after booking. ResDrop does that for you, accurately and without interruption.' },
  { Icon: Ic.Shield,   title: 'No change without your approval', text: 'We never touch your reservation. Every action is your choice. You receive an alert; you decide whether to rebook.' },
  { Icon: Ic.Dollar,   title: 'Recover money already committed', text: 'Most travelers never know a lower rate was available. ResDrop closes that gap automatically.' },
  { Icon: Ic.TrendDown, title: 'Refundable rates only, always',  text: 'We only surface rates with a clear cancellation window. No non-refundable traps. No bad surprises.' },
];

function Benefits() {
  return (
    <section className="rdp-benefits">
      <div className="rdp-container">
        <div className="rdp-benefits__grid">
          <div className="rdp-benefits__visual">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"
              alt="Luxury hotel pool"
              className="rdp-benefits__photo"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <div className="rdp-benefits__photo-fallback" style={{ display: 'none' }} />
            <div className="rdp-benefits__stat">
              <div className="rdp-benefits__stat-num">$412</div>
              <div className="rdp-benefits__stat-text">average saved per traveler<br />in the first 3 months</div>
            </div>
          </div>

          <div>
            <div className="rdp-eyebrow">Why it matters</div>
            <h2 className="rdp-h2">
              The price you paid<br />
              may not be the best<br />
              price available.
            </h2>
            <p className="rdp-body-lead">
              Hotel rates fluctuate constantly. Rooms you booked last month
              may now be available at a significantly lower rate, and most
              travelers never find out.
            </p>
            <div className="rdp-benefits__list">
              {benefits.map((b, i) => (
                <div className="rdp-benefits__item" key={i}>
                  <div className="rdp-benefits__item-icon"><b.Icon /></div>
                  <div>
                    <div className="rdp-benefits__item-title">{b.title}</div>
                    <p className="rdp-benefits__item-text">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   LIFESTYLE
   ═══════════════════════════════════════════════════════ */
function Lifestyle() {
  return (
    <section className="rdp-lifestyle">
      <div className="rdp-container">
        <div className="rdp-lifestyle__header">
          <div className="rdp-eyebrow">For travelers who expect more</div>
          <h2 className="rdp-h2">Travel thoughtfully.<br />Spend deliberately.</h2>
          <p className="rdp-body-lead">
            ResDrop was designed for people who take the quality of their
            travel seriously and who understand that paying more than
            necessary is simply unnecessary.
          </p>
        </div>

        <div className="rdp-lifestyle__grid">
          <img
            src="https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80"
            alt="Luxury hotel suite"
            className="rdp-lifestyle__main"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <div className="rdp-lifestyle__main-fallback" style={{ display: 'none' }} />

          <div className="rdp-lifestyle__right">
            <img
              src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=700&q=80"
              alt="Hotel interior"
              className="rdp-lifestyle__sub"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <div className="rdp-lifestyle__sub-fallback" style={{ display: 'none' }} />

            <div className="rdp-lifestyle__pull">
              <div className="rdp-lifestyle__quote">
                "The best tools are the ones you forget are running, until they save you money."
              </div>
              <div className="rdp-lifestyle__attr">The ResDrop promise</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════════ */
const testimonials = [
  {
    quote: 'We saved over $600 on our Rome trip. The alert came in while we were sleeping. By morning we had already rebooked at the lower rate.',
    name: 'Catherine V.', meta: 'Frequent leisure traveler',
    initials: 'CV', color: '#1A3A2E', saved: '$608',
  },
  {
    quote: 'I travel every week for work and book refundable rates out of habit. ResDrop has found drops I never would have caught on my own.',
    name: 'James O.', meta: 'Business traveler · 80+ nights/year',
    initials: 'JO', color: '#2B5E48', saved: '$1,240',
  },
  {
    quote: 'Elegant, quiet, and genuinely useful. It doesn\'t feel like a deal site. It feels like something built for people who care about their travel.',
    name: 'Sophie M.', meta: 'Luxury travel planner',
    initials: 'SM', color: '#2D4A3E', saved: '$880',
  },
];

function Testimonials() {
  return (
    <section className="rdp-testimonials">
      <div className="rdp-container">
        <div className="rdp-testimonials__header">
          <div className="rdp-eyebrow rdp-eyebrow--center">Traveler stories</div>
          <h2 className="rdp-h2 rdp-h2--center">What our users say</h2>
        </div>
        <div className="rdp-testimonials__grid">
          {testimonials.map(t => (
            <div className="rdp-testimonial" key={t.name}>
              <div className="rdp-testimonial__stars">
                {[...Array(5)].map((_, i) => <Ic.Star key={i} />)}
              </div>
              <div className="rdp-testimonial__quote">"{t.quote}"</div>
              <div className="rdp-testimonial__footer">
                <div className="rdp-testimonial__avatar" style={{ background: t.color }}>{t.initials}</div>
                <div>
                  <div className="rdp-testimonial__name">{t.name}</div>
                  <div className="rdp-testimonial__meta">{t.meta}</div>
                </div>
                <div className="rdp-testimonial__saved">
                  <div className="rdp-testimonial__saved-amt">{t.saved}</div>
                  <div className="rdp-testimonial__saved-label">saved</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════ */
const faqItems = [
  { q: 'How does price monitoring actually work?', a: 'Once you add a booking, ResDrop checks the hotel\'s refundable rates at regular intervals, day and night. We compare the current rate to what you paid and alert you the moment it drops below your booking price.' },
  { q: 'When do I receive a notification?', a: 'You are notified as soon as we detect a lower refundable rate for your reservation. Alerts arrive by email and in-app if you are logged in. We send them promptly so you have time to act before availability changes.' },
  { q: 'Do you cancel or rebook my reservation automatically?', a: 'Never. ResDrop only monitors and alerts. Every decision belongs to you. When you receive an alert, you can choose to rebook at the new rate or do nothing at all.' },
  { q: 'Can I track more than one booking at a time?', a: 'Yes. You can track as many upcoming reservations as you like. Each is monitored independently and alerts are specific to each booking.' },
  { q: 'Which platforms and hotels are supported?', a: 'We monitor rates across all major chains including Marriott, Hilton, Hyatt, IHG, Accor, and Wyndham, as well as Expedia, Booking.com, Hotels.com, and the hotel websites directly.' },
  { q: 'Does it work for international bookings?', a: 'Yes. ResDrop handles multi-currency monitoring and works for hotel bookings worldwide.' },
  { q: 'How quickly can I get started?', a: 'Under two minutes. Create a free account, enter your booking details, and ResDrop begins monitoring immediately.' },
];

function Faq() {
  const [open, setOpen] = useState(null);
  return (
    <section className="rdp-faq" id="faq">
      <div className="rdp-container">
        <div className="rdp-faq__inner">
          <div className="rdp-faq__header">
            <div className="rdp-eyebrow">FAQ</div>
            <h2 className="rdp-h2">Questions answered</h2>
            <p className="rdp-body-lead">Everything you need to know before you start.</p>
          </div>
          <div className="rdp-faq__list">
            {faqItems.map((item, i) => (
              <div className={`rdp-faq__item${open === i ? ' rdp-faq__item--open' : ''}`} key={i}>
                <button className="rdp-faq__q" onClick={() => setOpen(open === i ? null : i)}>
                  {item.q}
                  <span className="rdp-faq__icon"><Ic.Plus /></span>
                </button>
                <div className="rdp-faq__a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════ */
function Cta() {
  return (
    <section className="rdp-cta">
      <div className="rdp-cta__inner">
        <div className="rdp-cta__serif">The smarter way to book</div>
        <h2 className="rdp-cta__h2">Your next hotel<br />might already be cheaper.</h2>
        <p className="rdp-cta__sub">
          Add your booking in under two minutes. ResDrop does the rest.
          You only pay attention when there is money to save.
        </p>
        <div className="rdp-cta__actions">
          <Link to="/signup" className="rdp-btn rdp-btn--inv-primary rdp-btn--lg" style={{ textDecoration: 'none' }}>
            Start Tracking Free
            <span className="rdp-btn__arrow"><Ic.Arrow /></span>
          </Link>
          <Link to="/login" className="rdp-btn rdp-btn--inv-outline rdp-btn--lg" style={{ textDecoration: 'none' }}>
            Log in
          </Link>
        </div>
        <p className="rdp-cta__micro">No credit card required · Set up in 2 minutes · Cancel anytime</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="rdp-footer">
      <div className="rdp-footer__top">
        <div>
          <Link to="/" className="rdp-footer__logo">
            <span className="rdp-footer__logo-icon"><ResDropLogo size={20} /></span>
            <span className="rdp-footer__logo-text">ResDrop</span>
          </Link>
          <p className="rdp-footer__desc">
            Hotel rate intelligence for travelers who prefer to keep their savings,
            not leave them on the table.
          </p>
          <div className="rdp-footer__social">
            <a href="#" className="rdp-footer__social-a" aria-label="Twitter"><Ic.Twitter /></a>
            <a href="#" className="rdp-footer__social-a" aria-label="Instagram"><Ic.Instagram /></a>
            <a href="#" className="rdp-footer__social-a" aria-label="LinkedIn"><Ic.Linkedin /></a>
          </div>
        </div>

        <div>
          <div className="rdp-footer__col-title">Product</div>
          <div className="rdp-footer__links">
            <a href="#how-it-works" className="rdp-footer__link">How it works</a>
            <a href="#features"     className="rdp-footer__link">Features</a>
            <a href="#savings"      className="rdp-footer__link">Savings examples</a>
            <a href="#faq"          className="rdp-footer__link">FAQ</a>
            <Link to="/signup"      className="rdp-footer__link">Start free</Link>
          </div>
        </div>

        <div>
          <div className="rdp-footer__col-title">Company</div>
          <div className="rdp-footer__links">
            <Link to="/about"   className="rdp-footer__link">About</Link>
            <a href="mailto:hello@resdrop.com" className="rdp-footer__link">Contact</a>
            <Link to="/privacy" className="rdp-footer__link">Privacy Policy</Link>
            <Link to="/terms"   className="rdp-footer__link">Terms of Service</Link>
          </div>
        </div>

        <div>
          <div className="rdp-footer__col-title">Account</div>
          <div className="rdp-footer__links">
            <Link to="/login"      className="rdp-footer__link">Log in</Link>
            <Link to="/signup"     className="rdp-footer__link">Create account</Link>
            <Link to="/dashboard"  className="rdp-footer__link">Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="rdp-footer__bottom">
        <span className="rdp-footer__copy">&copy; {new Date().getFullYear()} ResDrop. All rights reserved.</span>
        <div className="rdp-footer__legal">
          <Link to="/privacy" className="rdp-footer__legal-link">Privacy</Link>
          <Link to="/terms"   className="rdp-footer__legal-link">Terms</Link>
          <a href="mailto:hello@resdrop.com" className="rdp-footer__legal-link">Contact</a>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════ */
export default function ResDroppLanding() {
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="rdp">
      <Nav scrolled={scrolled} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main>
        <Hero />
        <Platforms />
        <HowItWorks />
        <Features />
        <Dashboard />
        <Savings />
        <Benefits />
        <Lifestyle />
        <Testimonials />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
