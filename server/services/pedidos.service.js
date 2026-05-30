import db from "../config/db.js";
import { cambiarEstadoMesa } from "./mesas.service.js";

// =====================================================
// GENERAR NUMERO DE PEDIDO
// =====================================================

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
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(pedido_numero, 10) AS UNSIGNED)),
        0
      ) AS ultimo
      FROM pedidos
      WHERE pedido_numero LIKE ?
    `,
    [`PED-${anio}-%`]
  );

  return {
    lockName,
    pedidoNumero: `PED-${anio}-${String(
      Number(ultimo) + 1
    ).padStart(4, "0")}`
  };

};

// =====================================================
// CREAR PEDIDO
// =====================================================

export const crearPedido = async ({
  id_mesa,
  tipo,
  userId,
  items
}) => {

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

    const mesaPedido =
      tipo === "Salon"
        ? id_mesa
        : null;

    const [result] = await connection.query(
      `
        INSERT INTO pedidos (
          pedido_numero,
          id_mesa,
          id_mesero,
          pedido_tipo,
          pedido_estado,
          pedido_observaciones
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        pedidoNumero,
        mesaPedido,
        userId,
        tipo,
        "Pendiente",
        null
      ]
    );

    const id_pedido = result.insertId;

    // =====================================================
    // INSERTAR ITEMS
    // =====================================================

    if (
      Array.isArray(items)
      && items.length > 0
    ) {

      for (const item of items) {

        const [platilloRows] = await connection.query(
          `
            SELECT
              platillo_precio,
              platillo_disponible
            FROM platillos
            WHERE id_platillo = ?
          `,
          [item.id_platillo]
        );

        if (platilloRows.length === 0) {
          throw Object.assign(
            new Error("Platillo no encontrado"),
            { status: 404 }
          );
        }

        const platillo = platilloRows[0];

        if (
          platillo.platillo_disponible === 0
          || platillo.platillo_disponible === false
        ) {
          throw Object.assign(
            new Error("Uno de los platillos no esta disponible"),
            { status: 400 }
          );
        }

        const cantidad = Number(item.cantidad);

        if (
          isNaN(cantidad)
          || cantidad < 1
          || cantidad > 99
        ) {
          throw Object.assign(
            new Error("Cantidad invalida"),
            { status: 400 }
          );
        }

        const precio_unitario = Number(
          platillo.platillo_precio
        );

        const subtotal =
          precio_unitario * cantidad;

        await connection.query(
          `
            INSERT INTO detalle_pedido (
              id_pedido,
              id_platillo,
              detalle_pedido_cantidad,
              detalle_pedido_precio_unitario,
              detalle_pedido_subtotal,
              detalle_pedido_notas
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            id_pedido,
            item.id_platillo,
            cantidad,
            precio_unitario,
            subtotal,
            item.notas || null
          ]
        );

      }

      // =====================================================
      // RECALCULAR TOTAL
      // =====================================================

      await connection.query(
        `
          UPDATE pedidos
          SET pedido_total = (
            SELECT COALESCE(
              SUM(detalle_pedido_subtotal),
              0
            )
            FROM detalle_pedido
            WHERE id_pedido = ?
          )
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
      pedido_tipo: tipo,
      mesa_estado:
        tipo === "Salon"
          ? "Ocupada"
          : null
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

          await connection.query(
            "SELECT RELEASE_LOCK(?)",
            [lockName]
          );

        } catch (error) {

          console.error(
            "No se pudo liberar el bloqueo del correlativo",
            error
          );

        }

      }

      connection.release();

    }

  }

};

// =====================================================
// AGREGAR ITEMS AL PEDIDO
// =====================================================

