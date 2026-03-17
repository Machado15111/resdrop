import { useNavigate } from 'react-router-dom';
import { IconTrendDown, IconShield, IconBell, IconArrowRight } from './Icons';
import { useI18n } from '../i18n';
import './Hero.css';

const DEMO_CARDS = [
  {
    initials: 'FI',
    nameKey: 'hero.card1Name',
    locKey: 'hero.card1Loc',
    roomKey: 'hero.card1Room',
    originalPrice: 'R$4.200',
    newPrice: 'R$3.150',
    savings: 'R$1.050',
    percent: '-25%',
  },
  {
    initials: 'GM',
    nameKey: 'hero.card2Name',
    locKey: 'hero.card2Loc',
    roomKey: 'hero.card2Room',
    originalPrice: 'R$2.880',
    newPrice: 'R$1.870',
    savings: 'R$1.010',
    percent: '-35%',
    highlight: true,
  },
  {
    initials: 'CP',
    nameKey: 'hero.card3Name',
    locKey: 'hero.card3Loc',
    roomKey: 'hero.card3Room',
    originalPrice: 'R$9.600',
    newPrice: 'R$7.200',
    savings: 'R$2.400',
    percent: '-25%',
  },
];

function Hero() {
  const onGetStarted = useNavigate();
  const goSignup = () => onGetStarted('/signup');
  const { t } = useI18n();
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="container hero-content">
        <div className="hero-label">
          <span className="hero-dot" />
          {t('hero.badge')}
        </div>

        <h1 className="hero-title">
          {t('hero.title1')}<br />
          <span className="hero-highlight">{t('hero.title2')}</span>
        </h1>

        <p className="hero-subtitle">
          {t('hero.subtitle')}
        </p>

        <div className="hero-actions">
          <button className="btn btn-accent btn-lg" onClick={goSignup}>
            {t('hero.cta')}
            <IconArrowRight size={18} />
          </button>
          <button className="btn btn-white btn-lg" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('hero.howItWorks')}
          </button>
        </div>

        <div className="hero-trust">
          <div className="trust-item">
            <IconTrendDown size={18} />
            <div><span>{t('hero.trust1')}</span></div>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <IconShield size={18} />
            <div><span>{t('hero.trust2')}</span></div>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <IconBell size={18} />
            <div><span>{t('hero.trust3')}</span></div>
          </div>
        </div>
      </div>

      <div className="hero-cards-wrap container">
        <div className="hero-cards-grid">
          {DEMO_CARDS.map((card, i) => (
            <div className={`hero-card${card.highlight ? ' hero-card--highlight' : ''}`} key={i}>
              <div className="hc-header">
                <div className="hc-hotel">
                  <div className={`hc-avatar${card.highlight ? ' hc-avatar--highlight' : ''}`}>{card.initials}</div>
                  <div>
                    <div className="hc-name">{t(card.nameKey)}</div>
                    <div className="hc-loc">{t(card.locKey)}</div>
                  </div>
                </div>
                <span className="badge badge-success">{t('hero.saved')}</span>
              </div>
              <div className="hc-room-type">{t(card.roomKey)}</div>
              <div className="hc-prices">
                <div className="hc-price-col">
                  <span className="hc-price-label">{t('hero.originalPrice')}</span>
                  <span className="hc-price-old">{card.originalPrice}</span>
                </div>
                <div className="hc-arrow"><IconArrowRight size={20} /></div>
                <div className="hc-price-col">
                  <span className="hc-price-label">{t('hero.newPrice')}</span>
                  <span className="hc-price-new">{card.newPrice}</span>
                </div>
                <div className="hc-saving">
                  <span className="hc-saving-amt">{t('common.save')} {card.savings}</span>
                  <span className="hc-saving-pct">{card.percent}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="hero-platform-count">{t('hero.platformCount')}</p>
      </div>
    </section>
  );
}

export default Hero;
