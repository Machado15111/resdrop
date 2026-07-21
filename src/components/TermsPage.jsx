import Footer from './Footer';
import { useI18n } from '../i18n';
import './LegalPage.css';

const CONTENT = {
  en: {
    title: 'Terms of Service',
    updated: 'Last updated: March 17, 2026',
    intro: 'Welcome to ResDrop. By accessing or using our service, you agree to be bound by these Terms of Service. Please read them carefully.',
    sections: [
      {
        h: '1. Description of Service',
        p: ['ResDrop is a hotel price monitoring service. We track hotel booking prices on your behalf and notify you when prices drop so you can rebook at a lower rate. We do not make or cancel bookings for you.'],
      },
      {
        h: '2. Account Registration',
        p: ['To use ResDrop, you must create an account with accurate and complete information. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.'],
      },
      {
        h: '3. Acceptable Use',
        p: ['You agree not to:'],
        list: [
          'Use the service for any unlawful purpose',
          'Submit false or misleading booking information',
          'Attempt to interfere with or disrupt the service',
          'Access the service through automated means (bots, scrapers) without authorization',
          'Resell or redistribute the service without permission',
        ],
      },
      {
        h: '4. Price Monitoring & Alerts',
        p: ['We strive to provide accurate and timely price alerts, but we do not guarantee that all price drops will be detected or that prices shown will be available at the time of rebooking. Prices are subject to change by the hotel or booking platform at any time.'],
      },
      {
        h: '5. Subscription & Billing',
        p: ['Certain features of ResDrop may require a paid subscription. By subscribing, you authorize us to charge the applicable fees to your payment method. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period.'],
      },
      {
        h: '6. Intellectual Property',
        p: ['All content, features, and functionality of the ResDrop service — including text, graphics, logos, and software — are the property of ResDrop and protected by applicable intellectual property laws.'],
      },
      {
        h: '7. Limitation of Liability',
        p: ['To the fullest extent permitted by law, ResDrop shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the service, including but not limited to lost savings, missed price drops, or rebooking costs.'],
      },
      {
        h: '8. Termination',
        p: ['We reserve the right to suspend or terminate your account if you violate these Terms. You may also delete your account at any time through your account settings.'],
      },
      {
        h: '9. Changes to These Terms',
        p: ['We may modify these Terms from time to time. If we make material changes, we will notify you via email or through the service. Your continued use of ResDrop after changes are posted constitutes acceptance of the updated Terms.'],
      },
      {
        h: '10. Governing Law',
        p: ['These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ResDrop operates, without regard to conflict of law principles.'],
      },
      {
        h: '11. Contact Us',
        p: [],
        contact: 'If you have any questions about these Terms, please contact us at ',
      },
    ],
  },
  pt: {
    title: 'Termos de Serviço',
    updated: 'Última atualização: 17 de março de 2026',
    intro: 'Bem-vindo ao ResDrop. Ao acessar ou usar nosso serviço, você concorda com estes Termos de Serviço. Leia-os com atenção.',
    sections: [
      {
        h: '1. Descrição do Serviço',
        p: ['O ResDrop é um serviço de monitoramento de preços de hotéis. Rastreamos os preços das suas reservas de hotel e notificamos você quando os preços caem, para que possa remarcar por uma tarifa menor. Não fazemos nem cancelamos reservas por você.'],
      },
      {
        h: '2. Cadastro de Conta',
        p: ['Para usar o ResDrop, você deve criar uma conta com informações precisas e completas. Você é responsável por manter a segurança das suas credenciais e por toda atividade que ocorrer na sua conta.'],
      },
      {
        h: '3. Uso Aceitável',
        p: ['Você concorda em não:'],
        list: [
          'Usar o serviço para qualquer finalidade ilegal',
          'Enviar informações de reserva falsas ou enganosas',
          'Tentar interferir ou prejudicar o serviço',
          'Acessar o serviço por meios automatizados (bots, scrapers) sem autorização',
          'Revender ou redistribuir o serviço sem permissão',
        ],
      },
      {
        h: '4. Monitoramento de Preços e Alertas',
        p: ['Nos esforçamos para fornecer alertas de preço precisos e pontuais, mas não garantimos que todas as quedas de preço serão detectadas nem que os preços exibidos estarão disponíveis no momento da remarcação. Os preços podem ser alterados pelo hotel ou pela plataforma de reservas a qualquer momento.'],
      },
      {
        h: '5. Assinatura e Cobrança',
        p: ['Certos recursos do ResDrop podem exigir uma assinatura paga. Ao assinar, você nos autoriza a cobrar as taxas aplicáveis no seu método de pagamento. Você pode cancelar sua assinatura a qualquer momento; o cancelamento entra em vigor ao final do período de cobrança atual.'],
      },
      {
        h: '6. Propriedade Intelectual',
        p: ['Todo o conteúdo, recursos e funcionalidades do serviço ResDrop — incluindo textos, gráficos, logotipos e software — são propriedade do ResDrop e protegidos pelas leis de propriedade intelectual aplicáveis.'],
      },
      {
        h: '7. Limitação de Responsabilidade',
        p: ['Na máxima extensão permitida por lei, o ResDrop não será responsável por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso do serviço, incluindo, entre outros, economias perdidas, quedas de preço não detectadas ou custos de remarcação.'],
      },
      {
        h: '8. Encerramento',
        p: ['Reservamo-nos o direito de suspender ou encerrar sua conta se você violar estes Termos. Você também pode excluir sua conta a qualquer momento nas configurações da conta.'],
      },
      {
        h: '9. Alterações nestes Termos',
        p: ['Podemos modificar estes Termos periodicamente. Se fizermos alterações relevantes, notificaremos você por e-mail ou pelo serviço. O uso continuado do ResDrop após a publicação das alterações constitui aceitação dos Termos atualizados.'],
      },
      {
        h: '10. Lei Aplicável',
        p: ['Estes Termos serão regidos e interpretados de acordo com as leis da jurisdição em que o ResDrop opera, sem considerar princípios de conflito de leis.'],
      },
      {
        h: '11. Fale Conosco',
        p: [],
        contact: 'Se você tiver dúvidas sobre estes Termos, fale conosco em ',
      },
    ],
  },
};

function TermsPage() {
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

export default TermsPage;
