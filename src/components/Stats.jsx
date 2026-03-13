import { IconBarChart, IconDollar, IconTarget, IconTrendUp } from './Icons';
import { useI18n } from '../i18n';
import './Stats.css';

function Stats({ stats }) {
  const { t, lang } = useI18n();
  const d = stats || { totalBookings: 0, savingsFound: 0, totalSavings: 0, avgSavings: 0, successRate: 0 };

  const items = [
    { icon: IconBarChart, value: d.totalBookings, labelPt: 'Reservas Monitoradas', labelEn: 'Bookings Monitored', color: 'brand' },
    { icon: IconDollar, value: `R$${d.totalSavings.toLocaleString()}`, labelPt: 'Economia Total', labelEn: 'Total Savings Found', color: 'emerald' },
    { icon: IconTarget, value: `${d.successRate}%`, labelPt: 'Taxa de Sucesso', labelEn: 'Success Rate', color: 'brand' },
    { icon: IconTrendUp, value: `R$${d.avgSavings}`, labelPt: 'Economia Media por Reserva', labelEn: 'Avg. Savings Per Booking', color: 'brand' },
  ];

  return (
    <section className="section stats-section">
      <div className="container">
        <div className="section-header">
          <div className="section-label"><IconBarChart size={15} /> {t('stats.label')}</div>
          <h2 className="section-title">{t('stats.title')}</h2>
          <p className="section-subtitle">{t('stats.subtitle')}</p>
        </div>
        <div className="stats-grid">
          {items.map((item, i) => (
            <div className={`stat-card ${item.color === 'emerald' ? 'stat-highlight' : ''}`} key={i}>
              <div className={`stat-icon-wrap stat-icon-${item.color}`}>
                <item.icon size={22} />
              </div>
              <div className="stat-value">{item.value}</div>
              <div className="stat-label">{lang === 'pt' ? item.labelPt : item.labelEn}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Stats;
