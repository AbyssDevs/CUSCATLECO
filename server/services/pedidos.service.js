import db from "../config/db.js";
import { cambiarEstadoMesa } from "./mesas.service.js";

 
  // Crear pedido  (Numero correlativo , Fecha y hora actual, y estado "Pnediente")
const crearPedido = async ({ id_mesa, tipo, userId }) => {

    let result;

    if (tipo === "Salon") {

      [result] = await db.query(`
        INSERT INTO pedidos
        (id_mesa, id_mesero, pedido_tipo)
        VALUES (?, ?, ?)
        `, [
        id_mesa,
        userId,
        tipo
      ]);

  } else if (tipo === "Llevar") {

      [result] = await db.query(`
        INSERT INTO pedidos
        (id_mesa, id_mesero, pedido_tipo)
        VALUES (?, ?, ?)
      `, [
        null,
        userId,
        tipo
      ]);

  } else {
    throw new Error("Tipo de pedido inválido");
  }

    return {
      id_pedido: result.insertId,
      pedido_estado: "Pendiente",
      pedido_tipo: tipo
    };
  }; 


//Inciar pedido
export const iniciarPedido = async ({ id_mesa, tipo, userId }) => {

  if (tipo !== "Salon" && tipo !== "Llevar") {
   throw Object.assign(
     new Error("Tipo de pedido inválido"),
     { status: 400 }
   );
}

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
  const pedido = await crearPedido({ tipo, id_mesa, userId });

  // SOLO SI ES SALÓN → ocupar mesa
  if (tipo === "Salon") {
    await cambiarEstadoMesa(id_mesa, "Ocupada", userId);
  }

  return pedido;
};