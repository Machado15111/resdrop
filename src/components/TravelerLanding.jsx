import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import './TravelerLanding.css';

// Using inline SVG icons without external dependencies
const Icons = {
  Check: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  ResDropLogo: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M11 8h2" />
      <path d="M12 8v1.5" />
      <path d="M8 14.5a4 4 0 0 1 8 0" />
      <line x1="7" y1="14.5" x2="17" y2="14.5" />
      <line x1="6" y1="16.5" x2="18" y2="16.5" />
    </svg>
  ),
  ShieldAlert: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>,
  Shield: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Eye: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  CreditCard: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
  TrendDown: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>,
  Bell: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
  Refresh: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>,
  Tag: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>,
  Target: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  Percent: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>,
};

export default function TravelerLanding() {
  const { lang, toggleLang } = useI18n();
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Ensure the page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll-aware header: hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 80) {
        // Always show header near the top
        setHeaderVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        // Scrolling down — hide header
        setHeaderVisible(false);
      } else if (currentY < lastScrollY.current - 5) {
        // Scrolling up — show header
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pt = lang === 'pt';

  return (
    <div className="tl-page">
      {/* 1. HEADER */}
      <header className={`tl-header-wrapper ${headerVisible ? '' : 'tl-header-hidden'}`}>
        <div className="container">
          <Link to="/" className="tl-header-logo">
            <Icons.ResDropLogo /> ResDrop
          </Link>
          <nav className="tl-header-nav">
            <a href="#como-funciona">{pt ? 'Como funciona' : 'How it works'}</a>
            <a href="#economia">{pt ? 'Economia real' : 'Real savings'}</a>
            <a href="#planos">{pt ? 'Planos' : 'Plans'}</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="tl-header-actions">
            <button className="tl-lang-toggle" onClick={toggleLang} title={pt ? 'English' : 'Português'}>
              {pt ? 'EN' : 'PT'}
            </button>
            <Link to="/login" className="btn btn-ghost">{pt ? 'Entrar' : 'Sign in'}</Link>
            <Link to="/signup" className="btn btn-primary">{pt ? 'Começar grátis' : 'Start free'}</Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="tl-hero">
        <div className="tl-hero-content">
          <div className="tl-hero-pill">
            <Icons.ShieldAlert /> {pt ? 'Funciona apenas para tarifas reembolsáveis' : 'Works only for refundable rates'}
          </div>
          <h1>{pt ? 'Reserve seu hotel normalmente. Se o preço cair, você fica sabendo.' : 'Book your hotel as usual. If the price drops, you\'ll know.'}</h1>
          <p>{pt ? 'O ResDrop monitora tarifas reembolsáveis em mais de 20 plataformas e avisa quando encontra uma opção equivalente mais barata, para você reservar novamente e economizar.' : 'ResDrop monitors refundable rates across 20+ platforms and alerts you when it finds a cheaper equivalent option, so you can rebook and save.'}</p>

          <div className="tl-hero-actions">
            <Link to="/signup" className="btn btn-primary">{pt ? 'Começar grátis' : 'Start free'}</Link>
            <a href="#como-funciona" className="btn btn-outline">{pt ? 'Ver como funciona' : 'See how it works'}</a>
          </div>

          <div className="tl-hero-trust">
            <span><Icons.Check /> {pt ? 'Monitoramento 24/7' : '24/7 Monitoring'}</span>
            <span><Icons.Check /> {pt ? 'Mais de 20 plataformas' : '20+ platforms'}</span>
            <span><Icons.Check /> {pt ? 'Você continua no controle' : 'You stay in control'}</span>
          </div>
        </div>
      </section>

      {/* 3. TRUST STRIP */}
      <div className="tl-trust-strip">
        <div className="container">
          <div className="tl-trust-grid">
            <div className="tl-trust-item">
              <Icons.Eye />
              <span>{pt ? 'Monitoramos +20 plataformas' : 'We monitor 20+ platforms'}</span>
            </div>
            <div className="tl-trust-item">
              <Icons.Bell />
              <span>{pt ? 'Alertas em tempo real' : 'Real-time alerts'}</span>
            </div>
            <div className="tl-trust-item">
              <Icons.Shield />
              <span>{pt ? 'Sem mudanças automáticas' : 'No automatic changes'}</span>
            </div>
            <div className="tl-trust-item">
              <Icons.CreditCard />
              <span>{pt ? 'Ideal para tarifas flexíveis' : 'Ideal for flexible rates'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL SAVINGS EXAMPLES (6 Cards) */}
      <section id="economia" className="tl-savings">
        <div className="container">
          <div className="section-header">
            <h2>{pt ? 'Oportunidades reais. Economia palpável.' : 'Real opportunities. Tangible savings.'}</h2>
            <p className="muted">{pt ? 'Exemplos reais de como flutuações de inventário criam oportunidades únicas para nossos usuários entre a data da reserva e o check-in.' : 'Real examples of how inventory fluctuations create unique opportunities for our users between booking date and check-in.'}</p>
            <p style={{fontSize: '0.95rem', margin: '-10px 0 0 0', fontStyle: 'italic'}}>{pt ? 'Apenas para reservas com cancelamento grátis.' : 'Only for free cancellation bookings.'}</p>
          </div>

          <div className="tl-savings-grid">
            {/* 1 */}
            <div className="tl-savings-card">
              <span className="tl-savings-location">São Paulo, BR</span>
              <h3 className="tl-savings-hotel">Fasano Itaim</h3>
              <div className="tl-savings-room">Deluxe King Room • 3 {pt ? 'Noites' : 'Nights'}</div>
              <div className="tl-savings-price">
                <span className="old">R$ 5.400</span>
                <span className="new">R$ 4.250</span>
              </div>
              <div className="tl-savings-result">
                <span className="tl-savings-result-label">{pt ? 'Economia encontrada' : 'Savings found'}</span>
                <span className="tl-savings-result-value">R$ 1.150 (-21%)</span>
              </div>
              <div className="tl-savings-reason">
                <Icons.Tag /> {pt ? 'Promoção temporária da rede' : 'Temporary chain promotion'}
              </div>
            </div>

            {/* 2 */}
            <div className="tl-savings-card">
              <span className="tl-savings-location">Rio de Janeiro, BR</span>
              <h3 className="tl-savings-hotel">Copacabana Palace</h3>
              <div className="tl-savings-room">Ocean View Suite • 5 {pt ? 'Noites' : 'Nights'}</div>
              <div className="tl-savings-price">
                <span className="old">R$ 12.500</span>
                <span className="new">R$ 9.800</span>
              </div>
              <div className="tl-savings-result">
                <span className="tl-savings-result-label">{pt ? 'Economia encontrada' : 'Savings found'}</span>
                <span className="tl-savings-result-value">R$ 2.700 (-21%)</span>
              </div>
              <div className="tl-savings-reason">
                <Icons.Refresh /> {pt ? 'Tarifas revisadas para reocupação' : 'Rates revised for reoccupation'}
              </div>
            </div>

            {/* 3 */}
            <div className="tl-savings-card">
              <span className="tl-savings-location">Fortaleza, BR</span>
              <h3 className="tl-savings-hotel">Hotel Gran Marquise</h3>
              <div className="tl-savings-room">Executive Suite • 4 {pt ? 'Noites' : 'Nights'}</div>
              <div className="tl-savings-price">
                <span className="old">R$ 3.800</span>
                <span className="new">R$ 2.950</span>
              </div>
              <div className="tl-savings-result">
                <span className="tl-savings-result-label">{pt ? 'Economia encontrada' : 'Savings found'}</span>
                <span className="tl-savings-result-value">R$ 850 (-22%)</span>
              </div>
              <div className="tl-savings-reason">
                <Icons.Target /> {pt ? 'Diferença entre plataformas' : 'Cross-platform price difference'}
              </div>
            </div>

            {/* 4 */}
            <div className="tl-savings-card">
              <span className="tl-savings-location">{pt ? 'Lisboa, PT' : 'Lisbon, PT'}</span>
              <h3 className="tl-savings-hotel">Marriott</h3>
              <div className="tl-savings-room">Deluxe Queen • 4 {pt ? 'Noites' : 'Nights'}</div>
              <div className="tl-savings-price">
                <span className="old">€ 950</span>
                <span className="new">€ 790</span>
              </div>
              <div className="tl-savings-result">
                <span className="tl-savings-result-label">{pt ? 'Economia encontrada' : 'Savings found'}</span>
                <span className="tl-savings-result-value">€ 160 (-16%)</span>
              </div>
              <div className="tl-savings-reason">
                <Icons.Refresh /> {pt ? 'Ajuste de inventário interno' : 'Internal inventory adjustment'}
              </div>
            </div>

            {/* 5 */}
            <div className="tl-savings-card">
              <span className="tl-savings-location">{pt ? 'Nova York, EUA' : 'New York, USA'}</span>
              <h3 className="tl-savings-hotel">Hyatt</h3>
              <div className="tl-savings-room">King Bed City View • 5 {pt ? 'Noites' : 'Nights'}</div>
              <div className="tl-savings-price">
                <span className="old">US$ 1.850</span>
                <span className="new">US$ 1.480</span>
              </div>
              <div className="tl-savings-result">
                <span className="tl-savings-result-label">{pt ? 'Economia encontrada' : 'Savings found'}</span>
                <span className="tl-savings-result-value">US$ 370 (-20%)</span>
              </div>
              <div className="tl-savings-reason">
                <Icons.TrendDown /> {pt ? 'Cancelamentos liberaram nova tarifa' : 'Cancellations released new rates'}
              </div>
            </div>

            {/* 6 */}
            <div className="tl-savings-card">
              <span className="tl-savings-location">Buenos Aires, AR</span>
              <h3 className="tl-savings-hotel">Meliá</h3>
              <div className="tl-savings-room">Premium Room • 3 {pt ? 'Noites' : 'Nights'}</div>
              <div className="tl-savings-price">
                <span className="old">US$ 450</span>
                <span className="new">US$ 380</span>
              </div>
              <div className="tl-savings-result">
                <span className="tl-savings-result-label">{pt ? 'Economia encontrada' : 'Savings found'}</span>
                <span className="tl-savings-result-value">US$ 70 (-15%)</span>
              </div>
              <div className="tl-savings-reason">
                <Icons.Refresh /> {pt ? 'Diferença entre plataformas parceiras' : 'Partner platform price difference'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section id="como-funciona" className="tl-how">
        <div className="container">
          <div className="section-header">
            <h2>{pt ? 'Elegância na simplicidade' : 'Elegance in simplicity'}</h2>
            <p className="muted">{pt ? 'Um processo desenhado para minimizar seu esforço e maximizar suas vantagens.' : 'A process designed to minimize your effort and maximize your advantage.'}</p>
          </div>

          <div className="tl-how-grid">
            <div className="tl-how-step">
              <div className="tl-how-number">1</div>
              <h3>{pt ? 'Envie sua reserva' : 'Submit your booking'}</h3>
              <p>{pt ? 'Reserve sua tarifa reembolsável no site que preferir e adicione-a no ResDrop.' : 'Book your refundable rate on any site and add it to ResDrop.'}</p>
            </div>
            <div className="tl-how-step">
              <div className="tl-how-number">2</div>
              <h3>{pt ? 'Monitoramos 24/7' : 'We monitor 24/7'}</h3>
              <p>{pt ? 'Varreremos dezenas de plataformas comparando o mesmo hotel e tipo de quarto continuamente.' : 'We scan dozens of platforms comparing the same hotel and room type continuously.'}</p>
            </div>
            <div className="tl-how-step">
              <div className="tl-how-number">3</div>
              <h3>{pt ? 'Avisamos da queda' : 'We alert the drop'}</h3>
              <p>{pt ? 'Você recebe um alerta assim que o preço cair de forma vantajosa em uma plataforma confiável.' : 'You get an alert as soon as the price drops on a trusted platform.'}</p>
            </div>
            <div className="tl-how-step">
              <div className="tl-how-number">4</div>
              <h3>{pt ? 'Você escolhe' : 'You decide'}</h3>
              <p>{pt ? 'A decisão de refazer a reserva para economizar é totalmente sua. Nós apenas avisamos.' : 'The decision to rebook and save is entirely yours. We just notify you.'}</p>
            </div>
          </div>

          <div className="tl-how-note">
            <strong>{pt ? 'Transparência total:' : 'Full transparency:'}</strong> {pt ? 'O ResDrop apenas monitora e alerta a oportunidade. A decisão final e o controle são seus.' : 'ResDrop only monitors and alerts the opportunity. The final decision and control are yours.'}
          </div>
        </div>
      </section>

      {/* 6. WHY PRICES DROP */}
      <section className="tl-savings dark-section" style={{ background: 'var(--tl-bg-dark)' }}>
        <div className="container">
          <div className="tl-split-section">
            <div className="tl-image-block">
              <h2>{pt ? 'Por que os preços variam tanto depois da reserva?' : 'Why do prices change so much after booking?'}</h2>
              <p className="muted" style={{ marginBottom: '32px' }}>{pt ? 'A precificação hoteleira é dinâmica. O que parece ser o menor preço garantido na segunda-feira pode não ser na quinta. O ResDrop transforma essa volatilidade na sua vantagem financeira, e sem risco, já que sua tarifa original é reembolsável.' : 'Hotel pricing is dynamic. What seems like the lowest guaranteed price on Monday may not be on Thursday. ResDrop turns this volatility into your financial advantage — risk-free, since your original rate is refundable.'}</p>
            </div>

            <div className="tl-reasons-list">
              <div className="tl-reason-item">
                <div className="tl-reason-icon"><Icons.TrendDown /></div>
                <div>
                  <h4>{pt ? 'Cancelamentos inesperados' : 'Unexpected cancellations'}</h4>
                  <p className="muted">{pt ? 'Hóspedes cancelam. O hotel prefere vender por um menor valor do que deixar o quarto vazio.' : 'Guests cancel. Hotels prefer to sell at a lower price than leave rooms empty.'}</p>
                </div>
              </div>
              <div className="tl-reason-item">
                <div className="tl-reason-icon"><Icons.Target /></div>
                <div>
                  <h4>{pt ? 'Diferenças entre canais' : 'Cross-channel differences'}</h4>
                  <p className="muted">{pt ? 'Plataformas parceiras podem fazer liquidações temporárias que o seu sistema original de reserva ignora.' : 'Partner platforms may run temporary sales that your original booking site ignores.'}</p>
                </div>
              </div>
              <div className="tl-reason-item">
                <div className="tl-reason-icon"><Icons.Refresh /></div>
                <div>
                  <h4>{pt ? 'Ajustes próximos ao check-in' : 'Near check-in adjustments'}</h4>
                  <p className="muted">{pt ? 'Para evitar prejuízo, os hotéis ativam promoções agressivas caso a ocupação não esteja conforme a meta atingindo os dias finais.' : 'To avoid losses, hotels activate aggressive promotions when occupancy falls short of targets in the final days.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PRICING */}
      <section id="planos" className="tl-pricing">
        <div className="container">
          <div className="section-header">
            <h2>{pt ? 'Planos sob medida para o seu estilo de viagem' : 'Plans tailored to your travel style'}</h2>
            <p className="muted">{pt ? 'Escolha o nível de monitoramento que melhor atende à sua frequência de hospedagens.' : 'Choose the monitoring level that best suits your booking frequency.'}</p>
          </div>

          <div className="tl-pricing-grid">
            <div className="tl-pricing-card">
              <h3>{pt ? 'Grátis' : 'Free'}</h3>
              <p>{pt ? 'Para testar como funciona e experimentar a plataforma.' : 'To test how it works and try the platform.'}</p>
              <div className="tl-pricing-price">R$ 0 <span>{pt ? '/mês' : '/mo'}</span></div>
              <ul className="tl-pricing-features">
                <li><Icons.Check /> {pt ? 'Monitore 1 reserva por mês' : 'Monitor 1 booking per month'}</li>
                <li><Icons.Check /> {pt ? 'Verificação diária de preços' : 'Daily price checks'}</li>
                <li><Icons.Check /> {pt ? 'Alertas por e-mail' : 'Email alerts'}</li>
                <li><Icons.Check /> {pt ? 'Monitoramento padrão' : 'Standard monitoring'}</li>
              </ul>
              <Link to="/signup" className="btn btn-outline">{pt ? 'Começar grátis' : 'Start free'}</Link>
            </div>

            <div className="tl-pricing-card highlight">
              <div className="tl-pricing-badge">{pt ? 'Mais escolhido' : 'Most popular'}</div>
              <h3>{pt ? 'Viajante' : 'Traveler'}</h3>
              <p>{pt ? 'Ideal para viagens pessoais e frequentes com alto potencial de retorno.' : 'Ideal for frequent personal trips with high return potential.'}</p>
              <div className="tl-pricing-price" style={{ color: '#FFFFFF' }}>R$ 25 <span style={{ color: 'rgba(255,255,255,0.7)' }}>{pt ? '/mês' : '/mo'}</span></div>
              <ul className="tl-pricing-features">
                <li><Icons.Check /> {pt ? 'Monitore até 10 reservas por mês' : 'Monitor up to 10 bookings/month'}</li>
                <li><Icons.Check /> {pt ? '+20 plataformas verificadas' : '20+ verified platforms'}</li>
                <li><Icons.Check /> {pt ? 'Alertas em tempo real' : 'Real-time alerts'}</li>
                <li><Icons.Check /> {pt ? 'Histórico detalhado de preços' : 'Detailed price history'}</li>
              </ul>
              <Link to="/signup" className="btn btn-gold">{pt ? 'Escolher Viajante' : 'Choose Traveler'}</Link>
            </div>

            <div className="tl-pricing-card">
              <h3>Premium</h3>
              <p>{pt ? 'Para profissionais e quem quer prioridade máxima no ecossistema.' : 'For professionals who want maximum priority in the ecosystem.'}</p>
              <div className="tl-pricing-price">R$ 99 <span>{pt ? '/mês' : '/mo'}</span></div>
              <ul className="tl-pricing-features">
                <li><Icons.Check /> {pt ? 'Monitore até 50 reservas por mês' : 'Monitor up to 50 bookings/month'}</li>
                <li><Icons.Check /> {pt ? 'Alertas prioritários (Push + E-mail)' : 'Priority alerts (Push + Email)'}</li>
                <li><Icons.Check /> {pt ? 'Relatórios completos de mercado' : 'Full market reports'}</li>
                <li><Icons.Check /> {pt ? 'Suporte dedicado e consultoria' : 'Dedicated support & consulting'}</li>
              </ul>
              <Link to="/signup" className="btn btn-outline">{pt ? 'Escolher Premium' : 'Choose Premium'}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section id="faq" className="tl-faq">
        <div className="container">
          <div className="section-header">
            <h2>{pt ? 'Perguntas Frequentes' : 'Frequently Asked Questions'}</h2>
            <p className="muted">{pt ? 'Tudo o que você precisa saber sobre nosso serviço de monitoramento inteligente.' : 'Everything you need to know about our intelligent monitoring service.'}</p>
          </div>

          <div className="tl-faq-grid">
            <div className="tl-faq-item">
              <h4>{pt ? 'O ResDrop faz uma nova reserva automaticamente?' : 'Does ResDrop rebook automatically?'}</h4>
              <p>{pt ? 'Não. Nós apenas enviamos o alerta indicando onde encontrar a tarifa mais barata. O controle total e o processo de refazer a reserva continuam sendo exclusivamente seus, garantindo sua segurança.' : 'No. We only send an alert indicating where to find the cheaper rate. Full control and the rebooking process remain exclusively yours, ensuring your safety.'}</p>
            </div>
            <div className="tl-faq-item">
              <h4>{pt ? 'Precisa ser tarifa reembolsável?' : 'Does it need to be a refundable rate?'}</h4>
              <p>{pt ? 'Sim. Se você reservar uma tarifa "não reembolsável", você não poderá cancelar a primeira sem pagar multa, o que inviabiliza o ganho. Funciona perfeitamente apenas para reservas com o cancelamento grátis.' : 'Yes. If you book a non-refundable rate, you can\'t cancel without a penalty, making savings impossible. It works perfectly only for free cancellation bookings.'}</p>
            </div>
            <div className="tl-faq-item">
              <h4>{pt ? 'Como vocês comparam as tarifas?' : 'How do you compare rates?'}</h4>
              <p>{pt ? 'Nosso algoritmo rastreia o exato mesmo hotel, mesmas datas, mesmo tipo de quarto e políticas de cancelamento equivalentes ao redor de mais de 20 plataformas mundiais de hospedagem.' : 'Our algorithm tracks the exact same hotel, same dates, same room type, and equivalent cancellation policies across 20+ global booking platforms.'}</p>
            </div>
            <div className="tl-faq-item">
              <h4>{pt ? 'Preciso cancelar minha reserva atual antes?' : 'Do I need to cancel my current booking first?'}</h4>
              <p>{pt ? 'Jamais cancele a reserva atual antes de garantir a nova. Quando receber nosso alerta, faça a nova reserva com a tarifa promocional e, somente após a confirmação dela, cancele a anterior no site onde comprou.' : 'Never cancel your current booking before securing the new one. When you receive our alert, make the new booking at the lower rate and only after confirmation, cancel the original on the site where you booked.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="tl-cta">
        <div className="container">
          <h2>{pt ? 'Comece a monitorar sua próxima reserva' : 'Start monitoring your next booking'}</h2>
          <p>{pt ? 'Reserve normalmente e deixe o ResDrop avisar se o preço cair. O mercado flutua; o seu custo não precisa flutuar junto.' : 'Book as usual and let ResDrop alert you if the price drops. The market fluctuates; your cost doesn\'t have to.'}</p>
          <Link to="/signup" className="btn btn-gold">{pt ? 'Começar grátis hoje' : 'Start free today'}</Link>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="tl-footer">
        <div className="container">
          <div className="tl-footer-grid">
            <div className="tl-footer-brand">
              <Link to="/" className="logo"><Icons.ResDropLogo /> ResDrop</Link>
              <p>{pt ? 'Monitoramento inteligente de tarifas de hotel para quem valoriza seu dinheiro e gosta de viajar tranquilo.' : 'Intelligent hotel rate monitoring for those who value their money and love to travel stress-free.'}</p>
            </div>

            <div>
              <h4>{pt ? 'Produto' : 'Product'}</h4>
              <ul>
                <li><a href="#como-funciona">{pt ? 'Como funciona' : 'How it works'}</a></li>
                <li><a href="#economia">{pt ? 'Economia real' : 'Real savings'}</a></li>
                <li><a href="#planos">{pt ? 'Planos e Preços' : 'Plans & Pricing'}</a></li>
                <li><a href="#faq">{pt ? 'Perguntas Frequentes' : 'FAQ'}</a></li>
              </ul>
            </div>

            <div>
              <h4>{pt ? 'Empresa' : 'Company'}</h4>
              <ul>
                <li><Link to="/about">{pt ? 'Sobre nós' : 'About us'}</Link></li>
                <li><a href="#">{pt ? 'Carreiras' : 'Careers'}</a></li>
                <li><a href="#">{pt ? 'Imprensa' : 'Press'}</a></li>
                <li><a href="#">{pt ? 'Contato' : 'Contact'}</a></li>
              </ul>
            </div>

            <div>
              <h4>Legal</h4>
              <ul>
                <li><Link to="/terms">{pt ? 'Termos de Uso' : 'Terms of Use'}</Link></li>
                <li><Link to="/privacy">{pt ? 'Política de Privacidade' : 'Privacy Policy'}</Link></li>
                <li><a href="#">{pt ? 'Segurança de Dados' : 'Data Security'}</a></li>
              </ul>
            </div>
          </div>

          <div className="tl-footer-bottom">
            <span>&copy; {new Date().getFullYear()} ResDrop. {pt ? 'Todos os direitos reservados.' : 'All rights reserved.'}</span>
            <span>{pt ? 'Versão Travel' : 'Travel Edition'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
