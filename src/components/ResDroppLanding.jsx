import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import './ResDroppLanding.css';

/* ── Icons ──────────────────────────────────────────────── */
function IcCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 6.5L5 9.5L11 3.5" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcArrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M2.5 7.5h10M9 4l3.5 3.5L9 11" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcChevron({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcLogo({ size = 28 }) {
  return (
    <img src="/resdrop-logo.png" alt="" width={size} height={size}
      style={{ display: 'block', objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
  );
}

function IcMail() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function IcScan() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h3"/><path d="M19 12h3"/><path d="M12 2v3"/><path d="M12 19v3"/><circle cx="12" cy="12" r="7"/></svg>; }
function IcActivity() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>; }
function IcCompare() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="14" x2="21" y2="3"/><polyline points="8 21 3 21 3 16"/><line x1="20" y1="10" x2="3" y2="21"/></svg>; }
function IcCheckCircle() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }

const STEPS = [
  {
    n: '01',
    title: { en: 'Add your hotel booking', pt: 'Adicione sua reserva de hotel' },
    desc: { en: 'Forward your confirmation email or paste the booking details. ResDrop reads the hotel, dates, room type, cancellation deadline, and total price — accurately, not approximately.', pt: 'Encaminhe o e-mail de confirmação ou cole os detalhes da reserva. O ResDrop lê o hotel, datas, tipo de quarto, prazo de cancelamento e preço total — com precisão, não de forma aproximada.' },
    icon: <IcMail />
  },
  {
    n: '02',
    title: { en: 'ResDrop starts monitoring', pt: 'O ResDrop começa a monitorar' },
    desc: { en: 'We check rates daily — and more frequently as your cancellation deadline approaches. Room type, conditions, taxes, and included benefits are all tracked, not just the headline price.', pt: 'Verificamos tarifas diariamente — e com mais frequência conforme o prazo de cancelamento se aproxima. Tipo de quarto, condições, impostos e benefícios incluídos são todos monitorados, não só o preço principal.' },
    icon: <IcActivity />
  },
  {
    n: '03',
    title: { en: 'You get notified when something better appears', pt: 'Você é avisado quando algo melhor aparece' },
    desc: { en: 'When a lower rate, better room, or improved availability shows up for the same hotel, you receive a clear side-by-side comparison. No noise — only meaningful improvements.', pt: 'Quando uma tarifa mais baixa, quarto melhor ou disponibilidade melhorada aparecer para o mesmo hotel, você recebe uma comparação clara lado a lado. Sem ruído — apenas melhorias que realmente valem.' },
    icon: <IcCompare />
  },
  {
    n: '04',
    title: { en: 'You decide. We never act without you.', pt: 'Você decide. Nunca agimos sem você.' },
    desc: { en: 'Review the comparison and choose: rebook, upgrade, or do nothing. ResDrop never cancels, modifies, or touches your reservation without your explicit approval.', pt: 'Revise a comparação e escolha: remarcar, fazer upgrade ou não fazer nada. O ResDrop nunca cancela, altera ou mexe na sua reserva sem sua aprovação explícita.' },
    icon: <IcCheckCircle />
  },
];

const TRUST_ITEMS = [
  { en: 'Same or better room type', pt: 'Mesmo tipo de quarto ou melhor' },
  { en: 'Equal or better cancellation policy', pt: 'Política de cancelamento igual ou melhor' },
  { en: 'Total price including all taxes and fees', pt: 'Preço total com todos os impostos e taxas' },
  { en: 'Breakfast and included benefits verified', pt: 'Café da manhã e benefícios incluídos verificados' },
  { en: 'Nothing changed without your approval', pt: 'Nada alterado sem a sua aprovação' },
];

const FOR_WHO = [
  {
    n: '01',
    title: { en: 'You booked a refundable hotel', pt: 'Você reservou um hotel reembolsável' },
    desc: { en: 'Refundable reservations are where ResDrop adds the most value. You are protected if you switch — so there is no risk in watching for a better option.', pt: 'Reservas reembolsáveis são onde o ResDrop agrega mais valor. Você está protegido caso mude — então não há risco em monitorar uma opção melhor.' },
  },
  {
    n: '02',
    title: { en: 'You booked early and the price may still drop', pt: 'Você reservou cedo e o preço pode ainda cair' },
    desc: { en: 'The earlier you book, the longer ResDrop has to watch. That window between reservation and check-in is when rates tend to move the most.', pt: 'Quanto mais cedo você reserva, mais tempo o ResDrop tem para monitorar. Essa janela entre a reserva e o check-in é quando as tarifas mais variam.' },
  },
  {
    n: '03',
    title: { en: 'You want a better room', pt: 'Você quer um quarto melhor' },
    desc: { en: 'A room upgrade often becomes available as check-in approaches. ResDrop watches availability and room type — not just the headline price.', pt: 'Um upgrade de quarto frequentemente fica disponível conforme o check-in se aproxima. O ResDrop monitora disponibilidade e tipo de quarto — não só o preço.' },
  },
  {
    n: '04',
    title: { en: 'You are comparing multiple hotels', pt: 'Você está comparando vários hotéis' },
    desc: { en: 'Tracking two or three options before your cancellation window closes? Add them all. ResDrop monitors each one and tells you when it is time to act.', pt: 'Monitorando duas ou três opções antes de fechar a janela de cancelamento? Adicione todas. O ResDrop acompanha cada uma e avisa quando é hora de agir.' },
  },
  {
    n: '05',
    title: { en: 'You are tired of checking manually', pt: 'Você está cansado de verificar manualmente' },
    desc: { en: 'Most travelers check hotel prices four to six times after booking. Forward your confirmation once. ResDrop does the checking for you.', pt: 'A maioria dos viajantes verifica preços de hotel de 4 a 6 vezes após reservar. Encaminhe sua confirmação uma vez. O ResDrop verifica por você.' },
  },
];

const HOTEL_EXAMPLES = [
  {
    name: 'Park Hyatt Tokyo',
    location: 'Tokyo, Japan',
    room: 'Park Room, City View',
    nights: 3,
    was: 478,
    now: 389,
    saved: 267,
    reason: { en: 'A lower refundable member rate became available for the same room and dates.', pt: 'Uma tarifa de membro reembolsável mais baixa ficou disponível para o mesmo quarto e datas.' },
    img: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Shinjuku_Park_Tower_2018_from_MetGovBld.jpg',
  },
  {
    name: 'Rosewood London',
    location: 'London, United Kingdom',
    room: 'Deluxe Room, Garden View',
    nights: 4,
    was: 680,
    now: 595,
    saved: 340,
    reason: { en: 'A flexible rate with breakfast included reopened at a reduced price.', pt: 'Uma tarifa flexível com café da manhã incluído reabriu a um preço reduzido.' },
    img: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/The_Renaissance_Chancery_Court_Hotel%2C_High_Holborn-4846480310.jpg',
  },
  {
    name: 'Fasano Sao Paulo',
    location: 'Sao Paulo, Brazil',
    room: 'Classic Room',
    nights: 3,
    was: 1290,
    now: 1020,
    saved: 630,
    reason: { en: 'A preferred partner rate with added benefits matched the same stay at an improved price.', pt: 'Uma tarifa de parceiro preferencial com benefícios adicionais atendeu à mesma estadia a um preço melhor.' },
    img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  },
];

const FREE_FEATS = [
  { en: 'Track up to 2 bookings', pt: 'Monitore até 2 reservas' },
  { en: 'Daily rate monitoring', pt: 'Monitoramento diário de tarifas' },
  { en: 'Email alerts when something better appears', pt: 'Alertas por e-mail quando algo melhor aparecer' },
  { en: 'Full side-by-side comparison', pt: 'Comparação completa lado a lado' },
];

const PLUS_FEATS = [
  { en: 'Unlimited bookings tracked', pt: 'Reservas ilimitadas monitoradas' },
  { en: 'Priority monitoring — twice daily', pt: 'Monitoramento prioritário — duas vezes ao dia' },
  { en: 'Email and push notifications', pt: 'Notificações por e-mail e push' },
  { en: 'Savings dashboard', pt: 'Painel de economia' },
  { en: 'Priority support', pt: 'Suporte prioritário' },
];

const FAQS = [
  {
    q: { en: 'Does ResDrop automatically cancel or rebook my hotel?', pt: 'O ResDrop cancela ou remarca meu hotel automaticamente?' },
    a: { en: 'No. We never touch your reservation. ResDrop only monitors and alerts. Every action — rebook, upgrade, or do nothing — is always your decision.', pt: 'Não. Nunca tocamos na sua reserva. O ResDrop apenas monitora e alerta. Cada ação — remarcar, fazer upgrade ou não fazer nada — é sempre sua decisão.' },
  },
  {
    q: { en: 'Which bookings work best with ResDrop?', pt: 'Quais reservas funcionam melhor com o ResDrop?' },
    a: { en: 'Refundable hotel bookings made in advance — typically 4 to 12 weeks before check-in. The longer the monitoring window, the more opportunities ResDrop has to find a better deal.', pt: 'Reservas de hotel reembolsáveis feitas com antecedência — normalmente 4 a 12 semanas antes do check-in. Quanto maior a janela de monitoramento, mais oportunidades o ResDrop tem de encontrar uma opção melhor.' },
  },
  {
    q: { en: 'Does it work with Booking.com, Expedia, and hotel websites?', pt: 'Funciona com Booking.com, Expedia e sites de hotéis?' },
    a: { en: 'Yes. Forward your confirmation email from any major booking platform. ResDrop checks publicly available rates to find matching or better options for the same hotel.', pt: 'Sim. Encaminhe o e-mail de confirmação de qualquer plataforma principal. O ResDrop verifica tarifas disponíveis publicamente para encontrar opções iguais ou melhores para o mesmo hotel.' },
  },
  {
    q: { en: 'What if the cheaper rate has worse conditions?', pt: 'E se a tarifa mais barata tiver condições piores?' },
    a: { en: 'We will not surface it. ResDrop verifies room type, cancellation policy, taxes, fees, and included benefits before sending any alert. If the alternative is worse in any meaningful way, we stay quiet.', pt: 'Não exibiremos. O ResDrop verifica tipo de quarto, política de cancelamento, impostos, taxas e benefícios incluídos antes de enviar qualquer alerta. Se a alternativa for pior em qualquer aspecto relevante, ficamos quietos.' },
  },
  {
    q: { en: 'Is ResDrop a hotel booking site?', pt: 'O ResDrop é um site de reservas de hotéis?' },
    a: { en: 'No. You book through your usual channel — Booking.com, Expedia, the hotel\'s own website. ResDrop is the layer that watches what happens to your rate after you book, and alerts you when it is worth acting.', pt: 'Não. Você reserva pelo canal que preferir — Booking.com, Expedia, o site do próprio hotel. O ResDrop é a camada que monitora o que acontece com sua tarifa depois da reserva — e te avisa quando vale a pena agir.' },
  },
];

/* ── Component ───────────────────────────────────────────── */
export default function ResDroppLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen,  setFaqOpen]  = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { lang, toggleLang } = useI18n();
  const pt = lang === 'pt';

  useEffect(() => {
    const h = () => {
      setScrolled(window.scrollY > 12);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', h, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', h);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const els = document.querySelectorAll('.rdp-fade');
    if (!els.length) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('rdp-fade--in'); io.unobserve(e.target); }
      }),
      { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="rdp">

      {/* NAV */}
      <nav className={`rdp-nav${scrolled ? ' rdp-nav--scrolled' : ''}`}>
        <div className="rdp-nav__inner">
          <Link to="/" className="rdp-nav__logo" onClick={() => setMenuOpen(false)}>
            <IcLogo /><span>ResDrop</span>
          </Link>
          <div className="rdp-nav__links">
            <a href="#how-it-works">{pt ? 'Como funciona' : 'How it works'}</a>
            <a href="#savings">{pt ? 'Economia' : 'Savings'}</a>
            <a href="#pricing">{pt ? 'Preços' : 'Pricing'}</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="rdp-nav__actions">
            <button className="rdp-nav__login" onClick={toggleLang} style={{marginRight: '16px'}}>
              {pt ? 'EN' : 'PT'}
            </button>
            <Link to="/login" className="rdp-nav__login">{pt ? 'Entrar' : 'Log in'}</Link>
            <Link to="/signup" className="rdp-btn rdp-btn--sm rdp-btn--green">{pt ? 'Começar grátis' : 'Start free'}</Link>
          </div>
          <button
            className={`rdp-nav__burger${menuOpen ? ' rdp-nav__burger--open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="rdp-nav__drawer">
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>{pt ? 'Como funciona' : 'How it works'}</a>
            <a href="#savings"      onClick={() => setMenuOpen(false)}>{pt ? 'Economia' : 'Savings'}</a>
            <a href="#pricing"      onClick={() => setMenuOpen(false)}>{pt ? 'Preços' : 'Pricing'}</a>
            <a href="#faq"          onClick={() => setMenuOpen(false)}>FAQ</a>
            <Link to="/login"   onClick={() => setMenuOpen(false)}>{pt ? 'Entrar' : 'Log in'}</Link>
            <Link to="/signup"  className="rdp-btn rdp-btn--green rdp-btn--block" onClick={() => setMenuOpen(false)}>
              {pt ? 'Começar grátis' : 'Start tracking free'}
            </Link>
          </div>
        )}
      </nav>

      <main>

        {/* HERO */}
        <section className="rdp-hero">
          <div className="rdp-hero__content">
            <div className="rdp-kicker">{pt ? 'Monitoramento pós-reserva' : 'Post-booking monitoring'}</div>
            <h1 className="rdp-hero__h1">
              {pt ? 'Os preços mudam depois que você reserva.' : 'Hotel prices change after you book.'}<br />
              <span className="rdp-hero__h1--accent">{pt ? 'O ResDrop encontra a melhor opção.' : 'ResDrop catches the better deal.'}</span>
            </h1>
            <p className="rdp-hero__sub">
              {pt ? 'Adicione sua reserva uma vez. O ResDrop monitora tarifas, tipos de quarto e disponibilidade — e te avisa assim que aparecer uma opção genuinamente melhor para o mesmo hotel.' : 'Add your booking once. ResDrop monitors rates, room types, and availability — and alerts you the moment a genuinely better option appears for the same hotel.'}
            </p>
            <div className="rdp-hero__ctas">
              <Link to="/signup" className="rdp-btn rdp-btn--green rdp-btn--lg">
                {pt ? 'Começar a monitorar grátis' : 'Start tracking free'} <IcArrow />
              </Link>
              <a href="#how-it-works" className="rdp-btn rdp-btn--outline rdp-btn--lg">
                {pt ? 'Veja como funciona' : 'See how it works'}
              </a>
            </div>
            <ul className="rdp-hero__trust">
              <li><IcCheck /> {pt ? 'Sem cartão de crédito' : 'No credit card required'}</li>
              <li className="rdp-hero__trust-sep" aria-hidden="true" />
              <li><IcCheck /> {pt ? 'Nunca alteramos sua reserva sem aprovação' : 'We never touch your booking without approval'}</li>
              <li className="rdp-hero__trust-sep" aria-hidden="true" />
              <li><IcCheck /> {pt ? 'Configuração em menos de 2 minutos' : 'Takes under 2 minutes'}</li>
            </ul>
          </div>

          <div className="rdp-hero__visual">
            <div className="rdp-hw" style={{
              transform: `perspective(1400px) rotateX(${Math.max(0, 40 - scrollY * 0.08)}deg) scale(${Math.min(1.05, 0.85 + scrollY * 0.0004)}) translateY(${Math.max(-40, 120 - scrollY * 0.35)}px)`,
              boxShadow: `0 ${30 + scrollY * 0.2}px ${60 + scrollY * 0.3}px -20px rgba(26,92,55,${Math.min(0.4, 0.15 + scrollY * 0.0005)}), 0 0 0 1px rgba(0,0,0,0.06)`
            }}>
              {/* Browser Chrome */}
              <div className="rdp-hw__chrome">
                <div className="rdp-hw__dots">
                  <span className="rdp-hw__dot rdp-hw__dot--red" />
                  <span className="rdp-hw__dot rdp-hw__dot--yellow" />
                  <span className="rdp-hw__dot rdp-hw__dot--green" />
                </div>
                <div className="rdp-hw__url">app.resdrop.com</div>
              </div>
              
              <div className="rdp-hw__inner-body">
                {/* Sidebar */}
                <div className="rdp-hw__sidebar">
                  <div className="rdp-hw__logo">
                    <IcLogo size={20} />
                    <span>ResDrop</span>
                  </div>
                <nav className="rdp-hw__nav">
                  <div className="rdp-hw__nav-item rdp-hw__nav-item--active">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    My Bookings
                  </div>
                  <div className="rdp-hw__nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Alerts
                    <span className="rdp-hw__badge-dot">2</span>
                  </div>
                  <div className="rdp-hw__nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Savings
                  </div>
                </nav>
                <div className="rdp-hw__user">
                  <div className="rdp-hw__avatar">S</div>
                  <span>Sofia M.</span>
                </div>
              </div>

              {/* Main panel */}
              <div className="rdp-hw__main">
                <div className="rdp-hw__main-hd">
                  <h3 className="rdp-hw__main-title">Tracked Bookings</h3>
                </div>

                <div className="rdp-hw__stats">
                  <div className="rdp-hw__stat">
                    <div className="rdp-hw__stat-label">MONITORING</div>
                    <div className="rdp-hw__stat-val">3</div>
                  </div>
                  <div className="rdp-hw__stat">
                    <div className="rdp-hw__stat-label">TOTAL SAVED</div>
                    <div className="rdp-hw__stat-val rdp-hw__stat-val--green">$412</div>
                  </div>
                  <div className="rdp-hw__stat">
                    <div className="rdp-hw__stat-label">ALERTS</div>
                    <div className="rdp-hw__stat-val">7</div>
                  </div>
                </div>

                <div className="rdp-hw__alert">
                  <div className="rdp-hw__alert-ic">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  </div>
                  <div className="rdp-hw__alert-body">
                    <strong>Rate Improvement Found</strong>
                    <span>Park Hyatt Tokyo · Rate improved from $478 to $389/night</span>
                  </div>
                </div>

                <div className="rdp-hw__table">
                  {[
                    { name: 'Park Hyatt Tokyo',  dates: 'Mar 14-17', rate: '$389/nt', status: 'Drop found',  type: 'drop'       },
                    { name: 'Rosewood London',    dates: 'Apr 2-5',   rate: '$620/nt', status: 'Monitoring', type: 'monitoring'  },
                    { name: 'Fasano São Paulo',   dates: 'Apr 19-22', rate: '$1,020/nt', status: 'Monitoring', type: 'monitoring' },
                  ].map((row, i) => (
                    <div key={i} className="rdp-hw__row">
                      <div className="rdp-hw__row-info">
                        <span className="rdp-hw__row-name">{row.name}</span>
                        <span className="rdp-hw__row-dates">{row.dates}</span>
                      </div>
                      <span className="rdp-hw__row-rate">{row.rate}</span>
                      <span className={`rdp-hw__status rdp-hw__status--${row.type}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* PROBLEM */}
        <section className="rdp-section rdp-problem rdp-fade">
          <div className="rdp-container rdp-problem__inner">
            <div className="rdp-problem__text">
              <div className="rdp-kicker">{pt ? 'O problema' : 'The problem'}</div>
              <h2 className="rdp-h2">
                {pt ? 'Você reservou o hotel.' : 'You booked the hotel.'}<br />
                {pt ? 'Mas o preço pode mudar.' : 'But the price may still change.'}
              </h2>
              <p className="rdp-problem__body">
                {pt
                  ? 'As tarifas de hotel mudam constantemente — mesmo depois que você reserva. Quartos melhores aparecem. Cancelamentos acontecem. Novas promoções entram no ar. A maioria dos viajantes nunca verifica novamente e perde a chance de economizar ou fazer upgrade.'
                  : 'Hotel rates move constantly — even after you book. Better rooms open up. Cancellations happen. New promotions appear. Most travelers never check again — and miss the chance to save or upgrade.'}
              </p>
            </div>
            <div className="rdp-problem__stats">
              <div className="rdp-problem__stat">
                <div className="rdp-problem__stat-num">72%</div>
                <div className="rdp-problem__stat-label">{pt ? 'das reservas de hotel têm uma tarifa mais baixa disponível antes do check-in' : 'of hotel bookings have a lower rate available before check-in'}</div>
              </div>
              <div className="rdp-problem__stat">
                <div className="rdp-problem__stat-num">4–6×</div>
                <div className="rdp-problem__stat-label">{pt ? 'é quantas vezes o viajante médio verifica o preço manualmente após reservar' : 'is how many times the average traveler manually checks the price after booking'}</div>
              </div>
              <div className="rdp-problem__stat">
                <div className="rdp-problem__stat-num">$180</div>
                <div className="rdp-problem__stat-label">{pt ? 'é a economia média por reserva quando uma melhoria é encontrada e aproveitada' : 'is the average saving per booking when an improvement is found and acted on'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="rdp-section rdp-hiw rdp-fade" id="how-it-works">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">{pt ? 'Como funciona' : 'How it works'}</div>
              <h2 className="rdp-h2">{pt ? 'Quatro passos.' : 'Four steps.'}<br />{pt ? 'Zero esforço depois.' : 'Zero effort after setup.'}</h2>
            </div>
            <ol className="rdp-hiw__list">
              {STEPS.map((s, i) => (
                <li key={i} className={`rdp-hiw__step reveal-on-scroll`} style={{ transitionDelay: `${i * 0.15}s` }}>
                  <div className="rdp-hiw__num">{s.n}</div>
                  <div className="rdp-hiw__body">
                    <h3 className="rdp-hiw__title">
                      <span className="rdp-hiw__icon">{s.icon}</span>
                      {pt ? s.title.pt : s.title.en}
                    </h3>
                    <p className="rdp-hiw__desc">{pt ? s.desc.pt : s.desc.en}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* TRUST */}
        <section className="rdp-section rdp-trust rdp-fade">
          <div className="rdp-container rdp-trust__inner">
            <div className="rdp-trust__left">
              <div className="rdp-kicker">{pt ? 'O que verificamos' : 'What we check'}</div>
              <h2 className="rdp-h2">{pt ? 'Um preço menor' : 'A lower price'}<br />{pt ? 'só vale se tudo mais se mantiver.' : 'is only worth it if everything else holds.'}</h2>
              <p className="rdp-trust__body">
                {pt ? 'Antes de te avisar sobre qualquer coisa, o ResDrop verifica tipo de quarto, política de cancelamento, impostos, taxas e benefícios incluídos. Se a alternativa for pior em qualquer aspecto relevante, ficamos quietos.' : 'Before surfacing anything, ResDrop checks room type, cancellation policy, taxes, fees, and included benefits. If the alternative is worse in any meaningful way, we stay quiet.'}
              </p>
            </div>
            <div className="rdp-trust__right">
              <ul className="rdp-trust__list">
                {TRUST_ITEMS.map((item, i) => (
                  <li key={i} className="rdp-trust__item">
                    <span className="rdp-trust__check"><IcCheck /></span>
                    <span>{pt ? item.pt : item.en}</span>
                  </li>
                ))}
              </ul>
              <p className="rdp-trust__note">
                {pt ? 'Só exibimos opções que são iguais ou melhores em todas as dimensões relevantes.' : 'We only surface options that are equal or better in every relevant dimension.'}
              </p>
            </div>
          </div>
        </section>

        {/* DASHBOARD SECTION */}
        <section className="rdp-section rdp-dashboard rdp-fade">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">{pt ? 'Painel' : 'Dashboard'}</div>
              <h2 className="rdp-h2">{pt ? 'Todas as suas reservas.' : 'All your bookings.'}<br />{pt ? 'Uma visão clara.' : 'One clear view.'}</h2>
              <p className="rdp-section-sub">
                {pt ? 'Acompanhe vários hotéis, veja tarifas atuais e aja nos alertas — em um só lugar.' : 'Track multiple hotels, see current rates, and act on alerts — from one place.'}
              </p>
            </div>
            <div className="rdp-browser">
              <div className="rdp-browser__bar">
                <div className="rdp-browser__dots">
                  <span className="rdp-browser__dot rdp-browser__dot--red" />
                  <span className="rdp-browser__dot rdp-browser__dot--yellow" />
                  <span className="rdp-browser__dot rdp-browser__dot--green" />
                </div>
                <div className="rdp-browser__url">app.resdrop.com/bookings</div>
              </div>
              <div className="rdp-browser__body">
                {/* Sidebar */}
                <div className="rdp-dash-sidebar">
                  <div className="rdp-dash-sidebar__logo"><IcLogo size={22} /> ResDrop</div>
                  <nav className="rdp-dash-sidebar__nav">
                    <div className="rdp-dash-nav-item rdp-dash-nav-item--active">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      {pt ? 'Minhas Reservas' : 'My Bookings'}
                    </div>
                    <div className="rdp-dash-nav-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      {pt ? 'Alertas' : 'Alerts'} <span className="rdp-dash-badge">2</span>
                    </div>
                    <div className="rdp-dash-nav-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      {pt ? 'Economia' : 'Savings'}
                    </div>
                    <div className="rdp-dash-nav-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {pt ? 'Conta' : 'Account'}
                    </div>
                  </nav>
                  <div className="rdp-dash-sidebar__user">
                    <div className="rdp-dash-avatar">S</div>
                    <span>Sofia M.</span>
                  </div>
                </div>
                {/* Main */}
                <div className="rdp-dash-main">
                  <div className="rdp-dash-main__header">
                    <h3 className="rdp-dash-main__title">{pt ? 'Minhas Reservas' : 'My Bookings'}</h3>
                    <button className="rdp-dash-add">+ {pt ? 'Adicionar reserva' : 'Add booking'}</button>
                  </div>
                  <div className="rdp-dash-stats">
                    <div className="rdp-dash-stat">
                      <div className="rdp-dash-stat__label">{pt ? 'RASTREADAS' : 'TRACKED'}</div>
                      <div className="rdp-dash-stat__value">4</div>
                      <div className="rdp-dash-stat__sub">{pt ? 'Reservas ativas' : 'Active reservations'}</div>
                    </div>
                    <div className="rdp-dash-stat">
                      <div className="rdp-dash-stat__label">{pt ? 'MONITORANDO' : 'MONITORING'}</div>
                      <div className="rdp-dash-stat__value">3</div>
                      <div className="rdp-dash-stat__sub">{pt ? 'Verificando agora' : 'Checking now'}</div>
                    </div>
                    <div className="rdp-dash-stat">
                      <div className="rdp-dash-stat__label">{pt ? 'TOTAL ECON.' : 'TOTAL SAVED'}</div>
                      <div className="rdp-dash-stat__value rdp-dash-stat__value--green">$412</div>
                      <div className="rdp-dash-stat__sub">{pt ? 'Desde o início' : 'All time'}</div>
                    </div>
                    <div className="rdp-dash-stat">
                      <div className="rdp-dash-stat__label">{pt ? 'ALERTAS ENV.' : 'ALERTS SENT'}</div>
                      <div className="rdp-dash-stat__value">9</div>
                      <div className="rdp-dash-stat__sub">{pt ? 'Últimos 90 dias' : 'Past 90 days'}</div>
                    </div>
                  </div>
                  <div className="rdp-dash-alert">
                    <div className="rdp-dash-alert__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
                    </div>
                    <span>{pt ? 'Melhoria de tarifa encontrada no ' : 'Rate improvement found on '}<strong>Park Hyatt Tokyo</strong> · {pt ? '$89/noite ' : '$89/night '}{pt ? 'melhor que a atual.' : 'better than your current booking.'}</span>
                  </div>
                  <table className="rdp-dash-table">
                    <thead>
                      <tr>
                        <th>Hotel</th>
                        <th>{pt ? 'Datas' : 'Dates'}</th>
                        <th>{pt ? 'Tarifa/Noite' : 'Rate/Night'}</th>
                        <th>{pt ? 'Economia' : 'Saved'}</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Park Hyatt Tokyo</strong><br /><span className="rdp-dash-sub">Tokyo, {pt ? 'Japão' : 'Japan'}</span></td>
                        <td>{pt ? '14-17 Mar' : 'Mar 14-17'}</td>
                        <td>$389</td>
                        <td className="rdp-dash-saved">$267</td>
                        <td><span className="rdp-dash-status rdp-dash-status--drop">{pt ? 'Queda encontrada' : 'Drop found'}</span></td>
                      </tr>
                      <tr>
                        <td><strong>Rosewood London</strong><br /><span className="rdp-dash-sub">London, UK</span></td>
                        <td>{pt ? '2-5 Abr' : 'Apr 2-5'}</td>
                        <td>$620</td>
                        <td className="rdp-dash-muted">--</td>
                        <td><span className="rdp-dash-status rdp-dash-status--monitoring">{pt ? 'Monitorando' : 'Monitoring'}</span></td>
                      </tr>
                      <tr>
                        <td><strong>Fasano Sao Paulo</strong><br /><span className="rdp-dash-sub">Sao Paulo, BR</span></td>
                        <td>{pt ? '19-22 Abr' : 'Apr 19-22'}</td>
                        <td>$1,020</td>
                        <td className="rdp-dash-muted">--</td>
                        <td><span className="rdp-dash-status rdp-dash-status--monitoring">{pt ? 'Monitorando' : 'Monitoring'}</span></td>
                      </tr>
                      <tr>
                        <td><strong>Aman Tokyo</strong><br /><span className="rdp-dash-sub">Tokyo, {pt ? 'Japão' : 'Japan'}</span></td>
                        <td>{pt ? '5-8 Mai' : 'May 5-8'}</td>
                        <td>$1,140</td>
                        <td className="rdp-dash-saved">$145</td>
                        <td><span className="rdp-dash-status rdp-dash-status--saved">{pt ? 'Economizou' : 'Saved'}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOTEL SAVINGS EXAMPLES */}
        <section className="rdp-section rdp-savings rdp-fade" id="savings">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">{pt ? 'Exemplos reais' : 'Real examples'}</div>
              <h2 className="rdp-h2">{pt ? 'O que viajantes economizam' : 'What travelers save'}<br />{pt ? 'com o ResDrop.' : 'with ResDrop.'}</h2>
              <p className="rdp-section-sub">
                {pt ? 'Estes são os tipos de melhorias que nossos usuários encontram e aproveitam toda semana.' : 'These are the types of improvements our users catch and act on every week.'}
              </p>
            </div>
            <div className="rdp-savings__grid">
              {HOTEL_EXAMPLES.map((h, i) => (
                <div key={i} className="rdp-savings__card">
                  <div className="rdp-savings__img-wrap">
                    <img src={h.img} alt={h.name} className="rdp-savings__img" loading="lazy" />
                    <div className="rdp-savings__found-badge">
                      <span className="rdp-savings__found-dot" />
                      {pt ? 'Melhoria encontrada' : 'Improvement found'}
                    </div>
                    <div className="rdp-savings__saved-badge">
                      <span className="rdp-savings__saved-amount">${h.saved}</span>
                      <span className="rdp-savings__saved-label">{pt ? 'ECON.' : 'SAVED'}</span>
                    </div>
                  </div>
                  <div className="rdp-savings__body">
                    <div className="rdp-savings__hotel-name">{h.name}</div>
                    <div className="rdp-savings__hotel-meta">{h.location} · {h.room}</div>
                    <div className="rdp-savings__price-row">
                      <div className="rdp-savings__price-block">
                        <span className="rdp-savings__price-tag">{pt ? 'ERA' : 'WAS'}</span>
                        <span className="rdp-savings__price rdp-savings__price--old">${h.was}</span>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="#9C9C9C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div className="rdp-savings__price-block">
                        <span className="rdp-savings__price-tag">{pt ? 'AGORA' : 'NOW'}</span>
                        <span className="rdp-savings__price rdp-savings__price--new">${h.now}</span>
                      </div>
                    </div>
                    <div className="rdp-savings__footer">
                      <span>{h.nights} {pt ? 'noites' : 'nights'}</span>
                      <span>{pt ? 'economia de' : 'saved'} <strong className="rdp-savings__footer-saved">${h.saved}</strong></span>
                    </div>
                    <p className="rdp-savings__reason">{pt ? h.reason.pt : h.reason.en}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO IT IS FOR */}
        <section className="rdp-section rdp-forwho rdp-fade">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">{pt ? 'Para quem é' : 'Who it is for'}</div>
              <h2 className="rdp-h2">{pt ? 'Feito para viajantes' : 'Made for travelers'}<br />{pt ? 'que reservam com antecedência.' : 'who book ahead.'}</h2>
            </div>
            <div className="rdp-forwho__grid">
              {FOR_WHO.map((w, i) => (
                <div key={i} className="rdp-forwho__card">
                  <div className="rdp-forwho__num">{w.n}</div>
                  <h3 className="rdp-forwho__title">{pt ? w.title.pt : w.title.en}</h3>
                  <p className="rdp-forwho__desc">{pt ? w.desc.pt : w.desc.en}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="rdp-section rdp-pricing rdp-fade" id="pricing">
          <div className="rdp-container">
            <div className="rdp-section-hd rdp-section-hd--center">
              <div className="rdp-kicker">{pt ? 'Preços' : 'Pricing'}</div>
              <h2 className="rdp-h2">{pt ? 'Comece grátis.' : 'Start free.'}<br />{pt ? 'Atualize quando compensar.' : 'Upgrade when it pays off.'}</h2>
            </div>
            <div className="rdp-pricing__grid">
              <div className="rdp-pricing__card">
                <div className="rdp-pricing__tier">{pt ? 'Grátis' : 'Free'}</div>
                <div className="rdp-pricing__amount">$0</div>
                <p className="rdp-pricing__blurb">
                  {pt ? 'Encaminhe sua reserva e começamos a monitorar. Sem cartão, sem compromisso.' : 'Forward your booking and we start watching. No card required, no commitment.'}
                </p>
                <ul className="rdp-pricing__feats">
                  {FREE_FEATS.map((f, i) => (
                    <li key={i}><IcCheck /> {pt ? f.pt : f.en}</li>
                  ))}
                </ul>
                <Link to="/signup" className="rdp-btn rdp-btn--outline rdp-btn--block">
                  {pt ? 'Começar grátis' : 'Get started free'}
                </Link>
              </div>
              <div className="rdp-pricing__card rdp-pricing__card--highlight">
                <div className="rdp-pricing__pill">{pt ? 'Mais popular' : 'Most popular'}</div>
                <div className="rdp-pricing__tier">ResDrop Plus</div>
                <div className="rdp-pricing__amount">$9<span className="rdp-pricing__per">{pt ? '/mês' : '/month'}</span></div>
                <p className="rdp-pricing__blurb">
                  {pt ? 'Para viajantes com várias viagens por ano ou estadias de alto valor que merecem atenção constante.' : 'For frequent travelers and high-value stays worth watching closely.'}
                </p>
                <ul className="rdp-pricing__feats">
                  {PLUS_FEATS.map((f, i) => (
                    <li key={i}><IcCheck /> {pt ? f.pt : f.en}</li>
                  ))}
                </ul>
                <Link to="/signup" className="rdp-btn rdp-btn--white rdp-btn--block">
                  {pt ? 'Começar com Plus' : 'Start with Plus'}
                </Link>
                <p className="rdp-pricing__annual">{pt ? 'Ou $89/ano, economize 2 meses' : 'Or $89/year, save two months'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="rdp-section rdp-faq rdp-fade" id="faq">
          <div className="rdp-container rdp-faq__inner">
            <div className="rdp-faq__hd">
              <div className="rdp-kicker">FAQ</div>
              <h2 className="rdp-h2">{pt ? 'Perguntas' : 'Common'}<br />{pt ? 'frequentes.' : 'questions.'}</h2>
              <p className="rdp-faq__sub">
                {pt ? 'Respostas simples sobre como o ResDrop funciona.' : 'Simple answers about how ResDrop works.'}
              </p>
            </div>
            <div className="rdp-faq__list">
              {FAQS.map((f, i) => (
                <div key={i} className={`rdp-faq__item${faqOpen === i ? ' is-open' : ''}`}>
                  <button className="rdp-faq__q" onClick={() => setFaqOpen(p => p === i ? null : i)}>
                    <span>{pt ? f.q.pt : f.q.en}</span>
                    <IcChevron open={faqOpen === i} />
                  </button>
                  {faqOpen === i && <p className="rdp-faq__a">{pt ? f.a.pt : f.a.en}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rdp-cta rdp-fade">
          <div className="rdp-container rdp-cta__inner">
            <h2 className="rdp-cta__h2">
              {pt ? 'Não fique se perguntando' : "Don't wonder"}<br />
              {pt ? 'se você pagou demais.' : 'if you overpaid.'}
            </h2>
            <p className="rdp-cta__sub">
              {pt ? 'Sua reserva de hotel não termina quando você confirma. Encaminhe para o ResDrop — monitoramos até o prazo de cancelamento gratuito fechar.' : 'Your hotel booking is not done when you confirm it. Forward it to ResDrop — we watch it until your free cancellation window closes.'}
            </p>
            <div className="rdp-cta__btns">
              <Link to="/signup" className="rdp-btn rdp-btn--white rdp-btn--lg">
                {pt ? 'Começar a monitorar grátis' : 'Start tracking free'} <IcArrow />
              </Link>
              <Link to="/login" className="rdp-btn rdp-btn--ghost-light rdp-btn--lg">
                {pt ? 'Entrar' : 'Log in'}
              </Link>
            </div>
            <p className="rdp-cta__note">
              {pt ? 'Sem cartão de crédito · Menos de 2 minutos para configurar' : 'No credit card required · Takes under 2 minutes'}
            </p>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="rdp-footer">
        <div className="rdp-container rdp-footer__top">
          <div className="rdp-footer__brand">
            <Link to="/" className="rdp-footer__logo"><IcLogo /><span>ResDrop</span></Link>
            <p>{pt ? 'Monitoramento pós-reserva de hotel.' : 'Post-booking hotel monitoring.'}<br />{pt ? 'Reserve uma vez. Nós continuamos monitorando.' : 'Book once. We keep watching.'}</p>
          </div>
          <div className="rdp-footer__col">
            <div className="rdp-footer__col-hd">{pt ? 'Produto' : 'Product'}</div>
            <a href="#how-it-works">{pt ? 'Como funciona' : 'How it works'}</a>
            <a href="#savings">{pt ? 'Economia' : 'Savings'}</a>
            <a href="#pricing">{pt ? 'Preços' : 'Pricing'}</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="rdp-footer__col">
            <div className="rdp-footer__col-hd">{pt ? 'Conta' : 'Account'}</div>
            <Link to="/login">{pt ? 'Entrar' : 'Log in'}</Link>
            <Link to="/signup">{pt ? 'Criar conta' : 'Create account'}</Link>
          </div>
          <div className="rdp-footer__col">
            <div className="rdp-footer__col-hd">Legal</div>
            <Link to="/terms">{pt ? 'Termos de serviço' : 'Terms of service'}</Link>
            <Link to="/privacy">{pt ? 'Política de privacidade' : 'Privacy policy'}</Link>
          </div>
        </div>
        <div className="rdp-footer__bottom">
          <div className="rdp-container rdp-footer__bottom-row">
            <span>© 2025 ResDrop. {pt ? 'Todos os direitos reservados.' : 'All rights reserved.'}</span>
            <span>{pt ? 'Nunca alteramos sua reserva sem sua aprovação.' : 'We never change your booking without your approval.'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
