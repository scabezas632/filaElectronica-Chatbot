//========================================
// OFERTAS 
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
    "payload": 'Ver Horario'
}, {
    "content_type": "text",
    "title": 'Ver ofertas',
    "payload": 'Ver ofertas'
}]

function consultarOfertas(sender, responseText) {
    send.sendTextMessage(sender, 'Ok, dame un momento para consultar las ofertas...');
    request({
        url: 'https://filaelectronica-backend.herokuapp.com/oferta'
    }, function(err, resp, body) {
        if (!err && resp.statusCode == 200) {
            let oferta = JSON.parse(body);
            if (oferta.hasOwnProperty('ofertas') && oferta.length > 0) {
                let reply = `${responseText}\n`
                let contador = 0;
                for (let i = 0; i < oferta.length; i++) {
                    // Verificar validez de la oferta
                    if (ofertaIsValidate(oferta.ofertas[i])) {
                        let ahorro = oferta.ofertas[i]['producto']['precio'] - oferta.ofertas[i]['precioOferta'];
                        reply = `${reply}` +
                            `*Producto: ${oferta.ofertas[i]['producto']['nombre']}*\n` +
                            `Precio Normal: $${oferta.ofertas[i]['producto']['precio']}\n` +
                            `Precio Oferta: $${oferta.ofertas[i]['precioOferta']}\n` +
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
        } else {
            send.sendTextMessage(sender, 'Disculpa, pero en estos momentos no es posible revisar las ofertas');
            console.error(err);
        }
    });
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