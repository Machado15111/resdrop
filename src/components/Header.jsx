import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { LogoMark, IconMenu, IconX, IconPlus, IconLock, IconGlobe, IconUser } from './Icons';
import './Header.css';

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, lang, toggleLang } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="header-logo" onClick={closeMobile}>
          <LogoMark size={30} />
          <span className="logo-text">ResDrop</span>
        </Link>

        <nav className={`header-nav ${mobileOpen ? 'open' : ''}`}>
          {!isAuthenticated && (
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile} end>
              {t('nav.home')}
            </NavLink>
          )}
          {isAuthenticated && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              {t('nav.dashboard')}
            </NavLink>
          )}
          {isAuthenticated && (
            <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              {t('header.alerts')}
            </NavLink>
          )}
          <NavLink to="/plans" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
            {t('nav.pricing')}
          </NavLink>
          {isAuthenticated ? (
            <NavLink to="/account" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              <IconUser size={15} />
              {user?.name?.split(' ')[0] || t('nav.account')}
            </NavLink>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
              <IconUser size={15} />
              {t('nav.account')}
            </NavLink>
          )}
          {isAuthenticated && (
            <Link to="/submit" className="btn btn-primary btn-sm header-cta" onClick={closeMobile}>
              <IconPlus size={15} />
              {t('nav.addBooking')}
            </Link>
          )}
        </nav>

        <div className="header-right">
          <button className="lang-toggle" onClick={toggleLang} title={lang === 'pt' ? 'English' : 'Portugues'}>
            <IconGlobe size={15} />
            <span>{lang === 'pt' ? 'EN' : 'PT'}</span>
          </button>
          {user?.isAdmin && (
            <button className="admin-btn" onClick={() => navigate('/admin')} title="Admin">
              <IconLock size={16} />
            </button>
          )}
          <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <IconX size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
