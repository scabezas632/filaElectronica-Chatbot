const axios = require('axios');
const URL_API = require('../config/config').URL_API;

// Verificar si se tiene el registro del rut en el usuario
// si no, preguntar por el rut.
// Si el rut pertenece a algún cliente registrado, guardarlo en la tabla de usuario
// Sino, preguntar si desea registrarse. Si lo desea, se pregunta el correo

async function verifyClientExists(rut) {
    try {
        let response =  await axios.get('http://' + URL_API + '/cliente', {
            params:{
                rut
            }
        });
        // Si existe el chat con idFacebook
        if (response.data.length>0) return true;
        return false;
    } catch (error) {
        console.error(error)
    }
}

async function fetchClient(idFacebook) {
    try {
        let response =  await axios.get('http://' + URL_API + '/cliente', {
            params:{
                idFacebook
            }
        });
        // Si existe el chat con idFacebook
        if (response.data.length>0) return reponse.data.clientes[0];
        return false;
    } catch (error) {
        console.error(error)
    }
}

async function createClient(nombre, rut, email){

    let body =  {
        nombre,
        rut,
        email
    }

    try {
        let response =  await axios.post('http://' + URL_API + '/cliente/', body);
        // Si existe el chat con idFacebook
        if (response.data.length>0) return true;
        return false;
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    createClient,
    verifyClientExists,
    fetchClient
}