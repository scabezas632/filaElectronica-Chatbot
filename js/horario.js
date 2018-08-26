//========================================
// HORARIO 
//========================================
const request = require('request');
const send = require('./send');

const quickReplyFunctions = [{
    "content_type": "text",
    "title": 'Pedir Turno',
    "payload": 'Pedir Turno'
}, {
    "content_type": "text",
    "title": 'Ver Horario',
    "payload": 'Ver Horarios'
}, {
    "content_type": "text",
    "title": 'Ver ofertas',
    "payload": 'Ver ofertas'
}]

function consultarHorario(sender, responseText, parameters) {
    if (parameters.hasOwnProperty('comuna') && parameters['comuna'] != '') {
        send.sendTextMessage(sender, 'Ok, dame un momento para consultar los horarios...');
        request({
            url: 'https://filaelectronica-backend.herokuapp.com/sucursal',
            qs: {
                comuna: parameters['comuna']
            }
        }, function(err, resp, body) {
            let reply;
            let quickReplies = []
            let existenTiendas = true;

            if (!err && resp.statusCode == 200) {
                let sucursal = JSON.parse(body);
                if (sucursal.hasOwnProperty('sucursales') && sucursal.length == 1) {
                    reply = `${responseText}\n` +
                        `${sucursal.sucursales[0]['horario']['semana']}\n` +
                        `${sucursal.sucursales[0]['horario']['domingo']}`
                } else if (sucursal.hasOwnProperty('sucursales') && sucursal.length > 1) {
                    reply = `Tenemos ${sucursal.length} sucursales en ${parameters['comuna']}, ` +
                        `¿Cuál es la sucursal que necesitas?`;
                    // Llenar Quick Reply
                    for (let i = 0; i < sucursal.length; i++) {
                        let quickReplyContent = {
                            "content_type": "text",
                            "title": sucursal.sucursales[i]['nombre'],
                            "payload": sucursal.sucursales[i]['nombre']
                        }
                        quickReplies.push(quickReplyContent);
                    }
                } else {
                    reply = `Disculpa pero no tenemos sucursales en ${parameters['comuna']}. ` +
                        `¿Hay algo más en lo que pueda ayudarte?`;
                    existenTiendas = false;
                }
            } else {
                reply = 'Disculpa, pero en estos momentos no es posible revisar los horarios.';
                console.error(err);
            }

            // Comprobar si se envían quickReplys
            if (quickReplies.length == 0 && existenTiendas) {
                send.sendTextMessage(sender, reply);
            } else if (!existenTiendas) {
                send.sendQuickReply(sender, reply, quickReplyFunctions);
            } else {
                send.sendQuickReply(sender, reply, quickReplies);
            }
        });
    } else {
        // Cuando el usuario no manda todos los parametros necesarios
        const quickReplyContentLocation = [{
            "content_type": "location"
        }];
        send.sendQuickReply(sender, responseText, quickReplyContentLocation);
    }
}

module.exports = {
    consultarHorario
}