import { IconPercent, IconRefresh, IconChart, IconShield, IconTrendDown, IconCheck } from './Icons';
import { useI18n } from '../i18n';
import './PriceStrategy.css';

const reasons = [
  { icon: IconPercent, titleKey: 'strategy.reason1Title', descKey: 'strategy.reason1Desc' },
  { icon: IconRefresh, titleKey: 'strategy.reason2Title', descKey: 'strategy.reason2Desc' },
  { icon: IconChart, titleKey: 'strategy.reason3Title', descKey: 'strategy.reason3Desc' },
  { icon: IconShield, titleKey: 'strategy.reason4Title', descKey: 'strategy.reason4Desc' },
];

const trustItems = [
  'strategy.trust1',
  'strategy.trust2',
  'strategy.trust3',
  'strategy.trust4',
];

function PriceStrategy() {
  const { t } = useI18n();
  return (
    <section className="section strategy-section">
      <div className="container">
        <div className="section-header">
          <div className="section-label"><IconTrendDown size={15} /> {t('strategy.label')}</div>
          <h2 className="section-title">{t('strategy.title')}</h2>
          <p className="section-subtitle">{t('strategy.subtitle')}</p>
        </div>

        <div className="strategy-grid">
          {reasons.map((r, i) => (
            <div className="strategy-card" key={i}>
              <div className="strategy-icon-wrap"><r.icon size={22} /></div>
              <h3 className="strategy-title">{t(r.titleKey)}</h3>
              <p className="strategy-desc">{t(r.descKey)}</p>
            </div>
          ))}
        </div>

        <div className="strategy-trust-bar">
          {trustItems.map((key, i) => (
            <div className="trust-bar-item" key={i}>
              <IconCheck size={16} />
              <span>{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PriceStrategy;
