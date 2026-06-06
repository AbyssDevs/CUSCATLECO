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
// OBTENER PEDIDOS ACTIVOS DEL MESERO
// =====================================================

export const obtenerPedidosActivosMesero = async (userId) => {
  if (!userId) {
    throw Object.assign(
      new Error("ID de usuario requerido"),
      { status: 400 }
    );
  }

  try {
    const [pedidos] = await db.query(
      `
        SELECT
          p.id_pedido,
          p.pedido_numero,
          p.pedido_tipo,
          p.pedido_estado,
          p.pedido_total,
          p.pedido_fecha_hora,
          p.id_mesa,
          m.mesa_numero,
          m.mesa_ubicacion
        FROM pedidos p
        LEFT JOIN mesas m ON p.id_mesa = m.id_mesa
        WHERE p.id_mesero = ?
          AND p.pedido_estado IN ('Pendiente', 'EnPreparacion', 'Listo')
        ORDER BY p.pedido_fecha_hora DESC
      `,
      [userId]
    );

    const pedidosConDetalles = await Promise.all(
      pedidos.map(async (pedido) => {
        const [detalles] = await db.query(
          `
            SELECT
              dp.id_detalle_pedido,
              dp.id_platillo,
              dp.detalle_pedido_cantidad AS cantidad,
              dp.detalle_pedido_precio_unitario AS precio,
              dp.detalle_pedido_subtotal AS subtotal,
              dp.detalle_pedido_notas AS notas,
              pl.nombre AS nombre_platillo
            FROM detalle_pedido dp
            JOIN platillos pl ON dp.id_platillo = pl.id_platillo
            WHERE dp.id_pedido = ?
          `,
          [pedido.id_pedido]
        );

        return {
          ...pedido,
          platillos: detalles.map((d) => ({
            id_detalle_pedido: d.id_detalle_pedido,
            id_platillo: d.id_platillo,
            detalle_pedido_cantidad: d.cantidad,
          cantidad: d.cantidad,
            detalle_pedido_precio_unitario: d.precio,
            precio: d.precio,
            nombre: d.nombre_platillo,
            platillo_nombre: d.nombre_platillo,
            notas: d.notas,
            detalle_pedido_notas: d.notas
          }))
        };
      })
    );

    return pedidosConDetalles.filter((p) => {
      const total = p.pedido_total || p.platillos.reduce((sum, pl) => {
        return sum + ((pl.precio || 0) * (pl.cantidad || 0));
      }, 0);
      return total > 0;
    });
  } catch (error) {
    console.error("Error al obtener pedidos activos del mesero:", error);
    throw Object.assign(
      new Error("Error al obtener pedidos activos"),
      { status: 500 }
    );
  }
};

// =====================================================
// OBTENER PEDIDOS PENDIENTES PARA COCINA
// =====================================================

export const obtenerPedidosPendientesCocina = async () => {
  try {
    const [pedidos] = await db.query(
      `
        SELECT
          p.id_pedido,
          p.pedido_numero,
          p.pedido_tipo,
          p.pedido_estado,
          p.pedido_total,
          p.pedido_fecha_hora,
          p.id_mesa,
          p.id_mesero,
          m.mesa_numero,
          m.mesa_ubicacion,
          CONCAT(u.usuario_nombre, ' ', u.usuario_apellido) AS mesero_nombre
        FROM pedidos p
        LEFT JOIN mesas m ON p.id_mesa = m.id_mesa
        LEFT JOIN usuarios u ON p.id_mesero = u.id_usuario
        WHERE p.pedido_estado IN ('Pendiente', 'EnPreparacion', 'Listo')
        ORDER BY
          FIELD(p.pedido_estado, 'Pendiente', 'EnPreparacion', 'Listo'),
          p.pedido_fecha_hora ASC
      `
    );

    const pedidosConDetalles = await Promise.all(
      pedidos.map(async (pedido) => {
        const [detalles] = await db.query(
          `
            SELECT
              dp.id_detalle_pedido,
              dp.id_platillo,
              dp.detalle_pedido_cantidad AS cantidad,
              dp.detalle_pedido_precio_unitario AS precio,
              dp.detalle_pedido_notas AS notas,
              pl.nombre AS nombre_platillo
            FROM detalle_pedido dp
            JOIN platillos pl ON dp.id_platillo = pl.id_platillo
            WHERE dp.id_pedido = ?
          `,
          [pedido.id_pedido]
        );

        return {
          ...pedido,
          mesa: pedido.mesa_numero
            ? `Mesa ${pedido.mesa_numero}`
            : pedido.pedido_tipo === "Llevar"
              ? "Para llevar"
              : "N/A",
          platillos: detalles.map((d) => ({
            id_detalle_pedido: d.id_detalle_pedido,
            id_platillo: d.id_platillo,
            cantidad: d.cantidad,
            nombre: d.nombre_platillo,
            notas: d.notas
          }))
        };
      })
    );

    return pedidosConDetalles;
  } catch (error) {
    console.error("Error al obtener pedidos pendientes de cocina:", error);
    throw Object.assign(
      new Error("Error al obtener pedidos de cocina"),
      { status: 500 }
    );
  }
};

