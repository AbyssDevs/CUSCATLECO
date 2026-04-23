import db from "../config/db.js";

//  CREAR UNA
export const crearMesa = async (data, userId) => {
  let { mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado } = data;

  let estadoFinal = mesa_estado || "Disponible";
  if (estadoFinal === "Libre") estadoFinal = "Disponible";

  if (!mesa_numero || !mesa_capacidad) {
    throw Object.assign(new Error("Mesa número y capacidad son requeridos"), { status: 400 });
  }

  if (mesa_capacidad <= 0) {
    throw Object.assign(new Error("La capacidad debe ser mayor que 0"), { status: 400 });
  }

  const [existe] = await db.query(
    "SELECT id_mesa FROM mesas WHERE mesa_numero = ?",
    [mesa_numero]
  );

  if (existe.length > 0) {
    throw Object.assign(new Error("La mesa ya existe"), { status: 400 });
  }

  const [result] = await db.query(
    `INSERT INTO mesas (mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado, mesa_actualizada_por)
     VALUES (?, ?, ?, ?, ?)`,
    [mesa_numero, mesa_capacidad, mesa_ubicacion, estadoFinal, userId]
  );

  return { message: "Mesa creada exitosamente", id: result.insertId };
};

//  CREAR MASIVO
export const crearMesas = async (mesas, userId) => {
  if (!Array.isArray(mesas) || mesas.length === 0) {
    throw Object.assign(new Error("Se requiere un array de mesas"), { status: 400 });
  }

  if (mesas.length > 50) {
    throw Object.assign(new Error("Máximo 50 mesas"), { status: 400 });
  }

  for (let i = 0; i < mesas.length; i++) {
    const { mesa_numero, mesa_capacidad } = mesas[i];

    if (!mesa_numero || !mesa_capacidad) {
      throw Object.assign(new Error(`Mesa ${i + 1}: datos incompletos`), { status: 400 });
    }

    if (mesa_capacidad <= 0) {
      throw Object.assign(new Error(`Mesa ${i + 1}: capacidad inválida`), { status: 400 });
    }

    mesas[i].mesa_estado = "Disponible";
  }

  const numeros = mesas.map(m => m.mesa_numero);

  if (new Set(numeros).size !== numeros.length) {
    throw Object.assign(new Error("Mesas duplicadas en request"), { status: 400 });
  }

  const placeholders = numeros.map(() => "?").join(",");
  const [existentes] = await db.query(
    `SELECT mesa_numero FROM mesas WHERE mesa_numero IN (${placeholders})`,
    numeros
  );

  if (existentes.length > 0) {
    const lista = existentes.map(e => e.mesa_numero).join(", ");
    throw Object.assign(new Error(`Mesas ya existentes: ${lista}`), { status: 400 });
  }

  const values = mesas.map(m => [
    m.mesa_numero,
    m.mesa_capacidad,
    m.mesa_ubicacion,
    m.mesa_estado,
    userId
  ]);

  const [result] = await db.query(
    `INSERT INTO mesas (mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado, mesa_actualizada_por)
     VALUES ?`,
    [values]
  );

  return {
    message: `${mesas.length} mesas creadas`,
    firstId: result.insertId
  };
};

// LISTAR
export const listarMesas = async () => {
  const [rows] = await db.query(`
    SELECT 
      m.id_mesa,
      m.mesa_numero,
      m.mesa_capacidad,
      m.mesa_ubicacion,
      m.mesa_estado,
      u.usuario_nombre AS mesa_actualizada_por
    FROM mesas m
    LEFT JOIN usuarios u ON m.mesa_actualizada_por = u.id_usuario
    ORDER BY m.mesa_numero DESC
  `);

  return rows;
};

//  ELIMINAR
export const eliminarMesa = async (id) => {
  const [result] = await db.query(
    "DELETE FROM mesas WHERE id_mesa = ?",
    [id]
  );

  if (result.affectedRows === 0) {
    throw Object.assign(new Error("Mesa no encontrada"), { status: 404 });
  }

  return { message: "Mesa eliminada exitosamente" };
};

// CAMBIAR ESTADO
export const cambiarEstadoMesa = async (id, estado, userId) => {
  if (estado === "Libre") estado = "Disponible";

  const estadosValidos = [
    "Disponible",
    "Ocupada",
    "Reservada",
    "Limpieza",
    "Mantenimiento"
  ];

  if (!estado) {
    throw Object.assign(new Error("Debe enviar estado"), { status: 400 });
  }

  if (!estadosValidos.includes(estado)) {
    throw Object.assign(new Error("Estado inválido"), { status: 400 });
  }

  const [result] = await db.query(
    `UPDATE mesas
     SET mesa_estado = ?, mesa_actualizada_por = ?, mesa_actualizada_en = NOW()
     WHERE id_mesa = ?`,
    [estado, userId, id]
  );

  if (result.affectedRows === 0) {
    throw Object.assign(new Error("Mesa no encontrada"), { status: 404 });
  }

  return { message: "Estado actualizado correctamente" };
};