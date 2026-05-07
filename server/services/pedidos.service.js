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

export const agregarPlatilloAPedido = async ({
  id_pedido,
  id_platillo,
  cantidad,
  detalle_pedido_notas
}) => {

  // Validar la cantidad
  if (!cantidad || cantidad < 1 || cantidad > 99) {
    throw Object.assign(
      new Error("La cantidad debe estar entre 1 y 99"),
      { status: 400 }
    );
  }

  // Validar el pedido
  const [pedidoRows] = await db.query(
    `SELECT pedido_estado
     FROM pedidos
     WHERE id_pedido = ?`,
    [id_pedido]
  );

  if (pedidoRows.length === 0) {
    throw Object.assign(
      new Error("Pedido no encontrado"),
      { status: 404 }
    );
  }

  const pedido = pedidoRows[0];

  // Validar que el pedido aún permita agregar platillos
  const estadosBloqueados = [
    "EnPreparacion",
    "Listo",
    "Entregado",
    "Cerrado",
    "Cancelado"
  ];

  if (estadosBloqueados.includes(pedido.pedido_estado)) {
    throw Object.assign(
      new Error("El pedido ya no permite agregar platillos"),
      { status: 400 }
    );
  }

  // Validar platillo
  const [platilloRows] = await db.query(
    `SELECT 
        platillo_precio,
        platillo_disponible
     FROM platillos
     WHERE id_platillo = ?`,
    [id_platillo]
  );

  if (platilloRows.length === 0) {
    throw Object.assign(
      new Error("Platillo no encontrado"),
      { status: 404 }
    );
  }

  const platillo = platilloRows[0];

  if (!platillo.platillo_disponible) {
    throw Object.assign(
      new Error("El platillo no está disponible"),
      { status: 400 }
    );
  }

  // Verificar si ya existe el platillo en el pedido
  // Verificar si ya existe el platillo en el pedido
const [detalleRows] = await db.query(
  `SELECT 
      id_detalle,
      detalle_pedido_cantidad
   FROM detalle_pedido
   WHERE id_pedido = ?
   AND id_platillo = ?
   AND (detalle_pedido_notas = ? OR (detalle_pedido_notas IS NULL AND ? IS NULL))`,
  [id_pedido, id_platillo, detalle_pedido_notas || null, detalle_pedido_notas || null]
);

  const precio = Number(platillo.platillo_precio);

  // En caso de ya existir el platillo, actualizar cantidad y subtotal
  if (detalleRows.length > 0) {
    const detalle = detalleRows[0];

    const nuevaCantidad = detalle.detalle_pedido_cantidad + cantidad;

    if (nuevaCantidad > 99) {
      throw Object.assign(new Error("La cantidad máxima permitida es 99"), {
        status: 400,
      });
    }

    const nuevoSubtotal = nuevaCantidad * precio;

    await db.query(
      `UPDATE detalle_pedido
       SET detalle_pedido_cantidad = ?,
           detalle_pedido_subtotal = ?
       WHERE id_detalle = ?`,
      [nuevaCantidad, nuevoSubtotal, detalle.id_detalle],
    );
  } else {
    // En caso de no existir, insertar nuevo detalle
    const subtotal = cantidad * precio;

    await db.query(
      `INSERT INTO detalle_pedido (
    id_pedido,
    id_platillo,
    detalle_pedido_cantidad,
    detalle_pedido_precio_unitario,
    detalle_pedido_subtotal,
    detalle_pedido_notas
  )
  VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_pedido,
        id_platillo,
        cantidad,
        precio,
        subtotal,
        detalle_pedido_notas || null,
      ],
    );
  }

  // Recalcular total del pedido
  const [totalRows] = await db.query(
    `SELECT 
        SUM(detalle_pedido_subtotal) AS total
     FROM detalle_pedido
     WHERE id_pedido = ?`,
    [id_pedido]
  );

  const total = totalRows[0].total || 0;

  // Actualizar total en pedidos
  await db.query(
    `UPDATE pedidos
     SET pedido_total = ?
     WHERE id_pedido = ?`,
    [total, id_pedido]
  );

  return {
    message: "Platillo agregado correctamente",
    pedido_total: total
  };
};