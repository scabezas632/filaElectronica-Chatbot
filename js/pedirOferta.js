//========================================
// OFERTAS 
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

async function consultarOfertas(sender, responseText, parameters) {
    await send.sendTextMessage(sender, 'Ok, dame un momento para consultar las ofertas...');
    try {
        let resp = await axios.get(URL_API + '/oferta');
        let reply;

        let ofertas = resp.data.ofertas;
        console.log(ofertas)
        if (ofertas.length > 0) {
            let reply = `${responseText}\n`
            let contador = 0;
            for (let i = 0; i < ofertas.length; i++) {
                // Verificar validez de la oferta
                if (ofertaIsValidate(ofertas[i])) {
                    let ahorro = ofertas[i]['producto']['precio'] - ofertas[i]['precioOferta'];
                    reply = `${reply}` +
                        `*Producto: ${ofertas[i]['producto']['nombre']}*\n` +
                        `Precio Normal: $${ofertas[i]['producto']['precio']}\n` +
                        `Precio Oferta: $${ofertas[i]['precioOferta']}\n` +
                        `Ahorro: $${ahorro}\n\n`;

                    // Aumentar contador de ofertas validas
                    contador++;
                }
            }
            if (contador != 0) {
                send.sendTextMessage(sender, reply);
            } else {
                reply = 'Disculpa pero no existen ofertas vigentes' +
                    '¿Hay algo más en lo que pueda ayudarte?';
                send.sendQuickReply(sender, reply, quickReplyFunctions);
            }
        } else {
            reply = 'Disculpa pero no existen ofertas vigentes' +
                '¿Hay algo más en lo que pueda ayudarte?';
            send.sendQuickReply(sender, reply, quickReplyFunctions);
        }
    } catch (error) {
        send.sendTextMessage(sender, 'Disculpa, pero en estos momentos no es posible revisar las ofertas');
        console.error(error);
    }
}

// Comparar fechas 
function ofertaIsValidate(oferta) {
    const desde = new Date(oferta['ofertaInicio']);
    const hasta = new Date(oferta['ofertaFin']);
    const today = new Date();
    if (today.getTime() > desde.getTime() && today.getTime() < hasta.getTime()) {
        return true;
    } else {
        return false;
    }
}

module.exports = {
    consultarOfertas
}