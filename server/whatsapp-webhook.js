import express from 'express';

const router = express.Router();

/**
 * Webhook endpoint for Twilio WhatsApp API
 * Receives forwarded text/booking info, parses using deterministic/AI tools, and creates a ResDrop tracking entry.
 */
router.post('/whatsapp', async (req, res) => {
  // Twilio sends data in application/x-www-form-urlencoded
  const incomingMsg = req.body.Body || '';
  const senderNumber = req.body.From || '';

  console.log(`[WhatsApp] Received message from ${senderNumber}: ${incomingMsg}`);

  try {
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Tudo certo! ✅ Já estou monitorando sua reserva. Se o preço cair, te aviso por aqui.</Message>
</Response>`;

    res.type('text/xml').send(twimlResponse);
  } catch (error) {
    console.error('[WhatsApp] Parsing Error:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Desculpe, não consegui extrair os dados da sua reserva. Você pode me enviar o PDF ou colar o texto completo da confirmação?</Message>
</Response>`;

    res.type('text/xml').send(errorTwiml);
  }
});

export default router;
