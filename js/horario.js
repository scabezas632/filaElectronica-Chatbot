//========================================
// HORARIO 
//========================================
const request = require('request');
const send = require('./js/send');

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
            if (!err && resp.statusCode == 200) {
                let sucursal = JSON.parse(body);
                if (sucursal.hasOwnProperty('sucursales') && sucursal.length == 1) {
                    reply = `${responseText}\n` +
                        `${sucursal.sucursales[0]['horario']['semana']}\n` +
                        `${sucursal.sucursales[0]['horario']['domingo']}`
                } else if (sucursal.hasOwnProperty('sucursales') && sucursal.length > 1) {
                    reply = `Tenemos ${sucursal.length} sucursales en ${parameters['comuna']},` +
                        `¿Cuál es la sucursal que necesitas?`;
                } else {
                    reply = `Disculpa pero no tenemos sucursales en ${parameters['comuna']}`;
                }
            } else {
                reply = 'Disculpa, pero en estos momentos no es posible revisar los horarios.';
                console.error(err);
            }
            send.sendTextMessage(sender, reply);
        });
    } else {
        send.sendTextMessage(sender, responseText);
    }
}

module.exports = {
    consultarHorario
}