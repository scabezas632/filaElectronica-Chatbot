//========================================
// HORARIO
//========================================
const axios = require("axios");
const URL_API = require("../config/config").URL_API;
const send = require("./send");
const turnoUtils = require("../utils/turno");
const { ESTIMATED_TIME } = require("../utils/const");
const consultaSucursal = require("../utils/querySucursal")
  .responderCantidadSucursal;

// Utils
const validaRut = require("../utils/validaRut");

// API Request
const usuarioDB = require("../requestAPI/usuarios");
const clienteDB = require("../requestAPI/clientes");

const quickReplyFunctions = [
  {
    content_type: "text",
    title: "Pedir Turno",
    payload: "Pedir Turno"
  },
  {
    content_type: "text",
    title: "Dame el horario",
    payload: "Dame el horario"
  },
  {
    content_type: "text",
    title: "Dame las ofertas",
    payload: "Dame las ofertas"
  }
];

const quickReplyConfirmation = [
  {
    content_type: "text",
    title: "Si",
    payload: "Si"
  },
  {
    content_type: "text",
    title: "No",
    payload: "No"
  }
];

async function verificarComuna(sender, responseText, parameters) {
  if (parameters.hasOwnProperty("comuna") && parameters["comuna"] != "") {
    try {
      let resp = await axios.get(URL_API + "/sucursal", {
        params: {
          comuna: parameters["comuna"]
        }
      });
      let reply;
      let quickReplies = [];
      let existenTiendas = true;
      let responseConsultaSucursal;

      let sucursal = resp.data;
      if (sucursal.hasOwnProperty("sucursales") && sucursal.length == 1) {
        return mostrarTiempoEspera(sender);
      } else {
        responseConsultaSucursal = consultaSucursal(
          sucursal,
          parameters["comuna"]
        );
        reply = responseConsultaSucursal[0];
        if (responseConsultaSucursal[1]) {
          quickReplies = responseConsultaSucursal[1];
        } else {
          existenTiendas = responseConsultaSucursal[1];
        }
      }

      // Comprobar si se envían quickReplys
      if (quickReplies.length == 0 && existenTiendas) {
        send.sendQuickReply(sender, reply, quickReplyConfirmation);
        return ["pedirTurno_waitConfirmation", undefined, reply];
      } else if (!existenTiendas) {
        send.sendQuickReply(sender, reply, quickReplyFunctions);
        return ["closing", undefined, reply];
      } else {
        send.sendQuickReply(sender, reply, quickReplies);
        return ["pedirTurno_moreThanOneStore", parameters["comuna"], reply];
      }
    } catch (error) {
      reply =
        "Disculpa, pero en estos momentos no es posible revisar los horarios.";
      console.error(error);
      send.sendTextMessage(sender, reply);
    }
  } else {
    // Cuando el usuario no manda todos los parametros necesarios
    const quickReplyContentLocation = [
      {
        content_type: "location"
      }
    ];
    send.sendQuickReply(sender, responseText, quickReplyContentLocation);
    return ["pedirTurno_pedirComuna", undefined, responseText];
  }
}

async function consultarPorTiendaEspecifica(
  sender,
  responseText,
  nombreTienda,
  comuna
) {
  nombreTienda = nombreTienda.replace(/(^|\s)\S/g, l => l.toUpperCase());
  comuna = comuna.replace(/(^|\s)\S/g, l => l.toUpperCase());
  return mostrarTiempoEspera(sender);
}

