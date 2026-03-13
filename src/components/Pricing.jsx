import { useI18n } from '../i18n';
import { IconCheck, IconX, IconCrown, IconZap, IconStar } from './Icons';
import './Pricing.css';

const plans = [
  {
    id: 'free',
    name: 'Free',
    namePt: 'Gratis',
    price: 0,
    icon: IconZap,
    desc: 'Experimente a plataforma sem compromisso.',
    descEn: 'Try the platform with no commitment.',
    bookings: 1,
    features: [
      { pt: '1 reserva por mes', en: '1 booking per month', included: true },
      { pt: '1 busca por dia', en: '1 search per day', included: true },
      { pt: 'Alertas por email', en: 'Email alerts', included: true },
      { pt: '6 fontes OTA', en: '6 OTA sources', included: true },
      { pt: 'Alertas prioritarios', en: 'Priority alerts', included: false },
      { pt: 'Suporte dedicado', en: 'Dedicated support', included: false },
    ],
  },
  {
    id: 'viajante',
    name: 'Viajante',
    namePt: 'Viajante',
    price: 25,
    icon: IconStar,
    desc: 'Para viajantes frequentes que querem mais economia.',
    descEn: 'For frequent travelers who want more savings.',
    bookings: 10,
    popular: true,
    features: [
      { pt: '10 reservas por mes', en: '10 bookings per month', included: true },
      { pt: 'Buscas ilimitadas', en: 'Unlimited searches', included: true },
      { pt: 'Alertas por email e push', en: 'Email + push alerts', included: true },
      { pt: 'Todas fontes OTA', en: 'All OTA sources', included: true },
      { pt: 'Alertas prioritarios', en: 'Priority alerts', included: true },
      { pt: 'Suporte dedicado', en: 'Dedicated support', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    namePt: 'Premium',
    price: 100,
    icon: IconCrown,
    desc: 'Economia maxima para familias e viajantes premium.',
    descEn: 'Maximum savings for families and premium travelers.',
    bookings: 50,
    features: [
      { pt: '50 reservas por mes', en: '50 bookings per month', included: true },
      { pt: 'Buscas ilimitadas', en: 'Unlimited searches', included: true },
      { pt: 'Todos canais de alerta', en: 'All alert channels', included: true },
      { pt: 'Todas fontes OTA + direto', en: 'All OTA sources + direct', included: true },
      { pt: 'Alertas prioritarios', en: 'Priority alerts', included: true },
      { pt: 'Suporte dedicado', en: 'Dedicated support', included: true },
    ],
  },
];

function Pricing({ onSelectPlan }) {
  const { t, lang } = useI18n();

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
                onClick={() => onSelectPlan?.(plan.id)}
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
