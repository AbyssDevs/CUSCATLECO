import db from "../config/db.js";

const ESTADOS_FACTURABLES = ["Entregado", "Cerrado"];

const redondear2 = (valor) => Number(Number(valor).toFixed(2));

const calcularMontosDesdeTotal = (pedidoTotal) => {
  const total = redondear2(pedidoTotal || 0);
  const subtotal = Number((total / 1.13).toFixed(2));
  const iva = Number((total - subtotal).toFixed(2));

  return { subtotal, iva, total };
};

const generarCorrelativoConsumidorFinal = async (connection) => {
  const [[{ anio }]] = await connection.query(
    "SELECT YEAR(CURRENT_DATE()) AS anio"
  );

  const lockName = `facturas_cf_correlativo_${anio}`;
  const [[lockResult]] = await connection.query(
    "SELECT GET_LOCK(?, 10) AS lock_obtenido",
    [lockName]
  );

  if (lockResult.lock_obtenido !== 1) {
    throw Object.assign(
      new Error("No se pudo generar el correlativo de la factura"),
      { status: 500 }
    );
  }

  const [[{ ultimo }]] = await connection.query(
    `
      SELECT COALESCE(MAX(CAST(SUBSTRING(factura_correlativo, 9) AS UNSIGNED)), 0) AS ultimo
      FROM facturas
      WHERE factura_tipo = 'ConsumidorFinal'
        AND factura_correlativo LIKE ?
    `,
    [`CF-${anio}-%`]
  );

  return {
    lockName,
    correlativo: `CF-${anio}-${String(Number(ultimo) + 1).padStart(4, "0")}`,
  };
};

const mapDetalleFactura = (row) => ({
  id_platillo: row.id_platillo,
  nombre: row.nombre,
  cantidad: Number(row.cantidad) || 0,
  precio_unitario: redondear2(row.precio_unitario || 0),
  subtotal: redondear2(row.subtotal || 0),
});

const obtenerPedidoParaFactura = async (connection, idPedido, bloquear = false) => {
  const [pedidoRows] = await connection.query(
    `
      SELECT
        p.id_pedido,
        p.pedido_numero,
        p.pedido_estado,
        p.pedido_total,
        p.pedido_fecha_hora,
        f.id_factura,
        f.factura_correlativo
      FROM pedidos p
      LEFT JOIN facturas f
        ON f.id_pedido = p.id_pedido
       AND f.factura_anulada = FALSE
      WHERE p.id_pedido = ?
      ${bloquear ? "FOR UPDATE" : ""}
    `,
    [idPedido]
  );

  if (pedidoRows.length === 0) {
    throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
  }

  return pedidoRows[0];
};

const obtenerDetallePedido = async (connection, idPedido) => {
  const [detalleRows] = await connection.query(
    `
      SELECT
        dp.id_platillo,
        pl.platillo_nombre AS nombre,
        dp.detalle_pedido_cantidad AS cantidad,
        dp.detalle_pedido_precio_unitario AS precio_unitario,
        dp.detalle_pedido_subtotal AS subtotal
      FROM detalle_pedido dp
      INNER JOIN platillos pl
        ON pl.id_platillo = dp.id_platillo
      WHERE dp.id_pedido = ?
      ORDER BY dp.id_detalle ASC
    `,
    [idPedido]
  );

  if (detalleRows.length === 0) {
    throw Object.assign(
      new Error("El pedido no tiene platillos para facturar"),
      { status: 400 }
    );
  }

  return detalleRows.map(mapDetalleFactura);
};

const validarPedidoFacturable = (pedido) => {
  if (!ESTADOS_FACTURABLES.includes(pedido.pedido_estado)) {
    throw Object.assign(
      new Error("Solo se pueden facturar pedidos Entregado o Cerrado"),
      { status: 400 }
    );
  }

  if (pedido.id_factura) {
    throw Object.assign(
      new Error("El pedido ya tiene una factura asociada"),
      { status: 409 }
    );
  }
};

export const previsualizarFacturaConsumidorFinal = async (idPedido) => {
  const pedido = await obtenerPedidoParaFactura(db, idPedido);
  validarPedidoFacturable(pedido);

  const detalle = await obtenerDetallePedido(db, idPedido);
  const montos = calcularMontosDesdeTotal(pedido.pedido_total);

  return {
    pedido: {
      id_pedido: pedido.id_pedido,
      pedido_numero: pedido.pedido_numero,
      pedido_estado: pedido.pedido_estado,
      pedido_total: montos.total,
    },
    detalle,
    ...montos,
  };
};

