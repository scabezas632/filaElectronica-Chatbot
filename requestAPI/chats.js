const axios = require('axios');
const URL_API = require('../config/config').URL_API;

async function sendMessageToDB(idFacebook, intent, state, mensaje, usuario){

    // Si existe el chat, no se crea
    let existeChat = await existChat(idFacebook);

    let body =  {
        idFacebook,
        intent,
        state: state[0],
        mensaje,
        emisor: usuario,
        paramsProxMensaje: state[1]
    }

    if(existeChat) {
        axios.post('http://' + URL_API + '/chat/send', body)
          .then(function (response) {
            console.log(`${usuario} envió un mensaje al chat ${idFacebook}`);
          })
          .catch(function (error) {
            console.error(error);
          });
    } else {
        axios.post('http://' + URL_API + '/chat', body)
          .then(function (response) {
            console.log(`${usuario} envió un mensaje al chat ${idFacebook}`);
          })
          .catch(function (error) {
            console.error(error);
          });
    }
}

async function existChat(idFacebook) {
    try {
      let response =  await axios.get('http://' + URL_API + '/chat/' + idFacebook);
      // Si existe el chat con idFacebook
      if (response.data.length>0) return true;
      return false;
    } catch (error) {
      console.error(error)
    }
}

async function getLastState(idFacebook) {
    try {
        let response =  await axios.get('http://' + URL_API + '/chat/last/' + idFacebook);
            // Se obtiene el ultimo state registrado
            return {
                state: response.data.chats.state,
                paramsProxMensaje: response.data.chats.paramsProxMensaje
            };
    } catch (error) {
        console.error(error)
    }
      axios.get('http://' + URL_API + '/chat/last/' + idFacebook).then(response => {
          console.log(response);
      }).catch(error => console.error(error))
}

module.exports = {
  sendMessageToDB,
  getLastState
}