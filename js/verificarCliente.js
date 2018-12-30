//========================================
// HORARIO 
//========================================
const axios = require('axios');
const URL_API = require('../config/config').URL_API;
const send = require('./send');
const pedirTurno = require('./pedirTurno');

// Utils
const validaRut = require('../utils/validaRut');

// API Request
const usuarioDB = require('../requestAPI/usuarios');
const clienteDB = require('../requestAPI/clientes');

const quickReplyFunctions = [{
    "content_type": "text",
    "title": 'Pedir Turno',
    "payload": 'Pedir Turno'
}, {
    "content_type": "text",
    "title": 'Dame el horario',
    "payload": 'Dame el horario'
}, {
    "content_type": "text",
    "title": 'Dame las ofertas',
    "payload": 'Dame las ofertas'
}]

const quickReplyConfirmation = [{
    "content_type": "text",
    "title": 'Si',
    "payload": 'Si'
}, {
    "content_type": "text",
    "title": 'No',
    "payload": 'No'
}]

async function verificarUsuario(sender, responseText, parameters) {
    try {
        let response = await usuarioDB.verifyUserIsClient(sender);
        if(response===true) {
            let cliente = await clienteDB.fetchClient(sender);
            usuarioDB.registerUserAsClient(sender, cliente.rut, cliente.email, cliente.feNaci)
            return await pedirTurno.verificarComuna(sender, responseText, parameters);
        } else if(response==false) {
            //el usuario no es cliente, preguntar rut
            let reply = 'Antes, necesito saber si eres un cliente registrado. Por favor, escribe tu rut.';
            send.sendTextMessage(sender, reply);
            if(parameters['comuna']) {
                return ['verificarUsuario_requestRut', parameters['comuna'], reply];
            } else {
                return ['verificarUsuario_requestRut', undefined, reply];
            }
        }
    } catch (error) {
        reply = 'Disculpa, pero en estos momentos no es posible verificar si eres cliente.';
        console.error(error);
        send.sendTextMessage(sender, reply);
        return ['error', undefined, reply];
    }
}

async function verificarRut(sender, rut, params) {
    try {
        let response = await validaRut.verifyRut(rut);
        if(response) {
            // Function para continuar el proceso de pedido de turnos
            return verificarExistenciaCliente(sender, rut);
        } else {
            reply = 'El rut que me enviaste no es válido. Por favor, corrigelo';
            send.sendTextMessage(sender, reply);
            return ['verificarUsuario_requestRut', undefined, reply];
        }
    } catch(error) {
        reply = 'Disculpa, pero en estos momentos no es posible verificar el rut.';
        console.error(error);
        send.sendTextMessage(sender, reply);
        return ['error', undefined, reply];
    }
}

async function verificarExistenciaCliente(sender, rut, params) {
    try {
        let response = await clienteDB.verifyClientExists(rut);
        if(response) {
            // Usuario existe, se registra para no volver a preguntar
            usuarioDB.registerUserAsClient(sender, rut)
            reply = 'Ok, lo tendré en cuenta para la próxima vez';
            send.sendTextMessage(sender, reply);
            return ['pedirTurno_verifyApprobe', undefined, reply];
        } else {
            //Usuario no existe, se pregunta si se desea registrar
            reply = 'Al parecer no estás registrado como cliente. ¿Deseas registrarte?' +
                    ' Ten en consideración sólo puedes pedir un lugar en la fila estando registrado.';
            send.sendQuickReply(sender, reply, quickReplyConfirmation);
            return ['verificarUsuario_registerConfirmation', undefined, reply];
        }
    } catch(error) {
        reply = 'Disculpa, pero en estos momentos no es posible verificar si eres cliente.';
        console.error(error);
        send.sendTextMessage(sender, reply);
        return ['error', undefined, reply];
    }
}

async function registerUser(sender, userQuestion, params) {
    try {
        if(userQuestion.toUpperCase() === 'SI') {
            //Enviar link de registro
            reply = 'Ok, ingresa al siguiente link y registrate.'
            send.sendAccountLinking(sender, reply, 'Registrate', 'https://www.puntoscencosud.cl/portal/faces/inscribeme')
            send.sendQuickReply(sender, 'Cuando termines, vuelve y pideme un turno.', quickReplyFunctions);
            return ['closing', undefined, reply];
        } else if(userQuestion.toUpperCase() === 'NO'){
            reply = 'Ok, gracias por responder. Si necesitas de mi ayuda nuevamente, dimelo.';
            send.sendQuickReply(sender, reply, quickReplyFunctions);
            return ['closing', undefined, reply];
        } else {
            reply = `Por favor, dime 'Si' o 'No'.`;
            send.sendQuickReply(sender, reply, quickReplyConfirmation);
            return ['verificarUsuario_registerConfirmation', undefined, reply];
        }
    } catch (error) {
        reply = 'Disculpa, pero en estos momentos no es posible atender a tu respuesta.';
        console.error(error);
        send.sendTextMessage(sender, reply);
        return ['error', undefined, reply];
    }
}

module.exports = {
    verificarUsuario,
    verificarRut,
    registerUser
}