export const generarFacturaConsumidorFinal = async ({
  id_pedido,
  nombre_cliente,
  nit_cliente,
  id_cajero,
}) => {
  if (!id_pedido) {
    throw Object.assign(new Error("Debe enviar el id del pedido"), { status: 400 });
  }

  let connection;
  let lockName;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const pedido = await obtenerPedidoParaFactura(connection, id_pedido, true);
    validarPedidoFacturable(pedido);

    const detalle = await obtenerDetallePedido(connection, id_pedido);
    const montos = calcularMontosDesdeTotal(pedido.pedido_total);
    const correlativo = await generarCorrelativoConsumidorFinal(connection);
    lockName = correlativo.lockName;

    const [facturaResult] = await connection.query(
      `
        INSERT INTO facturas (
          id_pedido,
          id_cajero,
          factura_correlativo,
          factura_tipo,
          factura_nombre_cliente,
          factura_dui_nit,
          factura_subtotal,
          factura_iva,
          factura_total,
          factura_fecha_emision
        )
        VALUES (?, ?, ?, 'ConsumidorFinal', ?, ?, ?, ?, ?, NOW())
      `,
      [
        pedido.id_pedido,
        id_cajero,
        correlativo.correlativo,
        nombre_cliente || null,
        nit_cliente || null,
        montos.subtotal,
        montos.iva,
        montos.total,
      ]
    );

    const idFactura = facturaResult.insertId;

    for (const item of detalle) {
      await connection.query(
        `
          INSERT INTO detalle_factura (
            id_factura,
            id_platillo,
            detalle_factura_descripcion,
            detalle_factura_cantidad,
            detalle_factura_precio_unitario,
            detalle_factura_subtotal
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          idFactura,
          item.id_platillo,
          item.nombre,
          item.cantidad,
          item.precio_unitario,
          item.subtotal,
        ]
      );
    }

    if (pedido.pedido_estado !== "Cerrado") {
      await connection.query(
        "UPDATE pedidos SET pedido_estado = 'Cerrado' WHERE id_pedido = ?",
        [pedido.id_pedido]
      );
    }

    await connection.commit();

    return obtenerFacturaPorId(idFactura);
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) {
      if (lockName) {
        try {
          await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
        } catch (error) {
          console.error("No se pudo liberar el bloqueo del correlativo de factura", error);
        }
      }
      connection.release();
    }
  }
};

export const obtenerFacturaPorId = async (idFactura) => {
  const [facturaRows] = await db.query(
    `
      SELECT
        f.id_factura,
        f.id_pedido,
        f.factura_correlativo,
        f.factura_tipo,
        f.factura_nombre_cliente,
        f.factura_dui_nit,
        f.factura_subtotal,
        f.factura_iva,
        f.factura_total,
        f.factura_fecha_emision,
        p.pedido_numero,
        u.usuario_nombre AS cajero_nombre
      FROM facturas f
      INNER JOIN pedidos p
        ON p.id_pedido = f.id_pedido
      INNER JOIN usuarios u
        ON u.id_usuario = f.id_cajero
      WHERE f.id_factura = ?
        AND f.factura_anulada = FALSE
    `,
    [idFactura]
  );

  if (facturaRows.length === 0) {
    throw Object.assign(new Error("Factura no encontrada"), { status: 404 });
  }

  const factura = facturaRows[0];

  const [detalleRows] = await db.query(
    `
      SELECT
        id_platillo,
        detalle_factura_descripcion AS nombre,
        detalle_factura_cantidad AS cantidad,
        detalle_factura_precio_unitario AS precio_unitario,
        detalle_factura_subtotal AS subtotal
      FROM detalle_factura
      WHERE id_factura = ?
      ORDER BY id_detalle ASC
    `,
    [idFactura]
  );

  return {
    id_factura: factura.id_factura,
    numero_factura: factura.factura_correlativo,
    numeroFactura: factura.factura_correlativo,
    tipo_factura: factura.factura_tipo,
    id_pedido: factura.id_pedido,
    pedido_numero: factura.pedido_numero,
    nombre_cajero: factura.cajero_nombre,
    nombre_cliente: factura.factura_nombre_cliente,
    nit_cliente: factura.factura_dui_nit,
    subtotal: redondear2(factura.factura_subtotal),
    iva: redondear2(factura.factura_iva),
    total: redondear2(factura.factura_total),
    fecha_emision: factura.factura_fecha_emision,
    detalle: detalleRows.map(mapDetalleFactura),
    leyendas: [
      "Consumidor Final",
      "Documento no válido como crédito fiscal",
    ],
  };
};
