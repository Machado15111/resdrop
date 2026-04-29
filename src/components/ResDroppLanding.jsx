import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ResDroppLanding.css';

/* ── Icons ──────────────────────────────────────────────── */
function IcCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 6.5L5 9.5L11 3.5" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcArrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M2.5 7.5h10M9 4l3.5 3.5L9 11" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcChevron({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcLogo({ size = 28 }) {
  return (
    <img src="/resdrop-logo.png" alt="" width={size} height={size}
      style={{ display: 'block', objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
  );
}

/* ── Data ────────────────────────────────────────────────── */
const STEPS = [
  {
    n: '01',
    title: 'Forward your hotel confirmation',
    desc: 'Share your refundable booking confirmation with ResDrop. We extract the hotel, dates, room type, cancellation deadline and total price.',
  },
  {
    n: '02',
    title: 'We read every detail',
    desc: 'Room category, cancellation terms, included benefits, taxes and total cost. All parsed so comparisons are accurate, not approximate.',
  },
  {
    n: '03',
    title: 'Monitoring begins immediately',
    desc: 'ResDrop checks available rates daily and more frequently as your free cancellation deadline approaches.',
  },
  {
    n: '04',
    title: 'We send a clear comparison',
    desc: 'When a genuinely better option appears, you receive a side-by-side breakdown: same hotel, same room, same conditions and a lower price.',
  },
  {
    n: '05',
    title: 'You decide. Always.',
    desc: 'Review the comparison and choose. Keep your booking or switch. We never rebook, cancel or touch your reservation without your explicit approval.',
  },
];

const TRUST_ITEMS = [
  'Same or better room type',
  'Similar or better cancellation policy',
  'Total price including all taxes and fees',
  'Breakfast and included benefits',
  'No changes made without your approval',
];

const FOR_WHO = [
  {
    n: '01',
    title: 'Families booking vacations',
    desc: 'A hotel stay for four nights adds up fast. A meaningful rate drop that ResDrop catches can pay for a dinner or two.',
  },
  {
    n: '02',
    title: 'Couples planning honeymoons',
    desc: 'High-value stays booked 3 to 6 months in advance are exactly where ResDrop finds the most opportunities.',
  },
  {
    n: '03',
    title: 'Travelers booking premium hotels',
    desc: 'The higher the original rate, the greater the potential saving. ResDrop makes the most sense when the booking matters.',
  },
  {
    n: '04',
    title: 'Anyone booking months in advance',
    desc: 'Hotel rates shift constantly between booking and check-in. ResDrop watches the whole window so you do not have to.',
  },
  {
    n: '05',
    title: 'People tired of checking manually',
    desc: 'The average traveler checks prices 4 to 6 times after booking. Forward your confirmation once. We do the rest.',
  },
];

const HOTEL_EXAMPLES = [
  {
    name: 'Park Hyatt Tokyo',
    location: 'Tokyo, Japan',
    room: 'Park Room, City View',
    nights: 3,
    was: 478,
    now: 389,
    saved: 267,
    reason: 'A lower refundable member rate became available for the same room and dates.',
    img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&h=320&q=80',
  },
  {
    name: 'Rosewood London',
    location: 'London, United Kingdom',
    room: 'Deluxe Room, Garden View',
    nights: 4,
    was: 680,
    now: 595,
    saved: 340,
    reason: 'A flexible rate with breakfast included reopened at a reduced price.',
    img: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=600&h=320&q=80',
  },
  {
    name: 'Fasano Sao Paulo',
    location: 'Sao Paulo, Brazil',
    room: 'Classic Room',
    nights: 3,
    was: 1290,
    now: 1020,
    saved: 630,
    reason: 'A preferred partner rate with added benefits matched the same stay at an improved price.',
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&h=320&q=80',
  },
];

const FREE_FEATS = [
  'Track up to 2 bookings',
  'Daily rate monitoring',
  'Email alerts when rates drop',
  'Full comparison details',
];

const PLUS_FEATS = [
  'Unlimited bookings',
  'Priority monitoring twice daily',
  'Email and push notifications',
  'Savings dashboard',
  'Priority support',
];

const FAQS = [
  {
    q: 'Does ResDrop cancel my booking automatically?',
    a: 'No. We never rebook or cancel anything without your explicit approval. ResDrop only monitors and alerts. Every action is always your decision.',
  },
  {
    q: 'What types of reservations work best?',
    a: 'Refundable hotel bookings made in advance, typically 2 to 6 months before check-in. The longer the monitoring window, the more opportunities ResDrop has to find a better option.',
  },
  {
    q: 'Does ResDrop work with Booking.com, Expedia and hotel websites?',
    a: 'Yes. You can forward confirmation emails from major booking channels. ResDrop checks publicly available rates and other eligible sources to find matching or better options.',
  },
  {
    q: 'What if a cheaper rate has worse conditions?',
    a: 'We will not recommend it. ResDrop compares room type, cancellation policy, taxes, fees and included benefits before flagging anything. If the alternative is worse in any meaningful way, we stay quiet.',
  },
  {
    q: 'Is ResDrop a hotel booking website?',
    a: 'No. ResDrop is a post-booking monitoring layer. You book through your preferred channel. ResDrop monitors the reservation after it is made and alerts you if a genuine improvement appears.',
  },
];

/* ── Component ───────────────────────────────────────────── */
export default function ResDroppLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen,  setFaqOpen]  = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const els = document.querySelectorAll('.rdp-fade');
    if (!els.length) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('rdp-fade--in'); io.unobserve(e.target); }
      }),
      { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="rdp">

      {/* NAV */}
      <nav className={`rdp-nav${scrolled ? ' rdp-nav--scrolled' : ''}`}>
        <div className="rdp-nav__inner">
          <Link to="/" className="rdp-nav__logo" onClick={() => setMenuOpen(false)}>
            <IcLogo /><span>ResDrop</span>
          </Link>
          <div className="rdp-nav__links">
            <a href="#how-it-works">How it works</a>
            <a href="#savings">Savings</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="rdp-nav__actions">
            <Link to="/login" className="rdp-nav__login">Log in</Link>
            <Link to="/signup" className="rdp-btn rdp-btn--sm rdp-btn--green">Start free</Link>
          </div>
          <button
            className={`rdp-nav__burger${menuOpen ? ' rdp-nav__burger--open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="rdp-nav__drawer">
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#savings"      onClick={() => setMenuOpen(false)}>Savings</a>
            <a href="#pricing"      onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#faq"          onClick={() => setMenuOpen(false)}>FAQ</a>
            <Link to="/login"   onClick={() => setMenuOpen(false)}>Log in</Link>
            <Link to="/signup"  className="rdp-btn rdp-btn--green rdp-btn--block" onClick={() => setMenuOpen(false)}>
              Start tracking free
            </Link>
          </div>
        )}
      </nav>

      <main>

        {/* HERO */}
        <section className="rdp-hero">
          {/* Left — white */}
          <div className="rdp-hero__left">
            <div className="rdp-hero__left-inner">
              <div className="rdp-kicker">Post-booking protection</div>
              <h1 className="rdp-hero__h1">
                Booked.<br />
                Now let ResDrop<br />
                <span className="rdp-hero__h1--accent">keep watching.</span>
              </h1>
              <p className="rdp-hero__sub">
                ResDrop monitors your hotel reservation around the clock. When a better rate, improved terms, or added benefits become available, we alert you immediately so you can choose whether to rebook.
              </p>
              <div className="rdp-hero__ctas">
                <Link to="/signup" className="rdp-btn rdp-btn--green rdp-btn--lg">
                  Start Tracking Free <IcArrow />
                </Link>
                <a href="#how-it-works" className="rdp-btn rdp-btn--outline rdp-btn--lg">
                  See how it works
                </a>
              </div>
              <ul className="rdp-hero__trust">
                <li><IcCheck /> No credit card needed</li>
                <li className="rdp-hero__trust-sep" aria-hidden="true" />
                <li><IcCheck /> We never rebook without your approval</li>
                <li className="rdp-hero__trust-sep" aria-hidden="true" />
                <li><IcCheck /> Free to start</li>
              </ul>
            </div>
          </div>

          {/* Right — sage bg + dashboard window */}
          <div className="rdp-hero__right">
            <div className="rdp-hw">
              {/* Sidebar */}
              <div className="rdp-hw__sidebar">
                <div className="rdp-hw__logo">
                  <IcLogo size={20} />
                  <span>ResDrop</span>
                </div>
                <nav className="rdp-hw__nav">
                  <div className="rdp-hw__nav-item rdp-hw__nav-item--active">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    My Bookings
                  </div>
                  <div className="rdp-hw__nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Alerts
                    <span className="rdp-hw__badge-dot">2</span>
                  </div>
                  <div className="rdp-hw__nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Savings
                  </div>
                </nav>
                <div className="rdp-hw__user">
                  <div className="rdp-hw__avatar">S</div>
                  <span>Sofia M.</span>
                </div>
              </div>

              {/* Main panel */}
              <div className="rdp-hw__main">
                <div className="rdp-hw__main-hd">
                  <h3 className="rdp-hw__main-title">Tracked Bookings</h3>
                </div>

                <div className="rdp-hw__stats">
                  <div className="rdp-hw__stat">
                    <div className="rdp-hw__stat-label">MONITORING</div>
                    <div className="rdp-hw__stat-val">3</div>
                  </div>
                  <div className="rdp-hw__stat">
                    <div className="rdp-hw__stat-label">TOTAL SAVED</div>
                    <div className="rdp-hw__stat-val rdp-hw__stat-val--green">$412</div>
                  </div>
                  <div className="rdp-hw__stat">
                    <div className="rdp-hw__stat-label">ALERTS</div>
                    <div className="rdp-hw__stat-val">7</div>
                  </div>
                </div>

                <div className="rdp-hw__alert">
                  <div className="rdp-hw__alert-ic">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  </div>
                  <div className="rdp-hw__alert-body">
                    <strong>Rate Improvement Found</strong>
                    <span>Park Hyatt Tokyo · Rate improved from $478 to $389/night</span>
                  </div>
                </div>

                <div className="rdp-hw__table">
                  {[
                    { name: 'Park Hyatt Tokyo',  dates: 'Mar 14-17', rate: '$389/nt', status: 'Drop found',  type: 'drop'       },
                    { name: 'Rosewood London',    dates: 'Apr 2-5',   rate: '$620/nt', status: 'Monitoring', type: 'monitoring'  },
                    { name: 'Fasano São Paulo',   dates: 'Apr 19-22', rate: '$1,020/nt', status: 'Monitoring', type: 'monitoring' },
                  ].map((row, i) => (
                    <div key={i} className="rdp-hw__row">
                      <div className="rdp-hw__row-info">
                        <span className="rdp-hw__row-name">{row.name}</span>
                        <span className="rdp-hw__row-dates">{row.dates}</span>
                      </div>
                      <span className="rdp-hw__row-rate">{row.rate}</span>
                      <span className={`rdp-hw__status rdp-hw__status--${row.type}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="rdp-section rdp-hiw rdp-fade" id="how-it-works">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">How it works</div>
              <h2 className="rdp-h2">Five steps.<br />One less thing to think about.</h2>
            </div>
            <ol className="rdp-hiw__list">
              {STEPS.map((s, i) => (
                <li key={i} className="rdp-hiw__step">
                  <div className="rdp-hiw__num">{s.n}</div>
                  <div className="rdp-hiw__body">
                    <h3 className="rdp-hiw__title">{s.title}</h3>
                    <p className="rdp-hiw__desc">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* TRUST */}
        <section className="rdp-section rdp-trust rdp-fade">
          <div className="rdp-container rdp-trust__inner">
            <div className="rdp-trust__left">
              <div className="rdp-kicker">What we check</div>
              <h2 className="rdp-h2">Not every lower price<br />is a better deal.</h2>
              <p className="rdp-trust__body">
                That is why ResDrop checks the details before recommending anything. We compare room type, cancellation policy, taxes, fees and included benefits so you never trade a good booking for a worse one.
              </p>
            </div>
            <div className="rdp-trust__right">
              <ul className="rdp-trust__list">
                {TRUST_ITEMS.map((item, i) => (
                  <li key={i} className="rdp-trust__item">
                    <span className="rdp-trust__check"><IcCheck /></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="rdp-trust__note">
                We only surface options that are equal or better in every relevant dimension.
              </p>
            </div>
          </div>
        </section>

        {/* DASHBOARD SECTION */}
        <section className="rdp-section rdp-dashboard rdp-fade">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">Dashboard</div>
              <h2 className="rdp-h2">Your bookings, in one view.</h2>
              <p className="rdp-section-sub">
                A clean, focused interface. Your reservations, their current rates, and every improvement found.
              </p>
            </div>
            <div className="rdp-browser">
              <div className="rdp-browser__bar">
                <div className="rdp-browser__dots">
                  <span className="rdp-browser__dot rdp-browser__dot--red" />
                  <span className="rdp-browser__dot rdp-browser__dot--yellow" />
                  <span className="rdp-browser__dot rdp-browser__dot--green" />
                </div>
                <div className="rdp-browser__url">app.resdrop.com/bookings</div>
              </div>
              <div className="rdp-browser__body">
                {/* Sidebar */}
                <div className="rdp-dash-sidebar">
                  <div className="rdp-dash-sidebar__logo"><IcLogo size={22} /> ResDrop</div>
                  <nav className="rdp-dash-sidebar__nav">
                    <div className="rdp-dash-nav-item rdp-dash-nav-item--active">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      My Bookings
                    </div>
                    <div className="rdp-dash-nav-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      Alerts <span className="rdp-dash-badge">2</span>
                    </div>
                    <div className="rdp-dash-nav-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      Savings
                    </div>
                    <div className="rdp-dash-nav-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Account
                    </div>
                  </nav>
                  <div className="rdp-dash-sidebar__user">
                    <div className="rdp-dash-avatar">S</div>
                    <span>Sofia M.</span>
                  </div>
                </div>
                {/* Main */}
                <div className="rdp-dash-main">
                  <div className="rdp-dash-main__header">
                    <h3 className="rdp-dash-main__title">My Bookings</h3>
                    <button className="rdp-dash-add">+ Add booking</button>
                  </div>
                  <div className="rdp-dash-stats">
                    <div className="rdp-dash-stat">
                      <div className="rdp-dash-stat__label">TRACKED</div>
                      <div className="rdp-dash-stat__value">4</div>
                      <div className="rdp-dash-stat__sub">Active reservations</div>
                    </div>
                    <div className="rdp-dash-stat">
                      <div className="rdp-dash-stat__label">MONITORING</div>
                      <div className="rdp-dash-stat__value">3</div>
                      <div className="rdp-dash-stat__sub">Checking now</div>
                    </div>
                    <div className="rdp-dash-stat">
                      <div className="rdp-dash-stat__label">TOTAL SAVED</div>
                      <div className="rdp-dash-stat__value rdp-dash-stat__value--green">$412</div>
                      <div className="rdp-dash-stat__sub">All time</div>
                    </div>
                    <div className="rdp-dash-stat">
                      <div className="rdp-dash-stat__label">ALERTS SENT</div>
                      <div className="rdp-dash-stat__value">9</div>
                      <div className="rdp-dash-stat__sub">Past 90 days</div>
                    </div>
                  </div>
                  <div className="rdp-dash-alert">
                    <div className="rdp-dash-alert__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
                    </div>
                    <span>Rate improvement found on <strong>Park Hyatt Tokyo</strong> · $89/night better than your current booking.</span>
                  </div>
                  <table className="rdp-dash-table">
                    <thead>
                      <tr>
                        <th>Hotel</th>
                        <th>Dates</th>
                        <th>Rate/Night</th>
                        <th>Saved</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Park Hyatt Tokyo</strong><br /><span className="rdp-dash-sub">Tokyo, Japan</span></td>
                        <td>Mar 14-17</td>
                        <td>$389</td>
                        <td className="rdp-dash-saved">$267</td>
                        <td><span className="rdp-dash-status rdp-dash-status--drop">Drop found</span></td>
                      </tr>
                      <tr>
                        <td><strong>Rosewood London</strong><br /><span className="rdp-dash-sub">London, UK</span></td>
                        <td>Apr 2-5</td>
                        <td>$620</td>
                        <td className="rdp-dash-muted">--</td>
                        <td><span className="rdp-dash-status rdp-dash-status--monitoring">Monitoring</span></td>
                      </tr>
                      <tr>
                        <td><strong>Fasano Sao Paulo</strong><br /><span className="rdp-dash-sub">Sao Paulo, BR</span></td>
                        <td>Apr 19-22</td>
                        <td>$1,020</td>
                        <td className="rdp-dash-muted">--</td>
                        <td><span className="rdp-dash-status rdp-dash-status--monitoring">Monitoring</span></td>
                      </tr>
                      <tr>
                        <td><strong>Aman Tokyo</strong><br /><span className="rdp-dash-sub">Tokyo, Japan</span></td>
                        <td>May 5-8</td>
                        <td>$1,140</td>
                        <td className="rdp-dash-saved">$145</td>
                        <td><span className="rdp-dash-status rdp-dash-status--saved">Saved</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOTEL SAVINGS EXAMPLES */}
        <section className="rdp-section rdp-savings rdp-fade" id="savings">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">Real savings</div>
              <h2 className="rdp-h2">What ResDrop finds for you.</h2>
              <p className="rdp-section-sub">
                These are the types of rate improvements our users act on every week.
              </p>
            </div>
            <div className="rdp-savings__grid">
              {HOTEL_EXAMPLES.map((h, i) => (
                <div key={i} className="rdp-savings__card">
                  <div className="rdp-savings__img-wrap">
                    <img src={h.img} alt={h.name} className="rdp-savings__img" loading="lazy" />
                    <div className="rdp-savings__found-badge">
                      <span className="rdp-savings__found-dot" />
                      Improvement found
                    </div>
                    <div className="rdp-savings__saved-badge">
                      <span className="rdp-savings__saved-amount">${h.saved}</span>
                      <span className="rdp-savings__saved-label">SAVED</span>
                    </div>
                  </div>
                  <div className="rdp-savings__body">
                    <div className="rdp-savings__hotel-name">{h.name}</div>
                    <div className="rdp-savings__hotel-meta">{h.location} · {h.room}</div>
                    <div className="rdp-savings__price-row">
                      <div className="rdp-savings__price-block">
                        <span className="rdp-savings__price-tag">WAS</span>
                        <span className="rdp-savings__price rdp-savings__price--old">${h.was}</span>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="#9C9C9C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div className="rdp-savings__price-block">
                        <span className="rdp-savings__price-tag">NOW</span>
                        <span className="rdp-savings__price rdp-savings__price--new">${h.now}</span>
                      </div>
                    </div>
                    <div className="rdp-savings__footer">
                      <span>{h.nights} nights</span>
                      <span>saved <strong className="rdp-savings__footer-saved">${h.saved}</strong></span>
                    </div>
                    <p className="rdp-savings__reason">{h.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO IT IS FOR */}
        <section className="rdp-section rdp-forwho rdp-fade">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">Who it is for</div>
              <h2 className="rdp-h2">Built for travelers<br />who book in advance.</h2>
            </div>
            <div className="rdp-forwho__grid">
              {FOR_WHO.map((w, i) => (
                <div key={i} className="rdp-forwho__card">
                  <div className="rdp-forwho__num">{w.n}</div>
                  <h3 className="rdp-forwho__title">{w.title}</h3>
                  <p className="rdp-forwho__desc">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="rdp-section rdp-pricing rdp-fade" id="pricing">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">Pricing</div>
              <h2 className="rdp-h2">Start free.<br />Upgrade when it makes sense.</h2>
            </div>
            <div className="rdp-pricing__grid">
              <div className="rdp-pricing__card">
                <div className="rdp-pricing__tier">Free</div>
                <div className="rdp-pricing__amount">$0</div>
                <p className="rdp-pricing__blurb">
                  Forward your booking and we start tracking. No card, no commitment.
                </p>
                <ul className="rdp-pricing__feats">
                  {FREE_FEATS.map((f, i) => (
                    <li key={i}><IcCheck /> {f}</li>
                  ))}
                </ul>
                <Link to="/signup" className="rdp-btn rdp-btn--outline rdp-btn--block">
                  Get started free
                </Link>
              </div>
              <div className="rdp-pricing__card rdp-pricing__card--highlight">
                <div className="rdp-pricing__pill">Most popular</div>
                <div className="rdp-pricing__tier">ResDrop Plus</div>
                <div className="rdp-pricing__amount">$9<span className="rdp-pricing__per">/month</span></div>
                <p className="rdp-pricing__blurb">
                  For frequent travelers who want continuous, comprehensive coverage across every stay.
                </p>
                <ul className="rdp-pricing__feats">
                  {PLUS_FEATS.map((f, i) => (
                    <li key={i}><IcCheck /> {f}</li>
                  ))}
                </ul>
                <Link to="/signup" className="rdp-btn rdp-btn--white rdp-btn--block">
                  Start with Plus
                </Link>
                <p className="rdp-pricing__annual">Or $89/year, save two months</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="rdp-section rdp-faq rdp-fade" id="faq">
          <div className="rdp-container rdp-faq__inner">
            <div className="rdp-faq__hd">
              <div className="rdp-kicker">FAQ</div>
              <h2 className="rdp-h2">Common<br />questions.</h2>
              <p className="rdp-faq__sub">
                Everything you need to know about how ResDrop works and what to expect.
              </p>
            </div>
            <div className="rdp-faq__list">
              {FAQS.map((f, i) => (
                <div key={i} className={`rdp-faq__item${faqOpen === i ? ' is-open' : ''}`}>
                  <button className="rdp-faq__q" onClick={() => setFaqOpen(p => p === i ? null : i)}>
                    <span>{f.q}</span>
                    <IcChevron open={faqOpen === i} />
                  </button>
                  {faqOpen === i && <p className="rdp-faq__a">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rdp-cta rdp-fade">
          <div className="rdp-container rdp-cta__inner">
            <h2 className="rdp-cta__h2">
              Your booking deserves<br />
              to be watched over.
            </h2>
            <p className="rdp-cta__sub">
              Forward it to ResDrop. We will keep watching until your free cancellation window closes.
            </p>
            <div className="rdp-cta__btns">
              <Link to="/signup" className="rdp-btn rdp-btn--white rdp-btn--lg">
                Start tracking free <IcArrow />
              </Link>
              <Link to="/login" className="rdp-btn rdp-btn--ghost-light rdp-btn--lg">
                Log in
              </Link>
            </div>
            <p className="rdp-cta__note">
              No credit card required · Set up in under 2 minutes
            </p>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="rdp-footer">
        <div className="rdp-container rdp-footer__top">
          <div className="rdp-footer__brand">
            <Link to="/" className="rdp-footer__logo"><IcLogo /><span>ResDrop</span></Link>
            <p>Post-booking hotel rate monitoring.<br />Book once. We keep checking.</p>
          </div>
          <div className="rdp-footer__col">
            <div className="rdp-footer__col-hd">Product</div>
            <a href="#how-it-works">How it works</a>
            <a href="#savings">Savings</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="rdp-footer__col">
            <div className="rdp-footer__col-hd">Account</div>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Create account</Link>
          </div>
          <div className="rdp-footer__col">
            <div className="rdp-footer__col-hd">Legal</div>
            <Link to="/terms">Terms of service</Link>
            <Link to="/privacy">Privacy policy</Link>
          </div>
        </div>
        <div className="rdp-footer__bottom">
          <div className="rdp-container rdp-footer__bottom-row">
            <span>© 2025 ResDrop. All rights reserved.</span>
            <span>We never rebook without your approval.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
