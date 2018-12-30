const axios = require('axios');
const URL_API = require('../config/config').URL_API;
const FB_PAGE_TOKEN = require('../config/config').FB_PAGE_TOKEN;

// Verificar si se tiene el registro del rut en el usuario
// si no, preguntar por el rut.
// Si el rut pertenece a algún cliente registrado, guardarlo en la tabla de usuario
// Sino, preguntar si desea registrarse. Si lo desea, se pregunta el correo

async function verifyUserExist(idFacebook) {
    try {
        let response =  await axios.get(URL_API + '/usuario/' + idFacebook);
        // Si existe el usuario
        if (response.data.length===0) {
            await createUser(idFacebook);
            return false;
        }
        return true;
    } catch (error) {
        console.error(error)
    }
}

async function verifyUserIsClient(idFacebook) {
    try {
        console.log(idFacebook)
        let response =  await axios.get(URL_API + '/usuario/' + idFacebook);
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

async function createUser(idFacebook){

    let userName = await getUserInfo(idFacebook);

    let body =  {
        nombre: userName,
        idFacebook,
        estado: true
    }

    try {
        response = await axios.post(URL_API + '/usuario', body);
        return response.data.ok;
    } catch (error) {
        console.error(error)
    }
}

async function getUserInfo(userId) {
    try {
        response = await axios.get('https://graph.facebook.com/v2.7/' + userId,{
            params: {
                access_token: FB_PAGE_TOKEN
            }
        });
        return `${response.data.first_name} ${response.data.last_name}`;
    } catch (error) {
        console.error(error)
    }
}

async function registerUserAsClient(idFacebook, rut){
    let body =  {
        rut
    }

    try {
        response = await axios.put(URL_API + '/usuario/' + idFacebook, body);
        return response.data.ok;
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    verifyUserExist,
    verifyUserIsClient,
    createUser,
    registerUserAsClient,
    getUserInfo
}