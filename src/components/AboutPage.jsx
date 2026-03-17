import Footer from './Footer';
import './LegalPage.css';

function AboutPage() {
  return (
    <>
      <div className="legal-page about-page">
        <div className="about-hero">
          <h1>About ResDrop</h1>
          <p>
            We help travelers save money on hotel bookings by automatically monitoring prices and alerting you when rates drop — so you never overpay for a stay.
          </p>
        </div>

        <h2>Our Mission</h2>
        <p>
          Hotel prices fluctuate constantly. Most travelers book once and never look back, missing potential savings. ResDrop was built to fix that. We track your reservations around the clock and notify you when it's time to rebook at a lower rate.
        </p>

        <h2>How It Works</h2>
        <p>
          Submit your upcoming hotel booking and we'll monitor the price 24/7 across major platforms. When we detect a price drop, you get an instant alert with all the details you need to rebook and save.
        </p>

        <div className="about-values">
          <div className="about-value">
            <h3>Transparency</h3>
            <p>No hidden fees. You always know exactly what you're saving and how.</p>
          </div>
          <div className="about-value">
            <h3>Simplicity</h3>
            <p>Submit a booking in seconds. We handle the monitoring — you handle the savings.</p>
          </div>
          <div className="about-value">
            <h3>Privacy</h3>
            <p>Your data stays yours. We only collect what's needed to track your bookings.</p>
          </div>
          <div className="about-value">
            <h3>Reliability</h3>
            <p>24/7 price monitoring so you never miss a drop, no matter the time zone.</p>
          </div>
        </div>

        <h2>Contact</h2>
        <p>
          Have questions or feedback? Reach out to us at <a href="mailto:support@resdrop.com">support@resdrop.com</a>.
        </p>
      </div>
      <Footer />
    </>
  );
}

export default AboutPage;
