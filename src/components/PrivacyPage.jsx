import Footer from './Footer';
import { useI18n } from '../i18n';
import './LegalPage.css';

const CONTENT = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: March 17, 2026',
    intro: 'ResDrop ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our service.',
    sections: [
      {
        h: '1. Information We Collect',
        p: ['We collect information that you provide directly to us, including:'],
        list: [
          'Account information (name, email address, password)',
          'Booking details you submit for price monitoring (hotel name, dates, confirmation number)',
          'Communication preferences and alert settings',
        ],
        after: ['We also automatically collect certain technical information when you use our service, such as your IP address, browser type, and usage patterns.'],
      },
      {
        h: '2. How We Use Your Information',
        p: ['We use the information we collect to:'],
        list: [
          'Provide, maintain, and improve our price monitoring service',
          'Send you price drop alerts and notifications',
          'Communicate with you about your account and our service',
          'Detect and prevent fraud or abuse',
        ],
      },
      {
        h: '3. Information Sharing',
        p: ['We do not sell your personal information. We may share your information only in the following circumstances:'],
        list: [
          'With service providers who help us operate our platform',
          'When required by law or to protect our legal rights',
          'In connection with a business transfer or merger',
        ],
      },
      {
        h: '4. Data Security',
        p: ['We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.'],
      },
      {
        h: '5. Data Retention',
        p: ['We retain your personal information for as long as your account is active or as needed to provide our services. You may request deletion of your account and associated data at any time.'],
      },
      {
        h: '6. Your Rights',
        p: ['You have the right to:'],
        list: [
          'Access and update your personal information',
          'Request deletion of your data',
          'Opt out of marketing communications',
          'Export your data in a portable format',
        ],
      },
      {
        h: '7. Cookies',
        p: ['We use essential cookies to keep you signed in and remember your preferences. We do not use third-party tracking cookies for advertising purposes.'],
      },
      {
        h: '8. Changes to This Policy',
        p: ['We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our website and updating the "Last updated" date.'],
      },
      {
        h: '9. Contact Us',
        p: [],
        contact: 'If you have any questions about this Privacy Policy, please contact us at ',
      },
    ],
  },
  pt: {
    title: 'Política de Privacidade',
    updated: 'Última atualização: 17 de março de 2026',
    intro: 'O ResDrop ("nós" ou "nosso") tem o compromisso de proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos e protegemos suas informações pessoais quando você usa nosso serviço.',
    sections: [
      {
        h: '1. Informações que Coletamos',
        p: ['Coletamos informações que você nos fornece diretamente, incluindo:'],
        list: [
          'Informações da conta (nome, e-mail, senha)',
          'Detalhes de reservas que você envia para monitoramento de preços (nome do hotel, datas, número de confirmação)',
          'Preferências de comunicação e configurações de alertas',
        ],
        after: ['Também coletamos automaticamente certas informações técnicas quando você usa nosso serviço, como seu endereço IP, tipo de navegador e padrões de uso.'],
      },
      {
        h: '2. Como Usamos Suas Informações',
        p: ['Usamos as informações coletadas para:'],
        list: [
          'Fornecer, manter e melhorar nosso serviço de monitoramento de preços',
          'Enviar alertas de queda de preço e notificações',
          'Comunicar com você sobre sua conta e nosso serviço',
          'Detectar e prevenir fraude ou abuso',
        ],
      },
      {
        h: '3. Compartilhamento de Informações',
        p: ['Não vendemos suas informações pessoais. Podemos compartilhar suas informações apenas nas seguintes circunstâncias:'],
        list: [
          'Com prestadores de serviço que nos ajudam a operar a plataforma',
          'Quando exigido por lei ou para proteger nossos direitos legais',
          'Em conexão com uma transferência de negócios ou fusão',
        ],
      },
      {
        h: '4. Segurança dos Dados',
        p: ['Implementamos medidas de segurança padrão do setor para proteger suas informações pessoais. No entanto, nenhum método de transmissão pela internet é 100% seguro, e não podemos garantir segurança absoluta.'],
      },
      {
        h: '5. Retenção de Dados',
        p: ['Retemos suas informações pessoais enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços. Você pode solicitar a exclusão da sua conta e dos dados associados a qualquer momento.'],
      },
      {
        h: '6. Seus Direitos',
        p: ['Você tem o direito de:'],
        list: [
          'Acessar e atualizar suas informações pessoais',
          'Solicitar a exclusão dos seus dados',
          'Cancelar comunicações de marketing',
          'Exportar seus dados em formato portátil',
        ],
      },
      {
        h: '7. Cookies',
        p: ['Usamos cookies essenciais para manter você conectado e lembrar suas preferências. Não usamos cookies de rastreamento de terceiros para fins publicitários.'],
      },
      {
        h: '8. Alterações nesta Política',
        p: ['Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações relevantes publicando a política atualizada em nosso site e atualizando a data de "Última atualização".'],
      },
      {
        h: '9. Fale Conosco',
        p: [],
        contact: 'Se você tiver dúvidas sobre esta Política de Privacidade, fale conosco em ',
      },
    ],
  },
};

function PrivacyPage() {
  const { lang } = useI18n();
  const c = CONTENT[lang] || CONTENT.en;

  return (
    <>
      <div className="legal-page">
        <h1>{c.title}</h1>
        <p className="legal-updated">{c.updated}</p>

        <p>{c.intro}</p>

        {c.sections.map((s, i) => (
          <section key={i}>
            <h2>{s.h}</h2>
            {s.p.map((para, j) => <p key={j}>{para}</p>)}
            {s.list && (
              <ul>
                {s.list.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            )}
            {s.after && s.after.map((para, j) => <p key={j}>{para}</p>)}
            {s.contact && (
              <p>{s.contact}<a href="mailto:support@resdrop.com">support@resdrop.com</a>.</p>
            )}
          </section>
        ))}
      </div>
      <Footer />
    </>
  );
}

export default PrivacyPage;
