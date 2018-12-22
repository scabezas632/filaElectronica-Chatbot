//========================================
// Verificar RUT 
//========================================
const request = require('request');
const send = require('./send');

function VerificarCliente(sender, responseText, parameters) {
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

function verificarIdFacebook(userId) {

    request({
        url: 'https://filaelectronica-backend.herokuapp.com/usuario',
        qs: {
            idFacebook: userId
        }
    }, function(err, resp, body) {
        let reply;
        let quickReplies = []
        let existenTiendas = true;

        if (!err && resp.statusCode == 200) {
            let usuario = JSON.parse(body);
            if (sucursal.hasOwnProperty('usuarios') && sucursal.length == 1) {
                reply = ''
            } else if (sucursal.hasOwnProperty('usuarios') && sucursal.length == 0) {
                reply = 'Antes, necesito saber si eres un cliente registrado. Por favor, escribe tu RUT.'
            }
        } else {
            reply = 'Disculpa, pero en estos momentos no es posible reservar un lugar en la fila.';
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

}

function obtenerUsuario(userId) {
    // Se obtiene la información del usuario
    request({
        uri: 'https://graph.facebook.com/v2.7/' + userId,
        qs: {
            access_token: config.FB_PAGE_TOKEN
        }

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {

            var user = JSON.parse(body);

            if (user.first_name) {
                // console.log("Usuario de Facebook: %s %s, %s",
                //     user.first_name, user.last_name, user.gender);
            } else {
                console.log("No se ha podido obtener la información del usuario con id",
                    userId);
            }
        } else {
            console.error(response.error);
        }

    });
}

function verificarRut() {

}


module.exports = {
    consultarHorario
}