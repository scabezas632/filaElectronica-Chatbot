'use strict';

// Necesarios para el chatbot
const config = require('./config/config');
const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const send = require('./js/send');
const receivedEvents = require('./js/receivedEvents');
var io = require('socket.io').listen(3001);

const turnoUtils = require('./utils/turno');

// Parametros para Messenger API
if (!config.FB_PAGE_TOKEN) {
    throw new Error('FB_PAGE_TOKEN no esta configurado');
}
if (!config.FB_VERIFY_TOKEN) {
    throw new Error('FB_VERIFY_TOKEN no esta configurado');
}
if (!config.API_AI_CLIENT_ACCESS_TOKEN) {
    throw new Error('API_AI_CLIENT_ACCESS_TOKEN no esta configurado');
}
if (!config.FB_APP_SECRET) {
    throw new Error('FB_APP_SECRET no esta configurado');
}
if (!config.SERVER_URL) { //used for ink to static files
    throw new Error('SERVER_URL no esta configurado');
}

app.set('port', (process.env.PORT || 5000))

// Verifica la respuesta de Facebook
app.use(bodyParser.json({
    verify: verifyRequestSignature
}));

// serve static files in the public directory
app.use(express.static('public'));

// Proceso de application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// Preceso de application/json
app.use(bodyParser.json())

const sessionIds = new Map();

// Index route
app.get('/', function (req, res) {
    res.send('Hola, soy el backend del chat bot Fila Electronica')
})

// Para la verificacion de Facebook
app.get('/webhook/', function (req, res) {
    console.log("request");
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Validación Fallida. Asegurese de que el token de verificación coincida correctamente.");
        res.sendStatus(403);
    }
})

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook/', function (req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function (messagingEvent) {
                if (messagingEvent.optin) {
                    receivedEvents.receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedEvents.receivedMessage(messagingEvent, sessionIds);
                } else if (messagingEvent.delivery) {
                    receivedEvents.receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedEvents.receivedPostback(messagingEvent);
                } else if (messagingEvent.read) {
                    receivedEvents.receivedMessageRead(messagingEvent);
                } else if (messagingEvent.account_linking) {
                    receivedEvents.receivedAccountLink(messagingEvent);
                } else {
                    console.log("El webhook recibió un messagingEvent desconocido: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        // You must send back a 200, within 20 seconds
        res.sendStatus(200);
    }
});

function greetUserText(userId) {
    // Se obtiene la información del usuario para saludar
    request({
        uri: 'https://graph.facebook.com/v2.7/' + userId,
        qs: {
            access_token: config.FB_PAGE_TOKEN
        }

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var user = JSON.parse(body);

            if (user.first_name) {
                console.log("Usuario de Facebook: %s %s, %s",
                    user.first_name, user.last_name, user.gender);

                send.sendTextMessage(userId, "¡Hola " + user.first_name + '!');
            } else {
                console.log("No se ha podido obtener la información del usuario con id",
                    userId);
            }
        } else {
            console.error(response.error);
        }

    });
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
        throw new Error('Couldn\'t validate the signature.');
    } else {
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];

        var expectedHash = crypto.createHmac('sha1', config.FB_APP_SECRET)
            .update(buf)
            .digest('hex');

        if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}

io.on('connection', function (socket) {
    console.log('connected:', socket.client.id);
    // socket.on('serverEvent', function (data) {
    //     console.log('new message from client:', data);
    // });
    socket.on('sendCounter', function (data) {
        // search all user with 'posicion' diferent of null and notification true
        // Send message in 
        turnoUtils.incrementCounterPosition('CAJA', Number(data))
        console.log('new message from client:', data);
    });
});

// Spin up the server
app.listen(app.get('port'), function () {
    console.log('running on port', app.get('port'))
});