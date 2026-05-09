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


export const eliminarPlatilloPedido = async (id_detalle) => {

  // Buscar detalle
  const [detalleRows] = await db.query(
    `SELECT id_pedido
     FROM detalle_pedido
     WHERE id_detalle = ?`,
    [id_detalle]
  );

  if (detalleRows.length === 0) {
    throw Object.assign(
      new Error("Detalle de pedido no encontrado"),
      { status: 404 }
    );
  }

  const detalle = detalleRows[0];

  // Obtener estado del pedido
  const [pedidoRows] = await db.query(
    `SELECT pedido_estado
     FROM pedidos
     WHERE id_pedido = ?`,
    [detalle.id_pedido]
  );

  if (pedidoRows.length === 0) {
    throw Object.assign(
      new Error("Pedido no encontrado"),
      { status: 404 }
    );
  }

  const pedido = pedidoRows[0];

  // Validar estado
  if (pedido.pedido_estado !== "Pendiente") {
    throw Object.assign(
      new Error(
        "No se pueden eliminar platillos de un pedido enviado a cocina"
      ),
      { status: 400 }
    );
  }

  // Eliminar detalle
  await db.query(
    `DELETE FROM detalle_pedido
     WHERE id_detalle = ?`,
    [id_detalle]
  );

  // Recalcular total
  const [totalRows] = await db.query(
    `SELECT 
        SUM(detalle_pedido_subtotal) AS total
     FROM detalle_pedido
     WHERE id_pedido = ?`,
    [detalle.id_pedido]
  );

  const total = totalRows[0].total || 0;

  // Actualizar pedido
  await db.query(
    `UPDATE pedidos
     SET pedido_total = ?
     WHERE id_pedido = ?`,
    [total, detalle.id_pedido]
  );

  return {
    message: "Platillo eliminado correctamente",
    pedido_total: total
  };
}

export const modificarCantidadPlatillo = async ({ id_detalle, cantidad }) => {
  // Validar que cantidad sea un número válido
  const cantidadNum = Number(cantidad);

  if (isNaN(cantidadNum)) {
    throw Object.assign(new Error("La cantidad debe ser un número válido"), {
      status: 400,
    });
  }

  // Validar cantidad
  if (cantidadNum < 1 || cantidadNum > 99) {
    throw Object.assign(new Error("La cantidad debe estar entre 1 y 99"), {
      status: 400,
    });
  }

  // Buscar detalle
  const [detalleRows] = await db.query(
    `SELECT
        id_pedido,
        detalle_pedido_precio_unitario
     FROM detalle_pedido
     WHERE id_detalle = ?`,
    [id_detalle],
  );

  if (detalleRows.length === 0) {
    throw Object.assign(new Error("Detalle no encontrado"), { status: 404 });
  }

  const detalle = detalleRows[0];

  // Validar pedido
  const [pedidoRows] = await db.query(
    `SELECT pedido_estado
     FROM pedidos
     WHERE id_pedido = ?`,
    [detalle.id_pedido],
  );

  if (pedidoRows.length === 0) {
    throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
  }

  if (pedidoRows[0].pedido_estado !== "Pendiente") {
    throw Object.assign(new Error("El pedido no se puede modificar"), {
      status: 400,
    });
  }

  // Nuevo subtotal
  const subtotal = detalle.detalle_pedido_precio_unitario * cantidadNum;

  // Actualizar detalle
  await db.query(
    `UPDATE detalle_pedido
     SET
        detalle_pedido_cantidad = ?,
        detalle_pedido_subtotal = ?
     WHERE id_detalle = ?`,
    [cantidadNum, subtotal, id_detalle],
  );

  // Recalcular total
  const [totalRows] = await db.query(
    `SELECT
      SUM(detalle_pedido_subtotal) AS total
   FROM detalle_pedido
   WHERE id_pedido = ?`,
    [detalle.id_pedido],
  );

  // Convertir el total a número con 2 decimales
  const total = Number(totalRows[0].total) || 0;
  const totalFormateado = parseFloat(total.toFixed(2));

  // Actualizar pedido
  await db.query(
    `UPDATE pedidos
   SET pedido_total = ?
   WHERE id_pedido = ?`,
    [totalFormateado, detalle.id_pedido],
  );

  return {
    message: "Cantidad actualizada correctamente",
    pedido_total: totalFormateado,
  };
};

