import db from "../config/db.js";
import { cambiarEstadoMesa } from "./mesas.service.js";

 
// Crear pedido  (Numero correlativo , Fecha y hora actual, y estado "Pnediente")
export const crearPedido = async ({ id_mesa, tipo, userId, items }) => {

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

  const id_pedido = result.insertId;

  // Insertar detalles del pedido
  if (items && items.length > 0) {
    for (const item of items) {
      // Obtener el precio actual del platillo
      const [platillo] = await db.query(
        "SELECT platillo_precio FROM platillos WHERE id_platillo = ?",
        [item.id_platillo]
      );

      if (platillo.length > 0) {
        const precio_unitario = platillo[0].platillo_precio;
        const subtotal = precio_unitario * item.cantidad;

        await db.query(`
          INSERT INTO detalle_pedido 
          (id_pedido, id_platillo, detalle_pedido_cantidad, detalle_pedido_precio_unitario, detalle_pedido_subtotal, detalle_pedido_notas)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [id_pedido, item.id_platillo, item.cantidad, precio_unitario, subtotal, item.notas]);
      }
    }

    // Actualizar el total del pedido
    await db.query(`
      UPDATE pedidos 
      SET pedido_total = (SELECT SUM(detalle_pedido_subtotal) FROM detalle_pedido WHERE id_pedido = ?)
      WHERE id_pedido = ?
    `, [id_pedido, id_pedido]);
  }

    return {
      id_pedido: id_pedido,
      pedido_estado: "Pendiente",
      pedido_tipo: tipo
    };
  }; 


//Inciar pedido
export const iniciarPedido = async ({ id_mesa, tipo, userId, items }) => {

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
  const pedido = await crearPedido({ tipo, id_mesa, userId, items });

  // SOLO SI ES SALÓN → ocupar mesa
  if (tipo === "Salon") {
    await cambiarEstadoMesa(id_mesa, "Ocupada", userId);
  }

  return pedido;
};