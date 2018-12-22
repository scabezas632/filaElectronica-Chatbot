//========================================
// HORARIO 
//========================================
const axios = require('axios');
const URL_API = require('../config/config').URL_API;
const send = require('./send');

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

async function consultarHorario(sender, responseText, parameters) {
    if (parameters.hasOwnProperty('comuna') && parameters['comuna'] != '') {
        await send.sendTextMessage(sender, 'Ok, dame un momento para consultar los horarios...');
        try {
            let resp =  await axios.get('http://' + URL_API + '/sucursal', {
                params: {
                    comuna: parameters['comuna']
                }
            });
            let reply;
            let quickReplies = []
            let existenTiendas = true;

            let sucursal = resp.data;
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

            // Comprobar si se envían quickReplys
            if (quickReplies.length == 0 && existenTiendas) {
                send.sendTextMessage(sender, reply);
                return ['closing', undefined];
            } else if (!existenTiendas) {
                send.sendQuickReply(sender, reply, quickReplyFunctions);
                return ['closing', undefined];
            } else {
                send.sendQuickReply(sender, reply, quickReplies);
                return ['pedirHorario_moreThanOneStore', parameters['comuna']];
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
        return ['pedirHorario_pedirComuna', undefined]
    }
}


async function consultarHorarioTiendaEspecifica(sender, responseText, nombreTienda, comuna) {
    nombreTienda = nombreTienda.replace(/(^|\s)\S/g, l => l.toUpperCase());
    comuna = comuna.replace(/(^|\s)\S/g, l => l.toUpperCase());
    await send.sendTextMessage(sender, 'Ok, dame un momento para consultar los horarios...');
    try {
        let resp =  await axios.get('http://' + URL_API + '/sucursal', {
            params: {
                comuna: comuna,
                nombre: nombreTienda
            }
        });
        let reply;

        let sucursal = resp.data;

        console.log(sucursal)

        // Si existe una tienda con ese nombre
        if (sucursal.length > 0) {
            reply = `El horario para la sucursal '${nombreTienda}', en la comuna de ${comuna} es:\n` +
                    `${sucursal.sucursales[0]['horario']['semana']}\n` +
                    `${sucursal.sucursales[0]['horario']['domingo']}`
            send.sendTextMessage(sender, reply);
            return ['closing', undefined];
        } else {
            reply = `No se encontraron tiendas con el nombre: ${nombreTienda}.`;
            send.sendTextMessage(sender, reply);
            return ['closing', undefined];
        }

    } catch (error) {
        reply = 'Disculpa, pero en estos momentos no es posible revisar los horarios.';
        console.error(error);
        send.sendTextMessage(sender, reply);
    }
}

module.exports = {
    consultarHorario,
    consultarHorarioTiendaEspecifica
}