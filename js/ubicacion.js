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
        return comuna['results']['address_components'][2]['long_name'];
    });
}

module.exports = {
    obtenerComuna
}