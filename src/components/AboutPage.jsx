import Footer from './Footer';
import { useI18n } from '../i18n';
import './AboutPage.css';

const STATS = [
  { num: '3x', label: { en: 'Daily monitoring cycles per booking', pt: 'Ciclos de monitoramento diários por reserva' } },
  { num: '3+', label: { en: 'Booking sources checked per cycle', pt: 'Fontes de reserva verificadas por ciclo' } },
  { num: '0',  label: { en: 'Automatic rebookings. Ever.', pt: 'Remarcações automáticas. Nunca.' } },
];

const VALUES = [
  {
    title: { en: 'The traveler stays in control', pt: 'O viajante permanece no controle' },
    desc: {
      en: 'ResDrop surfaces opportunities. It does not create obligations. Every alert gives you the full picture — source, rate, room, cancellation terms. From there, the decision is yours. Nothing about your reservation changes unless you initiate it.',
      pt: 'O ResDrop apresenta oportunidades. Não cria obrigações. Cada alerta traz o panorama completo — fonte, tarifa, quarto, condições de cancelamento. A partir daí, a decisão é sua. Nada na sua reserva muda a menos que você inicie.',
    },
  },
  {
    title: { en: 'Equivalent means equivalent', pt: 'Equivalente significa equivalente' },
    desc: {
      en: 'We compare only like-for-like options: same hotel, same room category, same or better cancellation terms. We do not surface non-refundable alternatives, lower-tier rooms, or different properties — regardless of how the price compares.',
      pt: 'Comparamos apenas opções realmente equivalentes: mesmo hotel, mesma categoria de quarto, condições de cancelamento iguais ou melhores. Não apresentamos alternativas não reembolsáveis, quartos inferiores ou outros hotéis — independentemente do preço.',
    },
  },
  {
    title: { en: 'Transparency about what we check', pt: 'Transparência sobre o que verificamos' },
    desc: {
      en: 'We monitor the hotel\'s official direct booking channel, Expedia, Booking.com, and supported partner sources. When an alert is sent, it tells you exactly where the rate was found. No opaque matching, no mystery sources.',
      pt: 'Monitoramos o canal oficial de reservas do hotel, Expedia, Booking.com e fontes parceiras suportadas. Quando um alerta é enviado, ele informa exatamente onde a tarifa foi encontrada. Sem correspondências opacas, sem fontes misteriosas.',
    },
  },
  {
    title: { en: 'Your data serves one purpose', pt: 'Seus dados servem a um único propósito' },
    desc: {
      en: 'The booking details you add to ResDrop are used to monitor your reservation on your behalf. We do not sell, share, or use your data for advertising, analytics products, or any purpose outside the monitoring service.',
      pt: 'Os detalhes de reserva que você adiciona ao ResDrop são usados para monitorar sua reserva em seu nome. Não vendemos, compartilhamos nem usamos seus dados para publicidade, produtos de análise ou qualquer finalidade fora do serviço de monitoramento.',
    },
  },
];

const STEPS = [
  {
    title: { en: 'Add your confirmed booking', pt: 'Adicione sua reserva confirmada' },
    desc: {
      en: 'Enter the details of any refundable hotel reservation — or forward your confirmation email to your ResDrop address. Monitoring begins immediately.',
      pt: 'Insira os detalhes de qualquer reserva de hotel reembolsável — ou encaminhe o e-mail de confirmação para o seu endereço ResDrop. O monitoramento começa imediatamente.',
    },
  },
  {
    title: { en: 'We monitor continuously', pt: 'Monitoramos continuamente' },
    desc: {
      en: 'ResDrop checks the hotel\'s official site, Expedia, Booking.com, and supported sources three times a day — looking only for equivalent options with the same or better cancellation terms.',
      pt: 'O ResDrop verifica o site oficial do hotel, Expedia, Booking.com e fontes suportadas três vezes ao dia — buscando apenas opções equivalentes com condições de cancelamento iguais ou melhores.',
    },
  },
  {
    title: { en: 'You receive an alert when something appears', pt: 'Você recebe um alerta quando algo aparece' },
    desc: {
      en: 'The alert includes the source, the rate, the room details, and the cancellation terms. Everything you need to evaluate the opportunity and decide whether to act.',
      pt: 'O alerta inclui a fonte, a tarifa, os detalhes do quarto e as condições de cancelamento. Tudo o que você precisa para avaliar a oportunidade e decidir se age.',
    },
  },
];