// =====================================================
// ENVIAR PEDIDO A COCINA
// =====================================================

export const enviarPedidoACocina = async (id_pedido) => {
  if (!id_pedido) {
    throw Object.assign(
      new Error("ID de pedido requerido"),
      { status: 400 }
    );
  }

  try {
    const [pedidoRows] = await db.query(
      "SELECT pedido_estado FROM pedidos WHERE id_pedido = ?",
      [id_pedido]
    );

    if (pedidoRows.length === 0) {
      throw Object.assign(
        new Error("Pedido no encontrado"),
        { status: 404 }
      );
    }

    if (pedidoRows[0].pedido_estado !== "Pendiente") {
      throw Object.assign(
        new Error("El pedido ya fue enviado a cocina o no está pendiente"),
        { status: 400 }
      );
    }

    await db.query(
      "UPDATE pedidos SET pedido_estado = 'EnPreparacion' WHERE id_pedido = ?",
      [id_pedido]
    );

    return {
      id_pedido,
      pedido_estado: "EnPreparacion",
      message: "Pedido enviado a cocina correctamente"
    };
  } catch (error) {
    console.error("Error al enviar pedido a cocina:", error);
    throw error;
  }
};

// =====================================================
// MARCAR PEDIDO COMO ENTREGADO
// =====================================================

export const marcarPedidoEntregado = async (id_pedido, userId) => {
  if (!id_pedido) {
    throw Object.assign(
      new Error("ID de pedido requerido"),
      { status: 400 }
    );
  }

  try {
    const [pedidoRows] = await db.query(
      "SELECT id_mesa, pedido_estado, pedido_tipo FROM pedidos WHERE id_pedido = ?",
      [id_pedido]
    );

    if (pedidoRows.length === 0) {
      throw Object.assign(
        new Error("Pedido no encontrado"),
        { status: 404 }
      );
    }

    const pedido = pedidoRows[0];

    if (pedido.pedido_estado !== "Listo") {
      throw Object.assign(
        new Error("El pedido debe estar en estado 'Listo' para marcarlo como entregado"),
        { status: 400 }
      );
    }

    await db.query(
      "UPDATE pedidos SET pedido_estado = 'Entregado' WHERE id_pedido = ?",
      [id_pedido]
    );

    if (pedido.id_mesa && pedido.pedido_tipo === "Salon") {
      try {
        await cambiarEstadoMesa(pedido.id_mesa, "Disponible", userId);
      } catch (mesaError) {
        console.error("Error al liberar mesa:", mesaError);
      }
    }

    return {
      id_pedido,
      pedido_estado: "Entregado",
      message: "Pedido marcado como entregado"
    };
  } catch (error) {
    console.error("Error al marcar pedido como entregado:", error);
    throw error;
  }
};

// =====================================================
// CAMBIAR ESTADO PEDIDO DESDE COCINA
// =====================================================

export const cambiarEstadoPedidoCocina = async (id_pedido, estado) => {
  if (!id_pedido) {
    throw Object.assign(
      new Error("ID de pedido requerido"),
      { status: 400 }
    );
  }

  const estadosValidos = ["EnPreparacion", "Listo"];

  if (!estadosValidos.includes(estado)) {
    throw Object.assign(
      new Error(`Estado inválido. Debe ser: ${estadosValidos.join(", ")}`),
      { status: 400 }
    );
  }

  try {
    const [pedidoRows] = await db.query(
      "SELECT pedido_estado FROM pedidos WHERE id_pedido = ?",
      [id_pedido]
    );

    if (pedidoRows.length === 0) {
      throw Object.assign(
        new Error("Pedido no encontrado"),
        { status: 404 }
      );
    }

    if (estado === "EnPreparacion" && pedidoRows[0].pedido_estado !== "Pendiente") {
      throw Object.assign(
        new Error("Solo se pueden iniciar pedidos en estado Pendiente"),
        { status: 400 }
      );
    }

    if (estado === "Listo" && pedidoRows[0].pedido_estado !== "EnPreparacion") {
      throw Object.assign(
        new Error("Solo se pueden marcar como listos pedidos en preparación"),
        { status: 400 }
      );
    }

    await db.query(
      "UPDATE pedidos SET pedido_estado = ? WHERE id_pedido = ?",
      [estado, id_pedido]
    );

    return {
      id_pedido,
      pedido_estado: estado,
      message: estado === "EnPreparacion"
        ? "Pedido en preparación"
        : "Pedido marcado como listo"
    };
  } catch (error) {
    console.error("Error al cambiar estado del pedido:", error);
    throw error;
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

  return pedido;

};