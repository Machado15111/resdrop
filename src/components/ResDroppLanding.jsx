import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ResDroppLanding.css';

/* ── Icons ──────────────────────────────────────────────── */
function IcCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="1.75"
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
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}>
      <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 2L3 7v8l8 5 8-5V7L11 2z" stroke="currentColor"
        strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M7 9.5l4 2.5 4-2.5M11 12v5" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Static data ─────────────────────────────────────────── */
const STEPS = [
  {
    n: '01',
    title: 'Forward your hotel confirmation',
    desc: 'Share your refundable booking confirmation with ResDrop. We extract the hotel, dates, room type, free cancellation deadline and total price.',
  },
  {
    n: '02',
    title: 'We read every detail',
    desc: 'Room category, cancellation terms, included benefits, taxes and total cost — all parsed so comparisons are accurate, not approximate.',
  },
  {
    n: '03',
    title: 'Monitoring begins immediately',
    desc: 'ResDrop checks available rates daily — and more frequently as your free cancellation deadline approaches.',
  },
  {
    n: '04',
    title: 'We send a clear comparison',
    desc: 'When a genuinely better option appears, you receive a side-by-side breakdown: same hotel, same room, same conditions — just a lower price.',
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
    title: 'Families booking vacations',
    desc: 'A hotel stay for four nights adds up fast. A meaningful rate drop that ResDrop catches can pay for a dinner or two.',
  },
  {
    title: 'Couples planning honeymoons',
    desc: 'High-value stays booked 3 to 6 months in advance are exactly where ResDrop finds the most opportunities.',
  },
  {
    title: 'Travelers booking premium hotels',
    desc: 'The higher the original rate, the greater the potential saving. ResDrop makes the most sense when the booking matters.',
  },
  {
    title: 'Anyone booking months in advance',
    desc: 'Hotel rates shift constantly between booking and check-in. ResDrop watches the whole window so you do not have to.',
  },
  {
    title: 'People tired of checking manually',
    desc: 'The average traveler checks prices 4 to 6 times after booking. Forward your confirmation once. We do the rest.',
  },
];

