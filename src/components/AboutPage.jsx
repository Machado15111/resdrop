import Footer from './Footer';
import './AboutPage.css';

function AboutPage() {
  return (
    <>
      <div className="about-page">

        <section className="about-hero">
          <div className="about-container">
            <div className="about-eyebrow">OUR STORY</div>
            <h1>Built for the moment after booking.</h1>
            <p className="about-hero-sub">
              Most travel tools help you find a hotel before you book. ResDrop was built for what happens after —
              when the reservation is confirmed and the rate keeps moving without you.
            </p>
          </div>
        </section>

        <section className="about-origin">
          <div className="about-container about-origin-grid">
            <div className="about-origin-text">
              <h2>Why we built this</h2>
              <p>
                The idea started with a simple frustration: booking a hotel months in advance, then
                seeing the same room at a lower rate two weeks later. By then, the original booking
                felt locked in. Checking manually every few days was tedious, and easy to forget.
              </p>
              <p>
                Hotel rates are dynamic. They change after you book. A member rate opens on the hotel
                website. An equivalent room drops on Expedia. A partner channel surfaces a rate that
                was never publicly visible. None of this requires any action from the traveler —
                it just requires someone watching.
              </p>
              <p>
                ResDrop is that watcher. It monitors your confirmed refundable reservation across the
                hotel's official website, Expedia, Booking.com, and supported sources — and sends you
                an alert the moment a better equivalent option appears. What you do with that
                information is entirely up to you.
              </p>
            </div>
            <div className="about-origin-stat-col">
              <div className="about-stat-card">
                <div className="about-stat-number">3x</div>
                <div className="about-stat-label">Daily monitoring cycles per booking</div>
              </div>
              <div className="about-stat-card">
                <div className="about-stat-number">3+</div>
                <div className="about-stat-label">Booking sources checked per cycle</div>
              </div>
              <div className="about-stat-card">
                <div className="about-stat-number">0</div>
                <div className="about-stat-label">Automatic rebookings. Ever.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-principles">
          <div className="about-container">
            <h2>What we believe</h2>
            <div className="about-values-grid">
              <div className="about-value-item">
                <div className="about-value-num">01</div>
                <h3>The traveler stays in control</h3>
                <p>
                  ResDrop surfaces opportunities. It does not create obligations.
                  Every alert gives you the full picture — source, rate, room, cancellation terms.
                  From there, the decision is yours. Nothing about your reservation changes
                  unless you initiate it.
                </p>
              </div>
              <div className="about-value-item">
                <div className="about-value-num">02</div>
                <h3>Equivalent means equivalent</h3>
                <p>
                  We compare only like-for-like options: same hotel, same room category,
                  same or better cancellation terms. We do not surface non-refundable
                  alternatives, lower-tier rooms, or different properties — regardless
                  of how the price compares.
                </p>
              </div>
              <div className="about-value-item">
                <div className="about-value-num">03</div>
                <h3>Transparency about what we check</h3>
                <p>
                  We monitor the hotel's official direct booking channel, Expedia, Booking.com,
                  and supported partner sources. When an alert is sent, it tells you exactly
                  where the rate was found. No opaque matching, no mystery sources.
                </p>
              </div>
              <div className="about-value-item">
                <div className="about-value-num">04</div>
                <h3>Your data serves one purpose</h3>
                <p>
                  The booking details you add to ResDrop are used to monitor your reservation
                  on your behalf. We do not sell, share, or use your data for advertising,
                  analytics products, or any purpose outside the monitoring service.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-how">
          <div className="about-container">
            <h2>How it works</h2>
            <div className="about-steps">
              <div className="about-step">
                <div className="about-step-num">01</div>
                <div>
                  <h3>Add your confirmed booking</h3>
                  <p>Enter the details of any refundable hotel reservation — or forward your confirmation email to your ResDrop address. Monitoring begins immediately.</p>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-num">02</div>
                <div>
                  <h3>We monitor continuously</h3>
                  <p>ResDrop checks the hotel's official site, Expedia, Booking.com, and supported sources three times a day — looking only for equivalent options with the same or better cancellation terms.</p>
                </div>
              </div>
              <div className="about-step">
                <div className="about-step-num">03</div>
                <div>
                  <h3>You receive an alert when something appears</h3>
                  <p>The alert includes the source, the rate, the room details, and the cancellation terms. Everything you need to evaluate the opportunity and decide whether to act.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-contact">
          <div className="about-container">
            <h2>Get in touch</h2>
            <p>
              Questions about the product, your account, or a monitoring result?
              Reach us at <a href="mailto:hello@resdrop.app">hello@resdrop.app</a>.
            </p>
            <p className="about-contact-sub">
              We aim to respond within one business day.
            </p>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}

export default AboutPage;
