//========================================
// HORARIO 
//========================================
const axios = require('axios');
const URL_API = require('../config/config').URL_API;
const send = require('./send');
const moment = require('moment');
moment.locale('ES'); 

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

async function consultarPrecio(sender, responseText, parameters) {
    if (parameters.hasOwnProperty('number') && parameters['number'] != '') {
        await send.sendTextMessage(sender, 'Ok, dame un momento para consultar los precios...');
        try {
            let respProducto =  await axios.get(URL_API + '/producto', {
                params: {
                    codigoBarra: parameters['number']
                }
            });
            let reply;
            let producto = respProducto.data.productos[0];
            let oferta;
            if(respProducto.data.length !== 0) {
                let respOferta =  await axios.get(URL_API + '/oferta', {
                    params: {
                        producto: respProducto.data.productos[0]._id
                    }
                });
                oferta = respOferta.data.ofertas[0];
            }
    
            if(producto && !oferta) {
                reply = `El producto ${producto.nombre} está a ${producto.precio}`;
                send.sendTextMessage(sender, reply);
                return ['closing', undefined, reply];
            } else if (oferta) {
                reply = `¡Buenas noticias!, tenemos el producto ${producto.nombre} en oferta.\n` +
                         `Actualmente está a ${oferta.precioOferta}, ahorrando un total de ${producto.precio - oferta.precioOferta}.\n` +
                         `Oferta válida hasta el ${moment(oferta.ofertaFin).format('DD [de] MMMM')}`
                send.sendTextMessage(sender, reply);
                return ['closing', undefined, reply];
            } else {
                reply = 'El código de barras que me dijiste no es válido, por favor verificalo y dimelo de nuevo.'
                send.sendTextMessage(sender, reply);
                return ['pedirPrecio_pedirCodigoBarra', undefined, reply];
            }
        } catch (error) {
            reply = 'Disculpa, pero en estos momentos no es posible revisar los precios.';
            console.error(error);
            send.sendTextMessage(sender, reply);
        }
    } else {
        // Cuando el usuario no manda todos los parametros necesarios
        send.sendTextMessage(sender, responseText);
        return ['pedirPrecio_pedirCodigoBarra', undefined, responseText]
    }
}

module.exports = {
    consultarPrecio
}