//Ver pedidos activos del mesero
export const obtenerPedidosActivosMesero = async (id_mesero) => {

  const [rows] = await db.query(
    `SELECT
        p.id_pedido,
        p.pedido_tipo,
        p.pedido_estado,
        p.pedido_total,
        p.pedido_fecha_hora,
        m.mesa_numero
     FROM pedidos p
     LEFT JOIN mesas m
        ON p.id_mesa = m.id_mesa
     WHERE p.id_mesero = ?
       AND p.pedido_estado NOT IN ('Facturado', 'Anulado')
     ORDER BY p.pedido_fecha_hora DESC`,
    [id_mesero]
  );

  return rows;
};

// Cancelar pedido
export const cancelarPedido = async (id_pedido, motivo, userId) => {

  // Buscar pedido
  const [pedidoRows] = await db.query(
    `SELECT
        id_mesa,
        pedido_tipo,
        pedido_estado
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

  // No permitir facturados
  if (pedido.pedido_estado === "Cerrado") {
    throw Object.assign(
      new Error("No se puede cancelar un pedido facturado"),
      { status: 400 }
    );
  }

  // Evitar doble cancelación
  if (pedido.pedido_estado === "Cancelado") {
    throw Object.assign(
      new Error("El pedido ya fue cancelado anteriormente"),
      { status: 400 }
    );
  }

  // Guardar estado anterior
  const estadoAnterior = pedido.pedido_estado;

  // Cancelar pedido
  await db.query(
    `UPDATE pedidos
     SET
       pedido_estado = 'Cancelado',
       pedido_cancelado_motivo = ?,
       pedido_cancelado_en = NOW(),
       pedido_cancelado_por = ?,
       pedido_estado_anterior = ?
     WHERE id_pedido = ?`,
    [
      motivo || null,
      userId,
      estadoAnterior,
      id_pedido
    ]
  );

  // Liberar mesa si era salón
  if (
    pedido.pedido_tipo === "Salon"
    && pedido.id_mesa
  ) {

    await cambiarEstadoMesa(
      pedido.id_mesa,
      "Disponible",
      userId
    );
  }

  return {
    message: "Pedido cancelado correctamente"
  };

};

// Marcar pedido como entregado
export const marcarPedidoEntregado = async (id_pedido, userId) => {

  const [rows] = await db.query(`
    SELECT pedido_estado, id_mesa
    FROM pedidos
    WHERE id_pedido = ? AND id_mesero = ?
  `, [id_pedido, userId]);

  if (rows.length === 0) {
    throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
  }

  const pedido = rows[0];

  // VALIDACIÓN CLAVE
  if (pedido.pedido_estado !== "Listo") {
    throw Object.assign(
      new Error("Solo pedidos en estado 'Listo' pueden entregarse"),
      { status: 400 }
    );
  }

  // CAMBIO DE ESTADO
  await db.query(`
    UPDATE pedidos
    SET 
      pedido_estado = 'Entregado',
      pedido_entregado_en = NOW()
    WHERE id_pedido = ?
  `, [id_pedido]);

  // liberar mesa si aplica
  if (pedido.id_mesa) {
    await cambiarEstadoMesa(pedido.id_mesa, "Disponible", userId);
  }

  return {
    message: "Pedido entregado correctamente"
  };
};


// Obtener detalle completo de un pedido
export const obtenerDetallePedido = async (id_pedido) => {

  // Datos generales del pedido
  const [pedidoRows] = await db.query(`
    SELECT 
      p.id_pedido,
      p.pedido_estado,
      p.pedido_tipo,
      p.pedido_total,
      p.pedido_fecha_hora,
      p.pedido_enviado_cocina_en,
      p.pedido_listo_en,
      p.pedido_entregado_en,
      p.pedido_cancelado_en,
      p.pedido_cancelado_motivo,
      m.mesa_numero
    FROM pedidos p
    LEFT JOIN mesas m ON p.id_mesa = m.id_mesa
    WHERE p.id_pedido = ?
  `, [id_pedido]);

  if (pedidoRows.length === 0) {
    throw Object.assign(
      new Error("Pedido no encontrado"),
      { status: 404 }
    );
  }

  const pedido = pedidoRows[0];

  //  Platillos del pedido
  const [detalleRows] = await db.query(`
    SELECT 
      dp.id_detalle,
      dp.detalle_pedido_cantidad,
      dp.detalle_pedido_precio_unitario,
      dp.detalle_pedido_subtotal,
      dp.detalle_pedido_notas,
      pl.platillo_nombre
    FROM detalle_pedido dp
    JOIN platillos pl ON dp.id_platillo = pl.id_platillo
    WHERE dp.id_pedido = ?
  `, [id_pedido]);

  // Armar respuesta completa
  return {
    ...pedido,
    platillos: detalleRows
  };
};