function AboutPage() {
  const { lang } = useI18n();
  const pt = lang === 'pt';
  const L = (obj) => (pt ? obj.pt : obj.en);

  return (
    <>
      <div className="about-page">

        <section className="about-hero">
          <div className="about-container">
            <div className="about-eyebrow">{pt ? 'NOSSA HISTÓRIA' : 'OUR STORY'}</div>
            <h1>{pt ? 'Feito para o momento depois da reserva.' : 'Built for the moment after booking.'}</h1>
            <p className="about-hero-sub">
              {pt
                ? 'A maioria das ferramentas de viagem ajuda você a encontrar um hotel antes de reservar. O ResDrop foi criado para o que acontece depois — quando a reserva está confirmada e a tarifa continua mudando sem você.'
                : 'Most travel tools help you find a hotel before you book. ResDrop was built for what happens after — when the reservation is confirmed and the rate keeps moving without you.'}
            </p>
          </div>
        </section>

        <section className="about-origin">
          <div className="about-container about-origin-grid">
            <div className="about-origin-text">
              <h2>{pt ? 'Por que criamos isto' : 'Why we built this'}</h2>
              <p>
                {pt
                  ? 'A ideia começou com uma frustração simples: reservar um hotel com meses de antecedência e ver o mesmo quarto a uma tarifa menor duas semanas depois. Àquela altura, a reserva original parecia travada. Verificar manualmente a cada poucos dias era tedioso — e fácil de esquecer.'
                  : 'The idea started with a simple frustration: booking a hotel months in advance, then seeing the same room at a lower rate two weeks later. By then, the original booking felt locked in. Checking manually every few days was tedious, and easy to forget.'}
              </p>
              <p>
                {pt
                  ? 'Tarifas de hotel são dinâmicas. Elas mudam depois que você reserva. Uma tarifa de membro abre no site do hotel. Um quarto equivalente cai de preço na Expedia. Um canal parceiro revela uma tarifa que nunca foi publicamente visível. Nada disso exige ação do viajante — só exige alguém observando.'
                  : 'Hotel rates are dynamic. They change after you book. A member rate opens on the hotel website. An equivalent room drops on Expedia. A partner channel surfaces a rate that was never publicly visible. None of this requires any action from the traveler — it just requires someone watching.'}
              </p>
              <p>
                {pt
                  ? 'O ResDrop é esse observador. Ele monitora sua reserva reembolsável confirmada no site oficial do hotel, Expedia, Booking.com e fontes suportadas — e envia um alerta no momento em que uma opção equivalente melhor aparece. O que você faz com essa informação é totalmente decisão sua.'
                  : 'ResDrop is that watcher. It monitors your confirmed refundable reservation across the hotel\'s official website, Expedia, Booking.com, and supported sources — and sends you an alert the moment a better equivalent option appears. What you do with that information is entirely up to you.'}
              </p>
            </div>
            <div className="about-origin-stat-col">
              {STATS.map((s, i) => (
                <div className="about-stat-card" key={i}>
                  <div className="about-stat-number">{s.num}</div>
                  <div className="about-stat-label">{L(s.label)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-principles">
          <div className="about-container">
            <h2>{pt ? 'No que acreditamos' : 'What we believe'}</h2>
            <div className="about-values-grid">
              {VALUES.map((v, i) => (
                <div className="about-value-item" key={i}>
                  <div className="about-value-num">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{L(v.title)}</h3>
                  <p>{L(v.desc)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-how">
          <div className="about-container">
            <h2>{pt ? 'Como funciona' : 'How it works'}</h2>
            <div className="about-steps">
              {STEPS.map((s, i) => (
                <div className="about-step" key={i}>
                  <div className="about-step-num">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h3>{L(s.title)}</h3>
                    <p>{L(s.desc)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-contact">
          <div className="about-container">
            <h2>{pt ? 'Fale conosco' : 'Get in touch'}</h2>
            <p>
              {pt
                ? 'Dúvidas sobre o produto, sua conta ou um resultado de monitoramento? Fale conosco em '
                : 'Questions about the product, your account, or a monitoring result? Reach us at '}
              <a href="mailto:hello@resdrop.app">hello@resdrop.app</a>.
            </p>
            <p className="about-contact-sub">
              {pt ? 'Buscamos responder em até um dia útil.' : 'We aim to respond within one business day.'}
            </p>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}

export default AboutPage;
