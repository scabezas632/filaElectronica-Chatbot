'use strict';

const config = require('../config/config');
const send = require('./send');
const horario = require('./horario');
const oferta = require('./oferta');
const apiai = require('./apiai');
const request = require('request');

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
    apiai.sendToApiAi(senderID, quickReplyPayload, sessionIds);
}

//https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-echo
function handleEcho(messageId, appId, metadata) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
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

function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}

module.exports = {
    handleApiAiResponse,
    handleApiAiAction,
    handleMessage,
    handleCardMessages,
    handleMessageAttachments,
    handleQuickReply,
    handleEcho
}