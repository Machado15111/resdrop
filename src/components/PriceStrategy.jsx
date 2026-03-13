import { IconChart, IconClock, IconPercent, IconCalendar, IconHotel, IconRefresh, IconShield, IconTrendDown } from './Icons';
import { useI18n } from '../i18n';
import './PriceStrategy.css';

const strategies = [
  { icon: IconChart, pt: 'Comparacao Multi-Fonte', en: 'Multi-Source Comparison', descPt: 'Escaneamos Booking.com, Expedia, Hotels.com, Agoda, Trip.com e sites diretos de hoteis — tudo automaticamente.', descEn: 'We scan Booking.com, Expedia, Hotels.com, Agoda, Trip.com and direct hotel sites — all automatically.', tag: 'Core' },
  { icon: IconClock, pt: 'Monitoramento Inteligente', en: 'Smart Monitoring', descPt: 'Verificamos precos varias vezes ao dia. Precos costumam cair 1-3 semanas antes do check-in quando hoteis tentam preencher quartos.', descEn: 'We check prices multiple times daily. Prices often drop 1-3 weeks before check-in as hotels try to fill rooms.', tag: 'Timing' },
  { icon: IconPercent, pt: 'Arbitragem de Precos', en: 'Price Arbitrage', descPt: 'O mesmo quarto pode custar valores diferentes em cada plataforma. Nos encontramos a menor tarifa entre todas.', descEn: 'The same room can cost different amounts on each platform. We find the lowest rate across all of them.', tag: 'Arbitrage' },
  { icon: IconCalendar, pt: 'Padroes Sazonais', en: 'Seasonal Patterns', descPt: 'Baixa temporada, meio de semana e eventos cancelados criam oportunidades de economia de ate 40%.', descEn: 'Off-peak periods, mid-week stays, and cancelled events create savings opportunities up to 40%.', tag: 'Patterns' },
  { icon: IconHotel, pt: 'Tarifas Diretas', en: 'Direct Rates', descPt: 'Hoteis frequentemente oferecem tarifas exclusivas em seus proprios sites, sem comissoes de intermediarios.', descEn: 'Hotels often offer exclusive rates on their own sites, without intermediary commissions.', tag: 'Direct' },
  { icon: IconRefresh, pt: 'Ate o Check-in', en: 'Until Check-in', descPt: 'Monitoramos do momento da reserva ate o check-in. Cerca de 40% das reservas sofrem queda de preco nesse periodo.', descEn: 'We monitor from booking to check-in. About 40% of reservations see a price drop during this period.', tag: '24/7' },
];

function PriceStrategy() {
  const { t, lang } = useI18n();
  return (
    <section className="section strategy-section">
      <div className="container">
        <div className="section-header">
          <div className="section-label"><IconTrendDown size={15} /> {t('strategy.label')}</div>
          <h2 className="section-title">{t('strategy.title')}</h2>
          <p className="section-subtitle">{t('strategy.subtitle')}</p>
        </div>

        {/* Visual explainer */}
        <div className="price-explainer">
          <div className="explainer-step">
            <div className="explainer-num">1</div>
            <div className="explainer-text">
              <strong>{lang === 'pt' ? 'Voce reserva normalmente' : 'You book normally'}</strong>
              <span>{lang === 'pt' ? 'Em qualquer plataforma, com cancelamento gratuito' : 'On any platform, with free cancellation'}</span>
            </div>
          </div>
          <div className="explainer-arrow">&rarr;</div>
          <div className="explainer-step">
            <div className="explainer-num">2</div>
            <div className="explainer-text">
              <strong>{lang === 'pt' ? 'Nos monitoramos' : 'We monitor'}</strong>
              <span>{lang === 'pt' ? '6+ plataformas, varias vezes ao dia' : '6+ platforms, multiple times daily'}</span>
            </div>
          </div>
          <div className="explainer-arrow">&rarr;</div>
          <div className="explainer-step">
            <div className="explainer-num">3</div>
            <div className="explainer-text">
              <strong>{lang === 'pt' ? 'Preco caiu?' : 'Price dropped?'}</strong>
              <span>{lang === 'pt' ? 'Voce rebooking pelo menor preco e cancela a anterior' : 'You rebook at the lower price and cancel the old one'}</span>
            </div>
          </div>
        </div>

        <div className="strategy-grid">
          {strategies.map((s, i) => (
            <div className="strategy-card" key={i}>
              <div className="strategy-card-top">
                <div className="strategy-icon-wrap"><s.icon size={22} /></div>
                <span className="strategy-tag">{s.tag}</span>
              </div>
              <h3 className="strategy-title">{lang === 'pt' ? s.pt : s.en}</h3>
              <p className="strategy-desc">{lang === 'pt' ? s.descPt : s.descEn}</p>
            </div>
          ))}
        </div>

        <div className="strategy-insight">
          <div className="insight-icon-wrap"><IconShield size={24} /></div>
          <div className="insight-content">
            <p>{t('strategy.insight')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PriceStrategy;
