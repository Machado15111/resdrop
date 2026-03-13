import { useState } from 'react';
import { useI18n } from '../i18n';
import { LogoMark, IconMenu, IconX, IconPlus, IconLock, IconGlobe, IconUser } from './Icons';
import './Header.css';

function Header({ view, setView, bookingCount, currentUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, lang, toggleLang } = useI18n();

  const navigate = (v) => {
    setView(v);
    setMobileOpen(false);
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <div className="header-logo" onClick={() => navigate(currentUser ? 'dashboard' : 'home')}>
          <LogoMark size={30} />
          <span className="logo-text">ResDrop</span>
        </div>

        <nav className={`header-nav ${mobileOpen ? 'open' : ''}`}>
          {!currentUser && (
            <button className={`nav-link ${view === 'home' ? 'active' : ''}`} onClick={() => navigate('home')}>{t('nav.home')}</button>
          )}
          {currentUser && (
            <button className={`nav-link ${view === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('dashboard')}>
              {t('nav.dashboard')}
              {bookingCount > 0 && <span className="nav-badge">{bookingCount}</span>}
            </button>
          )}
          <button className={`nav-link ${view === 'pricing' ? 'active' : ''}`} onClick={() => navigate('pricing')}>{t('nav.pricing')}</button>
          <button className={`nav-link ${view === 'account' ? 'active' : ''}`} onClick={() => navigate('account')}>
            <IconUser size={15} />
            {currentUser ? currentUser.name.split(' ')[0] : t('nav.account')}
          </button>
          {currentUser && (
            <button className="btn btn-primary btn-sm header-cta" onClick={() => navigate('submit')}>
              <IconPlus size={15} />
              {t('nav.addBooking')}
            </button>
          )}
        </nav>

        <div className="header-right">
          <button className="lang-toggle" onClick={toggleLang} title={lang === 'pt' ? 'English' : 'Portugues'}>
            <IconGlobe size={15} />
            <span>{lang === 'pt' ? 'EN' : 'PT'}</span>
          </button>
          <button className="admin-btn" onClick={() => navigate('admin')} title="Admin">
            <IconLock size={16} />
          </button>
          <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <IconX size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
