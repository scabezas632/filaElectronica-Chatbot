const axios = require('axios');
const URL_API = require('../config/config').URL_API;

// Verificar si se tiene el registro del rut en el usuario
// si no, preguntar por el rut.
// Si el rut pertenece a algún cliente registrado, guardarlo en la tabla de usuario
// Sino, preguntar si desea registrarse. Si lo desea, se pregunta el correo

async function verifyUserExist(idFacebook, nombre) {
    try {
        let response =  await axios.get('http://' + URL_API + '/usuario/' + idFacebook);
        // Si existe el usuario
        if (response.data.length===0) {
            createUser(nombre, idFacebook);
            return false;
        }
        return true;
    } catch (error) {
        console.error(error)
    }
}

async function verifyUserIsClient(idFacebook) {
    try {
        let response =  await axios.get('http://' + URL_API + '/usuario/' + idFacebook);
        // Si existe el usuario
        if (response.data.length>0) {
            if(response.data.usuario.rut) return true;
            return false;
        };
        return 'USER_NOT_EXIST';
    } catch (error) {
        console.error(error)
    }
}

async function createUser(nombre, idFacebook){
    let body =  {
        nombre,
        idFacebook,
        estado: false
    }

    try {
        response = await axios.post('http://' + URL_API + '/usuario/', body);
        return response.data.ok;
    } catch (error) {
        console.error(error)
    }
}

async function registerUserAsClient(idFacebook, rut, email, feNaci){
    let body =  {
        rut,
        email,
        feNaci
    }

    try {
        response = await axios.put('http://' + URL_API + '/usuario/' + idFacebook, body);
        return response.data.ok;
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    verifyUserExist,
    verifyUserIsClient,
    createUser,
    registerUserAsClient
}