export const agregarItemsPedido = async ({
  id_pedido,
  items
}) => {

  if (!id_pedido) {
    throw Object.assign(
      new Error("Debe enviar el id del pedido"),
      { status: 400 }
    );
  }

  if (
    !Array.isArray(items)
    || items.length === 0
  ) {
    throw Object.assign(
      new Error("Debe seleccionar al menos un platillo valido"),
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {

    await connection.beginTransaction();

    const [pedidoRows] = await connection.query(
      `
        SELECT
          id_pedido,
          pedido_estado
        FROM pedidos
        WHERE id_pedido = ?
        FOR UPDATE
      `,
      [id_pedido]
    );

    if (pedidoRows.length === 0) {
      throw Object.assign(
        new Error("Pedido no encontrado"),
        { status: 404 }
      );
    }

    const pedido = pedidoRows[0];

    const estadosBloqueados = [
      "EnPreparacion",
      "Listo",
      "Entregado",
      "Cerrado",
      "Cancelado"
    ];

    if (
      estadosBloqueados.includes(
        pedido.pedido_estado
      )
    ) {
      throw Object.assign(
        new Error("El pedido ya no se puede modificar"),
        { status: 400 }
      );
    }

    // Eliminar todos los detalles existentes para reemplazarlos
    await connection.query(
      "DELETE FROM detalle_pedido WHERE id_pedido = ?",
      [id_pedido]
    );

    // =====================================================
    // INSERTAR ITEMS
    // =====================================================


    for (const item of items) {

      const [platilloRows] = await connection.query(
        `
          SELECT
            platillo_precio,
            platillo_disponible
          FROM platillos
          WHERE id_platillo = ?
        `,
        [item.id_platillo]
      );

      if (platilloRows.length === 0) {
        throw Object.assign(
          new Error("Platillo no encontrado"),
          { status: 404 }
        );
      }

      const platillo = platilloRows[0];

      if (
        platillo.platillo_disponible === 0
        || platillo.platillo_disponible === false
      ) {
        throw Object.assign(
          new Error("Uno de los platillos no esta disponible"),
          { status: 400 }
        );
      }

      const cantidad = Number(item.cantidad);

      if (
        isNaN(cantidad)
        || cantidad < 1
        || cantidad > 99
      ) {
        throw Object.assign(
          new Error("Cantidad invalida"),
          { status: 400 }
        );
      }

      const precio_unitario = Number(
        platillo.platillo_precio
      );

      const subtotal =
        precio_unitario * cantidad;

      await connection.query(
        `
          INSERT INTO detalle_pedido (
            id_pedido,
            id_platillo,
            detalle_pedido_cantidad,
            detalle_pedido_precio_unitario,
            detalle_pedido_subtotal,
            detalle_pedido_notas
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          id_pedido,
          item.id_platillo,
          cantidad,
          precio_unitario,
          subtotal,
          item.notas || null
        ]
      );

    }

    // =====================================================
    // RECALCULAR TOTAL
    // =====================================================

    await connection.query(
      `
        UPDATE pedidos
        SET pedido_total = (
          SELECT COALESCE(
            SUM(detalle_pedido_subtotal),
            0
          )
          FROM detalle_pedido
          WHERE id_pedido = ?
        )
        WHERE id_pedido = ?
      `,
      [id_pedido, id_pedido]
    );

    await connection.commit();

    return {
      id_pedido,
      pedido_estado: "Pendiente",
      message: "Platillos agregados correctamente"
    };

  } catch (error) {

    await connection.rollback();

    throw error;

  } finally {

    connection.release();

  }

};

// =====================================================
// INICIAR PEDIDO
// =====================================================

export const iniciarPedido = async ({
  id_mesa,
  tipo,
  userId,
  items
}) => {

  if (tipo !== "Salon" && tipo !== "Llevar") {
    throw Object.assign(
      new Error("Tipo de pedido invalido"),
      { status: 400 }
    );
  }

  if (tipo === "Salon") {

    if (!id_mesa) {
      throw Object.assign(
        new Error("Debe enviar id_mesa"),
        { status: 400 }
      );
    }

    const [mesaRows] = await db.query(
      `
        SELECT mesa_estado
        FROM mesas
        WHERE id_mesa = ?
      `,
      [id_mesa]
    );

    if (mesaRows.length === 0) {
      throw Object.assign(
        new Error("Mesa no encontrada"),
        { status: 404 }
      );
    }

    if (
      mesaRows[0].mesa_estado !== "Disponible"
    ) {
      throw Object.assign(
        new Error("La mesa no esta disponible"),
        { status: 400 }
      );
    }


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


 
// Enviar pedido a cocina
export const enviarPedidoACocina = async (id_pedido, userId) => {

  const [rows] = await db.query(`
    SELECT pedido_estado
    FROM pedidos
    WHERE id_pedido = ? AND id_mesero = ?
  `, [id_pedido, userId]);

  if (rows.length === 0) {
    throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
  }

  if (rows[0].pedido_estado !== "Pendiente") {
    throw Object.assign(
      new Error("Solo pedidos pendientes pueden enviarse a cocina"),
      { status: 400 }
    );
  }

  
  //VALIDACION PPARA ENVIOS VACIOS A COCINA
  const [detalle] = await db.query(`
    SELECT COUNT(*) AS total
    FROM detalle_pedido
    WHERE id_pedido = ?
  `, [id_pedido]);

  if (detalle[0].total === 0) {
    throw Object.assign(
      new Error("No puedes enviar un pedido sin platillos"),
      { status: 400 }
    );
  }

  // DESPUÉS SE ACTUALIZA
  await db.query(`
    UPDATE pedidos
    SET 
      pedido_estado = 'EnPreparacion',
      pedido_enviado_cocina_en = NOW()
    WHERE id_pedido = ?
  `, [id_pedido]);

  return {
    message: "Pedido enviado a cocina"
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

  // Solo pedidos listos
  if (pedido.pedido_estado !== "Listo") {
    throw Object.assign(
      new Error("Solo pedidos en estado 'Listo' pueden entregarse"),
      { status: 400 }
    );
  }

const [result] = await db.query(`
  UPDATE pedidos
  SET 
    pedido_estado = 'Entregado',
    pedido_entregado_en = NOW()
  WHERE id_pedido = ? AND pedido_estado = 'Listo'
`, [id_pedido]);

if (result.affectedRows === 0) {
  throw Object.assign(
    new Error("El pedido ya no está en estado 'Listo'"),
    { status: 400 }
  );
}

  // liberar mesa automáticamente
  if (pedido.id_mesa) {
    await cambiarEstadoMesa(pedido.id_mesa, "Disponible");
  }

  return {
    message: "Pedido entregado correctamente"
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
        m.mesa_numero,
        dp.id_detalle,
        dp.detalle_pedido_cantidad,
        dp.detalle_pedido_notas,
        pl.id_platillo,
        pl.platillo_nombre,
        pl.platillo_precio
     FROM pedidos p
     LEFT JOIN mesas m
        ON p.id_mesa = m.id_mesa
     LEFT JOIN detalle_pedido dp
        ON p.id_pedido = dp.id_pedido
     LEFT JOIN platillos pl
        ON dp.id_platillo = pl.id_platillo
     WHERE p.id_mesero = ?
       AND p.pedido_estado IN ('Pendiente', 'EnPreparacion', 'Listo')
     ORDER BY p.pedido_fecha_hora DESC`,
    [id_mesero]
  );

  const pedidosMap = {};

  rows.forEach((row) => {
    if (!pedidosMap[row.id_pedido]) {
      pedidosMap[row.id_pedido] = {
        id_pedido: row.id_pedido,
        pedido_tipo: row.pedido_tipo,
        pedido_estado: row.pedido_estado,
        pedido_total: row.pedido_total,
        pedido_fecha_hora: row.pedido_fecha_hora,
        mesa:
          row.pedido_tipo === "Llevar"
            ? "Para llevar"
            : row.mesa_numero,
        mesa_numero: row.mesa_numero,
        platillos: []
      };
    }

    if (row.id_detalle) {
      pedidosMap[row.id_pedido].platillos.push({
        id_detalle: row.id_detalle,
        id_platillo: row.id_platillo,
        nombre: row.platillo_nombre,
        precio: row.platillo_precio,
        cantidad: row.detalle_pedido_cantidad,
        notas: row.detalle_pedido_notas
      });
    }
  });

  return Object.values(pedidosMap);
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

  const pedido = await crearPedido({
    tipo,
    id_mesa,
    userId,
    items
  });

  if (tipo === "Salon") {

    await cambiarEstadoMesa(
      id_mesa,
      "Ocupada",
      userId
    );

  }


  // Query dinámica
  let sql = `
    UPDATE pedidos
    SET pedido_estado = ?
  `;

  const params = [nuevoEstado];

  // Registrar horas
  if (nuevoEstado === "EnPreparacion") {

    sql += `,
      pedido_en_preparacion_en = NOW()
    `;

  }

  if (nuevoEstado === "Listo")
    sql += `
    WHERE id_pedido = ?
  `;

  params.push(id_pedido);

  await db.query(sql, params);

  return {
    message:
      nuevoEstado === "EnPreparacion"
        ? "Pedido marcado en preparación"
        : "Pedido marcado como listo"
  };
};

  return pedido;

};

