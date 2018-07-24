'use strict';

const request = require('request');
const config = require('../config/config');
const send = require('./send');

function obtenerComuna(sender, location) {
    console.log(location);
    request({
        method: 'GET',
        url: 'https://maps.googleapis.com/maps/api/geocode/json',
        qs: {
            latlng: '28.385233, -81.563874',
            key: config.GMAPS_API_TOKEN
        }
    }, function(err, response, body) {
        if (err) {
            send.sendTextMessage(sender, 'Disculpa, pero en estos momentos no es posible revisar los horarios.');
            console.error(err);
        }
        console.log(body);
    });
}

module.exports = {
    obtenerComuna
}