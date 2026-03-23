import React, { useEffect } from 'react';
import './PremiumLanding.css';

// Using inline SVG icons to ensure zero dependencies and complete portability
const Icons = {
  Check: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Shield: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Clock: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Eye: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  CreditCard: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
  TrendDown: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>,
  Bell: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
  Refresh: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>,
  Target: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  Percent: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>,
  Star: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  Bed: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>,
};


export default function PremiumLanding() {
  // Simple scroll-to-top on mount to ensure clean slate
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="premium-landing">
      {/* 1. HEADER */}
      <header className="premium-header">
        <div className="container">
          <a href="#" className="premium-header-logo">
            <Icons.Shield /> ResDrop
          </a>
          <nav className="premium-header-nav">
            <a href="#como-funciona">Como funciona</a>
            <a href="#economia">Economia real</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="premium-header-actions">
            <a href="#planos" className="btn btn-primary">Monitorar reserva</a>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pl-hero">
        <div className="pl-hero-content">
          <div className="pl-hero-pill">
            <Icons.Star /> Inteligência em Hospitalidade
          </div>
          <h1>Sua tarifa pode cair após a reserva. Nós avisamos.</h1>
          <p>Reserve normalmente. O ResDrop monitora sua reserva 24/7 e alerta você no momento exato em que uma tarifa reembolsável mais vantajosa fica disponível.</p>
          
          <div className="pl-hero-actions">
            <a href="#planos" className="btn btn-primary">Começar grátis</a>
            <a href="#como-funciona" className="btn btn-outline">Ver como funciona</a>
          </div>

          <div className="pl-hero-trust">
            <span><Icons.Check /> Monitoramento 24/7</span>
            <span><Icons.Check /> Mais de 20 plataformas</span>
            <span><Icons.Check /> Você continua no controle</span>
          </div>
        </div>
      </section>

      {/* 3. TRUST STRIP */}
      <div className="pl-trust-strip">
        <div className="container">
          <div className="pl-trust-grid">
            <div className="pl-trust-item">
              <Icons.Eye />
              <span>Monitoramos +20 plataformas</span>
            </div>
            <div className="pl-trust-item">
              <Icons.Bell />
              <span>Alertas em tempo real</span>
            </div>
            <div className="pl-trust-item">
              <Icons.Shield />
              <span>Sem mudanças automáticas</span>
            </div>
            <div className="pl-trust-item">
              <Icons.CreditCard />
              <span>Ideal para tarifas flexíveis</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL SAVINGS EXAMPLES */}
      <section id="economia" className="pl-savings">
        <div className="container">
          <div className="section-header">
            <h2>Oportunidades reais. Economia palpável.</h2>
            <p className="muted">Exemplos reais de como flutuações de inventário criam oportunidades únicas para nossos usuários entre a data da reserva e o check-in.</p>
          </div>

          <div className="pl-savings-grid">
            <div className="pl-savings-card">
              <span className="pl-savings-location">São Paulo, BR</span>
              <h3 className="pl-savings-hotel">Fasano Itaim</h3>
              <div className="pl-savings-room">Deluxe King Room • 3 Noites</div>
              <div className="pl-savings-price">
                <span className="old">R$ 5.400</span>
                <span className="new">R$ 4.250</span>
              </div>
              <div className="pl-savings-result">
                <span className="pl-savings-result-label">Economia encontrada</span>
                <span className="pl-savings-result-value">R$ 1.150 (-21%)</span>
              </div>
              <div className="pl-savings-reason">
                <Icons.Target /> Ajuste de inventário a 7 dias do check-in
              </div>
            </div>

            <div className="pl-savings-card">
              <span className="pl-savings-location">Rio de Janeiro, BR</span>
              <h3 className="pl-savings-hotel">Copacabana Palace</h3>
              <div className="pl-savings-room">Ocean View Suite • 5 Noites</div>
              <div className="pl-savings-price">
                <span className="old">R$ 12.500</span>
                <span className="new">R$ 9.800</span>
              </div>
              <div className="pl-savings-result">
                <span className="pl-savings-result-label">Economia encontrada</span>
                <span className="pl-savings-result-value">R$ 2.700 (-21%)</span>
              </div>
              <div className="pl-savings-reason">
                <Icons.Target /> Cancelamento de grupo corporativo
              </div>
            </div>

            <div className="pl-savings-card">
              <span className="pl-savings-location">Fortaleza, BR</span>
              <h3 className="pl-savings-hotel">Hotel Gran Marquise</h3>
              <div className="pl-savings-room">Executive Suite • 4 Noites</div>
              <div className="pl-savings-price">
                <span className="old">R$ 3.800</span>
                <span className="new">R$ 2.950</span>
              </div>
              <div className="pl-savings-result">
                <span className="pl-savings-result-label">Economia encontrada</span>
                <span className="pl-savings-result-value">R$ 850 (-22%)</span>
              </div>
              <div className="pl-savings-reason">
                <Icons.Target /> Diferença de precificação entre plataformas
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section id="como-funciona" className="pl-how">
        <div className="container">
          <div className="section-header">
            <h2>Elegância na simplicidade</h2>
            <p className="muted">Um processo desenhado para minimizar seu esforço e maximizar suas vantagens em reservas de alto padrão.</p>
          </div>

          <div className="pl-how-grid">
            <div className="pl-how-step">
              <div className="pl-how-number">1</div>
              <h3>Envie sua reserva</h3>
              <p>Faça sua reserva reembolsável normalmente e adicione os dados no ResDrop.</p>
            </div>
            <div className="pl-how-step">
              <div className="pl-how-number">2</div>
              <h3>Nós monitoramos</h3>
              <p>Nosso sistema varre o mercado 24/7 comparando tarifas equivalentes em dezenas de plataformas.</p>
            </div>
            <div className="pl-how-step">
              <div className="pl-how-number">3</div>
              <h3>Receba o alerta</h3>
              <p>Assim que uma tarifa mais baixa para o mesmo quarto surgir, você será notificado imediatamente.</p>
            </div>
            <div className="pl-how-step">
              <div className="pl-how-number">4</div>
              <h3>Você decide</h3>
              <p>Reserve a nova tarifa com economia e cancele a antiga. Totalmente sob o seu controle.</p>
            </div>
          </div>

          <div className="pl-how-note">
            <strong>Transparência total:</strong> Você continua no controle da reserva. O ResDrop apenas monitora e alerta a oportunidade.
          </div>
        </div>
      </section>

      {/* 6. WHY PRICES DROP */}
      <section className="pl-savings dark-section" style={{ background: 'var(--p-bg-dark)' }}>
        <div className="container">
          <div className="pl-split-section">
            <div className="pl-image-block">
              <h2>Por que as tarifas de hotéis premium flutuam?</h2>
              <p className="muted" style={{ marginBottom: '32px' }}>A precificação hoteleira é dinâmica. As propriedades ajustam valores continuamente baseados em oferta e demanda. O ResDrop transforma essa complexidade em vantagem para você.</p>
              <div style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--p-accent-gold)' }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>"Não é o mesmo que esperar sorte. Nós monitoramos continuamente oportunidades reais em tarifas equivalentes."</p>
              </div>
            </div>

            <div className="pl-reasons-list" style={{ color: 'white' }}>
              <div className="pl-reason-item">
                <div className="pl-reason-icon"><Icons.TrendDown /></div>
                <div>
                  <h4 style={{ color: 'white' }}>Cancelamentos inesperados</h4>
                  <p className="muted">Quando hóspedes ou grupos cancelam, o inventário retorna ao sistema frequentemente por um valor menor para garantir ocupação imediata.</p>
                </div>
              </div>
              <div className="pl-reason-item">
                <div className="pl-reason-icon"><Icons.Percent /></div>
                <div>
                  <h4 style={{ color: 'white' }}>Promoções relâmpago exclusivas</h4>
                  <p className="muted">Canais de venda e plataformas parceiras implementam descontos temporários que duram apenas poucas horas.</p>
                </div>
              </div>
              <div className="pl-reason-item">
                <div className="pl-reason-icon"><Icons.Refresh /></div>
                <div>
                  <h4 style={{ color: 'white' }}>Ajustes próximos ao check-in</h4>
                  <p className="muted">Para evitar quartos vazios, gerentes de receita (Revenue Managers) reduzem agressivamente as tarifas nos dias que antecedem a data.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. WHO IT'S FOR (Merged lightly into benefits) */}
      <section className="pl-how" style={{ paddingBottom: '40px' }}>
        <div className="container">
          <div className="section-header">
            <h2>Para quem valoriza o próprio tempo e orçamento</h2>
            <p className="muted">Uma ferramenta essencial para viajantes frequentes, executivos e entusiastas da alta hotelaria que compreendem que tarifas flexíveis são ativos voláteis.</p>
          </div>
        </div>
      </section>

      {/* 9. PRICING */}
      <section id="planos" className="pl-pricing">
        <div className="container">
          <div className="section-header">
            <h2>Planos sob medida para o seu estilo de viagem</h2>
            <p className="muted">Escolha o nível de monitoramento que melhor atende à sua frequência de hospedagens.</p>
          </div>

          <div className="pl-pricing-grid">
            <div className="pl-pricing-card">
              <h3>Grátis</h3>
              <p>Para testar como funciona e experimentar a plataforma.</p>
              <div className="pl-pricing-price">R$ 0 <span>/mês</span></div>
              <ul className="pl-pricing-features">
                <li><Icons.Check /> Monitore 1 reserva por mês</li>
                <li><Icons.Check /> Verificação diária de preços</li>
                <li><Icons.Check /> Alertas por e-mail</li>
                <li><Icons.Check /> Monitoramento padrão</li>
              </ul>
              <a href="#" className="btn btn-outline">Começar grátis</a>
            </div>

            <div className="pl-pricing-card highlight">
              <div className="pl-pricing-badge">Mais escolhido</div>
              <h3>Viajante</h3>
              <p>Ideal para viagens pessoais e frequentes com alto potencial de retorno.</p>
              <div className="pl-pricing-price">R$ 39 <span>/mês</span></div>
              <ul className="pl-pricing-features">
                <li><Icons.Check /> Monitore até 10 reservas por mês</li>
                <li><Icons.Check /> +20 plataformas verificadas</li>
                <li><Icons.Check /> Alertas em tempo real</li>
                <li><Icons.Check /> Histórico detalhado de preços</li>
              </ul>
              <a href="#" className="btn btn-gold">Escolher Viajante</a>
            </div>

            <div className="pl-pricing-card">
              <h3>Premium</h3>
              <p>Para profissionais e quem quer prioridade máxima no ecossistema.</p>
              <div className="pl-pricing-price">R$ 99 <span>/mês</span></div>
              <ul className="pl-pricing-features">
                <li><Icons.Check /> Monitore até 50 reservas por mês</li>
                <li><Icons.Check /> Alertas prioritários (Push + Email)</li>
                <li><Icons.Check /> Relatórios completos de mercado</li>
                <li><Icons.Check /> Suporte dedicado e consultoria</li>
              </ul>
              <a href="#" className="btn btn-outline">Escolher Premium</a>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section id="faq" className="pl-faq">
        <div className="container">
          <div className="section-header">
            <h2>Perguntas Frequentes</h2>
            <p className="muted">Tudo o que você precisa saber sobre nosso serviço de monitoramento inteligente.</p>
          </div>

          <div className="pl-faq-grid">
            <div className="pl-faq-item">
              <h4>O ResDrop faz uma nova reserva automaticamente?</h4>
              <p>Não. Nós apenas enviamos o alerta indicando onde encontrar a tarifa mais barata. O controle total e o processo de refazer a reserva continuam sendo exclusivamente seus, garantindo sua segurança.</p>
            </div>
            <div className="pl-faq-item">
              <h4>O monitoramento vale para tarifas não reembolsáveis?</h4>
              <p>O ResDrop é focado em tarifas reembolsáveis. Se a sua reserva original não for cancelável, encontrar um preço menor não trará benefício financeiro, pois você pagaria multas ou perderia o valor já pago.</p>
            </div>
            <div className="pl-faq-item">
              <h4>Como vocês comparam as tarifas?</h4>
              <p>Nosso algoritmo rastreia o exato mesmo hotel, mesmas datas, mesmo tipo de quarto e políticas de cancelamento equivalentes ao redor de mais de 20 plataformas mundiais de hospedagem.</p>
            </div>
            <div className="pl-faq-item">
              <h4>Preciso cancelar minha reserva atual antes?</h4>
              <p>Jamais cancele a reserva atual antes de garantir a nova. Quando receber nosso alerta, faça a nova reserva com a tarifa promocional e, somente após a confirmação, cancele a anterior.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="pl-cta">
        <div className="container">
          <h2>Comece a monitorar sua próxima reserva</h2>
          <p>Reserve normalmente e deixe o ResDrop avisar se surgir uma tarifa melhor. O mercado flutua; o seu custo não precisa flutuar junto.</p>
          <a href="#planos" className="btn btn-gold">Começar grátis hoje</a>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="pl-footer">
        <div className="container">
          <div className="pl-footer-grid">
            <div className="pl-footer-brand">
              <a href="#" className="logo"><Icons.Shield /> ResDrop</a>
              <p>Monitoramento inteligente de tarifas de hotel para quem quer reservar com mais segurança e economizar quando o mercado flutua.</p>
            </div>
            
            <div>
              <h4>Produto</h4>
              <ul>
                <li><a href="#como-funciona">Como funciona</a></li>
                <li><a href="#economia">Economia real</a></li>
                <li><a href="#planos">Planos e Preços</a></li>
                <li><a href="#faq">Perguntas Frequentes</a></li>
              </ul>
            </div>

            <div>
              <h4>Empresa</h4>
              <ul>
                <li><a href="#">Sobre nós</a></li>
                <li><a href="#">Carreiras</a></li>
                <li><a href="#">Imprensa</a></li>
                <li><a href="#">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Termos de Uso</a></li>
                <li><a href="#">Política de Privacidade</a></li>
                <li><a href="#">Segurança de Dados</a></li>
              </ul>
            </div>
          </div>

          <div className="pl-footer-bottom">
            <span>&copy; {new Date().getFullYear()} ResDrop. Todos os direitos reservados.</span>
            <span>Design Hospitality Premium Edition</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
