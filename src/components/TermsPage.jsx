import Footer from './Footer';
import './LegalPage.css';

function TermsPage() {
  return (
    <>
      <div className="legal-page">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: March 17, 2026</p>

        <p>
          Welcome to ResDrop. By accessing or using our service, you agree to be bound by these Terms of Service. Please read them carefully.
        </p>

        <h2>1. Description of Service</h2>
        <p>
          ResDrop is a hotel price monitoring service. We track hotel booking prices on your behalf and notify you when prices drop so you can rebook at a lower rate. We do not make or cancel bookings for you.
        </p>

        <h2>2. Account Registration</h2>
        <p>
          To use ResDrop, you must create an account with accurate and complete information. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.
        </p>

        <h2>3. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service for any unlawful purpose</li>
          <li>Submit false or misleading booking information</li>
          <li>Attempt to interfere with or disrupt the service</li>
          <li>Access the service through automated means (bots, scrapers) without authorization</li>
          <li>Resell or redistribute the service without permission</li>
        </ul>

        <h2>4. Price Monitoring & Alerts</h2>
        <p>
          We strive to provide accurate and timely price alerts, but we do not guarantee that all price drops will be detected or that prices shown will be available at the time of rebooking. Prices are subject to change by the hotel or booking platform at any time.
        </p>

        <h2>5. Subscription & Billing</h2>
        <p>
          Certain features of ResDrop may require a paid subscription. By subscribing, you authorize us to charge the applicable fees to your payment method. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          All content, features, and functionality of the ResDrop service — including text, graphics, logos, and software — are the property of ResDrop and protected by applicable intellectual property laws.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, ResDrop shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the service, including but not limited to lost savings, missed price drops, or rebooking costs.
        </p>

        <h2>8. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account if you violate these Terms. You may also delete your account at any time through your account settings.
        </p>

        <h2>9. Changes to These Terms</h2>
        <p>
          We may modify these Terms from time to time. If we make material changes, we will notify you via email or through the service. Your continued use of ResDrop after changes are posted constitutes acceptance of the updated Terms.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ResDrop operates, without regard to conflict of law principles.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at <a href="mailto:support@resdrop.com">support@resdrop.com</a>.
        </p>
      </div>
      <Footer />
    </>
  );
}

export default TermsPage;
