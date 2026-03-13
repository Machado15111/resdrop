import { IconTrendDown, IconShield, IconBell, IconArrowRight } from './Icons';
import { useI18n } from '../i18n';
import './Hero.css';

function Hero({ onGetStarted }) {
  const { t, lang } = useI18n();
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
          <button className="btn btn-accent btn-lg" onClick={onGetStarted}>
            {lang === 'pt' ? 'Criar Conta Gratis' : 'Create Free Account'}
            <IconArrowRight size={18} />
          </button>
          <button className="btn btn-white btn-lg" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('hero.howItWorks')}
          </button>
        </div>

        <div className="hero-trust">
          <div className="trust-item">
            <IconTrendDown size={18} />
            <div>
              <span>{t('hero.trust1')}</span>
            </div>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <IconShield size={18} />
            <div>
              <span>{t('hero.trust2')}</span>
            </div>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <IconBell size={18} />
            <div>
              <span>{t('hero.trust3')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-card-wrap container">
        <div className="hero-card">
          <div className="hc-header">
            <div className="hc-hotel">
              <div className="hc-avatar">MP</div>
              <div>
                <div className="hc-name">Melia Paulista</div>
                <div className="hc-loc">Sao Paulo, Brasil &middot; Abr 30 - Mai 3</div>
              </div>
            </div>
            <span className="badge badge-success">{t('hero.saved')}</span>
          </div>
          <div className="hc-prices">
            <div className="hc-price-col">
              <span className="hc-price-label">{t('hero.originalPrice')}</span>
              <span className="hc-price-old">R$3.421</span>
            </div>
            <div className="hc-arrow"><IconArrowRight size={20} /></div>
            <div className="hc-price-col">
              <span className="hc-price-label">{t('hero.newPrice')}</span>
              <span className="hc-price-new">R$3.079</span>
            </div>
            <div className="hc-saving">
              <span className="hc-saving-amt">{lang === 'pt' ? 'Economize' : 'Save'} R$342</span>
              <span className="hc-saving-pct">-10%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
