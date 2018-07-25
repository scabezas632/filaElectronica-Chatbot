'use strict';

// Necesarios para el chatbot
const apiai = require('apiai');
const config = require('./config/config');
const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const uuid = require('uuid');
const send = require('./js/send');
const horario = require('./js/horario');
const oferta = require('./js/oferta');
const ubicacion = require('./js/ubicacion');



// Parametros para Messenger API
if (!config.FB_PAGE_TOKEN) {
    throw new Error('FB_PAGE_TOKEN no esta configurado');
}
if (!config.FB_VERIFY_TOKEN) {
    throw new Error('FB_VERIFY_TOKEN no esta configurado');
}
if (!config.API_AI_CLIENT_ACCESS_TOKEN) {
    throw new Error('API_AI_CLIENT_ACCESS_TOKEN no esta configurado');
}
if (!config.FB_APP_SECRET) {
    throw new Error('FB_APP_SECRET no esta configurado');
}
if (!config.SERVER_URL) { //used for ink to static files
    throw new Error('SERVER_URL no esta configurado');
}



app.set('port', (process.env.PORT || 5000))

// Verifica la respuesta de Facebook
app.use(bodyParser.json({
    verify: verifyRequestSignature
}));

// serve static files in the public directory
app.use(express.static('public'));

// Proceso de application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// Preceso de application/json
app.use(bodyParser.json())

const apiAiService = apiai(config.API_AI_CLIENT_ACCESS_TOKEN, {
    language: "en",
    requestSource: "fb"
});
const sessionIds = new Map();


function sendToApiAi(sender, text, sessionIds) {

    send.sendTypingOn(sender);
    let apiaiRequest = apiAiService.textRequest(text, {
        sessionId: sessionIds.get(sender)
    });

    apiaiRequest.on('response', (response) => {
        if (isDefined(response.result)) {
            handleApiAiResponse(sender, response);
        }
    });

    apiaiRequest.on('error', (error) => console.error(error));
    apiaiRequest.end();
}

// Index route
app.get('/', function(req, res) {
    res.send('Hola, soy el backend del chat bot Fila Electronica')
})

// Para la verificacion de Facebook
app.get('/webhook/', function(req, res) {
    console.log("request");
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Validación Fallida. Asegurese de que el token de verificación coincida correctamente.");
        res.sendStatus(403);
    }
})

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook/', function(req, res) {
    var data = req.body;
    console.log(JSON.stringify(data));

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function(messagingEvent) {
                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.delivery) {
                    receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else if (messagingEvent.read) {
                    receivedMessageRead(messagingEvent);
                } else if (messagingEvent.account_linking) {
                    receivedAccountLink(messagingEvent);
                } else {
                    console.log("El webhook recibió un messagingEvent desconocido: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        // You must send back a 200, within 20 seconds
        res.sendStatus(200);
    }
});


function receivedMessage(event) {

    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    if (!sessionIds.has(senderID)) {
        sessionIds.set(senderID, uuid.v1());
    }
    //console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;

    // Se pueden recibir texto o archivos adjuntos pero no ambos a la vez
    var messageText = message.text;
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;

    if (isEcho) {
        handleEcho(messageId, appId, metadata);
        return;
    } else if (quickReply) {
        handleQuickReply(senderID, quickReply, messageId);
        return;
    }


    if (messageText) {
        // Enviar mensaje a API 
        console.log("MENSAJE QUE SE ENVIA A API AI:", messageText);
        sendToApiAi(senderID, messageText, sessionIds);
    } else if (messageAttachments) {
        if (messageAttachments[0]['type'] === 'location') {
            let comuna;
            // OBTENER COMUNA DESDE LA UBICACION ENTREGADA POR EL USUARIO
            ubicacion.obtenerComuna(senderID, messageAttachments[0]['payload']['coordinates'])
                .then(resp => {
                    let location = resp.data.results[0];
                    let contador = 0;
                    while (true) {
                        if (location['address_components'][contador]['types'][0] === 'administrative_area_level_3') {
                            comuna = location['address_components'][contador]['long_name'];
                            break;
                        }
                        contador++;
                    }
                    console.log("MENSAJE QUE SE ENVIA A API AI:", messageText);
                    sendToApiAi(senderID, comuna, sessionIds);
                })
                .catch(err => {
                    send.sendTextMessage(sender, 'Disculpa, pero en estos momentos no es posible revisar los horarios.');
                    console.error(err);
                });
        } else {
            handleMessageAttachments(messageAttachments, senderID);
        }
    }
}


function handleApiAiResponse(sender, response) {
    let responseText = response.result.fulfillment.speech;
    let responseData = response.result.fulfillment.data;
    let messages = response.result.fulfillment.messages;
    let action = response.result.action;
    let contexts = response.result.contexts;
    let parameters = response.result.parameters;

    send.sendTypingOff(sender);

    if (isDefined(messages) && (messages.length == 1 && messages[0].type != 0 || messages.length > 1)) {
        let timeoutInterval = 1100;
        let previousType;
        let cardTypes = [];
        let timeout = 0;
        for (var i = 0; i < messages.length; i++) {

            if (previousType == 1 && (messages[i].type != 1 || i == messages.length - 1)) {
                timeout = (i - 1) * timeoutInterval;
                setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
                cardTypes = [];
                timeout = i * timeoutInterval;
                setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
            } else if (messages[i].type == 1 && i == messages.length - 1) {
                cardTypes.push(messages[i]);
                timeout = (i - 1) * timeoutInterval;
                setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
                cardTypes = [];
            } else if (messages[i].type == 1) {
                cardTypes.push(messages[i]);
            } else {
                timeout = i * timeoutInterval;
                setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
            }

            previousType = messages[i].type;

        }
    } else if (responseText == '' && !isDefined(action)) {
        //API AI no puede evaluar el input
        console.log('Pregunta desconocida: ' + response.result.resolvedQuery);
        send.sendTextMessage(sender, "No estoy seguro de lo que me dices. ¿Puedes ser más especifico?");
    } else if (isDefined(action)) {
        handleApiAiAction(sender, action, responseText, contexts, parameters);
    } else if (isDefined(responseData) && isDefined(responseData.facebook)) {
        try {
            console.log('Respuesta como formato de mensaje: ' + responseData.facebook);
            send.sendTextMessage(sender, responseData.facebook);
        } catch (err) {
            send.sendTextMessage(sender, err.message);
        }
    } else if (isDefined(responseText)) {
        send.sendTextMessage(sender, responseText);
    }
}

