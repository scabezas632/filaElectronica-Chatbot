const fetchHorarioTienda = require('../js/horario').consultarHorarioTiendaEspecifica;

// optionally store this in a database
const users = {}

// an object of state constants
const states = {
    pedirHorario_moreThanOneStore: 'moreThanOneStore',
    pedirHorario_sendSchedule: 'sendSchedule',
    closing: 'closing'
}

// mapping of each to state to the message associated with each state
const messages = {
    [states.pedirHorario_moreThanOneStore]: fetchHorarioTienda,
    [states.closing]: null,
}

// mapping of each state to the next state
const nextStates = {
    [states.pedirHorario_moreThanOneStore]: states.pedirHorario_sendSchedule,
    [states.pedirHorario_sendSchedule]: states.closing,
}

const receivedMessage = (event) => {
    // keep track of each user by their senderId
    const senderId = event.sender.id
    if (!users[senderId].currentState){
        // set the initial state
        users[senderId].currentState = states.question1
    } else {
        // store the answer and update the state
        users[senderId][users[senderId].state] = event.message.text
        users[senderId].state = nextStates[users[senderId.state]]
    }
    // send a message to the user via the Messenger API
    sendTextMessage(senderId, messages[users[senderId].state])
}