import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n';
import './MobileTabBar.css';

const Ico = ({ children }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

/**
 * Native-style bottom tab bar for the app on phones (hidden on desktop via CSS).
 * Uses the primary authenticated routes; the active tab is derived from the URL.
 */
export default function MobileTabBar() {
  const { lang } = useI18n();
  const pt = lang === 'pt';
  const tabs = [
    { to: '/dashboard', label: pt ? 'Início' : 'Home', icon: <><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /></> },
    { to: '/submit', label: pt ? 'Adicionar' : 'Add', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></> },
    { to: '/alerts', label: pt ? 'Alertas' : 'Alerts', icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></> },
    { to: '/account', label: pt ? 'Conta' : 'Account', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></> },
  ];
  return (
    <nav className="mtb" aria-label={pt ? 'Navegação principal' : 'Primary navigation'}>
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `mtb-item ${isActive ? 'active' : ''}`}>
          <Ico>{t.icon}</Ico>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
