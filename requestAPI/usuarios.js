const axios = require('axios');

export async function createUser(
    nombre,
    rut,
    email,
    feNaci,
    idFacebook,
    estado=true
){
    let existeUsuario = await verifyUserExist(idFacebook);
    if(existeUsuario) return;
    axios.post('/usuario', {
        nombre,
        rut,
        email,
        feNaci,
        idFacebook,
        estado
      })
      .then(function (response) {
        console.log('Usuario Creado con idFacebook:', idFacebook);
      })
      .catch(function (error) {
        console.error(error);
      });
}

export function verifyUserExist(idFacebook) {
    axios.get('/usuario', {
      params: {
        idFacebook
      }
    })
    .then(function (response) {
      // Si existe un usuario con el id de facebook
      if (response.length>0) return true;
      return false;
    })
    .catch(function (error) {
      console.error(error);
    });
}

export function getUsuarioByID()