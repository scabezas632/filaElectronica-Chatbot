const axios = require('axios');

// Verificar si se tiene el registro del rut en el usuario
// si no, preguntar por el rut.
// Si el rut pertenece a algún cliente registrado, guardarlo en la tabla de usuario
// Sino, preguntar si desea registrarse. Si lo desea, se pregunta el correo

export function createClient(nombre, rut, email){
    axios.post('/cliente', {
        nombre,
        rut,
        email
      })
      .then(function (response) {
        console.log(response);
      })
      .catch(function (error) {
        console.log(error);
      });
}

export function verifyUserExists(rut) {
  axios.post('/cliente', {
    params: {
      rut
    }
  })
  .then(function (response) {
    // Si existe un cliente con el rut
    if (response.length>0) return true;
    return false;
  })
  .catch(function (error) {
    console.error(error);
  });
}