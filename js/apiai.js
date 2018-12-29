'use strict';

// Necesarios para el chatbot
const apiai = require('apiai');
const config = require('../config/config');
const send = require('./send');
const horario = require('./horario');
const oferta = require('./oferta');
const verificarCliente = require('./verificarCliente');
const usuarioDB = require('../requestAPI/usuarios');

// Database
const ChatDB = require('../requestAPI/chats');

const apiAiService = apiai(config.API_AI_CLIENT_ACCESS_TOKEN, {
    language: "en",
    requestSource: "fb"
});

function sendToApiAi(sender, recipient, text, sessionIds) {

    send.sendTypingOn(sender);
    let apiaiRequest = apiAiService.textRequest(text, {
        sessionId: sessionIds.get(sender)
    });

    apiaiRequest.on('response', (response) => {
        if (isDefined(response.result)) {
            handleApiAiResponse(sender, recipient, response);
        }
    });

    apiaiRequest.on('error', (error) => console.error(error));
    apiaiRequest.end();
}

async function handleApiAiResponse(sender, recipient, response) {
    let userQuestion = response.result.resolvedQuery;
    let responseText = response.result.fulfillment.speech;
    let responseData = response.result.fulfillment.data;
    let messages = response.result.fulfillment.messages;
    let action = response.result.action;
    let contexts = response.result.contexts;
    let parameters = response.result.parameters;
    let intentName = response.result.metadata.intentName;

    send.sendTypingOff(sender);

    await usuarioDB.verifyUserExist(sender);

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
        handleApiAiAction(sender, action, responseText, contexts, parameters, userQuestion);
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

async function handleApiAiAction(sender, action, responseText, contexts, parameters, userQuestion) {
    try {
        let responseData;
        let data;
        let state;
        let param;
        switch (action) {
            case "obtener-ofertas":
            responseData = await oferta.consultarOfertas(sender, responseText);
                break;
            case "obtener-horario":
                data = await ChatDB.getLastState(sender);
                state = data.state;
                param = data.paramsProxMensaje;
                if (state !== null || state !== undefined) {
                    switch(state.split('_')[1]) {
                        case 'moreThanOneStore':
                            responseData = await horario.consultarHorarioTiendaEspecifica(sender, responseText, userQuestion, param);
                            break;
                        default:
                            responseData = await horario.consultarHorario(sender, responseText, parameters);
                            break;
                    }
                } else {
                    responseData = await horario.consultarHorario(sender, responseText, parameters);
                }
                break;
            case "pedir-turno":
                responseData = await verificarCliente.verificarUsuario(sender, parameters);
                break;
            default:
                // Acción no controlada, se consulta por el state del último mensaje
                data = await ChatDB.getLastState(sender);
                state = data.state;
                param = data.paramsProxMensaje;
                if (state !== null || state !== undefined) {
                    switch (state.split('_')[0]) {
                        case 'closing':
                            send.sendTextMessage(sender, responseText)
                            break;
                        case 'pedirHorario':
                            // CASOS DEL FLUJO PEDIR HORARIO
                            switch (state.split('_')[1]) {
                                case 'moreThanOneStore':
                                    responseData = await horario.consultarHorarioTiendaEspecifica(sender, responseText, userQuestion, param);
                                    break;
                                default:
                                    send.sendTextMessage(sender, responseText);
                                    break;
                            }
                            break;
                        case 'verificarUsuario':
                            // CASOS DEL FLUJO VERIFICAR USUARIO
                            switch (state.split('_')[1]) {                                   
                                case 'requestRut':
                                    responseData = await verificarCliente.verificarRut(sender, userQuestion, param);
                                    break;
                                case 'registerConfirmation':
                                    responseData = await verificarCliente.registerUser(sender, userQuestion, param);
                                    break;
                                default:
                                    send.sendTextMessage(sender, responseText);
                                    break;
                            }
                            break;
                        case 'pedirTurno':
                            //CASOS DEL FLUJO PARA PEDIR TURNO
                            switch (state.split('_')[1]) {
                                case 'verifyApprobe':
                                    // CONTINUAR CON PEDIR TURNO
                                    console.log('PASEEEEEEEEE')
                                    break;
                                default:
                                    send.sendTextMessage(sender, responseText);
                                    break;
                            }
                        default:
                            send.sendTextMessage(sender, responseText);
                            break;
                    }
                    break;
                } else {
                    send.sendTextMessage(sender, responseText);
                    break;
                } 
        }
        // Guardar mensaje en la base de datos
        await ChatDB.sendMessageToDB(sender, action, responseData, userQuestion, sender);
        if(responseData[2]) {
            await ChatDB.sendMessageToDB(sender, action, responseData, responseData[2], 'FilaElectronica');
        } else if (responseData === undefined || responseData === null){
            await ChatDB.sendMessageToDB(sender, action, ['error', undefined], responseText, 'FilaElectronica');
        } else {
            await ChatDB.sendMessageToDB(sender, action, responseData, responseText, 'FilaElectronica');
        }
    } catch (error) {
        console.log(error);
        let state = ['error', undefined];
        let reply = 'En estos momentos tengo problemas para responder a tu pregunta.';
        send.sendTextMessage(sender, reply);
        // Guardar mensaje en la base de datos
        await ChatDB.sendMessageToDB(sender, action, state, userQuestion, sender);
        await ChatDB.sendMessageToDB(sender, action, state, reply, 'FilaElectronica');
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

module.exports = {
    sendToApiAi
}