const axios = require('axios');
const URL_API = require('../config/config').URL_API;

async function sendMessageToDB(idFacebook, intent, state, mensaje, usuario) {

  // Si existe el chat, no se crea
  let existeChat = await existChat(idFacebook);

  let body = {
    idFacebook,
    intent,
    state: state[0] ? state[0] : null,
    mensaje,
    emisor: usuario,
    paramsProxMensaje: state[1] ? state[1] : null,
  }

  if (existeChat) {
    axios.post(URL_API + '/chat/send', body)
      .then(function (response) {
        console.log(`${usuario} envió un mensaje al chat ${idFacebook}`);
      })
      .catch(function (error) {
        console.error(error);
      });
  } else {
    axios.post(URL_API + '/chat', body)
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
    let response = await axios.get(URL_API + '/chat/' + idFacebook);
    // Si existe el chat con idFacebook
    if (response.data.length > 0) return true;
    return false;
  } catch (error) {
    console.error(error)
  }
}

async function getLastState(idFacebook) {
  try {
    let response = await axios.get(URL_API + '/chat/last/' + idFacebook);
    // Se obtiene el ultimo state registrado
    return {
      state: response.data.chats[0].state,
      paramsProxMensaje: response.data.chats[0].paramsProxMensaje
    };
  } catch (error) {
    console.error(error)
  }
}

module.exports = {
  sendMessageToDB,
  getLastState
}