//========================================
// HORARIO 
//========================================
const axios = require('axios');
const URL_API = require('../config/config').URL_API;
const send = require('./send');
const turnoUtils = require('../utils/turno');
const consultaSucursal = require('../utils/querySucursal').responderCantidadSucursal;

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

async function verificarComuna(sender, responseText, parameters) {
    if (parameters.hasOwnProperty('comuna') && parameters['comuna'] != '') {
        try {
            let resp = await axios.get(URL_API + '/sucursal', {
                params: {
                    comuna: parameters['comuna']
                }
            });
            let reply;
            let quickReplies = []
            let existenTiendas = true;
            let responseConsultaSucursal;

            let sucursal = resp.data;
            if (sucursal.hasOwnProperty('sucursales') && sucursal.length == 1) {
                return mostrarTiempoEspera(sender);
            } else {
                responseConsultaSucursal = consultaSucursal(sucursal, parameters['comuna']);
                reply = responseConsultaSucursal[0];
                if (responseConsultaSucursal[1]) {
                    quickReplies = responseConsultaSucursal[1];
                } else {
                    existenTiendas = responseConsultaSucursal[1];
                }
            }

            // Comprobar si se envían quickReplys
            if (quickReplies.length == 0 && existenTiendas) {
                send.sendQuickReply(sender, reply, quickReplyConfirmation);
                return ['pedirTurno_waitConfirmation', undefined, reply];
            } else if (!existenTiendas) {
                send.sendQuickReply(sender, reply, quickReplyFunctions);
                return ['closing', undefined, reply];
            } else {
                send.sendQuickReply(sender, reply, quickReplies);
                return ['pedirTurno_moreThanOneStore', parameters['comuna'], reply];
            }

        } catch (error) {
            reply = 'Disculpa, pero en estos momentos no es posible revisar los horarios.';
            console.error(error);
            send.sendTextMessage(sender, reply);
        }
    } else {
        // Cuando el usuario no manda todos los parametros necesarios
        const quickReplyContentLocation = [{
            "content_type": "location"
        }];
        send.sendQuickReply(sender, responseText, quickReplyContentLocation);
        return ['pedirTurno_pedirComuna', undefined, responseText]
    }
}

async function consultarPorTiendaEspecifica(sender, responseText, nombreTienda, comuna) {
    nombreTienda = nombreTienda.replace(/(^|\s)\S/g, l => l.toUpperCase());
    comuna = comuna.replace(/(^|\s)\S/g, l => l.toUpperCase());
    return mostrarTiempoEspera(sender);
}

async function mostrarTiempoEspera(sender) {
    console.log('=======================');
    console.log('aqui esta el problema')
    const turno = await turnoUtils.getNextPosition(sender);
    console.log(turno)
    // FUNCION PARA PEDIR LA CANTIDAD DE PERSONAS QUE HAY ESPERANDO
    // (NUMERO DE PERSONAS QUE PIDIERON EL SERVICIO - CONTADOR DE ARDUINO)
    reply = `Ok, el tiempo de espera estimado es de entre 1 y 2 minutos. ¿Aceptas esperar?`;
    send.sendQuickReply(sender, reply, quickReplyConfirmation);
    return ['pedirTurno_waitConfirmation', undefined, reply];
}

async function confirmarTurno(sender, userQuestion, params) {
    try {
        if (userQuestion.toUpperCase() === 'SI') {
            let cantidadLista = 3;
            reply = 'Ok, tu turno es el 12, te esperamos en la caja de clientes';
            await send.sendTextMessage(sender, reply);
            //CONDICIONAL, SI HAY MAS DE DOS PERSONAS EN LA LISTA
            setTimeout(() => {
                if (cantidadLista >= 2) {
                    send.sendQuickReply(sender, `¿Deseas que te avise cuando queden 2 personas antes de ti?`, quickReplyConfirmation);
                    return ['pedirTurno_waitConfirmationNotification', undefined, reply];
                } else {
                    reply = 'Ok, gracias por responder. Si necesitas de mi ayuda nuevamente, dimelo.';
                    send.sendQuickReply(sender, reply, quickReplyFunctions);
                    return ['closing', undefined, reply];
                }
            }, 500)
        } else if (userQuestion.toUpperCase() === 'NO') {
            reply = 'Ok, gracias por responder. Si necesitas de mi ayuda nuevamente, dimelo.';
            send.sendQuickReply(sender, reply, quickReplyFunctions);
            return ['closing', undefined, reply];
        } else {
            reply = `Por favor, dime 'Si' o 'No'.`;
            send.sendQuickReply(sender, reply, quickReplyConfirmation);
            return ['pedirTurno_waitConfirmation', undefined, reply];
        }
    } catch (error) {
        reply = 'Disculpa, pero en estos momentos no es posible atender a tu respuesta.';
        console.error(error);
        send.sendTextMessage(sender, reply);
        return ['error', undefined, reply];
    }
}

async function confirmNotification(sender, userQuestion, params) {
    try {
        if (userQuestion.toUpperCase() === 'SI') {
            reply = 'Ok, te avisaré cuando queden 2 personas. Si necesitas de mi ayuda nuevamente, dimelo.';
        } else if (userQuestion.toUpperCase() === 'NO') {
            reply = 'Ok, gracias por responder. Si necesitas de mi ayuda nuevamente, dimelo.';
        } else {
            reply = `Por favor, dime 'Si' o 'No'.`;
            send.sendQuickReply(sender, reply, quickReplyConfirmation);
            return ['pedirTurno_waitConfirmationNotification', undefined, reply];
        }
        send.sendQuickReply(sender, reply, quickReplyConfirmation);
        return ['closing', undefined, reply];
    } catch (error) {
        reply = 'Disculpa, pero en estos momentos no es posible atender a tu respuesta.';
        console.error(error);
        send.sendTextMessage(sender, reply);
        return ['error', undefined, reply];
    }
}

module.exports = {
    verificarComuna,
    consultarPorTiendaEspecifica,
    mostrarTiempoEspera,
    confirmarTurno,
    confirmNotification
}