async function mostrarTiempoEspera(sender) {
  const positionsData = await turnoUtils.getPositionData(sender);
  const numFila =
    positionsData.actualClientes - positionsData.actualCaja >= 0
      ? positionsData.actualClientes - positionsData.actualCaja
      : 0;
  // Obtener el tiempo estimado
  const estimateTime = ESTIMATED_TIME[numFila]
    ? ESTIMATED_TIME[numFila].time
    : ESTIMATED_TIME[10].time;

  let reply = "";
  if (numFila === 0) {
    reply = `¡Es tu día de suerte!. La caja está libre para ti. ¿Deseas ir a la caja ahora?`;
  } else {
    reply = `Ok, hay ${numFila} ${
      numFila > 1 ? "personas" : "persona"
    } antes de ti y el tiempo de espera estimado es de ${estimateTime.toFixed(
      0
    )} minutos. ¿Aceptas esperar?`;
  }
  send.sendQuickReply(sender, reply, quickReplyConfirmation);
  return ["pedirTurno_waitConfirmation", undefined, reply];
}

async function confirmarTurno(sender, userQuestion, params) {
  try {
    if (userQuestion.toUpperCase() === "SI") {
      const positionsData = await turnoUtils.getPositionData(sender);
      reply = `Ok, tu turno es el ${positionsData.actualClientes +
        1}, te esperamos en la caja de clientes`;
      turnoUtils.incrementCounterPosition(
        "CLIENTE",
        positionsData.actualClientes + 1
      );
      turnoUtils.savePositionUser(
        sender,
        "POSITION",
        positionsData.actualClientes + 1
      );
      await send.sendTextMessage(sender, reply);
      //CONDICIONAL, SI HAY MAS DE DOS PERSONAS EN LA LISTA
      // setTimeout(() => {
      if (positionsData.actualClientes - positionsData.actualCaja >= 2) {
        send.sendQuickReply(
          sender,
          `¿Deseas que te avise cuando queden 2 personas antes de ti?`,
          quickReplyConfirmation
        );
        return ["pedirTurno_waitConfirmationNotification", undefined, reply];
      } else {
        reply = "Si necesitas de mi ayuda nuevamente, dimelo.";
        send.sendQuickReply(sender, reply, quickReplyFunctions);
        return ["closing", undefined, reply];
      }
      // }, 500)
    } else if (userQuestion.toUpperCase() === "NO") {
      reply =
        "Ok, gracias por responder. Si necesitas de mi ayuda nuevamente, dimelo.";
      send.sendQuickReply(sender, reply, quickReplyFunctions);
      return ["closing", undefined, reply];
    } else {
      reply = `Por favor, dime 'Si' o 'No'.`;
      send.sendQuickReply(sender, reply, quickReplyConfirmation);
      return ["pedirTurno_waitConfirmation", undefined, reply];
    }
  } catch (error) {
    reply =
      "Disculpa, pero en estos momentos no es posible atender a tu respuesta.";
    console.error(error);
    send.sendTextMessage(sender, reply);
    return ["error", undefined, reply];
  }
}

async function confirmNotification(sender, userQuestion, params) {
  try {
    if (userQuestion.toUpperCase() === "SI") {
      console.log("paso");
      turnoUtils.savePositionUser(sender, "NOTIFICATION", true);
      reply =
        "Ok, te avisaré cuando queden 2 personas. Si necesitas de mi ayuda nuevamente, dimelo.";
      send.sendQuickReply(sender, reply, quickReplyFunctions);
    } else if (userQuestion.toUpperCase() === "NO") {
      reply =
        "Ok, gracias por responder. Si necesitas de mi ayuda nuevamente, dimelo.";
      send.sendQuickReply(sender, reply, quickReplyConfirmation);
    } else {
      reply = `Por favor, dime 'Si' o 'No'.`;
      send.sendQuickReply(sender, reply, quickReplyConfirmation);
      return ["pedirTurno_waitConfirmationNotification", undefined, reply];
    }
    return ["closing", undefined, reply];
  } catch (error) {
    reply =
      "Disculpa, pero en estos momentos no es posible atender a tu respuesta.";
    console.error(error);
    send.sendTextMessage(sender, reply);
    return ["error", undefined, reply];
  }
}

module.exports = {
  verificarComuna,
  consultarPorTiendaEspecifica,
  mostrarTiempoEspera,
  confirmarTurno,
  confirmNotification
};
