const axios = require('axios');
const URL_API = require('../config/config').URL_API;
const send = require('../js/send');

function responderCantidadSucursal(sucursal, comuna) {
    let reply;
    if (sucursal.hasOwnProperty('sucursales') && sucursal.length > 1) {
        console.log('=========================')
        console.log('PASOOOOOOOOO')
        let quickReplies = [];
        reply = `Tenemos ${sucursal.length} sucursales en ${comuna}, ` +
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
        return [reply, quickReplies]
    } else {
        reply = `Disculpa pero no tenemos sucursales en ${comuna}. ` +
            `¿Hay algo más en lo que pueda ayudarte?`;
        let existenTiendas = false;
        return [reply, existenTiendas]
    }
}

async function consultarHorarioTiendaEspecifica(sender, responseText, nombreTienda, comuna) {
    nombreTienda = nombreTienda.replace(/(^|\s)\S/g, l => l.toUpperCase());
    comuna = comuna.replace(/(^|\s)\S/g, l => l.toUpperCase());
    await send.sendTextMessage(sender, 'Ok, dame un momento para consultar los horarios...');
    try {
        let resp =  await axios.get(URL_API + '/sucursal', {
            params: {
                comuna: comuna,
                nombre: nombreTienda
            }
        });

        return resp.data;
    } catch (error) {
        let reply = 'Disculpa, pero en estos momentos no es posible revisar los horarios.';
        console.error(error);
        send.sendTextMessage(sender, reply);
        return null;
    }
}

module.exports = {
    responderCantidadSucursal,
    consultarHorarioTiendaEspecifica
}