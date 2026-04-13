const db = require("../db");

const crearPlatillo = (req, res) => {
  const { id_categoria, platillo_nombre, platillo_descripcion, platillo_precio, platillo_imagen_url, platillo_disponible = true } = req.body;

  if (!id_categoria || !platillo_nombre || !platillo_precio) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const checkSql = "SELECT * FROM platillos WHERE platillo_nombre = ?";
  db.query(checkSql, [platillo_nombre], (checkError, checkResult) => {
    if (checkError) {
      console.error(checkError);
      return res.status(500).json({ error: "Error verificando nombre del platillo" });
    }

    if (checkResult.length > 0) {
      return res.status(400).json({ error: "El platillo ya existe" });
    }

    const sql = `
      INSERT INTO platillos 
      (id_categoria, platillo_nombre, platillo_descripcion, platillo_precio, platillo_imagen_url, platillo_disponible, platillo_actualizado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [id_categoria, platillo_nombre, platillo_descripcion, platillo_precio, platillo_imagen_url, platillo_disponible, req.user.id],
      (error, resultado) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ error: "Error al crear platillo" });
        }

        res.json({
          mensaje: "Platillo creado correctamente",
          id_platillo: resultado.insertId
        });
      }
    );
  });
};

const obtenerPlatillos = (req, res) => {
  const role = (req.user && req.user.role || "").toLowerCase();
  const isAdmin = role === "administrador";

  const { categoria_id, nombre, orderBy = 'nombre', orderDir = 'ASC' } = req.query;

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
      Date_Format(p.platillo_creado_en, '%Y-%m-%d') AS fecha_creacion,
      Date_Format(p.platillo_actualizado_en, '%Y-%m-%d') AS fecha_actualizacion,
      u.usuario_nombre AS actualizado_por
    FROM platillos p
    JOIN categorias c ON p.id_categoria = c.id_categoria
    LEFT JOIN usuarios u ON p.platillo_actualizado_por = u.id_usuario
    WHERE 1=1
  `;

  const queryParams = [];

  if (!isAdmin) {
    sql += " AND p.platillo_disponible = TRUE";
  }

  if (categoria_id) {
    sql += " AND p.id_categoria = ?";
    queryParams.push(categoria_id);
  }

  if (nombre) {
    sql += " AND LOWER(p.platillo_nombre) LIKE LOWER(?)";
    queryParams.push(`%${nombre}%`);
  }

  const validOrderFields = {
    'nombre': 'p.platillo_nombre',
    'precio': 'p.platillo_precio'
  };
  
  const sortField = validOrderFields[orderBy] || 'p.platillo_nombre';
  const sortDir = orderDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  sql += ` ORDER BY ${sortField} ${sortDir}`;

  db.query(sql, queryParams, (error, platillos) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error del servidor" });
    }

    res.json(platillos);
  });
};

const obtenerPlatillo = (req, res) => {
  const { id } = req.params;
  const role = (req.user && req.user.role || "").toLowerCase();
  const isAdmin = role === "administrador";

  const sql = `
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
  `;

  db.query(sql, [id], (error, resultado) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error del servidor" });
    }

    if (resultado.length === 0) {
      return res.status(404).json({ error: "Platillo no encontrado" });
    }

    res.json(resultado[0]);
  });
};

module.exports = { crearPlatillo, obtenerPlatillos, obtenerPlatillo };