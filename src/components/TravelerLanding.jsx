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
            <Icons.ShieldAlert /> {pt ? 'Funciona com reservas com cancelamento gratuito' : 'Works with free cancellation bookings'}
          </div>
          <h1>{pt ? 'Sua reserva de hotel pode estar custando mais do que deveria' : 'Your hotel booking may be costing more than it should'}</h1>
          <p>{pt ? 'Preços de hotéis mudam após a reserva. O ResDrop monitora essas variações e avisa quando encontra uma tarifa menor para que você decida o que fazer.' : 'Hotel prices change after you book. ResDrop monitors these changes and alerts you when it finds a lower rate — so you can decide what to do.'}</p>

          <div className="tl-hero-actions">
            <Link to="/signup" className="btn btn-primary">{pt ? 'Começar gratuitamente' : 'Get started free'}</Link>
            <a href="#como-funciona" className="btn btn-outline">{pt ? 'Como funciona' : 'How it works'}</a>
          </div>

          <div className="tl-hero-trust">
            <span><Icons.Check /> {pt ? 'Monitoramento contínuo' : 'Continuous monitoring'}</span>
            <span><Icons.Check /> {pt ? 'Sem acesso a dados financeiros' : 'No financial data access'}</span>
            <span><Icons.Check /> {pt ? 'Você decide cada passo' : 'You decide every step'}</span>
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
              <span>{pt ? 'Alertas quando o preço cai' : 'Alerts when prices drop'}</span>
            </div>
            <div className="tl-trust-item">
              <Icons.Shield />
              <span>{pt ? 'Nenhuma alteração automática na sua reserva' : 'No automatic changes to your booking'}</span>
            </div>
            <div className="tl-trust-item">
              <Icons.CreditCard />
              <span>{pt ? 'Apenas para reservas com cancelamento grátis' : 'Only for free cancellation bookings'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL SAVINGS EXAMPLES (6 Cards) */}
      <section id="economia" className="tl-savings">
        <div className="container">
          <div className="section-header">
            <h2>{pt ? 'Variações reais encontradas entre a reserva e o check-in' : 'Real price changes found between booking and check-in'}</h2>
            <p className="muted">{pt ? 'Exemplos de como flutuações de inventário criam oportunidades para nossos usuários. Resultados variam conforme disponibilidade e condições de mercado.' : 'Examples of how inventory fluctuations create opportunities for our users. Results vary based on availability and market conditions.'}</p>
            <p className="tl-refundable-note"><Icons.ShieldAlert /> {pt ? 'Válido apenas para reservas com cancelamento gratuito.' : 'Valid only for free cancellation bookings.'}</p>
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
                <span className="tl-savings-result-label">{pt ? 'Diferença identificada' : 'Difference found'}</span>
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
                <span className="tl-savings-result-label">{pt ? 'Diferença identificada' : 'Difference found'}</span>
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
                <span className="tl-savings-result-label">{pt ? 'Diferença identificada' : 'Difference found'}</span>
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
                <span className="tl-savings-result-label">{pt ? 'Diferença identificada' : 'Difference found'}</span>
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
                <span className="tl-savings-result-label">{pt ? 'Diferença identificada' : 'Difference found'}</span>
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
                <span className="tl-savings-result-label">{pt ? 'Diferença identificada' : 'Difference found'}</span>
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
            <h2>{pt ? 'Como o ResDrop funciona' : 'How ResDrop works'}</h2>
            <p className="muted">{pt ? 'Um processo simples. Você adiciona sua reserva com cancelamento gratuito e nós acompanhamos o mercado por você.' : 'A simple process. You add your free cancellation booking and we track the market for you.'}</p>
          </div>

          <div className="tl-how-grid">
            <div className="tl-how-step">
              <div className="tl-how-number">1</div>
              <h3>{pt ? 'Adicione sua reserva' : 'Add your booking'}</h3>
              <p>{pt ? 'Faça sua reserva com cancelamento gratuito normalmente e adicione os dados no ResDrop — manualmente ou colando o email de confirmação.' : 'Make your free cancellation booking as usual and add the details to ResDrop — manually or by pasting the confirmation email.'}</p>
            </div>
            <div className="tl-how-step">
              <div className="tl-how-number">2</div>
              <h3>{pt ? 'Monitoramos o mercado' : 'We monitor the market'}</h3>
              <p>{pt ? 'Comparamos tarifas em dezenas de plataformas para o mesmo hotel, datas e tipo de quarto, de forma contínua.' : 'We compare rates across dozens of platforms for the same hotel, dates, and room type — continuously.'}</p>
            </div>
            <div className="tl-how-step">
              <div className="tl-how-number">3</div>
              <h3>{pt ? 'Você recebe um alerta' : 'You get an alert'}</h3>
              <p>{pt ? 'Se identificarmos uma tarifa menor em uma plataforma confiável, enviamos um alerta com os detalhes.' : 'If we identify a lower rate on a trusted platform, we send you an alert with the details.'}</p>
            </div>
            <div className="tl-how-step">
              <div className="tl-how-number">4</div>
              <h3>{pt ? 'Você decide o próximo passo' : 'You decide the next step'}</h3>
              <p>{pt ? 'Analise a oportunidade, faça a nova reserva se fizer sentido e só cancele a original após confirmar a nova.' : 'Review the opportunity, make the new booking if it makes sense, and only cancel the original after confirming the new one.'}</p>
            </div>
          </div>

          <div className="tl-how-note">
            <Icons.Shield /> <strong>{pt ? 'Importante:' : 'Important:'}</strong> {pt ? 'O ResDrop é uma plataforma de monitoramento e alertas. Não fazemos alterações na sua reserva e não acessamos dados financeiros. Toda ação é sua.' : 'ResDrop is a monitoring and alerting platform. We do not make changes to your booking and do not access financial data. Every action is yours.'}
          </div>
        </div>
      </section>

      {/* 6. WHY PRICES DROP */}
      <section className="tl-savings dark-section" style={{ background: 'var(--tl-bg-dark)' }}>
        <div className="container">
          <div className="tl-split-section">
            <div className="tl-image-block">
              <h2>{pt ? 'Por que os preços variam depois da reserva?' : 'Why do prices change after booking?'}</h2>
              <p className="muted" style={{ marginBottom: '32px' }}>{pt ? 'A precificação hoteleira é dinâmica. A tarifa que você pagou na segunda pode não ser a melhor na quinta. O ResDrop acompanha essas variações para você, e como sua reserva tem cancelamento gratuito, você pode avaliar se vale trocar.' : 'Hotel pricing is dynamic. The rate you paid on Monday might not be the best by Thursday. ResDrop tracks these changes for you, and since your booking has free cancellation, you can evaluate whether it\'s worth switching.'}</p>
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

      {/* 7.25 WHERE WE SEARCH — OTA PORTALS */}
      <section className="tl-portals">
        <div className="container">
          <h2>{pt ? 'Comparamos tarifas nas maiores plataformas' : 'We compare rates across major platforms'}</h2>
          <p className="tl-portals-sub">{pt
            ? 'Monitoramos automaticamente as principais plataformas de reserva para identificar quando uma tarifa mais baixa está disponível para o seu hotel.'
            : 'We automatically monitor the top booking platforms to identify when a lower rate becomes available for your hotel.'}</p>
          <div className="tl-portals-grid">
            {[
              { name: 'Booking.com', domain: 'booking.com' },
              { name: 'Expedia', domain: 'expedia.com' },
              { name: 'Hotels.com', domain: 'hotels.com' },
              { name: 'Agoda', domain: 'agoda.com' },
              { name: 'Trip.com', domain: 'trip.com' },
              { name: 'Priceline', domain: 'priceline.com' },
              { name: 'Trivago', domain: 'trivago.com' },
              { name: 'Kayak', domain: 'kayak.com' },
              { name: 'HotelsCombined', domain: 'hotelscombined.com' },
              { name: 'Google Hotels', domain: 'google.com' },
            ].map(portal => (
              <div key={portal.name} className="tl-portal-item">
                <img
                  src={`https://logo.clearbit.com/${portal.domain}`}
                  alt={portal.name}
                  className="tl-portal-logo"
                  loading="lazy"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
                <div className="tl-portal-fallback" style={{ display: 'none' }}>
                  {portal.name[0]}
                </div>
                <span className="tl-portal-name">{portal.name}</span>
              </div>
            ))}
          </div>
          <p className="tl-portals-note">{pt
            ? 'Resultados filtrados por fontes confiáveis. Não incluímos revendedores ou fontes não verificadas.'
            : 'Results filtered by trusted sources. We do not include resellers or unverified sources.'}</p>
        </div>
      </section>

      {/* 7.5 SPECIAL FARES — CONCIERGE SERVICE */}
      <section className="tl-special-fares">
        <div className="container">
          <div className="tl-sf-layout">
            <div className="tl-sf-content">
              <div className="tl-sf-badge">{pt ? 'Novo' : 'New'}</div>
              <h2>{pt ? 'ResDrop Special Fares' : 'ResDrop Special Fares'}</h2>
              <p className="tl-sf-lead">{pt
                ? 'Encontramos tarifas exclusivas que nem sempre estão disponíveis nas plataformas tradicionais. Um concierge dedicado cuida de tudo para você.'
                : 'We find exclusive rates that aren\'t always available on traditional platforms. A dedicated concierge handles everything for you.'
              }</p>

              <div className="tl-sf-steps">
                <div className="tl-sf-step">
                  <div className="tl-sf-step-num">1</div>
                  <div>
                    <h4>{pt ? 'Identificamos a oportunidade' : 'We identify the opportunity'}</h4>
                    <p>{pt ? 'Nosso sistema encontra uma tarifa especial para o seu hotel, mesmas datas e tipo de quarto.' : 'Our system finds a special rate for your hotel, same dates and room type.'}</p>
                  </div>
                </div>
                <div className="tl-sf-step">
                  <div className="tl-sf-step-num">2</div>
                  <div>
                    <h4>{pt ? 'Você analisa e aprova' : 'You review and approve'}</h4>
                    <p>{pt ? 'Apresentamos a tarifa encontrada com todos os detalhes. Você decide se deseja prosseguir.' : 'We present the rate found with all details. You decide whether to proceed.'}</p>
                  </div>
                </div>
                <div className="tl-sf-step">
                  <div className="tl-sf-step-num">3</div>
                  <div>
                    <h4>{pt ? 'Nosso concierge efetua a reserva' : 'Our concierge books for you'}</h4>
                    <p>{pt ? 'Após sua aprovação, nosso concierge realiza a nova reserva. Só então você cancela a original.' : 'After your approval, our concierge makes the new booking. Only then you cancel the original.'}</p>
                  </div>
                </div>
              </div>

              <div className="tl-sf-trust-points">
                <div className="tl-sf-trust-item">
                  <Icons.Shield />
                  <span>{pt ? 'Seus dados são tratados com sigilo e protocolos de segurança' : 'Your data is handled with confidentiality and security protocols'}</span>
                </div>
                <div className="tl-sf-trust-item">
                  <Icons.CreditCard />
                  <span>{pt ? 'Não armazenamos dados de cartão de crédito' : 'We do not store credit card data'}</span>
                </div>
                <div className="tl-sf-trust-item">
                  <Icons.Eye />
                  <span>{pt ? 'Processo transparente — você acompanha cada etapa' : 'Transparent process — you follow every step'}</span>
                </div>
              </div>

              <p className="tl-sf-disclaimer">{pt
                ? 'O serviço de Special Fares é um serviço de concierge. A disponibilidade de tarifas especiais depende de condições de mercado e não é garantida para todas as reservas.'
                : 'Special Fares is a concierge service. The availability of special rates depends on market conditions and is not guaranteed for every booking.'
              }</p>
            </div>

            <div className="tl-sf-visual">
              <div className="tl-sf-card-demo">
                <div className="tl-sf-card-label">{pt ? 'Exemplo de Special Fare' : 'Special Fare example'}</div>
                <div className="tl-sf-card-hotel">Hotel Fasano São Paulo</div>
                <div className="tl-sf-card-room">Deluxe King · 3 {pt ? 'noites' : 'nights'}</div>
                <div className="tl-sf-card-prices">
                  <div className="tl-sf-card-original">
                    <span className="tl-sf-price-label">{pt ? 'Sua tarifa atual' : 'Your current rate'}</span>
                    <span className="tl-sf-price-old">R$ 5.400</span>
                  </div>
                  <div className="tl-sf-card-special">
                    <span className="tl-sf-price-label">{pt ? 'Special Fare encontrada' : 'Special Fare found'}</span>
                    <span className="tl-sf-price-new">R$ 3.890</span>
                  </div>
                </div>
                <div className="tl-sf-card-saving">
                  <span>{pt ? 'Economia potencial' : 'Potential savings'}</span>
                  <span className="tl-sf-saving-value">R$ 1.510 (-28%)</span>
                </div>
                <div className="tl-sf-card-tag">
                  <Icons.Shield /> {pt ? 'Reserva via concierge dedicado' : 'Booked via dedicated concierge'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TRUST & PRIVACY */}
      <section className="tl-trust-section">
        <div className="container">
          <div className="section-header">
            <h2>{pt ? 'Transparência e segurança' : 'Transparency and security'}</h2>
            <p className="muted">{pt ? 'Projetado para que você tenha total controle e clareza sobre como o serviço funciona.' : 'Designed so you have full control and clarity on how the service works.'}</p>
          </div>
          <div className="tl-trust-cards">
            <div className="tl-trust-card">
              <div className="tl-trust-card-icon"><Icons.Shield /></div>
              <h4>{pt ? 'Sem acesso a dados financeiros' : 'No financial data access'}</h4>
              <p>{pt ? 'Não solicitamos cartão de crédito, conta bancária ou credenciais de pagamento. Trabalhamos apenas com os dados da reserva.' : 'We don\'t request credit cards, bank accounts, or payment credentials. We only work with booking data.'}</p>
            </div>
            <div className="tl-trust-card">
              <div className="tl-trust-card-icon"><Icons.Eye /></div>
              <h4>{pt ? 'Monitoramento, não execução' : 'Monitoring, not execution'}</h4>
              <p>{pt ? 'O ResDrop monitora e alerta. Não cancelamos, não reservamos e não alteramos nada em seu nome. A ação é sempre sua.' : 'ResDrop monitors and alerts. We don\'t cancel, book, or change anything on your behalf. The action is always yours.'}</p>
            </div>
            <div className="tl-trust-card">
              <div className="tl-trust-card-icon"><Icons.CreditCard /></div>
              <h4>{pt ? 'Apenas reservas reembolsáveis' : 'Refundable bookings only'}</h4>
              <p>{pt ? 'O serviço é projetado exclusivamente para reservas com cancelamento gratuito. Reservas não reembolsáveis não se beneficiam do monitoramento.' : 'The service is designed exclusively for free cancellation bookings. Non-refundable bookings do not benefit from monitoring.'}</p>
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
            <p className="muted">{pt ? 'Dúvidas comuns sobre o serviço de monitoramento do ResDrop.' : 'Common questions about ResDrop\'s monitoring service.'}</p>
          </div>

          <div className="tl-faq-grid">
            <div className="tl-faq-item">
              <h4>{pt ? 'O ResDrop faz alguma alteração na minha reserva?' : 'Does ResDrop make any changes to my booking?'}</h4>
              <p>{pt ? 'Não. O ResDrop é uma plataforma de monitoramento e alertas. Nós apenas avisamos quando encontramos uma tarifa menor. Toda decisão e ação é exclusivamente sua.' : 'No. ResDrop is a monitoring and alerting platform. We only notify you when we find a lower rate. Every decision and action is exclusively yours.'}</p>
            </div>
            <div className="tl-faq-item">
              <h4>{pt ? 'Por que precisa ser uma reserva com cancelamento grátis?' : 'Why does it need to be a free cancellation booking?'}</h4>
              <p>{pt ? 'Para aproveitar uma tarifa menor, você precisaria cancelar a reserva original sem custos. Se a reserva for não reembolsável, a multa de cancelamento pode eliminar qualquer vantagem. Por isso, o serviço funciona apenas com reservas reembolsáveis.' : 'To take advantage of a lower rate, you would need to cancel the original booking at no cost. If the booking is non-refundable, the cancellation penalty could eliminate any advantage. That\'s why the service works only with refundable bookings.'}</p>
            </div>
            <div className="tl-faq-item">
              <h4>{pt ? 'Como vocês comparam as tarifas?' : 'How do you compare rates?'}</h4>
              <p>{pt ? 'Nosso sistema rastreia o mesmo hotel, mesmas datas e tipo de quarto equivalente em mais de 20 plataformas de hospedagem. Comparamos tarifas com políticas de cancelamento similares.' : 'Our system tracks the same hotel, same dates, and equivalent room type across 20+ booking platforms. We compare rates with similar cancellation policies.'}</p>
            </div>
            <div className="tl-faq-item">
              <h4>{pt ? 'Devo cancelar minha reserva atual antes de refazer?' : 'Should I cancel my current booking before rebooking?'}</h4>
              <p>{pt ? 'Nunca. Primeiro, faça a nova reserva com a tarifa menor. Somente após a confirmação da nova reserva, cancele a original no site onde foi feita. Isso garante que você nunca fique sem hospedagem.' : 'Never. First, make the new booking at the lower rate. Only after the new booking is confirmed, cancel the original on the site where it was made. This ensures you never end up without accommodation.'}</p>
            </div>
            <div className="tl-faq-item">
              <h4>{pt ? 'Vocês acessam meus dados financeiros ou de pagamento?' : 'Do you access my financial or payment data?'}</h4>
              <p>{pt ? 'Não. O ResDrop não solicita e não tem acesso a dados de cartão de crédito, conta bancária ou credenciais de pagamento. Trabalhamos apenas com as informações da reserva que você compartilha conosco.' : 'No. ResDrop does not request and does not have access to credit card data, bank accounts, or payment credentials. We only work with the booking information you share with us.'}</p>
            </div>
            <div className="tl-faq-item">
              <h4>{pt ? 'O ResDrop garante economia em todas as reservas?' : 'Does ResDrop guarantee savings on every booking?'}</h4>
              <p>{pt ? 'Não. O mercado hoteleiro é dinâmico e nem sempre os preços caem. O ResDrop monitora e alerta oportunidades quando elas surgem, mas não há garantia de que uma tarifa menor será encontrada para cada reserva.' : 'No. The hotel market is dynamic and prices don\'t always drop. ResDrop monitors and alerts opportunities when they arise, but there is no guarantee that a lower rate will be found for every booking.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="tl-cta">
        <div className="container">
          <h2>{pt ? 'Adicione sua próxima reserva e deixe o ResDrop acompanhar' : 'Add your next booking and let ResDrop keep watch'}</h2>
          <p>{pt ? 'Reserve com cancelamento gratuito e ative o monitoramento. Se o preço cair, você será o primeiro a saber.' : 'Book with free cancellation and activate monitoring. If the price drops, you\'ll be the first to know.'}</p>
          <Link to="/signup" className="btn btn-gold">{pt ? 'Criar conta gratuita' : 'Create free account'}</Link>
          <p className="tl-cta-disclaimer">{pt ? 'Serviço de monitoramento e alertas. Resultados variam conforme disponibilidade.' : 'Monitoring and alerting service. Results vary based on availability.'}</p>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="tl-footer">
        <div className="container">
          <div className="tl-footer-grid">
            <div className="tl-footer-brand">
              <Link to="/" className="logo"><Icons.ResDropLogo /> ResDrop</Link>
              <p>{pt ? 'Plataforma de monitoramento de tarifas hoteleiras. Acompanhamos variações de preço e alertamos oportunidades para reservas com cancelamento gratuito.' : 'Hotel rate monitoring platform. We track price changes and alert opportunities for free cancellation bookings.'}</p>
              <p className="tl-footer-compliance">{pt ? 'Serviço de monitoramento e alertas. Não garantimos resultados específicos. Não acessamos dados financeiros.' : 'Monitoring and alerting service. We do not guarantee specific results. We do not access financial data.'}</p>
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
