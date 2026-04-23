import { Link } from 'react-router-dom';
import { LogoMark } from './Icons';
import { useI18n } from '../i18n';
import './Footer.css';

function Footer() {
  const { t, lang } = useI18n();
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
            <p className="footer-contact-line">
              <a href="mailto:hello@resdrop.app">hello@resdrop.app</a>
            </p>
          </div>
          <div className="footer-links">
            <h4>{t('footer.product')}</h4>
            <Link to="/">{lang === 'pt' ? 'Como funciona' : 'How It Works'}</Link>
            <Link to="/plans">{lang === 'pt' ? 'Planos e Preços' : 'Pricing'}</Link>
            <Link to="/about">FAQ</Link>
          </div>
          <div className="footer-links">
            <h4>{t('footer.company')}</h4>
            <Link to="/about">{lang === 'pt' ? 'Sobre' : 'About'}</Link>
            <a href="mailto:hello@resdrop.app">{lang === 'pt' ? 'Contato' : 'Contact'}</a>
          </div>
          <div className="footer-links">
            <h4>{t('footer.legal')}</h4>
            <Link to="/privacy">{lang === 'pt' ? 'Privacidade' : 'Privacy Policy'}</Link>
            <Link to="/terms">{lang === 'pt' ? 'Termos de Uso' : 'Terms of Service'}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 ResDrop. {t('footer.rights')}</p>
          <p className="footer-bottom-note">
            {lang === 'pt'
              ? 'Nunca remarcamos sem sua aprovação.'
              : 'We never rebook without your approval.'}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