function handleApiAiAction(sender, action, responseText, contexts, parameters) {
    switch (action) {
        case "obtener-ofertas":
            oferta.consultarOfertas(sender, responseText);
            break;
        case "obtener-horario":
            horario.consultarHorario(sender, responseText, parameters);
            break;
        default:
            // Acción no controlada, se envia mensaje por default 
            send.sendTextMessage(sender, responseText);
    }
}

function handleMessage(message, sender) {
    switch (message.type) {
        case 0: //texto
            send.sendTextMessage(sender, message.speech);
            break;
        case 2: //quick replies
            let replies = [];
            for (var b = 0; b < message.replies.length; b++) {
                let reply = {
                    "content_type": "text",
                    "title": message.replies[b],
                    "payload": message.replies[b]
                }
                replies.push(reply);
            }
            send.sendQuickReply(sender, message.title, replies);
            break;
        case 3: //imagen
            send.sendImageMessage(sender, message.imageUrl);
            break;
        case 4:
            // custom payload
            var messageData = {
                recipient: {
                    id: sender
                },
                message: message.payload.facebook

            };

            callSendAPI(messageData);

            break;
    }
}


function handleCardMessages(messages, sender) {

    let elements = [];
    for (var m = 0; m < messages.length; m++) {
        let message = messages[m];
        let buttons = [];
        for (var b = 0; b < message.buttons.length; b++) {
            let isLink = (message.buttons[b].postback.substring(0, 4) === 'http');
            let button;
            if (isLink) {
                button = {
                    "type": "web_url",
                    "title": message.buttons[b].text,
                    "url": message.buttons[b].postback
                }
            } else {
                button = {
                    "type": "postback",
                    "title": message.buttons[b].text,
                    "payload": message.buttons[b].postback
                }
            }
            buttons.push(button);
        }


        let element = {
            "title": message.title,
            "image_url": message.imageUrl,
            "subtitle": message.subtitle,
            "buttons": buttons
        };
        elements.push(element);
    }
    send.sendGenericMessage(sender, elements);
}


function handleMessageAttachments(messageAttachments, senderID) {
    // Por ahora, solo responde
    // send.sendTextMessage(senderID, "Archivo recibido. Procesando...");
    // var barcode = getBarcodeFromImage(messageAttachments.payload.url);
    // send.sendTextMessage(senderID, "Buscando información de " + barcode);
}

function handleQuickReply(senderID, quickReply, messageId) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply para el mensaje %s con payload %s", messageId, quickReplyPayload);
    // Se envia el payload a API AI
    sendToApiAi(senderID, quickReplyPayload, sessionIds);
}

//https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-echo
function handleEcho(messageId, appId, metadata) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
}

function greetUserText(userId) {
    // Se obtiene la información del usuario para saludar
    request({
        uri: 'https://graph.facebook.com/v2.7/' + userId,
        qs: {
            access_token: config.FB_PAGE_TOKEN
        }

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {

            var user = JSON.parse(body);

            if (user.first_name) {
                console.log("Usuario de Facebook: %s %s, %s",
                    user.first_name, user.last_name, user.gender);

                send.sendTextMessage(userId, "¡Hola " + user.first_name + '!');
            } else {
                console.log("No se ha podido obtener la información del usuario con id",
                    userId);
            }
        } else {
            console.error(response.error);
        }

    });
}


/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: config.FB_PAGE_TOKEN
        },
        method: 'POST',
        json: messageData

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback 
    // button for Structured Messages. 
    var payload = event.postback.payload;

    switch (payload) {
        default:
        //unindentified payload
            send.sendTextMessage(senderID, "I'm not sure what you want. Can you be more specific?");
        break;

    }

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

}


/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
        "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
        "and auth code %s ", senderID, status, authCode);
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;

    if (messageIDs) {
        messageIDs.forEach(function(messageID) {
            console.log("Received delivery confirmation for message ID: %s",
                messageID);
        });
    }

    console.log("All message before %d were delivered.", watermark);
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfAuth = event.timestamp;

    // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
    // The developer can set this to an arbitrary value to associate the 
    // authentication callback with the 'Send to Messenger' click event. This is
    // a way to do account linking when the user clicks the 'Send to Messenger' 
    // plugin.
    var passThroughParam = event.optin.ref;

    console.log("Received authentication for user %d and page %d with pass " +
        "through param '%s' at %d", senderID, recipientID, passThroughParam,
        timeOfAuth);

    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    send.sendTextMessage(senderID, "Authentication successful");
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
        throw new Error('Couldn\'t validate the signature.');
    } else {
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];

        var expectedHash = crypto.createHmac('sha1', config.FB_APP_SECRET)
            .update(buf)
            .digest('hex');

        if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}

function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
});