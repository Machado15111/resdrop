import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { IconCheck, IconX, IconCrown, IconZap, IconStar } from './Icons';
import './Pricing.css';

const plans = [
  {
    id: 'free',
    name: 'Free',
    namePt: 'Gr\u00e1tis',
    price: 0,
    icon: IconZap,
    desc: 'Para experimentar.',
    descEn: 'To try it out.',
    bookings: 1,
    features: [
      { pt: 'Monitoramento de 1 reserva', en: 'Monitor 1 booking', included: true },
      { pt: 'Mais de 20 plataformas', en: 'Over 20 platforms', included: true },
      { pt: 'Alertas por email', en: 'Email alerts', included: true },
      { pt: 'Alertas priorit\u00e1rios', en: 'Priority alerts', included: false },
      { pt: 'Suporte dedicado', en: 'Dedicated support', included: false },
    ],
  },
  {
    id: 'viajante',
    name: 'Viajante',
    namePt: 'Viajante',
    price: 25,
    icon: IconStar,
    desc: 'Ideal para f\u00e9rias e viagens.',
    descEn: 'Perfect for vacation travel.',
    bookings: 10,
    popular: true,
    features: [
      { pt: 'Monitoramento de at\u00e9 10 reservas por m\u00eas', en: 'Monitor up to 10 bookings/month', included: true },
      { pt: 'Mais de 20 plataformas', en: 'Over 20 platforms', included: true },
      { pt: 'Alertas por email e push', en: 'Email & push alerts', included: true },
      { pt: 'Hist\u00f3rico de pre\u00e7os', en: 'Price history', included: true },
      { pt: 'Alertas priorit\u00e1rios', en: 'Priority alerts', included: true },
      { pt: 'Suporte dedicado', en: 'Dedicated support', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    namePt: 'Premium',
    price: 100,
    icon: IconCrown,
    desc: 'Para viajantes frequentes.',
    descEn: 'For frequent travelers.',
    bookings: 50,
    features: [
      { pt: 'Monitoramento de at\u00e9 50 reservas por m\u00eas', en: 'Monitor up to 50 bookings/month', included: true },
      { pt: 'Mais de 20 plataformas', en: 'Over 20 platforms', included: true },
      { pt: 'Alertas priorit\u00e1rios', en: 'Priority alerts', included: true },
      { pt: 'Hist\u00f3rico completo + relat\u00f3rios', en: 'Full history + reports', included: true },
      { pt: 'Suporte dedicado', en: 'Dedicated support', included: true },
    ],
  },
];

function Pricing() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  return (
    <section className="section pricing-section">
      <div className="container">
        <div className="section-header">
          <div className="section-label">{t('pricing.label')}</div>
          <h2 className="section-title">{t('pricing.title')}</h2>
          <p className="section-subtitle">{t('pricing.subtitle')}</p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div className={`pricing-card ${plan.popular ? 'pricing-popular' : ''}`} key={plan.id}>
              {plan.popular && <div className="pricing-badge">{t('pricing.popular')}</div>}
              <div className="pricing-card-header">
                <div className={`pricing-icon pricing-icon-${plan.id}`}>
                  <plan.icon size={22} />
                </div>
                <h3 className="pricing-name">{lang === 'pt' ? plan.namePt : plan.name}</h3>
                <p className="pricing-desc">{lang === 'pt' ? plan.desc : plan.descEn}</p>
              </div>
              <div className="pricing-price">
                {plan.price === 0 ? (
                  <span className="pricing-amount pricing-free">{t('pricing.free')}</span>
                ) : (
                  <>
                    <span className="pricing-currency">R$</span>
                    <span className="pricing-amount">{plan.price}</span>
                    <span className="pricing-period">{t('pricing.month')}</span>
                  </>
                )}
              </div>
              <div className="pricing-limit">
                {plan.bookings} {t('pricing.bookings')}
              </div>
              <ul className="pricing-features">
                {plan.features.map((f, i) => (
                  <li key={i} className={f.included ? 'included' : 'excluded'}>
                    {f.included ? <IconCheck size={16} /> : <IconX size={16} />}
                    {lang === 'pt' ? f.pt : f.en}
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${plan.popular ? 'btn-accent' : 'btn-outline'} pricing-cta`}
                onClick={() => navigate('/signup')}
              >
                {t('pricing.getStarted')}
              </button>
            </div>
          ))}
        </div>

        <div className="pricing-note">{t('pricing.note')}</div>
      </div>
    </section>
  );
}

export default Pricing;
export { plans };
