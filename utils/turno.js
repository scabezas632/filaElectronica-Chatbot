const axios = require('axios');
const URL_API = require('../config/config').URL_API;
const send = require('../js/send');

async function getNextPosition(sender) {
    try {
        let resp = await axios.get(URL_API + '/turno');
        return resp.data.turno.actualClientes + 1;
    } catch (error) {
        console.log(error.response);
        let reply = 'Al parecer hubo un error al intertar reservar, por favor, intenta otra vez'
        send.sendTextMessage(sender, reply);
    }
}

async function savePositionUser(facebookId, sendNotification) {
    try {
        const position = await getNextPosition(facebookId);
        const body = {
            position,
            notification: sendNotification,
        }
        let resp = await axios.put(URL_API + '/turno/' + facebookId, body);
        return position;
    } catch (error) {
        console.log(error);
        send.sendTextMessage(facebookId, 'Tuve problemas al realizar la reserva, por favor, intenta en unos minutos');
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
        console.log(error);
    }
}

module.exports = {
    getNextPosition,
    savePositionUser,
    sendMessageToAllUser
}