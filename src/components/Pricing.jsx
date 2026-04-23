import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { IconCheck, IconX, IconCrown, IconZap, IconStar } from './Icons';
import './Pricing.css';

const plans = [
  {
    id: 'free',
    name: 'Free',
    namePt: 'Gratuito',
    price: { usd: 0, brl: 0 },
    icon: IconZap,
    desc: {
      en: 'Monitor one upcoming reservation at no cost. Full rate monitoring, immediate alerts.',
      pt: 'Monitore uma reserva por conta propria, sem custo. Monitoramento completo com alertas imediatos.',
    },
    bookings: { en: '1 active booking', pt: '1 reserva ativa' },
    features: [
      { en: 'Monitor 1 refundable booking', pt: 'Monitorar 1 reserva reembolsavel', included: true },
      { en: 'Hotel direct, Expedia, Booking.com', pt: 'Hotel direto, Expedia, Booking.com', included: true },
      { en: 'Immediate email alerts', pt: 'Alertas por email imediatos', included: true },
      { en: 'Price history log', pt: 'Historico de tarifas', included: false },
      { en: 'Priority alert delivery', pt: 'Entrega prioritaria de alertas', included: false },
      { en: 'Special fare monitoring', pt: 'Monitoramento de tarifas especiais', included: false },
    ],
  },
  {
    id: 'traveler',
    name: 'Traveler',
    namePt: 'Viajante',
    price: { usd: 9, brl: 25 },
    icon: IconStar,
    desc: {
      en: 'For travelers with multiple upcoming stays. Monitor all your bookings at once.',
      pt: 'Para quem viaja com frequencia. Monitore todas as suas reservas ao mesmo tempo.',
    },
    bookings: { en: 'Up to 10 active bookings', pt: 'Ate 10 reservas ativas' },
    popular: true,
    features: [
      { en: 'Monitor up to 10 bookings', pt: 'Monitorar ate 10 reservas', included: true },
      { en: 'Hotel direct, Expedia, Booking.com', pt: 'Hotel direto, Expedia, Booking.com', included: true },
      { en: 'Immediate email alerts', pt: 'Alertas por email imediatos', included: true },
      { en: 'Full price history log', pt: 'Historico completo de tarifas', included: true },
      { en: 'Priority alert delivery', pt: 'Entrega prioritaria de alertas', included: true },
      { en: 'Special fare monitoring', pt: 'Monitoramento de tarifas especiais', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    namePt: 'Premium',
    price: { usd: 29, brl: 100 },
    icon: IconCrown,
    desc: {
      en: 'For frequent travelers who want full coverage, including special fares from partner sources.',
      pt: 'Para viajantes frequentes que querem cobertura total, incluindo tarifas especiais de fontes parceiras.',
    },
    bookings: { en: 'Up to 50 active bookings', pt: 'Ate 50 reservas ativas' },
    features: [
      { en: 'Monitor up to 50 bookings', pt: 'Monitorar ate 50 reservas', included: true },
      { en: 'Hotel direct, Expedia, Booking.com', pt: 'Hotel direto, Expedia, Booking.com', included: true },
      { en: 'Immediate email alerts', pt: 'Alertas por email imediatos', included: true },
      { en: 'Full price history + reports', pt: 'Historico completo + relatorios', included: true },
      { en: 'Priority alert delivery', pt: 'Entrega prioritaria de alertas', included: true },
      { en: 'Special fare monitoring', pt: 'Monitoramento de tarifas especiais', included: true },
    ],
  },
];

function Pricing() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isBrl = lang === 'pt';

  const formatPrice = (plan) => {
    if (plan.price.usd === 0) return null;
    return isBrl
      ? { symbol: 'R$', amount: plan.price.brl }
      : { symbol: '$', amount: plan.price.usd };
  };

  return (
    <section className="section pricing-section" id="pricing">
      <div className="container">
        <div className="section-header">
          <div className="section-label">{t('pricing.label')}</div>
          <h2 className="section-title">{t('pricing.title')}</h2>
          <p className="section-subtitle">
            {lang === 'pt'
              ? 'Todos os planos monitoram o site oficial do hotel, Expedia, Booking.com e fontes suportadas. Sem remarkacao automatica. Sempre sua decisao.'
              : 'Every plan monitors the hotel\'s official website, Expedia, Booking.com, and supported sources. No automatic rebooking. Always your decision.'}
          </p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => {
            const priceData = formatPrice(plan);
            return (
              <div className={`pricing-card ${plan.popular ? 'pricing-popular' : ''}`} key={plan.id}>
                {plan.popular && (
                  <div className="pricing-badge">
                    {lang === 'pt' ? 'Mais popular' : 'Most popular'}
                  </div>
                )}
                <div className="pricing-card-header">
                  <div className={`pricing-icon pricing-icon-${plan.id}`}>
                    <plan.icon size={22} />
                  </div>
                  <h3 className="pricing-name">{lang === 'pt' ? plan.namePt : plan.name}</h3>
                  <p className="pricing-desc">{plan.desc[lang === 'pt' ? 'pt' : 'en']}</p>
                </div>
                <div className="pricing-price">
                  {!priceData ? (
                    <span className="pricing-amount pricing-free">{t('pricing.free')}</span>
                  ) : (
                    <>
                      <span className="pricing-currency">{priceData.symbol}</span>
                      <span className="pricing-amount">{priceData.amount}</span>
                      <span className="pricing-period">{t('pricing.month')}</span>
                    </>
                  )}
                </div>
                <div className="pricing-limit">
                  {plan.bookings[lang === 'pt' ? 'pt' : 'en']}
                </div>
                <ul className="pricing-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className={f.included ? 'included' : 'excluded'}>
                      {f.included ? <IconCheck size={16} /> : <IconX size={16} />}
                      {f[lang === 'pt' ? 'pt' : 'en']}
                    </li>
                  ))}
                </ul>
                <button
                  className={`btn ${plan.popular ? 'btn-accent' : 'btn-outline'} pricing-cta`}
                  onClick={() => navigate('/signup')}
                >
                  {plan.price.usd === 0
                    ? (lang === 'pt' ? 'Comecar Gratis' : 'Start Free')
                    : (lang === 'pt' ? 'Comecar' : 'Get Started')}
                </button>
              </div>
            );
          })}
        </div>

        <div className="pricing-trust">
          <span>{lang === 'pt' ? 'Sem cartao de credito para o plano gratuito' : 'No credit card required for free plan'}</span>
          <span className="pricing-trust-dot">·</span>
          <span>{lang === 'pt' ? 'Cancele quando quiser' : 'Cancel anytime'}</span>
          <span className="pricing-trust-dot">·</span>
          <span>{lang === 'pt' ? 'Nunca remarcamos sem sua aprovacao' : 'We never rebook without your approval'}</span>
        </div>
      </div>
    </section>
  );
}

export default Pricing;
export { plans };
