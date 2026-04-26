import db from "../config/db.js";
import { cambiarEstadoMesa } from "./mesas.service.js";

//Cambio de mesa a Ocupada al se crear un pedido.

//Esto es para ir avanzando con el servicio de pedidos, no es el código final, solo es un mock para probar la funcionalidad de cambio de estado de mesa al crear un pedido.
//Esto despues lo borras Stan, y creas el servicio de pedidos con toda la lógica necesaria. 
export const crearPedidoMock = async (data, userId) => {
    return{
        id_pedido: 2,
        estado: "Pendiente",
    }
}

export const iniciarPedido = async ({ id_mesa, tipo, userId }) => {

  // PEDIDO EN SALÓN
  if (tipo === "Salon") {
    if (!id_mesa) {
      throw Object.assign(
        new Error("Debe enviar id_mesa para pedido en salón"),
        { status: 400 }
      );
    }

    const [mesa] = await db.query(
      "SELECT mesa_estado FROM mesas WHERE id_mesa = ?",
      [id_mesa]
    );

    if (mesa.length === 0) {
      throw Object.assign(new Error("Mesa no encontrada"), { status: 404 });
    }

    if (mesa[0].mesa_estado !== "Disponible") {
      throw Object.assign(
        new Error("La mesa no está disponible"),
        { status: 400 }
      );
    }
  }

  // CREAR PEDIDO
  const pedido = await crearPedidoMock({}, userId);

  // SOLO SI ES SALÓN → ocupar mesa
  if (tipo === "Salon") {
    await cambiarEstadoMesa(id_mesa, "Ocupada", userId);
  }

  return pedido;
};