const FAQS = [
  {
    q: 'Does ResDrop cancel my booking automatically?',
    a: 'No. We never rebook or cancel anything without your explicit approval. ResDrop only monitors and alerts. Every action is always your decision.',
  },
  {
    q: 'What types of reservations work best?',
    a: 'Refundable hotel bookings made in advance — typically 2 to 6 months before check-in. The longer the monitoring window, the more opportunities ResDrop has to find a better option.',
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
  const [faqOpen, setFaqOpen]   = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  /* Scroll-in animations */
  useEffect(() => {
    const els = document.querySelectorAll('.rdp-fade');
    if (!els.length) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('rdp-fade--in'); io.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const toggleFaq = i => setFaqOpen(prev => prev === i ? null : i);

  return (
    <div className="rdp">

      {/* ══════════════ NAV ══════════════ */}
      <nav className={`rdp-nav${scrolled ? ' rdp-nav--scrolled' : ''}`}>
        <div className="rdp-nav__inner">
          <Link to="/" className="rdp-nav__logo" onClick={() => setMenuOpen(false)}>
            <IcLogo />
            <span>ResDrop</span>
          </Link>

          <div className="rdp-nav__links">
            <a href="#how-it-works">How it works</a>
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
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
            <Link to="/signup" className="rdp-btn rdp-btn--green rdp-btn--block"
              onClick={() => setMenuOpen(false)}>
              Start tracking free
            </Link>
          </div>
        )}
      </nav>

      <main>

        {/* ══════════════ HERO ══════════════ */}
        <section className="rdp-hero">
          <div className="rdp-container rdp-hero__inner">

            <div className="rdp-hero__left">
              <div className="rdp-kicker">Post-booking protection</div>
              <h1 className="rdp-hero__h1">
                Book once.<br />
                We keep<br />
                checking.
              </h1>
              <p className="rdp-hero__sub">
                Forward your refundable hotel booking and ResDrop monitors it until your free cancellation deadline. If the same stay — or a genuinely better option — appears for less, we will let you know.
              </p>
              <div className="rdp-hero__ctas">
                <Link to="/signup" className="rdp-btn rdp-btn--green rdp-btn--lg">
                  Start tracking free <IcArrow />
                </Link>
                <a href="#how-it-works" className="rdp-btn rdp-btn--outline rdp-btn--lg">
                  See how it works
                </a>
              </div>
              <ul className="rdp-hero__trust">
                <li><IcCheck /> No credit card needed</li>
                <li><IcCheck /> We never rebook without your approval</li>
                <li><IcCheck /> Free to start</li>
              </ul>
            </div>

            {/* Comparison card */}
            <div className="rdp-hero__right">
              <div className="rdp-ccard">
                <div className="rdp-ccard__status">
                  <span className="rdp-ccard__dot" />
                  Monitoring
                </div>

                <div className="rdp-ccard__block rdp-ccard__block--current">
                  <div className="rdp-ccard__block-label">Your current booking</div>
                  <div className="rdp-ccard__hotel">Fasano São Paulo</div>
                  <div className="rdp-ccard__meta">May 12–16 · Deluxe Room, Garden View</div>
                  <div className="rdp-ccard__policy">
                    <IcCheck /> Free cancellation until May 5
                  </div>
                  <div className="rdp-ccard__price-row">
                    <span className="rdp-ccard__price-label">Total paid</span>
                    <span className="rdp-ccard__price rdp-ccard__price--old">$1,500</span>
                  </div>
                </div>

                <div className="rdp-ccard__divider">
                  <span>↓&nbsp; Better option found</span>
                </div>

                <div className="rdp-ccard__block rdp-ccard__block--new">
                  <div className="rdp-ccard__block-label">Matching option</div>
                  <div className="rdp-ccard__hotel">Fasano São Paulo</div>
                  <div className="rdp-ccard__meta">May 12–16 · Deluxe Room, Garden View</div>
                  <div className="rdp-ccard__policy">
                    <IcCheck /> Free cancellation until May 5
                  </div>
                  <div className="rdp-ccard__price-row">
                    <span className="rdp-ccard__price-label">New total</span>
                    <div className="rdp-ccard__price-group">
                      <span className="rdp-ccard__price rdp-ccard__price--new">$1,250</span>
                      <span className="rdp-ccard__save">Save $250</span>
                    </div>
                  </div>
                </div>

                <div className="rdp-ccard__footer">
                  <span className="rdp-ccard__verdict">Same room. Same conditions. $250 less.</span>
                  <span className="rdp-ccard__action">Pending your review →</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════ HOW IT WORKS ══════════════ */}
        <section className="rdp-section rdp-hiw rdp-fade" id="how-it-works">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">How it works</div>
              <h2 className="rdp-h2">Five steps.<br />One less thing to worry about.</h2>
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

        {/* ══════════════ TRUST ══════════════ */}
        <section className="rdp-section rdp-trust rdp-fade">
          <div className="rdp-container rdp-trust__inner">
            <div className="rdp-trust__left">
              <div className="rdp-kicker">What we check</div>
              <h2 className="rdp-h2">Not every lower price<br />is a better deal.</h2>
              <p className="rdp-body-text">
                That is why ResDrop checks the details before recommending anything. We compare room type, cancellation policy, taxes, fees and included benefits — so you never trade a good booking for a worse one.
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

        {/* ══════════════ WHO IT'S FOR ══════════════ */}
        <section className="rdp-section rdp-forwho rdp-fade">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">Who it is for</div>
              <h2 className="rdp-h2">Built for travelers<br />who book in advance.</h2>
            </div>
            <div className="rdp-forwho__grid">
              {FOR_WHO.map((w, i) => (
                <div key={i} className="rdp-forwho__card">
                  <div className="rdp-forwho__num">{String(i + 1).padStart(2, '0')}</div>
                  <h3 className="rdp-forwho__title">{w.title}</h3>
                  <p className="rdp-forwho__desc">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ EXAMPLE COMPARISON ══════════════ */}
        <section className="rdp-section rdp-example rdp-fade">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">See it in action</div>
              <h2 className="rdp-h2">What a ResDrop<br />alert looks like.</h2>
              <p className="rdp-section-sub">
                Same hotel. Same room. Same cancellation terms. Just a better price.
              </p>
            </div>

            <div className="rdp-example__wrap">
              <div className="rdp-example__col rdp-example__col--a">
                <div className="rdp-example__col-tag">Your booking</div>
                <table className="rdp-example__tbl">
                  <tbody>
                    <tr>
                      <th>Hotel</th>
                      <td>Fasano São Paulo</td>
                    </tr>
                    <tr>
                      <th>Dates</th>
                      <td>May 12–16 · 4 nights</td>
                    </tr>
                    <tr>
                      <th>Room</th>
                      <td>Deluxe Room</td>
                    </tr>
                    <tr>
                      <th>Cancellation</th>
                      <td>Free until May 5</td>
                    </tr>
                    <tr className="rdp-example__tbl-total">
                      <th>Total</th>
                      <td><span className="rdp-example__price">$1,500</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rdp-example__bridge">
                <div className="rdp-example__bridge-icon">→</div>
              </div>

              <div className="rdp-example__col rdp-example__col--b">
                <div className="rdp-example__col-tag rdp-example__col-tag--new">Better option found</div>
                <table className="rdp-example__tbl">
                  <tbody>
                    <tr>
                      <th>Hotel</th>
                      <td>Fasano São Paulo</td>
                    </tr>
                    <tr>
                      <th>Dates</th>
                      <td>May 12–16 · 4 nights</td>
                    </tr>
                    <tr>
                      <th>Room</th>
                      <td>Deluxe Room</td>
                    </tr>
                    <tr>
                      <th>Cancellation</th>
                      <td>Free until May 5</td>
                    </tr>
                    <tr className="rdp-example__tbl-total">
                      <th>Total</th>
                      <td>
                        <span className="rdp-example__price rdp-example__price--new">$1,250</span>
                        <span className="rdp-example__badge">Save $250</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rdp-example__verdict">
              Same conditions. Lower total price. Review before rebooking.
            </div>
          </div>
        </section>

        {/* ══════════════ PRICING ══════════════ */}
        <section className="rdp-section rdp-pricing rdp-fade" id="pricing">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">Pricing</div>
              <h2 className="rdp-h2">Start free.<br />Pay only when it works.</h2>
            </div>
            <div className="rdp-pricing__grid">

              <div className="rdp-pricing__card">
                <div className="rdp-pricing__tier">Free</div>
                <div className="rdp-pricing__amount">$0</div>
                <p className="rdp-pricing__blurb">
                  Forward your booking and we start tracking it. No card, no commitment.
                </p>
                <ul className="rdp-pricing__feats">
                  <li><IcCheck /> Track up to 2 bookings</li>
                  <li><IcCheck /> Daily rate monitoring</li>
                  <li><IcCheck /> Email alerts</li>
                  <li><IcCheck /> Full comparison details</li>
                </ul>
                <Link to="/signup" className="rdp-btn rdp-btn--outline rdp-btn--block">
                  Get started free
                </Link>
              </div>

              <div className="rdp-pricing__card rdp-pricing__card--highlight">
                <div className="rdp-pricing__pill">Most popular</div>
                <div className="rdp-pricing__tier">Pay when you save</div>
                <div className="rdp-pricing__amount">Success fee</div>
                <p className="rdp-pricing__blurb">
                  A small fee applies only when you choose to use a better option we found. If we find nothing, you pay nothing.
                </p>
                <ul className="rdp-pricing__feats">
                  <li><IcCheck /> Unlimited bookings</li>
                  <li><IcCheck /> Priority monitoring</li>
                  <li><IcCheck /> Email &amp; push alerts</li>
                  <li><IcCheck /> Detailed side-by-side comparison</li>
                  <li><IcCheck /> Full support</li>
                </ul>
                <Link to="/signup" className="rdp-btn rdp-btn--white rdp-btn--block">
                  Start tracking free
                </Link>
              </div>

              <div className="rdp-pricing__card rdp-pricing__card--muted">
                <div className="rdp-pricing__tier">ResDrop Plus</div>
                <div className="rdp-pricing__amount">Coming soon</div>
                <p className="rdp-pricing__blurb">
                  An annual plan for frequent travelers who book multiple stays per year and want continuous, automatic coverage.
                </p>
                <ul className="rdp-pricing__feats">
                  <li><IcCheck /> Unlimited bookings</li>
                  <li><IcCheck /> Annual flat rate</li>
                  <li><IcCheck /> Priority support</li>
                  <li><IcCheck /> Savings dashboard</li>
                </ul>
                <button className="rdp-btn rdp-btn--outline rdp-btn--block" disabled>
                  Notify me when available
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════ FAQ ══════════════ */}
        <section className="rdp-section rdp-faq rdp-fade" id="faq">
          <div className="rdp-container rdp-faq__inner">
            <div className="rdp-faq__hd">
              <div className="rdp-kicker">FAQ</div>
              <h2 className="rdp-h2">Common<br />questions.</h2>
              <p className="rdp-body-text">
                Everything you need to know about how ResDrop works and what to expect.
              </p>
            </div>
            <div className="rdp-faq__list">
              {FAQS.map((f, i) => (
                <div key={i} className={`rdp-faq__item${faqOpen === i ? ' is-open' : ''}`}>
                  <button className="rdp-faq__q" onClick={() => toggleFaq(i)}>
                    <span>{f.q}</span>
                    <IcChevron open={faqOpen === i} />
                  </button>
                  {faqOpen === i && <p className="rdp-faq__a">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ CTA ══════════════ */}
        <section className="rdp-cta">
          <div className="rdp-container rdp-cta__inner">
            <h2 className="rdp-cta__h2">
              Your booking shouldn't be<br />
              forgotten after checkout.
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
              No credit card required &nbsp;·&nbsp; Set up in under 2 minutes
            </p>
          </div>
        </section>

      </main>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="rdp-footer">
        <div className="rdp-container rdp-footer__top">
          <div className="rdp-footer__brand">
            <Link to="/" className="rdp-footer__logo">
              <IcLogo />
              <span>ResDrop</span>
            </Link>
            <p>Post-booking hotel rate monitoring.<br />Book once. We keep checking.</p>
          </div>
          <div className="rdp-footer__col">
            <div className="rdp-footer__col-hd">Product</div>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link to="/signup">Start free</Link>
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
