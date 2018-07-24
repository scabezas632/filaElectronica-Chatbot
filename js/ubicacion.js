'use strict';

const request = require('request');
const config = require('../config/config');
const send = require('./send');

function obtenerComuna(sender, location) {
    const lat = location.lat;
    const long = location.long;
    request({
        method: 'GET',
        url: 'https://maps.googleapis.com/maps/api/geocode/json',
        qs: {
            latlng: lat + ', ' + long,
            key: config.GMAPS_API_TOKEN
        }
    }, function(err, response, body) {
        if (err) {
            send.sendTextMessage(sender, 'Disculpa, pero en estos momentos no es posible revisar los horarios.');
            console.error(err);
        }
        let comunaJSON = JSON.parse(body);
        let comuna;
        const self = this;
        let contador = 0;
        while (true) {
            if (comunaJSON['results'][0]['address_components'][contador]['types'][0] === 'administrative_area_level_3') {
                comuna = comunaJSON['results'][0]['address_components'][contador]['long_name'];
                break;
            }
            contador++;
        }
        console.log("COMUNA1:", comuna);
    });
    console.log("COMUNA2:", self.comuna)
    return self.comuna;
}

module.exports = {
    obtenerComuna
}