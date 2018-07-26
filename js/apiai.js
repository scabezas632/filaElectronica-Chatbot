'use strict';

// Necesarios para el chatbot
const apiai = require('apiai');
const config = require('../config/config');
const send = require('./send');
const handle = require('./handle');

const apiAiService = apiai(config.API_AI_CLIENT_ACCESS_TOKEN, {
    language: "en",
    requestSource: "fb"
});

function sendToApiAi(sender, text, sessionIds) {

    send.sendTypingOn(sender);
    let apiaiRequest = apiAiService.textRequest(text, {
        sessionId: sessionIds.get(sender)
    });

    apiaiRequest.on('response', (response) => {
        if (isDefined(response.result)) {
            handle.handleApiAiResponse(sender, response);
        }
    });

    apiaiRequest.on('error', (error) => console.error(error));
    apiaiRequest.end();
}

module.exports = {
    sendToApiAi
}