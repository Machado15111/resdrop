import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ResDroppLanding.css';

/* ═══════════════════════════════════════════════════════
   TRANSLATIONS  — EN + PT
   ═══════════════════════════════════════════════════════ */
const T = {
  en: {
    nav: {
      how: 'How it works', features: 'Features',
      savings: 'Savings', faq: 'FAQ',
      login: 'Log in', start: 'Start Free',
    },
    hero: {
      kicker: 'Live rate monitoring',
      h1a: 'Booked.', h1b: 'Now let ResDrop', h1c: 'keep watching.',
      sub: 'ResDrop monitors your hotel reservation around the clock. When a better rate, improved terms, or added benefits become available, we alert you immediately so you can choose whether to rebook.',
      cta1: 'Start Tracking Free', cta2: 'See how it works',
      t1: 'No credit card needed', t2: 'We never rebook without your approval', t3: 'Free to start',
    },
    platforms: 'Monitors rates at',
    how: {
      label: 'HOW IT WORKS',
      h: 'Set it once. Stay in control.',
      sub: 'ResDrop runs quietly in the background. You stay in full control. We only alert; you decide whether to act.',
      steps: [
        { title: 'Add your booking', desc: 'Enter your existing hotel reservation details in under two minutes.' },
        { title: 'We monitor your rate', desc: 'ResDrop continuously checks for better rates, improved terms, and booking opportunities.' },
        { title: 'You receive an alert', desc: 'When a stronger option appears, you are notified immediately via email or in-app.' },
        { title: 'You decide', desc: 'Review the improved option and choose whether to rebook. We never act without your approval.' },
      ],
    },
    features: {
      label: 'FEATURES',
      h: 'Every tool you need.\nNothing you don\'t.',
      sub: 'ResDrop is purpose-built for one thing: making sure you never pay more than necessary for a hotel stay you have already booked.',
      cards: [
        { title: '24/7 rate monitoring', desc: 'Our system checks hotel rates continuously. Nights, weekends, holidays. You never have to look.' },
        { title: 'Instant rate alerts', desc: 'When a better refundable rate appears, you are notified within minutes via email or in-app.', accent: true },
        { title: 'Broad platform coverage', desc: 'We track rates at all major chains, Expedia, Booking.com, Hotels.com, and the hotel directly.' },
        { title: 'Track multiple bookings', desc: 'Monitor every upcoming reservation from one clean dashboard. No limit on the number of bookings.' },
        { title: 'Rate improvements overview', desc: 'A clear view of every improvement found, every alert sent, and every rebooking opportunity identified.' },
        { title: 'Privacy-first design', desc: 'We monitor rates. Nothing else. No access to your loyalty accounts, payment details, or personal data.' },
      ],
    },
    dashboard: {
      label: 'DASHBOARD',
      h: 'Your bookings, in one view.',
      sub: 'A clean, focused interface. No clutter. Just your reservations, their current rates, and every improvement found.',
    },
    sf: {
      label: 'RESDROP SPECIAL FARE',
      badge: 'Special Fare',
      h: 'Beyond public rates.',
      sub: 'ResDrop does not only monitor publicly available rates. We also check selected partner and internal channels for improved rates, added amenities, or better overall booking value on your existing stay.',
      items: [
        { title: 'Preferred partner rates', desc: 'Access to rates available through our booking partnerships, not always visible on public channels.' },
        { title: 'Added amenities and benefits', desc: 'Identify equivalent stays that include breakfast, upgrades, or flexible cancellation at the same or lower price.' },
        { title: 'Better booking terms', desc: 'Find the same room with improved cancellation policies, deposit conditions, or loyalty earning potential.' },
      ],
    },
    savings: {
      label: 'REAL SAVINGS',
      h: 'What ResDrop finds for you.',
      sub: 'These are the types of rate improvements our users act on every week.',
      pill: 'IMPROVEMENT FOUND',
      saved: 'saved',
      was: 'Was', now: 'Now', nights: 'nights',
    },
    benefits: {
      label: 'WHY IT MATTERS',
      h: 'The rate you booked may not be the best available.',
      sub: 'Hotel rates fluctuate constantly. Rooms you booked last month may now be available at a significantly lower or better rate, and most travelers never find out.',
      items: [
        { title: 'Stop checking manually', desc: 'The average traveler checks hotel prices 4 to 6 times after booking. ResDrop does that for you, accurately and without interruption.' },
        { title: 'No change without your approval', desc: 'We never touch your reservation. Every action is your choice. You receive an alert; you decide whether to rebook.' },
        { title: 'Better rate, better terms', desc: 'Most travelers never know a lower or better rate was available. ResDrop closes that gap automatically.' },
        { title: 'Refundable rates only, always', desc: 'We only alert you to refundable alternatives. You keep full flexibility, with no risk to your original booking.' },
      ],
      stat: 'average improvement identified per traveler in the first 3 months',
    },
    lifestyle: {
      label: 'FOR TRAVELERS WHO EXPECT MORE',
      h: 'Travel thoughtfully.\nSpend deliberately.',
      sub: 'ResDrop was designed for people who take the quality of their travel seriously and who understand that paying more than necessary is simply unnecessary.',
      quote: '"The best tools are the ones you forget are running, until they surface a better option."',
      attr: 'The ResDrop promise',
    },
    testimonials: {
      label: 'TRAVELER STORIES',
      h: 'What our users say.',
      saved: 'improved',
      items: [
        { quote: 'We found a better rate on our Rome trip. The alert came in while we were sleeping. By morning we had already rebooked at the improved rate.', name: 'Catherine V.', meta: 'Frequent leisure traveler', initials: 'CV', color: '#1A3A2E', saved: '$608' },
        { quote: 'I travel every week for work and always book refundable rates. ResDrop has found improvements I never would have caught on my own.', name: 'James O.', meta: 'Business traveler · 80+ nights/year', initials: 'JO', color: '#2B5E48', saved: '$1,240' },
        { quote: 'Elegant, quiet, and genuinely useful. It does not feel like a deal site. It feels like something built for people who care about their travel.', name: 'Sophie M.', meta: 'Luxury travel planner', initials: 'SM', color: '#2D4A3E', saved: '$880' },
      ],
    },
    faq: {
      label: 'FAQ',
      h: 'Questions answered.',
      sub: 'Everything you need to know before you start.',
      items: [
        { q: 'How does rate monitoring actually work?', a: 'Once you add a booking, ResDrop continuously checks the rate for your specific room, dates, and hotel across all major platforms. When a better refundable rate or improved booking option appears, we send you an alert immediately.' },
        { q: 'When do I receive a notification?', a: 'You receive an alert as soon as we detect a rate lower than your current booking, a better refundable option, or a rate with improved terms or added benefits.' },
        { q: 'Do you cancel or rebook my reservation automatically?', a: 'Never. ResDrop only alerts you. Every rebooking decision is entirely yours. We provide the information; you take the action.' },
        { q: 'Can I track more than one booking at a time?', a: 'Yes. You can track as many upcoming reservations as you like from a single dashboard.' },
        { q: 'Which platforms and hotels are supported?', a: 'We monitor rates across all major chains including Marriott, Hilton, Hyatt, IHG, Accor, and Wyndham, as well as Expedia, Booking.com, Hotels.com, and the hotel websites directly.' },
        { q: 'Does it work for international bookings?', a: 'Yes. ResDrop supports hotel monitoring in all major travel markets worldwide.' },
        { q: 'How quickly can I get started?', a: 'You can add your first booking in under two minutes. No credit card required to start.' },
      ],
    },
    cta: {
      serif: 'The smarter way to monitor your stay',
      h: 'Your next hotel\nmay already have\na better rate.',
      sub: 'Add your booking in under two minutes. ResDrop does the rest. You only pay attention when there is a real opportunity.',
      btn1: 'Start Tracking Free', btn2: 'Log in',
      micro: 'No credit card required · Set up in 2 minutes · Cancel anytime',
    },
    footer: {
      tagline: 'Hotel rate monitoring for travelers who prefer to keep their savings, not leave them on the table.',
      product: 'PRODUCT', company: 'COMPANY', account: 'ACCOUNT',
      how: 'How it works', features: 'Features', savings: 'Savings examples', faq: 'FAQ', start: 'Start free',
      about: 'About', contact: 'Contact', privacy: 'Privacy Policy', terms: 'Terms of Service',
      login: 'Log in', create: 'Create account', dashboard: 'Dashboard',
      copy: 'All rights reserved.', privacyShort: 'Privacy', termsShort: 'Terms',
    },
  },

  pt: {
    nav: {
      how: 'Como funciona', features: 'Funcionalidades',
      savings: 'Economias', faq: 'FAQ',
      login: 'Entrar', start: 'Começar Grátis',
    },
    hero: {
      kicker: 'Monitoramento de tarifas em tempo real',
      h1a: 'Reservado.', h1b: 'Agora a ResDrop', h1c: 'continua monitorando.',
      sub: 'A ResDrop monitora sua reserva de hotel o tempo todo. Quando uma tarifa melhor, condições mais vantajosas ou benefícios adicionais ficam disponíveis, você recebe um alerta imediato para decidir se quer remarcar.',
      cta1: 'Começar Gratuitamente', cta2: 'Ver como funciona',
      t1: 'Sem cartão de crédito', t2: 'Nunca remarcamos sem a sua aprovação', t3: 'Grátis para começar',
    },
    platforms: 'Monitora tarifas em',
    how: {
      label: 'COMO FUNCIONA',
      h: 'Configure uma vez. Fique no controle.',
      sub: 'A ResDrop funciona silenciosamente em segundo plano. Você mantém o controle total. Apenas alertamos; você decide se quer agir.',
      steps: [
        { title: 'Adicione sua reserva', desc: 'Insira os dados da sua reserva de hotel existente em menos de dois minutos.' },
        { title: 'Monitoramos sua tarifa', desc: 'A ResDrop verifica continuamente melhores tarifas, condições mais vantajosas e oportunidades de reserva.' },
        { title: 'Você recebe um alerta', desc: 'Quando surge uma opção melhor, você é notificado imediatamente por e-mail ou pelo app.' },
        { title: 'Você decide', desc: 'Avalie a opção melhorada e escolha se deseja remarcar. Nunca agimos sem a sua aprovação.' },
      ],
    },
    features: {
      label: 'FUNCIONALIDADES',
      h: 'Tudo que você precisa.\nNada além disso.',
      sub: 'A ResDrop foi criada para uma única função: garantir que você nunca pague mais do que o necessário por uma estadia que já reservou.',
      cards: [
        { title: 'Monitoramento 24/7', desc: 'Nosso sistema verifica tarifas de hotel continuamente. Noites, fins de semana, feriados. Você nunca precisa checar.' },
        { title: 'Alertas instantâneos', desc: 'Quando uma tarifa reembolsável melhor aparece, você é notificado em minutos por e-mail ou pelo app.', accent: true },
        { title: 'Cobertura ampla', desc: 'Monitoramos tarifas nas principais redes, Expedia, Booking.com, Hotels.com e diretamente no hotel.' },
        { title: 'Múltiplas reservas', desc: 'Acompanhe todas as suas próximas reservas em um painel único e organizado. Sem limite de quantidade.' },
        { title: 'Visão de melhorias', desc: 'Visão clara de cada melhoria de tarifa encontrada, cada alerta enviado e cada oportunidade de remarcação identificada.' },
        { title: 'Privacidade em primeiro lugar', desc: 'Monitoramos tarifas. Nada mais. Sem acesso a contas de fidelidade, dados de pagamento ou informações pessoais.' },
      ],
    },
    dashboard: {
      label: 'PAINEL',
      h: 'Suas reservas, em uma única visão.',
      sub: 'Uma interface limpa e focada. Sem ruído. Apenas suas reservas, as tarifas atuais e cada melhoria encontrada.',
    },
    sf: {
      label: 'RESDROP SPECIAL FARE',
      badge: 'Special Fare',
      h: 'Além das tarifas públicas.',
      sub: 'A ResDrop não monitora apenas tarifas publicamente disponíveis. Também verificamos canais parceiros selecionados e internos em busca de tarifas melhores, comodidades adicionais ou melhor valor geral na sua estadia.',
      items: [
        { title: 'Tarifas de parceiros preferenciais', desc: 'Acesso a tarifas disponíveis por meio de nossas parcerias de reserva, nem sempre visíveis em canais públicos.' },
        { title: 'Comodidades e benefícios adicionais', desc: 'Identifique estadias equivalentes que incluem café da manhã, upgrades ou cancelamento flexível pelo mesmo preço ou menos.' },
        { title: 'Melhores condições de reserva', desc: 'Encontre o mesmo quarto com melhores políticas de cancelamento, condições de depósito ou potencial de acúmulo de pontos.' },
      ],
    },
    savings: {
      label: 'MELHORIAS REAIS',
      h: 'O que a ResDrop encontra para você.',
      sub: 'Estes são os tipos de melhorias de tarifa que nossos usuários aproveitam toda semana.',
      pill: 'MELHORIA ENCONTRADA',
      saved: 'economizado',
      was: 'Era', now: 'Agora', nights: 'noites',
    },
    benefits: {
      label: 'POR QUE IMPORTA',
      h: 'A tarifa que você reservou pode não ser a melhor disponível.',
      sub: 'As tarifas hoteleiras mudam constantemente. Quartos que você reservou no mês passado podem estar disponíveis a uma tarifa significativamente melhor, e a maioria dos viajantes nunca fica sabendo.',
      items: [
        { title: 'Pare de verificar manualmente', desc: 'O viajante médio checa preços de hotel de 4 a 6 vezes após a reserva. A ResDrop faz isso por você, com precisão e sem interrupções.' },
        { title: 'Sem alterações sem sua aprovação', desc: 'Nunca tocamos na sua reserva. Cada ação é sua escolha. Você recebe um alerta; você decide se quer remarcar.' },
        { title: 'Melhor tarifa, melhores condições', desc: 'A maioria dos viajantes nunca sabe que havia uma tarifa melhor disponível. A ResDrop elimina essa lacuna automaticamente.' },
        { title: 'Apenas tarifas reembolsáveis', desc: 'Alertamos apenas para alternativas reembolsáveis. Você mantém total flexibilidade, sem risco para sua reserva original.' },
      ],
      stat: 'melhoria média identificada por viajante nos primeiros 3 meses',
    },
    lifestyle: {
      label: 'PARA QUEM ESPERA MAIS',
      h: 'Viaje com propósito.\nGaste com intenção.',
      sub: 'A ResDrop foi criada para pessoas que levam a qualidade de suas viagens a sério e entendem que pagar mais do que o necessário é simplesmente desnecessário.',
      quote: '"As melhores ferramentas são aquelas que você esquece que estão rodando, até que encontram uma opção melhor."',
      attr: 'A promessa da ResDrop',
    },
    testimonials: {
      label: 'HISTÓRIAS DE VIAJANTES',
      h: 'O que nossos usuários dizem.',
      saved: 'melhorado',
      items: [
        { quote: 'Encontramos uma tarifa melhor na nossa viagem a Roma. O alerta chegou enquanto dormíamos. De manhã já tínhamos remarcado na tarifa melhorada.', name: 'Catherine V.', meta: 'Viajante de lazer frequente', initials: 'CV', color: '#1A3A2E', saved: '$608' },
        { quote: 'Viajo toda semana a trabalho e sempre reservo tarifas reembolsáveis. A ResDrop encontrou melhorias que eu nunca teria percebido sozinho.', name: 'James O.', meta: 'Viajante de negócios · 80+ noites/ano', initials: 'JO', color: '#2B5E48', saved: '$1.240' },
        { quote: 'Elegante, discreto e genuinamente útil. Não parece um site de descontos. Parece algo construído para pessoas que levam a sério suas viagens.', name: 'Sophie M.', meta: 'Planejadora de viagens de luxo', initials: 'SM', color: '#2D4A3E', saved: '$880' },
      ],
    },
    faq: {
      label: 'FAQ',
      h: 'Perguntas respondidas.',
      sub: 'Tudo que você precisa saber antes de começar.',
      items: [
        { q: 'Como o monitoramento de tarifas funciona?', a: 'Após adicionar uma reserva, a ResDrop verifica continuamente a tarifa do seu quarto específico, datas e hotel em todas as principais plataformas. Quando uma tarifa reembolsável melhor ou uma opção superior aparece, enviamos um alerta imediatamente.' },
        { q: 'Quando recebo uma notificação?', a: 'Você recebe um alerta assim que detectamos uma tarifa mais baixa, uma opção reembolsável melhor, ou uma tarifa com condições mais vantajosas ou benefícios adicionais.' },
        { q: 'Vocês cancelam ou remarcam minha reserva automaticamente?', a: 'Nunca. A ResDrop apenas alerta você. Cada decisão de remarcação é totalmente sua. Fornecemos a informação; você toma a ação.' },
        { q: 'Posso monitorar mais de uma reserva ao mesmo tempo?', a: 'Sim. Você pode monitorar quantas reservas futuras quiser a partir de um único painel.' },
        { q: 'Quais plataformas e hotéis são suportados?', a: 'Monitoramos tarifas nas principais redes, incluindo Marriott, Hilton, Hyatt, IHG, Accor e Wyndham, além de Expedia, Booking.com, Hotels.com e os sites dos próprios hotéis.' },
        { q: 'Funciona para reservas internacionais?', a: 'Sim. A ResDrop suporta monitoramento de hotéis em todos os principais mercados de viagem do mundo.' },
        { q: 'Como começo rapidamente?', a: 'Você pode adicionar sua primeira reserva em menos de dois minutos. Não é necessário cartão de crédito para começar.' },
      ],
    },
    cta: {
      serif: 'A forma mais inteligente de monitorar sua estadia',
      h: 'Seu próximo hotel\npode já ter\numa tarifa melhor.',
      sub: 'Adicione sua reserva em menos de dois minutos. A ResDrop faz o resto. Você só presta atenção quando há uma oportunidade real.',
      btn1: 'Começar Gratuitamente', btn2: 'Entrar',
      micro: 'Sem cartão de crédito · Configuração em 2 minutos · Cancele quando quiser',
    },
    footer: {
      tagline: 'Monitoramento de tarifas hoteleiras para viajantes que preferem manter suas economias, não deixá-las na mesa.',
      product: 'PRODUTO', company: 'EMPRESA', account: 'CONTA',
      how: 'Como funciona', features: 'Funcionalidades', savings: 'Exemplos de melhoria', faq: 'FAQ', start: 'Começar grátis',
      about: 'Sobre', contact: 'Contato', privacy: 'Política de Privacidade', terms: 'Termos de Serviço',
      login: 'Entrar', create: 'Criar conta', dashboard: 'Painel',
      copy: 'Todos os direitos reservados.', privacyShort: 'Privacidade', termsShort: 'Termos',
    },
  },
};

