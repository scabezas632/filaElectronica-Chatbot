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
        let comuna = JSON.parse(body);
        let termino = false;
        let contador = 0;
        while (!termino) {
            if (['results'][0]['address_components'][contador]['types'][0] === 'administrative_area_level_3') {
                comuna = ['results'][0]['address_components'][contador]['long_name'];
                termino = true;
            }
        }
        return comuna;
    });
}

module.exports = {
    obtenerComuna
}