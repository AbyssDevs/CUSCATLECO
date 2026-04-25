import db from "../config/db.js";

// CREAR
export const crearPlatillo = async (data, userId) => {
  const {
    id_categoria,
    platillo_nombre,
    platillo_descripcion,
    platillo_precio,
    platillo_imagen_url,
    platillo_disponible = true
  } = data;

  if (!id_categoria || !platillo_nombre || !platillo_precio) {
    const error = new Error("Faltan campos requeridos");
    error.status = 400;
    throw error;
  }

  // validar duplicado
  const [existe] = await db.query(
    "SELECT id_platillo FROM platillos WHERE platillo_nombre = ?",
    [platillo_nombre]
  );

  if (existe.length > 0) {
    const error = new Error("El platillo ya existe");
    error.status = 400;
    throw error;
  }

  const [resultado] = await db.query(
    `INSERT INTO platillos 
    (id_categoria, platillo_nombre, platillo_descripcion, platillo_precio, platillo_imagen_url, platillo_disponible, platillo_actualizado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id_categoria,
      platillo_nombre,
      platillo_descripcion,
      platillo_precio,
      platillo_imagen_url,
      platillo_disponible,
      userId
    ]
  );

  return {
    mensaje: "Platillo creado correctamente",
    id_platillo: resultado.insertId
  };
};

// OBTENER LISTA
export const obtenerPlatillos = async (query, rol) => {
  const isAdmin = rol === "Administrador";

  const { categoria_id, nombre, orderBy = "nombre", orderDir = "ASC" } = query;

  let sql = `
    SELECT 
      p.id_platillo,
      p.id_categoria,
      c.categoria_nombre,
      p.platillo_nombre,
      p.platillo_descripcion,
      p.platillo_precio,
      p.platillo_imagen_url,
      p.platillo_disponible,
      DATE_FORMAT(p.platillo_creado_en, '%Y-%m-%d') AS fecha_creacion,
      DATE_FORMAT(p.platillo_actualizado_en, '%Y-%m-%d') AS fecha_actualizacion,
      u.usuario_nombre AS actualizado_por
    FROM platillos p
    JOIN categorias c ON p.id_categoria = c.id_categoria
    LEFT JOIN usuarios u ON p.platillo_actualizado_por = u.id_usuario
    WHERE 1=1
  `;

  const params = [];

  if (!isAdmin) {
    sql += " AND p.platillo_disponible = TRUE";
  }

  if (categoria_id) {
    sql += " AND p.id_categoria = ?";
    params.push(categoria_id);
  }

  if (nombre) {
    sql += " AND LOWER(p.platillo_nombre) LIKE LOWER(?)";
    params.push(`%${nombre}%`);
  }

  const validOrderFields = {
    nombre: "p.platillo_nombre",
    precio: "p.platillo_precio"
  };

  const sortField = validOrderFields[orderBy] || "p.platillo_nombre";
  const sortDir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";

  sql += ` ORDER BY ${sortField} ${sortDir}`;

  const [rows] = await db.query(sql, params);

  return rows;
};

// OBTENER UNO
export const obtenerPlatillo = async (id, rol) => {
  const isAdmin = rol === "Administrador";

  const [rows] = await db.query(
    `
    SELECT 
      p.id_platillo,
      p.id_categoria,
      c.categoria_nombre,
      p.platillo_nombre,
      p.platillo_descripcion,
      p.platillo_precio,
      p.platillo_imagen_url,
      p.platillo_disponible
    FROM platillos p
    JOIN categorias c ON p.id_categoria = c.id_categoria
    WHERE p.id_platillo = ?
    ${isAdmin ? "" : "AND p.platillo_disponible = TRUE"}
    `,
    [id]
  );

  if (rows.length === 0) {
    const error = new Error("Platillo no encontrado");
    error.status = 404;
    throw error;
  }

  return rows[0];
};

// EDITAR
export const editarPlatillo = async (id, data, userId) => {
  const {
    id_categoria,
    platillo_nombre,
    platillo_descripcion,
    platillo_precio,
    platillo_imagen_url
  } = data;

  // validar estado
  const [estado] = await db.query(
    "SELECT platillo_disponible, platillo_nombre FROM platillos WHERE id_platillo = ?",
    [id]
  );

  if (estado.length === 0) {
    throw Object.assign(new Error("Platillo no encontrado"), { status: 404 });
  }

  if (!estado[0].platillo_disponible) {
    throw Object.assign(new Error("Solo se pueden editar platillos activos"), { status: 403 });
  }

  // validar duplicado SOLO SI el nombre cambió
  if (platillo_nombre !== estado[0].platillo_nombre) {
    const [dup] = await db.query(
      "SELECT id_platillo FROM platillos WHERE platillo_nombre = ? AND id_platillo != ?",
      [platillo_nombre, id]
    );

    if (dup.length > 0) {
      throw Object.assign(new Error("El platillo ya existe"), { status: 400 });
    }
  }

  // Obtener la imagen actual si no se proporciona una nueva
  let imagenFinal = platillo_imagen_url;
  if (!imagenFinal) {
    const [current] = await db.query(
      "SELECT platillo_imagen_url FROM platillos WHERE id_platillo = ?",
      [id]
    );
    if (current.length > 0) {
      imagenFinal = current[0].platillo_imagen_url;
    }
  }

  await db.query(
    `
    UPDATE platillos
    SET
      id_categoria = ?,
      platillo_nombre = ?,
      platillo_descripcion = ?,
      platillo_precio = ?,
      platillo_imagen_url = ?,
      platillo_actualizado_por = ?,
      platillo_actualizado_en = NOW()
    WHERE id_platillo = ?
    `,
    [
      id_categoria,
      platillo_nombre,
      platillo_descripcion,
      platillo_precio,
      imagenFinal,
      userId,
      id
    ]
  );

  return { mensaje: "Platillo actualizado correctamente" };
};

// CAMBIAR ESTADO
export const cambiarEstadoPlatillo = async (id, estado, userId) => {
  if (estado === undefined) {
    throw Object.assign(new Error("Debe enviar el estado del platillo"), { status: 400 });
  }

  const [result] = await db.query(
    `
    UPDATE platillos
    SET
      platillo_disponible = ?,
      platillo_actualizado_por = ?,
      platillo_actualizado_en = NOW()
    WHERE id_platillo = ?
    `,
    [estado, userId, id]
  );

  if (result.affectedRows === 0) {
    throw Object.assign(new Error("Platillo no encontrado"), { status: 404 });
  }

  return { mensaje: "Estado del platillo actualizado correctamente" };
};