/* ═══════════════════════════════════════════════════════
   HOTEL DATA  — bilingual
   ═══════════════════════════════════════════════════════ */
const HOTELS = [
  {
    hotel: 'Park Hyatt Tokyo',
    location: { en: 'Tokyo, Japan · Park Room, City View', pt: 'Tóquio, Japão · Park Room, Vista da Cidade' },
    img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=700&q=80',
    bg: '#1A3A2E',
    old: '$478', new_: '$389', nights: 3, saved: '$267',
    why: {
      en: 'A lower refundable member rate became available for the same room and dates.',
      pt: 'Uma tarifa reembolsável de membro mais baixa ficou disponível para o mesmo quarto e datas.',
    },
  },
  {
    hotel: 'Rosewood London',
    location: { en: 'London, United Kingdom · Deluxe Room, Garden View', pt: 'Londres, Reino Unido · Deluxe Room, Vista do Jardim' },
    img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700&q=80',
    bg: '#2B3D34',
    old: '$680', new_: '$595', nights: 4, saved: '$340',
    why: {
      en: 'A flexible rate with breakfast included reopened at a reduced price.',
      pt: 'Uma tarifa flexível com café da manhã incluído reabriu a um preço reduzido.',
    },
  },
  {
    hotel: 'Fasano São Paulo',
    location: { en: 'São Paulo, Brazil · Classic Room', pt: 'São Paulo, Brasil · Classic Room' },
    img: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=700&q=80',
    bg: '#3A2A1A',
    old: '$1,290', new_: '$1,020', nights: 3, saved: '$630',
    why: {
      en: 'A preferred partner rate with added benefits matched the same stay at an improved price.',
      pt: 'Uma tarifa de parceiro preferencial com benefícios adicionais correspondeu à mesma estadia por um preço melhor.',
    },
  },
];

