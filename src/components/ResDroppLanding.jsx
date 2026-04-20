import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ResDroppLanding.css';

/* ═══════════════════════════════════════════════════════
   INLINE SVG ICONS — clean, custom, no library needed
   ═══════════════════════════════════════════════════════ */
const Ic = {
  Bell: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  TrendDown: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
      <polyline points="17 18 23 18 23 12"/>
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Mobile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  Eye: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Zap: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Lock: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Globe: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Clock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Twitter: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  Instagram: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  ),
  Linkedin: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  ),
  Bookmark: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  DollarSign: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Layers: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  LogoMark: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M12 2L4 7v10l8 5 8-5V7L12 2zm0 2.5L18 8v8l-6 3.75L6 16V8l6-3.5z"/>
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════ */
function RdpNav({ scrolled, mobileOpen, setMobileOpen }) {
  return (
    <>
      <nav className={`rdp-nav ${scrolled ? 'rdp-nav--scrolled' : ''}`}>
        <div className="rdp-nav__inner">
          <Link to="/" className="rdp-nav__logo">
            <div className="rdp-nav__logo-mark">
              <Ic.LogoMark />
            </div>
            <span className="rdp-nav__logo-wordmark">ResDropp</span>
          </Link>

          <div className="rdp-nav__links">
            <a href="#how-it-works" className="rdp-nav__link">How it works</a>
            <a href="#features" className="rdp-nav__link">Features</a>
            <a href="#savings" className="rdp-nav__link">Savings</a>
            <a href="#faq" className="rdp-nav__link">FAQ</a>
          </div>

          <div className="rdp-nav__actions">
            <Link to="/login" className="rdp-nav__login">Log in</Link>
            <Link to="/signup" className="rdp-btn rdp-btn--primary" style={{ textDecoration: 'none' }}>
              Start Free
            </Link>
          </div>

          <button
            className="rdp-nav__hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className={`rdp-nav__mobile-menu ${mobileOpen ? 'rdp-nav__mobile-menu--open' : ''}`}>
        <a href="#how-it-works" className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>How it works</a>
        <a href="#features" className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>Features</a>
        <a href="#savings" className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>Savings</a>
        <a href="#faq" className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>FAQ</a>
        <div className="rdp-nav__mobile-divider" />
        <Link to="/login" className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>Log in</Link>
        <div className="rdp-nav__mobile-cta">
          <Link to="/signup" className="rdp-btn rdp-btn--primary rdp-btn--lg" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            Start Tracking Free
          </Link>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════ */
function RdpHero() {
  return (
    <section className="rdp-hero">
      <div className="rdp-hero__inner">
        {/* ── LEFT ── */}
        <div className="rdp-hero__left">
          <div className="rdp-hero__tag">
            <span className="rdp-hero__tag-dot" />
            Hotel Rate Intelligence
          </div>

          <h1 className="rdp-hero__h1">
            Book first.<br />
            Save if the<br />
            <em>price drops.</em>
          </h1>

          <p className="rdp-hero__sub">
            ResDropp monitors your hotel reservations around the clock.
            When a better refundable rate becomes available, we notify you —
            so you can rebook and keep the difference.
          </p>

          <div className="rdp-hero__actions">
            <Link
              to="/signup"
              className="rdp-btn rdp-btn--primary rdp-btn--lg"
              style={{ textDecoration: 'none' }}
            >
              Start Tracking Free
              <span className="rdp-btn__arrow"><Ic.ArrowRight /></span>
            </Link>
            <a href="#how-it-works" className="rdp-btn rdp-btn--outline rdp-btn--lg">
              See how it works
            </a>
          </div>

          <div className="rdp-hero__trust">
            <div className="rdp-hero__trust-item">
              <span className="rdp-hero__trust-icon"><Ic.Check /></span>
              No credit card needed
            </div>
            <div className="rdp-hero__trust-divider" />
            <div className="rdp-hero__trust-item">
              <span className="rdp-hero__trust-icon"><Ic.Check /></span>
              We never rebook without you
            </div>
            <div className="rdp-hero__trust-divider" />
            <div className="rdp-hero__trust-item">
              <span className="rdp-hero__trust-icon"><Ic.Check /></span>
              Free to start
            </div>
          </div>
        </div>

        {/* ── RIGHT: App Screen ── */}
        <div className="rdp-hero__right">
          <div className="rdp-hero__visual">
            <div className="rdp-hero__screen">
              {/* Browser chrome */}
              <div className="rdp-screen-bar">
                <div className="rdp-screen-bar__dots">
                  <span className="rdp-screen-bar__dot" />
                  <span className="rdp-screen-bar__dot" />
                  <span className="rdp-screen-bar__dot" />
                </div>
                <div className="rdp-screen-bar__url">
                  <span className="rdp-screen-bar__url-lock"><Ic.Lock /></span>
                  app.resdropp.com
                </div>
              </div>

              {/* App layout */}
              <div className="rdp-app">
                <aside className="rdp-app__sidebar">
                  <div className="rdp-app__sidebar-logo">
                    <div className="rdp-app__sidebar-logo-mark">
                      <Ic.LogoMark />
                    </div>
                    <span className="rdp-app__sidebar-logo-text">ResDropp</span>
                  </div>

                  <nav className="rdp-app__sidebar-nav">
                    <div className="rdp-app__nav-item rdp-app__nav-item--active">
                      <Ic.Bookmark />
                      My Bookings
                    </div>
                    <div className="rdp-app__nav-item">
                      <Ic.Bell />
                      Alerts
                    </div>
                    <div className="rdp-app__nav-item">
                      <Ic.BarChart />
                      Savings
                    </div>
                  </nav>

                  <div className="rdp-app__sidebar-bottom">
                    <div className="rdp-app__user">
                      <div className="rdp-app__avatar">S</div>
                      <span className="rdp-app__user-name">Sofia M.</span>
                    </div>
                  </div>
                </aside>

                <div className="rdp-app__main">
                  <div className="rdp-app__header">
                    <span className="rdp-app__title">Tracked Bookings</span>
                  </div>

                  <div className="rdp-app__stats">
                    <div className="rdp-app__stat">
                      <div className="rdp-app__stat-label">Monitoring</div>
                      <div className="rdp-app__stat-value">3</div>
                    </div>
                    <div className="rdp-app__stat">
                      <div className="rdp-app__stat-label">Total Saved</div>
                      <div className="rdp-app__stat-value rdp-app__stat-value--green">$412</div>
                    </div>
                    <div className="rdp-app__stat">
                      <div className="rdp-app__stat-label">Alerts Sent</div>
                      <div className="rdp-app__stat-value">7</div>
                    </div>
                  </div>

                  {/* Price drop alert */}
                  <div className="rdp-app__alert">
                    <div className="rdp-app__alert-icon">
                      <Ic.TrendDown />
                    </div>
                    <div className="rdp-app__alert-body">
                      <div className="rdp-app__alert-title">Price Drop Detected</div>
                      <div className="rdp-app__alert-text">
                        Park Hyatt Tokyo · Rate dropped from $478 → $389/night
                      </div>
                    </div>
                    <button className="rdp-app__alert-action">Rebook</button>
                  </div>

                  {/* Booking cards */}
                  <div className="rdp-app__bookings">
                    {[
                      { hotel: 'Park Hyatt Tokyo', dates: 'Mar 14 – 17', rate: '$389/nt', status: 'Drop found' },
                      { hotel: 'Rosewood London', dates: 'Apr 2 – 5', rate: '$620/nt', status: 'Monitoring' },
                      { hotel: 'Bvlgari Milan', dates: 'Apr 19 – 22', rate: '$890/nt', status: 'Monitoring' },
                    ].map((b, i) => (
                      <div className="rdp-app__booking" key={i}>
                        <div className="rdp-app__booking-info">
                          <div className="rdp-app__booking-hotel">{b.hotel}</div>
                          <div className="rdp-app__booking-dates">{b.dates}</div>
                        </div>
                        <div className="rdp-app__booking-right">
                          <div className="rdp-app__booking-rate">{b.rate}</div>
                          <div className={`rdp-app__booking-badge rdp-app__booking-badge--monitoring`}>
                            <span className="rdp-app__booking-badge--dot" />
                            {b.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating notification */}
            <div className="rdp-hero__float-notif">
              <div className="rdp-hero__float-notif-header">
                <span className="rdp-hero__float-notif-dot" />
                <span className="rdp-hero__float-notif-label">Price Drop Alert</span>
              </div>
              <div className="rdp-hero__float-notif-hotel">Aman Tokyo</div>
              <div className="rdp-hero__float-notif-detail">Rate reduced · 2 nights available</div>
              <div className="rdp-hero__float-notif-saving">
                <div className="rdp-hero__float-notif-amt">$178</div>
                <div className="rdp-hero__float-notif-saved">potential<br />savings</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   LOGOS / TRUST STRIP
   ═══════════════════════════════════════════════════════ */
function RdpLogos() {
  const chains = ['Marriott', 'Hilton', 'Hyatt', 'IHG', 'Accor', 'Wyndham'];
  return (
    <div className="rdp-logos">
      <div className="rdp-logos__inner">
        <span className="rdp-logos__label">Monitors rates at</span>
        <div className="rdp-logos__divider" />
        <div className="rdp-logos__grid">
          {chains.map(c => (
            <span className="rdp-logos__item" key={c}>{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════ */
const HiwSteps = [
  {
    num: '01',
    Icon: Ic.Bookmark,
    title: 'Add your booking',
    text: 'Paste in your confirmation details — hotel name, dates, and the rate you paid. Takes under a minute.',
  },
  {
    num: '02',
    Icon: Ic.Eye,
    title: 'We monitor 24/7',
    text: 'Our system checks the hotel\'s refundable rate around the clock, across every available channel.',
  },
  {
    num: '03',
    Icon: Ic.Bell,
    title: 'Get alerted instantly',
    text: 'The moment a lower refundable rate appears, you receive a clear, immediate notification.',
  },
  {
    num: '04',
    Icon: Ic.DollarSign,
    title: 'Rebook and save',
    text: 'You rebook directly at the new rate, cancel the original, and keep every dollar of the difference.',
  },
];

function RdpHowItWorks() {
  return (
    <section className="rdp-hiw" id="how-it-works">
      <div className="rdp-container">
        <div className="rdp-hiw__header">
          <div className="rdp-eyebrow rdp-eyebrow--center">How it works</div>
          <h2 className="rdp-h2 rdp-h2--center">Set it once. Save indefinitely.</h2>
          <p className="rdp-body-lead rdp-body-lead--center" style={{ maxWidth: 480, margin: '0 auto' }}>
            ResDropp runs quietly in the background. You stay in full control — we
            only alert; you decide whether to act.
          </p>
        </div>

        <div className="rdp-hiw__steps">
          {HiwSteps.map((step) => (
            <div className="rdp-hiw__step" key={step.num}>
              <div className="rdp-hiw__step-num">{step.num}</div>
              <div className="rdp-hiw__step-icon">
                <step.Icon />
              </div>
              <div className="rdp-hiw__step-title">{step.title}</div>
              <p className="rdp-hiw__step-text">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FEATURE GRID
   ═══════════════════════════════════════════════════════ */
const features = [
  {
    Icon: Ic.Clock,
    title: '24/7 rate monitoring',
    text: 'Our system checks hotel rates continuously — nights, weekends, holidays. You never have to look.',
  },
  {
    Icon: Ic.Zap,
    title: 'Instant price-drop alerts',
    text: 'When a better refundable rate appears, you\'re notified within minutes. Via email or in-app.',
    accent: true,
  },
  {
    Icon: Ic.Globe,
    title: 'Broad hotel coverage',
    text: 'We track rates across all major chains — Marriott, Hilton, Hyatt, IHG, Accor, and more.',
  },
  {
    Icon: Ic.Layers,
    title: 'Track multiple bookings',
    text: 'Monitor every upcoming reservation from one clean dashboard. No limit on the number of hotels.',
  },
  {
    Icon: Ic.BarChart,
    title: 'Savings overview',
    text: 'A clear view of every price drop found, every alert sent, and every dollar recovered over time.',
  },
  {
    Icon: Ic.Shield,
    title: 'Privacy-first, always',
    text: 'We monitor rates — nothing else. No access to your loyalty accounts, payment details, or bookings.',
  },
  {
    Icon: Ic.Mobile,
    title: 'Built for mobile',
    text: 'Alerts and your full dashboard work perfectly on any device, anywhere in the world.',
  },
  {
    Icon: Ic.TrendDown,
    title: 'Refundable rates only',
    text: 'We only surface rates you can actually use. No non-refundable traps, no fine print surprises.',
  },
];

function RdpFeatures() {
  return (
    <section className="rdp-features" id="features">
      <div className="rdp-container">
        <div className="rdp-features__header">
          <div>
            <div className="rdp-eyebrow">Features</div>
            <h2 className="rdp-h2">
              Every tool you need.<br />Nothing you don't.
            </h2>
          </div>
          <div className="rdp-features__header-right">
            <p className="rdp-body-lead" style={{ maxWidth: 380 }}>
              ResDropp is purpose-built for one thing: making sure you never
              pay more than necessary for a hotel you've already booked.
            </p>
          </div>
        </div>

        <div className="rdp-features__grid">
          {features.map((f, i) => (
            <div
              className={`rdp-feature-card ${f.accent ? 'rdp-feature-card--accent' : ''}`}
              key={i}
            >
              <div className="rdp-feature-card__icon">
                <f.Icon />
              </div>
              <h3 className="rdp-feature-card__title">{f.title}</h3>
              <p className="rdp-feature-card__text">{f.text}</p>
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
function RdpDashboard() {
  return (
    <section className="rdp-dash">
      <div className="rdp-container">
        <div className="rdp-dash__header">
          <div className="rdp-eyebrow rdp-eyebrow--center rdp-eyebrow--inv">Dashboard</div>
          <h2 className="rdp-h2 rdp-h2--inv rdp-h2--center">Your savings, in one view</h2>
          <p className="rdp-body-lead rdp-body-lead--inv rdp-body-lead--center" style={{ maxWidth: 500, margin: '0 auto' }}>
            A clean, focused interface. No clutter. Just your bookings, their current
            rates, and every saving we've found.
          </p>
        </div>

        {/* Full-size browser mockup */}
        <div className="rdp-dash__browser">
          <div className="rdp-dash-bar">
            <div className="rdp-dash-bar__dots">
              <span className="rdp-dash-bar__dot" />
              <span className="rdp-dash-bar__dot" />
              <span className="rdp-dash-bar__dot" />
            </div>
            <div className="rdp-dash-bar__url">
              <Ic.Lock />
              &nbsp;app.resdropp.com/bookings
            </div>
          </div>

          <div className="rdp-full-app">
            {/* Sidebar */}
            <aside className="rdp-full-app__sidebar">
              <div className="rdp-full-app__sidebar-header">
                <div className="rdp-full-app__logo">ResDropp</div>
              </div>
              <nav className="rdp-full-app__sidebar-nav">
                {[
                  { label: 'My Bookings', Icon: Ic.Bookmark, active: true, badge: null },
                  { label: 'Alerts', Icon: Ic.Bell, active: false, badge: '2', alert: true },
                  { label: 'Savings', Icon: Ic.DollarSign, active: false, badge: null },
                  { label: 'Account', Icon: Ic.Shield, active: false, badge: null },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rdp-full-app__nav-item ${item.active ? 'rdp-full-app__nav-item--active' : ''}`}
                  >
                    <item.Icon />
                    {item.label}
                    {item.badge && (
                      <span className={`rdp-full-app__badge ${item.alert ? 'rdp-full-app__badge--alert' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main */}
            <div className="rdp-full-app__main">
              <div className="rdp-full-app__top">
                <div className="rdp-full-app__page-title">My Bookings</div>
                <button className="rdp-full-app__add-btn">
                  <Ic.Plus /> Add booking
                </button>
              </div>

              {/* KPIs */}
              <div className="rdp-full-app__kpis">
                {[
                  { label: 'Tracked', value: '4', sub: 'Active reservations' },
                  { label: 'Monitoring', value: '3', sub: 'Checking now' },
                  { label: 'Total Saved', value: '$412', sub: 'All time', green: true },
                  { label: 'Alerts Sent', value: '9', sub: 'Past 90 days' },
                ].map((k) => (
                  <div className="rdp-full-app__kpi" key={k.label}>
                    <div className="rdp-full-app__kpi-label">{k.label}</div>
                    <div className={`rdp-full-app__kpi-val ${k.green ? 'rdp-full-app__kpi-val--green' : ''}`}>
                      {k.value}
                    </div>
                    <div className="rdp-full-app__kpi-sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Alert banner */}
              <div className="rdp-full-app__alert-banner">
                <div className="rdp-full-app__alert-dot">
                  <Ic.TrendDown />
                </div>
                <div className="rdp-full-app__alert-msg">
                  Price drop found on Park Hyatt Tokyo —&nbsp;
                  <span>$89/night less than your current booking.</span>
                </div>
                <button className="rdp-full-app__alert-cta">View &amp; Rebook</button>
              </div>

              {/* Table header */}
              <div className="rdp-full-app__table-header">
                <span>Hotel</span>
                <span>Dates</span>
                <span>Rate / night</span>
                <span>Saved</span>
                <span>Status</span>
              </div>

              {/* Bookings */}
              <div className="rdp-full-app__bookings">
                {[
                  { name: 'Park Hyatt Tokyo', loc: 'Tokyo, Japan', thumb: '#1A3A2E', initials: 'PH', dates: 'Mar 14–17', rate: '$389', saved: '$267', status: 'Drop found', saved2: true },
                  { name: 'Rosewood London', loc: 'London, UK', thumb: '#2D4A3E', initials: 'RL', dates: 'Apr 2–5', rate: '$620', saved: '—', status: 'Monitoring', saved2: false },
                  { name: 'Bvlgari Hotel Milan', loc: 'Milan, Italy', thumb: '#3D5040', initials: 'BV', dates: 'Apr 19–22', rate: '$890', saved: '—', status: 'Monitoring', saved2: false },
                  { name: 'Aman Tokyo', loc: 'Tokyo, Japan', thumb: '#1B3D2D', initials: 'AT', dates: 'May 5–8', rate: '$1,140', saved: '$145', status: 'Saved', saved2: true },
                ].map((b) => (
                  <div className="rdp-full-app__booking" key={b.name}>
                    <div className="rdp-full-app__booking-hotel">
                      <div className="rdp-full-app__booking-thumb" style={{ background: b.thumb }}>
                        <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>{b.initials}</span>
                      </div>
                      <div className="rdp-full-app__booking-info">
                        <div className="rdp-full-app__booking-name">{b.name}</div>
                        <div className="rdp-full-app__booking-location">{b.loc}</div>
                      </div>
                    </div>
                    <div className="rdp-full-app__booking-dates">{b.dates}</div>
                    <div className="rdp-full-app__booking-rate">{b.rate}</div>
                    <div className="rdp-full-app__booking-savings">{b.saved}</div>
                    <div className={`rdp-full-app__booking-status ${b.saved2 ? 'rdp-full-app__booking-status--saved' : 'rdp-full-app__booking-status--active'}`}>
                      <span className="rdp-full-app__booking-status-dot" />
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
   SAVINGS EXAMPLES
   ═══════════════════════════════════════════════════════ */
const savingsData = [
  {
    hotel: 'Park Hyatt Tokyo',
    location: 'Tokyo, Japan',
    type: 'Park Room, City View',
    oldRate: '$478',
    newRate: '$389',
    nights: 3,
    totalSaved: '$267',
    img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
    imgBg: '#1A3A2E',
  },
  {
    hotel: 'Rosewood London',
    location: 'London, United Kingdom',
    type: 'Deluxe Room, Garden View',
    oldRate: '$680',
    newRate: '$595',
    nights: 4,
    totalSaved: '$340',
    img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
    imgBg: '#2C3E2F',
  },
  {
    hotel: 'Bvlgari Hotel Milan',
    location: 'Milan, Italy',
    type: 'Junior Suite',
    oldRate: '$990',
    newRate: '$780',
    nights: 3,
    totalSaved: '$630',
    img: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
    imgBg: '#2D4A3E',
  },
];

function RdpSavings() {
  return (
    <section className="rdp-savings" id="savings">
      <div className="rdp-container">
        <div className="rdp-savings__header">
          <div>
            <div className="rdp-eyebrow">Real savings</div>
            <h2 className="rdp-h2">What ResDropp finds for you</h2>
          </div>
          <p className="rdp-body-lead" style={{ maxWidth: 320 }}>
            These are the types of rate improvements our users act on every week.
          </p>
        </div>

        <div className="rdp-savings__grid">
          {savingsData.map((s) => (
            <div className="rdp-saving-card" key={s.hotel}>
              <img
                src={s.img}
                alt={s.hotel}
                className="rdp-saving-card__img"
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
              />
              <div
                className="rdp-saving-card__img"
                style={{ background: s.imgBg, display: 'none', color: 'white', alignItems: 'center', justifyContent: 'center', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18 }}
              >
                {s.hotel}
              </div>

              <div className="rdp-saving-card__body">
                <div className="rdp-saving-card__chip">
                  Price Drop Found
                </div>
                <div className="rdp-saving-card__hotel">{s.hotel}</div>
                <div className="rdp-saving-card__location">{s.location} · {s.type}</div>

                <div className="rdp-saving-card__rates">
                  <div className="rdp-saving-card__rate-block">
                    <div className="rdp-saving-card__rate-label">Was</div>
                    <div className="rdp-saving-card__rate-val rdp-saving-card__rate-val--old">{s.oldRate}</div>
                  </div>
                  <div className="rdp-saving-card__arrow">→</div>
                  <div className="rdp-saving-card__rate-block">
                    <div className="rdp-saving-card__rate-label">Now</div>
                    <div className="rdp-saving-card__rate-val rdp-saving-card__rate-val--new">{s.newRate}</div>
                  </div>
                </div>

                <div className="rdp-saving-card__footer">
                  <span className="rdp-saving-card__nights">{s.nights} nights</span>
                  <span className="rdp-saving-card__total">
                    <span className="rdp-saving-card__total-label">Saved</span>
                    {s.totalSaved}
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
  {
    Icon: Ic.Clock,
    title: 'Stop checking manually',
    text: 'The average traveler checks hotel prices 4–6 times after booking. ResDropp does that for you — accurately and silently.',
  },
  {
    Icon: Ic.Shield,
    title: 'No risk, no change without you',
    text: 'We never modify your reservation. Every action is your choice. You receive an alert; you decide whether to rebook.',
  },
  {
    Icon: Ic.DollarSign,
    title: 'Recover money already spent',
    text: 'Most travelers simply don\'t know a lower rate was available. ResDropp closes that gap — automatically.',
  },
  {
    Icon: Ic.TrendDown,
    title: 'Refundable rates only, always',
    text: 'We only surface rates with a clear cancellation window. Never a non-refundable trap. Never a bad surprise.',
  },
];

function RdpBenefits() {
  return (
    <section className="rdp-benefits">
      <div className="rdp-container">
        <div className="rdp-benefits__inner">
          {/* Visual */}
          <div className="rdp-benefits__visual">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"
              alt="Premium hotel interior"
              className="rdp-benefits__photo"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <div className="rdp-benefits__photo-bg" style={{ display: 'none' }} />

            <div className="rdp-benefits__stat-card">
              <div className="rdp-benefits__stat-num">$412</div>
              <div className="rdp-benefits__stat-text">average saved per traveler<br />in the first 3 months</div>
            </div>
          </div>

          {/* Content */}
          <div className="rdp-benefits__content">
            <div className="rdp-eyebrow">Why it matters</div>
            <h2 className="rdp-h2">
              The price you paid<br />
              may not be the best<br />
              price available.
            </h2>
            <p className="rdp-body-lead">
              Hotel rates fluctuate constantly. Rooms you booked last month
              may now be available at a significantly lower rate — and most
              travelers never find out.
            </p>

            <div className="rdp-benefits__list">
              {benefits.map((b, i) => (
                <div className="rdp-benefits__item" key={i}>
                  <div className="rdp-benefits__item-icon">
                    <b.Icon />
                  </div>
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
   LIFESTYLE / PHOTOGRAPHY
   ═══════════════════════════════════════════════════════ */
function RdpLifestyle() {
  return (
    <section className="rdp-lifestyle">
      <div className="rdp-container">
        <div style={{ maxWidth: 620 }}>
          <div className="rdp-eyebrow">For travelers who expect more</div>
          <h2 className="rdp-h2">
            Travel thoughtfully.<br />
            Spend deliberately.
          </h2>
          <p className="rdp-body-lead">
            ResDropp was designed for people who take the quality of their travel
            seriously — and who understand that paying more than necessary is
            simply unnecessary.
          </p>
        </div>

        <div className="rdp-lifestyle__grid">
          <img
            src="https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80"
            alt="Luxury hotel suite"
            className="rdp-lifestyle__main-img"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <div className="rdp-lifestyle__main-bg" style={{ display: 'none' }} />

          <div className="rdp-lifestyle__right">
            <img
              src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=700&q=80"
              alt="Hotel lobby"
              className="rdp-lifestyle__sub-img"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <div className="rdp-lifestyle__sub-bg" style={{ display: 'none' }} />

            <div className="rdp-lifestyle__pull">
              <div className="rdp-lifestyle__pull-quote">
                "The best tools are the ones you forget are running — until they save you money."
              </div>
              <div className="rdp-lifestyle__pull-attr">The ResDropp promise</div>
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
    quote: 'We saved over $600 on our Rome trip. The alert came in while we were sleeping — by the time we woke up, we had already rebooked at the lower rate.',
    name: 'Catherine V.',
    meta: 'Frequent leisure traveler',
    initials: 'CV',
    color: '#1A3A2E',
    saved: '$608',
  },
  {
    quote: 'I travel every week for work and book refundable rates out of habit. ResDropp has found drops I never would have caught on my own.',
    name: 'James O.',
    meta: 'Business traveler · 80+ nights/year',
    initials: 'JO',
    color: '#2C5F4A',
    saved: '$1,240',
  },
  {
    quote: 'Elegant, quiet, and genuinely useful. It doesn\'t feel like a deal site. It feels like something built for people who care about their travel.',
    name: 'Sophie M.',
    meta: 'Luxury travel planner',
    initials: 'SM',
    color: '#2D4A3E',
    saved: '$880',
  },
];

function RdpTestimonials() {
  return (
    <section className="rdp-testimonials">
      <div className="rdp-container">
        <div className="rdp-testimonials__header">
          <div className="rdp-eyebrow rdp-eyebrow--center">Traveler stories</div>
          <h2 className="rdp-h2 rdp-h2--center">What our users say</h2>
        </div>

        <div className="rdp-testimonials__grid">
          {testimonials.map((t) => (
            <div className="rdp-testimonial" key={t.name}>
              <div className="rdp-testimonial__stars">
                {[...Array(5)].map((_, i) => <Ic.Star key={i} />)}
              </div>
              <div className="rdp-testimonial__quote">"{t.quote}"</div>
              <div className="rdp-testimonial__footer">
                <div className="rdp-testimonial__avatar" style={{ background: t.color }}>
                  {t.initials}
                </div>
                <div>
                  <div className="rdp-testimonial__name">{t.name}</div>
                  <div className="rdp-testimonial__meta">{t.meta}</div>
                </div>
                <div className="rdp-testimonial__saving">
                  <div className="rdp-testimonial__saving-amt">{t.saved}</div>
                  <div className="rdp-testimonial__saving-label">saved</div>
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
const faqData = [
  {
    q: 'How does price monitoring actually work?',
    a: 'Once you add a booking, ResDropp checks the hotel\'s refundable rates at regular intervals — day and night. We compare the current rate to what you paid and alert you the moment it drops below your booking price.',
  },
  {
    q: 'When do I receive a notification?',
    a: 'You\'re notified as soon as we detect a lower refundable rate for your reservation. Alerts arrive by email, and in-app if you\'re logged in. We send them promptly so you have time to act before availability changes.',
  },
  {
    q: 'Do you cancel or rebook my reservation automatically?',
    a: 'Never. ResDropp only monitors and alerts. Every decision belongs to you. When you receive an alert, you can choose to rebook at the new rate — or do nothing at all.',
  },
  {
    q: 'Can I track more than one booking at a time?',
    a: 'Yes. You can track as many upcoming reservations as you like. Each is monitored independently, and alerts are specific to each booking.',
  },
  {
    q: 'Which hotels are supported?',
    a: 'We monitor rates across all major chains and many independent properties — including Marriott, Hilton, Hyatt, IHG, Accor, and Wyndham brands. Coverage continues to expand.',
  },
  {
    q: 'Does it work for international bookings?',
    a: 'Yes. ResDropp handles multi-currency monitoring and works for hotel bookings worldwide.',
  },
  {
    q: 'How quickly can I get started?',
    a: 'Under two minutes. Create a free account, enter your booking details, and ResDropp begins monitoring immediately.',
  },
];

function RdpFaq() {
  const [open, setOpen] = useState(null);

  return (
    <section className="rdp-faq" id="faq">
      <div className="rdp-container">
        <div className="rdp-faq__inner">
          <div className="rdp-faq__header">
            <div className="rdp-eyebrow">FAQ</div>
            <h2 className="rdp-h2">Questions answered</h2>
            <p className="rdp-body-lead">
              Everything you need to know before you start.
            </p>
          </div>

          <div className="rdp-faq__list">
            {faqData.map((item, i) => (
              <div
                className={`rdp-faq__item ${open === i ? 'rdp-faq__item--open' : ''}`}
                key={i}
              >
                <button
                  className="rdp-faq__question"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {item.q}
                  <span className="rdp-faq__icon">
                    <Ic.Plus />
                  </span>
                </button>
                <div className="rdp-faq__answer">{item.a}</div>
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
function RdpCta() {
  return (
    <section className="rdp-cta">
      <div className="rdp-cta__inner">
        <div className="rdp-cta__editorial">The smarter way to book</div>
        <h2 className="rdp-cta__h2">
          Your next hotel might<br />already be cheaper.
        </h2>
        <p className="rdp-cta__sub">
          Add your booking in under two minutes. ResDropp does the rest.
          You only pay attention when there's money to save.
        </p>
        <div className="rdp-cta__actions">
          <Link
            to="/signup"
            className="rdp-btn rdp-btn--inv-primary rdp-btn--lg"
            style={{ textDecoration: 'none' }}
          >
            Start Tracking Free
            <span className="rdp-btn__arrow"><Ic.ArrowRight /></span>
          </Link>
          <Link
            to="/login"
            className="rdp-btn rdp-btn--inv-outline rdp-btn--lg"
            style={{ textDecoration: 'none' }}
          >
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
function RdpFooter() {
  return (
    <footer className="rdp-footer">
      <div className="rdp-footer__top">
        {/* Brand */}
        <div className="rdp-footer__brand">
          <Link to="/" className="rdp-footer__logo">
            <div className="rdp-footer__logo-mark">
              <Ic.LogoMark />
            </div>
            <span className="rdp-footer__logo-text">ResDropp</span>
          </Link>
          <p className="rdp-footer__brand-desc">
            Hotel rate intelligence for travelers who prefer to keep their savings
            — not leave them on the table.
          </p>
          <div className="rdp-footer__social">
            <a href="#" className="rdp-footer__social-link" aria-label="Twitter">
              <Ic.Twitter />
            </a>
            <a href="#" className="rdp-footer__social-link" aria-label="Instagram">
              <Ic.Instagram />
            </a>
            <a href="#" className="rdp-footer__social-link" aria-label="LinkedIn">
              <Ic.Linkedin />
            </a>
          </div>
        </div>

        {/* Product */}
        <div>
          <div className="rdp-footer__col-title">Product</div>
          <div className="rdp-footer__col-links">
            <a href="#how-it-works" className="rdp-footer__link">How it works</a>
            <a href="#features" className="rdp-footer__link">Features</a>
            <a href="#savings" className="rdp-footer__link">Savings examples</a>
            <a href="#faq" className="rdp-footer__link">FAQ</a>
            <Link to="/signup" className="rdp-footer__link">Start free</Link>
          </div>
        </div>

        {/* Company */}
        <div>
          <div className="rdp-footer__col-title">Company</div>
          <div className="rdp-footer__col-links">
            <Link to="/about" className="rdp-footer__link">About</Link>
            <a href="mailto:hello@resdropp.com" className="rdp-footer__link">Contact</a>
            <Link to="/privacy" className="rdp-footer__link">Privacy Policy</Link>
            <Link to="/terms" className="rdp-footer__link">Terms of Service</Link>
          </div>
        </div>

        {/* Account */}
        <div>
          <div className="rdp-footer__col-title">Account</div>
          <div className="rdp-footer__col-links">
            <Link to="/login" className="rdp-footer__link">Log in</Link>
            <Link to="/signup" className="rdp-footer__link">Create account</Link>
            <Link to="/dashboard" className="rdp-footer__link">Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="rdp-footer__bottom">
        <span className="rdp-footer__copy">
          &copy; {new Date().getFullYear()} ResDropp. All rights reserved.
        </span>
        <div className="rdp-footer__legal">
          <Link to="/privacy" className="rdp-footer__legal-link">Privacy</Link>
          <Link to="/terms" className="rdp-footer__legal-link">Terms</Link>
          <a href="mailto:hello@resdropp.com" className="rdp-footer__legal-link">Contact</a>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════ */
export default function ResDroppLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="rdp">
      <RdpNav
        scrolled={scrolled}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main>
        <RdpHero />
        <RdpLogos />
        <RdpHowItWorks />
        <RdpFeatures />
        <RdpDashboard />
        <RdpSavings />
        <RdpBenefits />
        <RdpLifestyle />
        <RdpTestimonials />
        <RdpFaq />
        <RdpCta />
      </main>
      <RdpFooter />
    </div>
  );
}
