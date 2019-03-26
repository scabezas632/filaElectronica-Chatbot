const axios = require('axios');
const URL_API = require('../config/config').URL_API;
const send = require('../js/send');

async function getPositionData(sender) {
    try {
        let resp = await axios.get(URL_API + '/turno');
        return resp.data.turnos;
    } catch (error) {
        console.log(error.response);
        let reply = 'Al parecer hubo un error al intertar reservar, por favor, intenta otra vez'
        send.sendTextMessage(sender, reply);
    }
}

async function savePositionUser(facebookId, type, value) {
    try {
        const body = {};
        if (type === 'POSITION') {
            body.posicion = value;
        } else if (type === 'NOTIFICATION') {
            body.notificacion = true;
        }
        await axios.put(URL_API + '/usuario/' + facebookId, body);
    } catch (error) {
        console.log(error.response);
        send.sendTextMessage(facebookId, 'Tuve problemas al realizar la reserva, por favor, intenta en unos minutos');
    }
}

async function incrementCounterPosition(type, value) {
    try {
        switch (type) {
            case 'CAJA':
                await axios.put(URL_API + '/turno/', {
                    actualCaja: value
                });
                sendMessageToAllUser(value);
                break;
            case 'CLIENTE':
                await axios.put(URL_API + '/turno/', {
                    actualClientes: value
                });
                break;
            default:
                console.log('No paso por ningun lado');
                break;
        }
    } catch (error) {
        console.log(error.response)
    }
}

async function sendMessageToAllUser(posicionActualCaja) {
    try {
        let resp = await axios.get(URL_API + '/usuario/notificacion', {
            params: {
                posicionActualCaja
            }
        });
        resp.data.usuarios.forEach(usuario => {
            let reply = '';
            if (usuario.posicion === posicionActualCaja) {
                reply = 'Ahora te atenderán, si no estás en al fila debes apurarte o perderás el cupo';
                send.sendTextMessage(usuario.idFacebook, reply);
            } else if (usuario.posicion === posicionActualCaja + 1) {
                reply = 'Sólo queda una persona antes de que te atiendan, si no estás en al fila debes apurarte o perderás el cupo';
                send.sendTextMessage(usuario.idFacebook, reply);
            } else if (usuario.posicion === posicionActualCaja + 2) {
                reply = 'Quedan dos personas antes de que te atiendan, si no estás en al fila debes apurarte o perderás el cupo';
                send.sendTextMessage(usuario.idFacebook, reply);
            }
        });
    } catch (error) {
        console.log(error.response);
    }
}

module.exports = {
    getPositionData,
    savePositionUser,
    sendMessageToAllUser,
    incrementCounterPosition
}