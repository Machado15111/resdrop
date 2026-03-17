import Footer from './Footer';
import './LegalPage.css';

function PrivacyPage() {
  return (
    <>
      <div className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: March 17, 2026</p>

        <p>
          ResDrop ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our service.
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect information that you provide directly to us, including:</p>
        <ul>
          <li>Account information (name, email address, password)</li>
          <li>Booking details you submit for price monitoring (hotel name, dates, confirmation number)</li>
          <li>Communication preferences and alert settings</li>
        </ul>
        <p>We also automatically collect certain technical information when you use our service, such as your IP address, browser type, and usage patterns.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our price monitoring service</li>
          <li>Send you price drop alerts and notifications</li>
          <li>Communicate with you about your account and our service</li>
          <li>Detect and prevent fraud or abuse</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We do not sell your personal information. We may share your information only in the following circumstances:
        </p>
        <ul>
          <li>With service providers who help us operate our platform</li>
          <li>When required by law or to protect our legal rights</li>
          <li>In connection with a business transfer or merger</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          We retain your personal information for as long as your account is active or as needed to provide our services. You may request deletion of your account and associated data at any time.
        </p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access and update your personal information</li>
          <li>Request deletion of your data</li>
          <li>Opt out of marketing communications</li>
          <li>Export your data in a portable format</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>
          We use essential cookies to keep you signed in and remember your preferences. We do not use third-party tracking cookies for advertising purposes.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our website and updating the "Last updated" date.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@resdrop.com">support@resdrop.com</a>.
        </p>
      </div>
      <Footer />
    </>
  );
}

export default PrivacyPage;
