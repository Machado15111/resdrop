const express = require('express');
const router = express.Router();

/**
 * Webhook endpoint for Twilio WhatsApp API
 * Receives forwarded text/booking info, parses using an LLM, and creates a ResDrop tracking entry.
 */
router.post('/whatsapp', async (req, res) => {
  // Twilio sends data in application/x-www-form-urlencoded
  const incomingMsg = req.body.Body || '';
  const senderNumber = req.body.From || '';

  console.log(`[WhatsApp] Received message from ${senderNumber}: ${incomingMsg}`);

  // TODO: Validate user account
  // const user = await db.getUserByPhone(senderNumber);
  // if (!user) { return res.send('<Response><Message>Please link your WhatsApp number in ResDrop settings.</Message></Response>'); }

  try {
    // Basic AI Parsing Logic placeholder
    // Ideally you would use OpenAI's API with structured JSON output here
    /*
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a hotel booking extractor. Extract the following from the message and return STRICT JSON: { hotelName, checkinDate, checkoutDate, originalPrice, currency, guestName, confirmationNumber }" 
        },
        { role: "user", content: incomingMsg }
      ],
      response_format: { type: "json_object" }
    });
    
    const parsedBooking = JSON.parse(completion.choices[0].message.content);
    
    // Save to database
    // await db.createBooking({ ...parsedBooking, userId: user.id });
    */

    // Simulated successful TwiML response
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

module.exports = router;
