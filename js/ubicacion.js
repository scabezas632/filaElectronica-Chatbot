'use strict';

const axios = require('axios');
const config = require('../config/config');
const send = require('./send');
const apiai = require('./apiai');

function queryGoogleMaps(coords) {
    const lat = coords.lat;
    const long = coords.long;
    return axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
            latlng: lat + ', ' + long,
            key: config.GMAPS_API_TOKEN
        }
    });
}

// OBTENER COMUNA DESDE LA UBICACION ENTREGADA POR EL USUARIO
function obtenerComuna(sender, sessionIds, coords) {
    let comuna;
    queryGoogleMaps(coords)
        .then(resp => {
            let location = resp.data.results[0];
            let contador = 0;
            while (true) {
                if (location['address_components'][contador]['types'][0] === 'administrative_area_level_3') {
                    comuna = location['address_components'][contador]['long_name'];
                    break;
                }
                contador++;
            }
            apiai.sendToApiAi(sender, comuna, sessionIds);
        })
        .catch(err => {
            send.sendTextMessage(sender, 'Disculpa, pero en estos momentos no es posible revisar los horarios.');
            console.error(err);
        });
}

module.exports = {
    obtenerComuna
}