/* ═══════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════ */
const ResDropLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M11 8h2" /><path d="M12 8v1.5" />
    <path d="M8 14.5a4 4 0 0 1 8 0" />
    <line x1="7" y1="14.5" x2="17" y2="14.5" />
    <line x1="6" y1="16.5" x2="18" y2="16.5" />
  </svg>
);

const Ic = {
  Check: () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  TrendDown: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>),
  Bell: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
  Shield: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  Eye: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  Bookmark: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>),
  Dollar: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>),
  Globe: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>),
  Clock: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Zap: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  Layers: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  BarChart: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  Plus: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  Arrow: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>),
  Star: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>),
  LockSm: () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  Info: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>),
  Twitter: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>),
  Instagram: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>),
  Linkedin: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>),
};

const FEAT_ICONS = [Ic.Clock, Ic.Zap, Ic.Globe, Ic.Layers, Ic.BarChart, Ic.Shield];
const BENEFIT_ICONS = [Ic.Clock, Ic.Shield, Ic.Dollar, Ic.TrendDown];

/* ═══════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════ */
function Nav({ scrolled, mobileOpen, setMobileOpen, lang, setLang, t }) {
  const tn = t.nav;
  const navLinks = [
    { href: '#how-it-works', label: tn.how },
    { href: '#features',     label: tn.features },
    { href: '#savings',      label: tn.savings },
    { href: '#faq',          label: tn.faq },
  ];
  return (
    <>
      <nav className={`rdp-nav${scrolled ? ' rdp-nav--scrolled' : ''}`}>
        <div className="rdp-nav__inner">
          <Link to="/" className="rdp-nav__logo">
            <span className="rdp-nav__logo-icon"><ResDropLogo size={22} /></span>
            <span className="rdp-nav__logo-text">ResDrop</span>
          </Link>

          <div className="rdp-nav__links">
            {navLinks.map(l => <a key={l.href} href={l.href} className="rdp-nav__link">{l.label}</a>)}
          </div>

          <div className="rdp-nav__actions">
            <div className="rdp-nav__lang">
              <button className={`rdp-nav__lang-btn${lang === 'en' ? ' rdp-nav__lang-btn--active' : ''}`} onClick={() => setLang('en')}>EN</button>
              <span className="rdp-nav__lang-sep">|</span>
              <button className={`rdp-nav__lang-btn${lang === 'pt' ? ' rdp-nav__lang-btn--active' : ''}`} onClick={() => setLang('pt')}>PT</button>
            </div>
            <Link to="/login"  className="rdp-nav__login">{tn.login}</Link>
            <Link to="/signup" className="rdp-btn rdp-btn--primary" style={{ textDecoration: 'none' }}>{tn.start}</Link>
          </div>

          <button className="rdp-nav__hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div className={`rdp-nav__mobile-menu${mobileOpen ? ' rdp-nav__mobile-menu--open' : ''}`}>
        {navLinks.map(l => (
          <a key={l.href} href={l.href} className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>{l.label}</a>
        ))}
        <div className="rdp-nav__mobile-divider" />
        <div className="rdp-nav__mobile-lang">
          <button className={`rdp-nav__lang-btn${lang === 'en' ? ' rdp-nav__lang-btn--active' : ''}`} onClick={() => setLang('en')}>EN</button>
          <span className="rdp-nav__lang-sep">|</span>
          <button className={`rdp-nav__lang-btn${lang === 'pt' ? ' rdp-nav__lang-btn--active' : ''}`} onClick={() => setLang('pt')}>PT</button>
        </div>
        <Link to="/login" className="rdp-nav__mobile-link" onClick={() => setMobileOpen(false)}>{tn.login}</Link>
        <div style={{ marginTop: 12 }}>
          <Link to="/signup" className="rdp-btn rdp-btn--primary rdp-btn--lg"
            style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}
            onClick={() => setMobileOpen(false)}>
            {tn.start}
          </Link>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════ */
function Hero({ t }) {
  const th = t.hero;
  return (
    <section className="rdp-hero">
      <div className="rdp-hero__glow" />
      <div className="rdp-hero__wrap">
        <div className="rdp-hero__left">
          <h1 className="rdp-hero__h1">
            {th.h1a}<br />{th.h1b}<br />
            <em>{th.h1c}</em>
          </h1>
          <p className="rdp-hero__sub">{th.sub}</p>
          <div className="rdp-hero__actions">
            <Link to="/signup" className="rdp-btn rdp-btn--primary rdp-btn--lg" style={{ textDecoration: 'none' }}>
              {th.cta1}<span className="rdp-btn__arrow"><Ic.Arrow /></span>
            </Link>
            <a href="#how-it-works" className="rdp-btn rdp-btn--outline rdp-btn--lg">{th.cta2}</a>
          </div>
          <div className="rdp-hero__trust">
            {[th.t1, th.t2, th.t3].map((label, i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="rdp-hero__trust-item">
                  <span className="rdp-hero__trust-check"><Ic.Check /></span>
                  {label}
                </div>
                {i < arr.length - 1 && <span className="rdp-hero__trust-divider" />}
              </div>
            ))}
          </div>
        </div>

        <div className="rdp-hero__right">
          <div className="rdp-hero__app-wrap">
            <div className="rdp-hero__app">
              <div className="rdp-hero__app-bar">
                <span className="rdp-hero__app-bar-dot" />
                <span className="rdp-hero__app-bar-dot" />
                <span className="rdp-hero__app-bar-dot" />
              </div>
              <div className="rdp-hero__app-body">
                <aside className="rdp-hero__sidebar">
                  <div className="rdp-hero__sidebar-head">
                    <div className="rdp-hero__sidebar-brand">
                      <span className="rdp-hero__sidebar-brand-icon"><ResDropLogo size={18} /></span>
                      ResDrop
                    </div>
                  </div>
                  <nav className="rdp-hero__sidebar-nav">
                    {[
                      { Icon: Ic.Bookmark, label: 'My Bookings', on: true },
                      { Icon: Ic.Bell,     label: 'Alerts',      on: false },
                      { Icon: Ic.BarChart, label: 'Savings',     on: false },
                    ].map(item => (
                      <div key={item.label} className={`rdp-hero__nav-item${item.on ? ' rdp-hero__nav-item--on' : ''}`}>
                        <item.Icon />{item.label}
                      </div>
                    ))}
                  </nav>
                  <div className="rdp-hero__sidebar-foot">
                    <div className="rdp-hero__avatar">S</div>
                    <span className="rdp-hero__user-name">Sofia M.</span>
                  </div>
                </aside>
                <div className="rdp-hero__main">
                  <div className="rdp-hero__main-head">
                    <span className="rdp-hero__main-title">Tracked Bookings</span>
                  </div>
                  <div className="rdp-hero__kpis">
                    {[
                      { label: 'Monitoring', value: '3' },
                      { label: 'Total Saved', value: '$412', green: true },
                      { label: 'Alerts', value: '7' },
                    ].map(k => (
                      <div className="rdp-hero__kpi" key={k.label}>
                        <div className="rdp-hero__kpi-label">{k.label}</div>
                        <div className={`rdp-hero__kpi-value${k.green ? ' rdp-hero__kpi-value--green' : ''}`}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rdp-hero__alert">
                    <div className="rdp-hero__alert-badge"><Ic.TrendDown /></div>
                    <div>
                      <div className="rdp-hero__alert-title">Rate Improvement Found</div>
                      <div className="rdp-hero__alert-text">Park Hyatt Tokyo · Rate improved from $478 to $389/night</div>
                    </div>
                    <button className="rdp-hero__alert-btn">Review</button>
                  </div>
                  <div className="rdp-hero__rows">
                    {[
                      { hotel: 'Park Hyatt Tokyo',  dates: 'Mar 14–17', rate: '$389/nt' },
                      { hotel: 'Rosewood London',   dates: 'Apr 2–5',   rate: '$620/nt' },
                      { hotel: 'Fasano São Paulo',  dates: 'Apr 19–22', rate: '$1,020/nt' },
                    ].map(b => (
                      <div className="rdp-hero__row" key={b.hotel}>
                        <div className="rdp-hero__row-info">
                          <div className="rdp-hero__row-hotel">{b.hotel}</div>
                          <div className="rdp-hero__row-dates">{b.dates}</div>
                        </div>
                        <div className="rdp-hero__row-right">
                          <div className="rdp-hero__row-rate">{b.rate}</div>
                          <div className="rdp-hero__row-badge">
                            <span className="rdp-hero__row-badge-dot" />Monitoring
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   PLATFORMS STRIP
   ═══════════════════════════════════════════════════════ */
const PLATFORMS = ['Marriott','Hilton','Hyatt','IHG','Accor','Wyndham','Expedia','Booking.com','Hotels.com'];

function Platforms({ t }) {
  return (
    <div className="rdp-platforms">
      <div className="rdp-platforms__inner">
        <span className="rdp-platforms__label">{t.platforms}</span>
        <div className="rdp-platforms__sep" />
        <div className="rdp-platforms__list">
          {PLATFORMS.map(p => <span className="rdp-platforms__item" key={p}>{p}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════ */
const STEP_ICONS = [Ic.Bookmark, Ic.Eye, Ic.Bell, Ic.Dollar];

function HowItWorks({ t }) {
  const th = t.how;
  return (
    <section className="rdp-hiw" id="how-it-works">
      <div className="rdp-container">
        <div className="rdp-hiw__header">
          <div className="rdp-eyebrow rdp-eyebrow--center rdp-animate">{th.label}</div>
          <h2 className="rdp-h2 rdp-h2--center rdp-animate rdp-stagger-1">{th.h}</h2>
          <p className="rdp-body-lead rdp-body-lead--center rdp-animate rdp-stagger-2" style={{ maxWidth: 460, margin: '0 auto' }}>{th.sub}</p>
        </div>
        <div className="rdp-hiw__steps">
          {th.steps.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div className={`rdp-hiw__step rdp-animate rdp-stagger-${i + 1}`} key={i}>
                <div className="rdp-hiw__num">0{i + 1}</div>
                <div className="rdp-hiw__icon"><Icon /></div>
                <div className="rdp-hiw__title">{s.title}</div>
                <p className="rdp-hiw__text">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════════════ */
function Features({ t }) {
  const tf = t.features;
  return (
    <section className="rdp-features" id="features">
      <div className="rdp-container">
        <div className="rdp-features__header">
          <div>
            <div className="rdp-eyebrow rdp-animate">{tf.label}</div>
            <h2 className="rdp-h2 rdp-animate rdp-stagger-1">
              {tf.h.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
            </h2>
          </div>
          <p className="rdp-body-lead rdp-animate rdp-stagger-2" style={{ maxWidth: 360 }}>{tf.sub}</p>
        </div>
        <div className="rdp-features__grid">
          {tf.cards.map((card, i) => {
            const Icon = FEAT_ICONS[i];
            return (
              <div className={`rdp-feat-card${card.accent ? ' rdp-feat-card--accent' : ''} rdp-animate rdp-stagger-${(i % 3) + 1}`} key={i}>
                <div className="rdp-feat-card__icon"><Icon /></div>
                <h3 className="rdp-feat-card__title">{card.title}</h3>
                <p className="rdp-feat-card__text">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD SHOWCASE
   ═══════════════════════════════════════════════════════ */
function Dashboard({ t }) {
  const td = t.dashboard;
  return (
    <section className="rdp-dash">
      <div className="rdp-container">
        <div className="rdp-dash__header">
          <div className="rdp-eyebrow rdp-eyebrow--center rdp-eyebrow--inv rdp-animate">{td.label}</div>
          <h2 className="rdp-h2 rdp-h2--inv rdp-h2--center rdp-animate rdp-stagger-1">{td.h}</h2>
          <p className="rdp-body-lead rdp-body-lead--inv rdp-body-lead--center rdp-animate rdp-stagger-2" style={{ maxWidth: 480, margin: '0 auto' }}>{td.sub}</p>
        </div>
        <div className="rdp-dash__browser rdp-animate rdp-stagger-3">
          <div className="rdp-dash-bar">
            <div className="rdp-dash-bar__dots">
              <span className="rdp-dash-bar__dot" /><span className="rdp-dash-bar__dot" /><span className="rdp-dash-bar__dot" />
            </div>
            <div className="rdp-dash-bar__url"><Ic.LockSm />&nbsp;app.resdrop.com/bookings</div>
          </div>
          <div className="rdp-full-app">
            <aside className="rdp-full-sidebar">
              <div className="rdp-full-sidebar__head">
                <div className="rdp-full-sidebar__brand"><ResDropLogo size={17} />ResDrop</div>
              </div>
              <nav className="rdp-full-sidebar__nav">
                {[
                  { Icon: Ic.Bookmark, label: 'My Bookings', on: true,  badge: null },
                  { Icon: Ic.Bell,     label: 'Alerts',      on: false, badge: '2', alert: true },
                  { Icon: Ic.Dollar,   label: 'Savings',     on: false, badge: null },
                  { Icon: Ic.Shield,   label: 'Account',     on: false, badge: null },
                ].map(item => (
                  <div key={item.label} className={`rdp-full-nav-item${item.on ? ' rdp-full-nav-item--on' : ''}`}>
                    <item.Icon />{item.label}
                    {item.badge && <span className={`rdp-full-badge${item.alert ? ' rdp-full-badge--alert' : ''}`}>{item.badge}</span>}
                  </div>
                ))}
              </nav>
            </aside>
            <div className="rdp-full-main">
              <div className="rdp-full-main__top">
                <div className="rdp-full-main__title">My Bookings</div>
                <button className="rdp-full-main__add"><Ic.Plus /> Add booking</button>
              </div>
              <div className="rdp-full-kpis">
                {[
                  { label: 'Tracked',    val: '4',    sub: 'Active reservations' },
                  { label: 'Monitoring', val: '3',    sub: 'Checking now' },
                  { label: 'Total Saved', val: '$412', sub: 'All time', green: true },
                  { label: 'Alerts Sent', val: '9',   sub: 'Past 90 days' },
                ].map(k => (
                  <div className="rdp-full-kpi" key={k.label}>
                    <div className="rdp-full-kpi__label">{k.label}</div>
                    <div className={`rdp-full-kpi__val${k.green ? ' rdp-full-kpi__val--green' : ''}`}>{k.val}</div>
                    <div className="rdp-full-kpi__sub">{k.sub}</div>
                  </div>
                ))}
              </div>
              <div className="rdp-full-alert">
                <div className="rdp-full-alert__icon"><Ic.TrendDown /></div>
                <div className="rdp-full-alert__msg">
                  Rate improvement found on Park Hyatt Tokyo <span>· $89/night better than your current booking.</span>
                </div>
                <button className="rdp-full-alert__cta">View &amp; Rebook</button>
              </div>
              <div className="rdp-full-table-head">
                <span>Hotel</span><span>Dates</span><span>Rate/night</span><span>Saved</span><span>Status</span>
              </div>
              <div className="rdp-full-rows">
                {[
                  { name: 'Park Hyatt Tokyo',  loc: 'Tokyo, Japan',    bg: '#1A3A2E', init: 'PH', dates: 'Mar 14–17', rate: '$389', saved: '$267', status: 'Drop found', blue: true },
                  { name: 'Rosewood London',   loc: 'London, UK',      bg: '#2B3D34', init: 'RL', dates: 'Apr 2–5',   rate: '$620', saved: '--',   status: 'Monitoring' },
                  { name: 'Fasano São Paulo',  loc: 'São Paulo, BR',   bg: '#3A2A1A', init: 'FS', dates: 'Apr 19–22', rate: '$1,020', saved: '--', status: 'Monitoring' },
                  { name: 'Aman Tokyo',        loc: 'Tokyo, Japan',    bg: '#1B3D2D', init: 'AT', dates: 'May 5–8',   rate: '$1,140', saved: '$145', status: 'Saved', blue: true },
                ].map(b => (
                  <div className="rdp-full-row" key={b.name}>
                    <div className="rdp-full-row__hotel">
                      <div className="rdp-full-row__thumb" style={{ background: b.bg }}>{b.init}</div>
                      <div>
                        <div className="rdp-full-row__name">{b.name}</div>
                        <div className="rdp-full-row__loc">{b.loc}</div>
                      </div>
                    </div>
                    <div className="rdp-full-row__dates">{b.dates}</div>
                    <div className="rdp-full-row__rate">{b.rate}</div>
                    <div className="rdp-full-row__saved">{b.saved}</div>
                    <div className={`rdp-full-row__status${b.blue ? ' rdp-full-row__status--saved' : ' rdp-full-row__status--active'}`}>
                      <span className="rdp-full-row__status-dot" />{b.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SPECIAL FARE  — new section
   ═══════════════════════════════════════════════════════ */
function SpecialFare({ t }) {
  const ts = t.sf;
  return (
    <section className="rdp-sf" id="special-fare">
      <div className="rdp-container">
        <div className="rdp-sf__wrap">
          <div className="rdp-sf__left">
            <div className="rdp-sf__badge rdp-animate">
              <span className="rdp-sf__badge-star">✦</span>
              {ts.badge}
            </div>
            <div className="rdp-eyebrow rdp-animate rdp-stagger-1">{ts.label}</div>
            <h2 className="rdp-h2 rdp-animate rdp-stagger-2">{ts.h}</h2>
            <p className="rdp-body-lead rdp-animate rdp-stagger-3">{ts.sub}</p>
          </div>
          <div className="rdp-sf__items">
            {ts.items.map((item, i) => (
              <div className={`rdp-sf__item rdp-animate rdp-stagger-${i + 1}`} key={i}>
                <div className="rdp-sf__item-num">0{i + 1}</div>
                <div>
                  <h3 className="rdp-sf__item-title">{item.title}</h3>
                  <p className="rdp-sf__item-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SAVINGS EXAMPLES
   ═══════════════════════════════════════════════════════ */
function Savings({ t, lang }) {
  const ts = t.savings;
  return (
    <section className="rdp-savings" id="savings">
      <div className="rdp-container">
        <div className="rdp-savings__header">
          <div>
            <div className="rdp-eyebrow rdp-animate">{ts.label}</div>
            <h2 className="rdp-h2 rdp-animate rdp-stagger-1">{ts.h}</h2>
          </div>
          <p className="rdp-body-lead rdp-animate rdp-stagger-2" style={{ maxWidth: 300 }}>{ts.sub}</p>
        </div>
        <div className="rdp-savings__grid">
          {HOTELS.map((s, i) => (
            <div className={`rdp-save-card rdp-animate rdp-stagger-${i + 1}`} key={s.hotel}>
              <div className="rdp-save-card__img-wrap">
                <img
                  src={s.img} alt={s.hotel}
                  className="rdp-save-card__img"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
                <div className="rdp-save-card__img-fallback" style={{ background: s.bg, display: 'none' }}>{s.hotel}</div>
                <div className="rdp-save-card__badge">
                  <span className="rdp-save-card__badge-dot" />{ts.pill}
                </div>
                <div className="rdp-save-card__photo-savings">
                  <div className="rdp-save-card__photo-amt">{s.saved}</div>
                  <div className="rdp-save-card__photo-label">{ts.saved}</div>
                </div>
              </div>
              <div className="rdp-save-card__body">
                <div className="rdp-save-card__hotel">{s.hotel}</div>
                <div className="rdp-save-card__location">{s.location[lang]}</div>
                <div className="rdp-save-card__rates">
                  <div className="rdp-save-card__rate-col">
                    <div className="rdp-save-card__rate-label">{ts.was}</div>
                    <div className="rdp-save-card__rate-val rdp-save-card__rate-val--old">{s.old}</div>
                  </div>
                  <div className="rdp-save-card__arrow">→</div>
                  <div className="rdp-save-card__rate-col">
                    <div className="rdp-save-card__rate-label">{ts.now}</div>
                    <div className="rdp-save-card__rate-val rdp-save-card__rate-val--new">{s.new_}</div>
                  </div>
                </div>
                <div className="rdp-save-card__footer">
                  <span className="rdp-save-card__nights">{s.nights} {ts.nights}</span>
                  <span className="rdp-save-card__total">
                    <span className="rdp-save-card__total-label">{ts.saved}&nbsp;</span>{s.saved}
                  </span>
                </div>
              </div>
              <div className="rdp-save-card__why">
                <span className="rdp-save-card__why-icon"><Ic.Info /></span>
                <p className="rdp-save-card__why-text">{s.why[lang]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   BENEFITS
   ═══════════════════════════════════════════════════════ */
function Benefits({ t }) {
  const tb = t.benefits;
  return (
    <section className="rdp-benefits">
      <div className="rdp-container">
        <div className="rdp-benefits__grid">
          <div className="rdp-benefits__visual rdp-animate">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"
              alt="Luxury hotel"
              className="rdp-benefits__photo"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <div className="rdp-benefits__photo-fallback" style={{ display: 'none' }} />
            <div className="rdp-benefits__stat">
              <div className="rdp-benefits__stat-num">$412</div>
              <div className="rdp-benefits__stat-text">{tb.stat}</div>
            </div>
          </div>
          <div>
            <div className="rdp-eyebrow rdp-animate">{tb.label}</div>
            <h2 className="rdp-h2 rdp-animate rdp-stagger-1">{tb.h}</h2>
            <p className="rdp-body-lead rdp-animate rdp-stagger-2">{tb.sub}</p>
            <div className="rdp-benefits__list">
              {tb.items.map((b, i) => {
                const Icon = BENEFIT_ICONS[i];
                return (
                  <div className={`rdp-benefits__item rdp-animate rdp-stagger-${i + 1}`} key={i}>
                    <div className="rdp-benefits__item-icon"><Icon /></div>
                    <div>
                      <div className="rdp-benefits__item-title">{b.title}</div>
                      <p className="rdp-benefits__item-text">{b.text || b.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   LIFESTYLE
   ═══════════════════════════════════════════════════════ */
function Lifestyle({ t }) {
  const tl = t.lifestyle;
  return (
    <section className="rdp-lifestyle">
      <div className="rdp-container">
        <div className="rdp-lifestyle__header">
          <div className="rdp-eyebrow rdp-animate">{tl.label}</div>
          <h2 className="rdp-h2 rdp-animate rdp-stagger-1">
            {tl.h.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
          </h2>
          <p className="rdp-body-lead rdp-animate rdp-stagger-2">{tl.sub}</p>
        </div>
        <div className="rdp-lifestyle__grid">
          <img
            src="https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80"
            alt="Luxury hotel suite" className="rdp-lifestyle__main rdp-animate"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <div className="rdp-lifestyle__main-fallback" style={{ display: 'none' }} />
          <div className="rdp-lifestyle__right">
            <img
              src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=700&q=80"
              alt="Hotel interior" className="rdp-lifestyle__sub rdp-animate rdp-stagger-1"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <div className="rdp-lifestyle__sub-fallback" style={{ display: 'none' }} />
            <div className="rdp-lifestyle__pull rdp-animate rdp-stagger-2">
              <div className="rdp-lifestyle__quote">{tl.quote}</div>
              <div className="rdp-lifestyle__attr">{tl.attr}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════════ */
function Testimonials({ t }) {
  const tt = t.testimonials;
  return (
    <section className="rdp-testimonials">
      <div className="rdp-container">
        <div className="rdp-testimonials__header">
          <div className="rdp-eyebrow rdp-eyebrow--center rdp-animate">{tt.label}</div>
          <h2 className="rdp-h2 rdp-h2--center rdp-animate rdp-stagger-1">{tt.h}</h2>
        </div>
        <div className="rdp-testimonials__grid">
          {tt.items.map((item, i) => (
            <div className={`rdp-testimonial rdp-animate rdp-stagger-${i + 1}`} key={item.name}>
              <div className="rdp-testimonial__stars">{[...Array(5)].map((_, j) => <Ic.Star key={j} />)}</div>
              <div className="rdp-testimonial__quote">{item.quote}</div>
              <div className="rdp-testimonial__footer">
                <div className="rdp-testimonial__avatar" style={{ background: item.color }}>{item.initials}</div>
                <div>
                  <div className="rdp-testimonial__name">{item.name}</div>
                  <div className="rdp-testimonial__meta">{item.meta}</div>
                </div>
                <div className="rdp-testimonial__saved">
                  <div className="rdp-testimonial__saved-amt">{item.saved}</div>
                  <div className="rdp-testimonial__saved-label">{tt.saved}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════ */
function Faq({ t }) {
  const tf = t.faq;
  const [open, setOpen] = useState(null);
  return (
    <section className="rdp-faq" id="faq">
      <div className="rdp-container">
        <div className="rdp-faq__inner">
          <div className="rdp-faq__header">
            <div className="rdp-eyebrow rdp-animate">{tf.label}</div>
            <h2 className="rdp-h2 rdp-animate rdp-stagger-1">{tf.h}</h2>
            <p className="rdp-body-lead rdp-animate rdp-stagger-2">{tf.sub}</p>
          </div>
          <div className="rdp-faq__list rdp-animate rdp-stagger-3">
            {tf.items.map((item, i) => (
              <div className={`rdp-faq__item${open === i ? ' rdp-faq__item--open' : ''}`} key={i}>
                <button className="rdp-faq__q" onClick={() => setOpen(open === i ? null : i)}>
                  {item.q}
                  <span className="rdp-faq__icon"><Ic.Plus /></span>
                </button>
                <div className="rdp-faq__a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════ */
function Cta({ t }) {
  const tc = t.cta;
  const lines = tc.h.split('\n');
  return (
    <section className="rdp-cta">
      <div className="rdp-cta__inner">
        <div className="rdp-cta__serif rdp-animate">{tc.serif}</div>
        <h2 className="rdp-cta__h2 rdp-animate rdp-stagger-1">
          {lines.map((line, i) => <span key={i}>{line}{i < lines.length - 1 && <br />}</span>)}
        </h2>
        <p className="rdp-cta__sub rdp-animate rdp-stagger-2">{tc.sub}</p>
        <div className="rdp-cta__actions rdp-animate rdp-stagger-3">
          <Link to="/signup" className="rdp-btn rdp-btn--inv-primary rdp-btn--lg" style={{ textDecoration: 'none' }}>
            {tc.btn1}<span className="rdp-btn__arrow"><Ic.Arrow /></span>
          </Link>
          <Link to="/login" className="rdp-btn rdp-btn--inv-outline rdp-btn--lg" style={{ textDecoration: 'none' }}>{tc.btn2}</Link>
        </div>
        <p className="rdp-cta__micro rdp-animate rdp-stagger-4">{tc.micro}</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════ */
function Footer({ t }) {
  const tf = t.footer;
  return (
    <footer className="rdp-footer">
      <div className="rdp-footer__top">
        <div>
          <Link to="/" className="rdp-footer__logo">
            <span className="rdp-footer__logo-icon"><ResDropLogo size={20} /></span>
            <span className="rdp-footer__logo-text">ResDrop</span>
          </Link>
          <p className="rdp-footer__desc">{tf.tagline}</p>
          <div className="rdp-footer__social">
            <a href="#" className="rdp-footer__social-a" aria-label="Twitter"><Ic.Twitter /></a>
            <a href="#" className="rdp-footer__social-a" aria-label="Instagram"><Ic.Instagram /></a>
            <a href="#" className="rdp-footer__social-a" aria-label="LinkedIn"><Ic.Linkedin /></a>
          </div>
        </div>
        <div>
          <div className="rdp-footer__col-title">{tf.product}</div>
          <div className="rdp-footer__links">
            <a href="#how-it-works" className="rdp-footer__link">{tf.how}</a>
            <a href="#features"     className="rdp-footer__link">{tf.features}</a>
            <a href="#savings"      className="rdp-footer__link">{tf.savings}</a>
            <a href="#faq"          className="rdp-footer__link">{tf.faq}</a>
            <Link to="/signup"      className="rdp-footer__link">{tf.start}</Link>
          </div>
        </div>
        <div>
          <div className="rdp-footer__col-title">{tf.company}</div>
          <div className="rdp-footer__links">
            <Link to="/about"   className="rdp-footer__link">{tf.about}</Link>
            <a href="mailto:hello@resdrop.com" className="rdp-footer__link">{tf.contact}</a>
            <Link to="/privacy" className="rdp-footer__link">{tf.privacy}</Link>
            <Link to="/terms"   className="rdp-footer__link">{tf.terms}</Link>
          </div>
        </div>
        <div>
          <div className="rdp-footer__col-title">{tf.account}</div>
          <div className="rdp-footer__links">
            <Link to="/login"     className="rdp-footer__link">{tf.login}</Link>
            <Link to="/signup"    className="rdp-footer__link">{tf.create}</Link>
            <Link to="/dashboard" className="rdp-footer__link">{tf.dashboard}</Link>
          </div>
        </div>
      </div>
      <div className="rdp-footer__bottom">
        <span className="rdp-footer__copy">&copy; {new Date().getFullYear()} ResDrop. {tf.copy}</span>
        <div className="rdp-footer__legal">
          <Link to="/privacy" className="rdp-footer__legal-link">{tf.privacyShort}</Link>
          <Link to="/terms"   className="rdp-footer__legal-link">{tf.termsShort}</Link>
          <a href="mailto:hello@resdrop.com" className="rdp-footer__legal-link">{tf.contact}</a>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════ */
export default function ResDroppLanding() {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [lang,        setLang]        = useState('en');

  const t = T[lang];

  // Scroll state for nav
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Mobile scroll lock
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Scroll-triggered animations via IntersectionObserver
  useEffect(() => {
    const els = document.querySelectorAll('.rdp-animate');
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('rdp-visible');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [lang]); // re-run when language changes to catch any re-mounted elements

  return (
    <div className="rdp">
      <Nav
        scrolled={scrolled} mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen} lang={lang}
        setLang={setLang} t={t}
      />
      <main>
        <Hero t={t} />
        <Platforms t={t} />
        <HowItWorks t={t} />
        <Features t={t} />
        <Dashboard t={t} />
        <SpecialFare t={t} />
        <Savings t={t} lang={lang} />
        <Benefits t={t} />
        <Lifestyle t={t} />
        <Testimonials t={t} />
        <Faq t={t} />
        <Cta t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}
