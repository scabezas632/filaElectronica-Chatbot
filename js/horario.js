//========================================
// HORARIO 
//========================================
const request = require('request');
const send = require('./send');

let quickReplyContent = {
    "content_type": "",
    "title": "",
    "payload": ""
}

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

            if (!err && resp.statusCode == 200) {
                let sucursal = JSON.parse(body);
                if (sucursal.hasOwnProperty('sucursales') && sucursal.length == 1) {
                    reply = `${responseText}\n` +
                        `${sucursal.sucursales[0]['horario']['semana']}\n` +
                        `${sucursal.sucursales[0]['horario']['domingo']}`
                } else if (sucursal.hasOwnProperty('sucursales') && sucursal.length > 1) {
                    reply = `Tenemos ${sucursal.length} sucursales en ${parameters['comuna']},` +
                        `¿Cuál es la sucursal que necesitas?`;
                    // Llenar Quick Reply
                    for (let i = 0; i < sucursal.length; i++) {
                        quickReplyContent.content_type = "text";
                        quickReplyContent.title = sucursal.sucursales[i]['nombre'];
                        quickReplyContent.payload = `El horario de ${sucursal.sucursales[i]['nombre']}`;
                        quickReplies.push(quickReplyContent);
                    }
                } else {
                    reply = `Disculpa pero no tenemos sucursales en ${parameters['comuna']}`;
                }
            } else {
                reply = 'Disculpa, pero en estos momentos no es posible revisar los horarios.';
                console.error(err);
            }

            // Comprobar si se envían quickReplys
            if (quickReplies.length == 0) {
                send.sendTextMessage(sender, reply);
            } else {
                send.sendQuickReply(sender, reply, quickReplies);
            }
        });
    } else {
        // Cuando el usuario no manda todos los parametros necesarios
        send.sendTextMessage(sender, responseText);
    }
}

module.exports = {
    consultarHorario
}