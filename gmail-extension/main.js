/**
 * Triggered when a user opens an email in Gmail.
 * It reads the email body and allows users to push it to the ResDrop API.
 */
function onGmailMessageOpen(e) {
  var messageId = e.gmail.messageId;
  var accessToken = e.gmail.accessToken;
  
  // Set the access token so we can read the message contents securely
  GmailApp.setCurrentMessageAccessToken(accessToken);
  var message = GmailApp.getMessageById(messageId);
  var emailBody = message.getPlainBody() || message.getBody();
  var emailSender = message.getFrom();
  
  // Minimal heuristic to find bookings
  var isHotelBooking = emailSender.toLowerCase().includes('booking.com') || 
                       emailSender.toLowerCase().includes('expedia') ||
                       emailSender.toLowerCase().includes('hotels.com') ||
                       emailBody.toLowerCase().includes('hotel confirmation') ||
                       emailBody.toLowerCase().includes('check-in');

  if (!isHotelBooking) {
    return createNoOpCard();
  }

  // Create UI Card for the sidebar pane
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('ResDrop - Track Booking'));
  
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText("We detected a hotel booking confirmation. Click below to add it to ResDrop for automatic price monitoring."));
    
  var action = CardService.newAction()
      .setFunctionName('sendToResDrop')
      .setParameters({ emailBody: emailBody, sender: emailSender });
      
  var button = CardService.newTextButton()
      .setText("Track with ResDrop")
      .setOnClickAction(action)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED);
      
  section.addWidget(CardService.newButtonSet().addButton(button));
  card.addSection(section);
  
  return card.build();
}

/**
 * Action triggered when user clicks 'Track with ResDrop'
 */
function sendToResDrop(e) {
  var emailBody = e.parameters.emailBody;
  
  // Create payload for ResDrop backend
  var payload = {
    rawEmail: emailBody,
    email: Session.getActiveUser().getEmail() // Sends the current Google user's email
  };
  
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    // Note: ensure api.resdrop.app accepts this POST payload structure 
    var response = UrlFetchApp.fetch('https://api.resdrop.app/bookings/from-email', options);
    
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      var nav = CardService.newNavigation().pushCard(createSuccessCard());
      return CardService.newActionResponseBuilder().setNavigation(nav).build();
    } else {
      throw new Error("API responded with " + response.getResponseCode());
    }
        
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("Failed to process booking: " + err.message)
        .setType(CardService.NotificationType.ERROR))
      .build();
  }
}

function createNoOpCard() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('ResDrop'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("Open a hotel confirmation email to start tracking it with ResDrop.")))
    .build();
}

function createSuccessCard() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Success!'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("Your booking is now being tracked! If the price drops, you'll be the first to know.")))
    .build();
}
