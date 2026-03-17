import { Link } from 'react-router-dom';
import { LogoMark } from './Icons';
import { useI18n } from '../i18n';
import './Footer.css';

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <LogoMark size={28} />
              <span className="footer-logo-text">ResDrop</span>
            </div>
            <p className="footer-tagline">
              {t('footer.tagline')}
            </p>
          </div>
          <div className="footer-links">
            <h4>{t('footer.product')}</h4>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-links">
            <h4>{t('footer.company')}</h4>
            <Link to="/about">About</Link>
            <a href="#blog">Blog</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-links">
            <h4>{t('footer.legal')}</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 ResDrop. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
