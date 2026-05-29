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