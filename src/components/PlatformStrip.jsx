import { useI18n } from '../i18n';
import './PlatformStrip.css';

const PLATFORMS = [
  'Booking.com', 'Expedia', 'Hotels.com', 'Agoda', 'Trip.com',
  'Kayak', 'Trivago', 'Priceline', 'Google Hotels', 'Hotwire',
  'Orbitz', 'Travelocity', 'CheapTickets', 'HotelsCombined', 'Momondo',
  'Skyscanner Hotels', 'Hurb', 'Hotel Urbano', 'Decolar', 'MaxMilhas',
  '123Milhas',
];

function PlatformStrip() {
  const { t } = useI18n();
  return (
    <section className="section platform-strip-section">
      <div className="container">
        <p className="platform-strip-title">{t('platforms.title')}</p>
        <div className="platform-strip">
          {PLATFORMS.map((name) => (
            <span className="platform-pill" key={name}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PlatformStrip;
