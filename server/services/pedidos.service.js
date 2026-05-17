import db from "../config/db.js";
import { cambiarEstadoMesa } from "./mesas.service.js";

const generarNumeroPedido = async (connection) => {
  const [[{ anio }]] = await connection.query(
    "SELECT YEAR(CURRENT_DATE()) AS anio"
  );

  const lockName = `pedidos_correlativo_${anio}`;
  const [[lockResult]] = await connection.query(
    "SELECT GET_LOCK(?, 10) AS lock_obtenido",
    [lockName]
  );

  if (lockResult.lock_obtenido !== 1) {
    throw Object.assign(
      new Error("No se pudo generar el correlativo del pedido"),
      { status: 500 }
    );
  }

  const [[{ ultimo }]] = await connection.query(
    `
      SELECT COALESCE(MAX(CAST(SUBSTRING(pedido_numero, 10) AS UNSIGNED)), 0) AS ultimo
      FROM pedidos
      WHERE pedido_numero LIKE ?
    `,
    [`PED-${anio}-%`]
  );

  return {
    lockName,
    pedidoNumero: `PED-${anio}-${String(Number(ultimo) + 1).padStart(4, "0")}`
  };
};

// Crear pedido (numero correlativo, fecha y hora actual, estado "Pendiente")
export const crearPedido = async ({ id_mesa, tipo, userId, items }) => {
  if (tipo !== "Salon" && tipo !== "Llevar") {
    throw Object.assign(
      new Error("Tipo de pedido invalido"),
      { status: 400 }
    );
  }

  let connection;
  let lockName;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const correlativo = await generarNumeroPedido(connection);
    lockName = correlativo.lockName;
    const pedidoNumero = correlativo.pedidoNumero;
    const mesaPedido = tipo === "Salon" ? id_mesa : null;

    const [result] = await connection.query(
      `
        INSERT INTO pedidos
        (pedido_numero, id_mesa, id_mesero, pedido_tipo, pedido_estado, pedido_observaciones)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [pedidoNumero, mesaPedido, userId, tipo, "Pendiente", null]
    );

    const id_pedido = result.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        const [platillo] = await connection.query(
          "SELECT platillo_precio FROM platillos WHERE id_platillo = ?",
          [item.id_platillo]
        );

        if (platillo.length > 0) {
          const precio_unitario = platillo[0].platillo_precio;
          const subtotal = precio_unitario * item.cantidad;

          await connection.query(
            `
              INSERT INTO detalle_pedido
              (id_pedido, id_platillo, detalle_pedido_cantidad, detalle_pedido_precio_unitario, detalle_pedido_subtotal, detalle_pedido_notas)
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              id_pedido,
              item.id_platillo,
              item.cantidad,
              precio_unitario,
              subtotal,
              item.notas
            ]
          );
        }
      }

      await connection.query(
        `
          UPDATE pedidos
          SET pedido_total = (SELECT SUM(detalle_pedido_subtotal) FROM detalle_pedido WHERE id_pedido = ?)
          WHERE id_pedido = ?
        `,
        [id_pedido, id_pedido]
      );
    }

    await connection.commit();

    return {
      id_pedido,
      pedido_numero: pedidoNumero,
      pedido_estado: "Pendiente",
      pedido_tipo: tipo
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      if (lockName) {
        try {
          await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
        } catch (error) {
          console.error("No se pudo liberar el bloqueo del correlativo", error);
        }
      }
      connection.release();
    }
  }
};

export const agregarItemsPedido = async ({ id_pedido, items }) => {
  if (!id_pedido) {
    throw Object.assign(
      new Error("Debe enviar el id del pedido"),
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(
      new Error("Debe seleccionar al menos un platillo valido"),
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [pedido] = await connection.query(
      "SELECT id_pedido, pedido_estado FROM pedidos WHERE id_pedido = ? FOR UPDATE",
      [id_pedido]
    );

    if (pedido.length === 0) {
      throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
    }

    if (pedido[0].pedido_estado !== "Pendiente") {
      throw Object.assign(
        new Error("Solo se pueden modificar pedidos pendientes"),
        { status: 400 }
      );
    }

    for (const item of items) {
      const [platillo] = await connection.query(
        "SELECT platillo_precio FROM platillos WHERE id_platillo = ?",
        [item.id_platillo]
      );

      if (platillo.length > 0) {
        const precio_unitario = platillo[0].platillo_precio;
        const subtotal = precio_unitario * item.cantidad;

        await connection.query(
          `
            INSERT INTO detalle_pedido
            (id_pedido, id_platillo, detalle_pedido_cantidad, detalle_pedido_precio_unitario, detalle_pedido_subtotal, detalle_pedido_notas)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            id_pedido,
            item.id_platillo,
            item.cantidad,
            precio_unitario,
            subtotal,
            item.notas
          ]
        );
      }
    }

    await connection.query(
      `
        UPDATE pedidos
        SET pedido_total = (SELECT COALESCE(SUM(detalle_pedido_subtotal), 0) FROM detalle_pedido WHERE id_pedido = ?)
        WHERE id_pedido = ?
      `,
      [id_pedido, id_pedido]
    );

    await connection.commit();

    return {
      id_pedido,
      pedido_estado: "Pendiente",
      message: "Platillos agregados al pedido correctamente"
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Iniciar pedido
export const iniciarPedido = async ({ id_mesa, tipo, userId, items }) => {
  if (tipo !== "Salon" && tipo !== "Llevar") {
    throw Object.assign(
      new Error("Tipo de pedido invalido"),
      { status: 400 }
    );
  }

  // Pedido en salon
  if (tipo === "Salon") {
    if (!id_mesa) {
      throw Object.assign(
        new Error("Debe enviar id_mesa para pedido en salon"),
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
        new Error("La mesa no esta disponible"),
        { status: 400 }
      );
    }
  }

  const pedido = await crearPedido({ tipo, id_mesa, userId, items });

  if (tipo === "Salon") {
    await cambiarEstadoMesa(id_mesa, "Ocupada", userId);
  }

  return pedido;
};
