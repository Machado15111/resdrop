import { IconUpload, IconSearch, IconBell, IconDollar } from './Icons';
import { useI18n } from '../i18n';
import './HowItWorks.css';

const stepIcons = [
  { num: '01', icon: IconUpload, titleKey: 'hiw.step1.title', descKey: 'hiw.step1.desc' },
  { num: '02', icon: IconSearch, titleKey: 'hiw.step2.title', descKey: 'hiw.step2.desc' },
  { num: '03', icon: IconBell, titleKey: 'hiw.step3.title', descKey: 'hiw.step3.desc' },
  { num: '04', icon: IconDollar, titleKey: 'hiw.step4.title', descKey: 'hiw.step4.desc' },
];

function HowItWorks() {
  const { t } = useI18n();
  return (
    <section className="section how-it-works" id="how-it-works">
      <div className="container">
        <div className="section-header">
          <div className="section-label">{t('hiw.label')}</div>
          <h2 className="section-title">{t('hiw.title')}</h2>
          <p className="section-subtitle">
            {t('hiw.subtitle')}
          </p>
        </div>
        <div className="hiw-steps">
          {stepIcons.map((step) => (
            <div className="hiw-step" key={step.num}>
              <div className="hiw-step-num">{step.num}</div>
              <div className="hiw-step-icon">
                <step.icon size={28} />
              </div>
              <h3 className="hiw-step-title">{t(step.titleKey)}</h3>
              <p className="hiw-step-desc">{t(step.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
