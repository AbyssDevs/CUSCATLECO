const db = require("../db");

const crearMesa = (req, res) => {
  const { mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado } = req.body;
  const estadoFinal = mesa_estado || "Libre";

  if (!mesa_numero || !mesa_capacidad) {
    return res.status(400).json({ error: "Mesa número y capacidad son requeridos" });
  }

  if (mesa_capacidad <= 0) {
    return res.status(400).json({ error: "La capacidad de la mesa debe ser un número positivo" });
  }

  const existingMesaSql = `SELECT * FROM mesas WHERE mesa_numero = ?`;
  db.query(existingMesaSql, [mesa_numero], (err, existingMesa) => {
    if (err) {
      console.error("Error al verificar la mesa existente:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }

    if (existingMesa.length > 0) {
      return res.status(400).json({ error: "La mesa con ese número ya existe" });
    }

    const sql = `
      INSERT INTO mesas (mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado, mesa_actualizada_por)
      VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [mesa_numero, mesa_capacidad, mesa_ubicacion, estadoFinal, req.user.id], (err, result) => {
      if (err) {
        console.error("Error al crear la mesa:", err);
        return res.status(500).json({ error: "Error al crear la mesa" });
      }
      res.status(201).json({ message: "Mesa creada exitosamente", id: result.insertId });
    });
  });
};

const crearMesas = (req, res) => {
  const mesas = req.body.mesas;

  if (!Array.isArray(mesas) || mesas.length === 0) {
    return res.status(400).json({ error: "Se requiere un array de mesas" });
  }

  if (mesas.length > 50) {
    return res.status(400).json({ error: "No se pueden crear más de 50 mesas a la vez" });
  }

  for (let i = 0; i < mesas.length; i++) {
    const { mesa_numero, mesa_capacidad } = mesas[i];
    if (!mesa_numero || !mesa_capacidad) {
      return res.status(400).json({ error: `Mesa ${i + 1}: mesa_numero y mesa_capacidad son requeridos` });
    }
    if (mesa_capacidad <= 0) {
      return res.status(400).json({ error: `Mesa ${i + 1}: la capacidad debe ser mayor que 0` });
    }
    mesas[i].mesa_estado = "Disponible";
  }

  const numeros = mesas.map(m => m.mesa_numero);
  if (new Set(numeros).size !== numeros.length) {
    return res.status(400).json({ error: "Hay números de mesa duplicados en la solicitud" });
  }

  const placeholders = numeros.map(() => '?').join(',');
  const existingSql = `SELECT mesa_numero FROM mesas WHERE mesa_numero IN (${placeholders})`;
  db.query(existingSql, numeros, (err, existing) => {
    if (err) {
      console.error("Error al verificar mesas existentes:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }

    if (existing.length > 0) {
      const existentes = existing.map(e => e.mesa_numero).join(', ');
      return res.status(400).json({ error: `Las mesas con números ${existentes} ya existen` });
    }

    const values = mesas.map(m => [m.mesa_numero, m.mesa_capacidad, m.mesa_ubicacion, m.mesa_estado, req.user.id]);
    const insertSql = `INSERT INTO mesas (mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado, mesa_actualizada_por) VALUES ?`;

    db.query(insertSql, [values], (err, result) => {
      if (err) {
        console.error("Error al crear las mesas:", err);
        return res.status(500).json({ error: "Error al crear las mesas" });
      }
      res.status(201).json({ message: `${mesas.length} mesas creadas exitosamente`, ids: result.insertId ? Array.from({ length: mesas.length }, (_, i) => result.insertId + i) : [] });
    });
  });
};

const listarMesas = (req, res) => {
  const sql = `SELECT 
    m.id_mesa,
    m.mesa_numero,
    m.mesa_capacidad,
    m.mesa_ubicacion,
    m.mesa_estado,
    u.usuario_nombre AS mesa_actualizada_por
  FROM mesas m
  LEFT JOIN usuarios u ON m.mesa_actualizada_por = u.id_usuario
  ORDER BY m.mesa_numero DESC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error al listar las mesas:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }
    res.json(results);
  });
}

const cambiarEstadoMesa = (req, res) => {
  const { id } = req.params;
  const { mesa_estado } = req.body;

  const estadosValidos = ["Disponible", "Ocupada", "Reservada", "Limpieza"];
  
  const id_usuario = (req.user && req.user.id)
    ? req.user.id
    : (req.body.id_usuario || 1);
  if (mesa_estado === undefined) {
    return res.status(400).json({ error: "Debe enviar el estado de la mesa" });
  }
  if (!estadosValidos.includes(mesa_estado)) {
    return res.status(400).json({ error: `Estado de mesa inválido. Estados permitidos: ${estadosValidos.join(', ')}` });
  }

  const sql = `
    UPDATE mesas
    SET mesa_estado = ?, mesa_actualizada_por = ?, mesa_actualizada_en = NOW()
    WHERE id_mesa = ?
  `;

  db.query(sql, [mesa_estado, id_usuario, id], (err, result) => {
    if (err) {
      console.error("Error al cambiar el estado de la mesa:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Mesa no encontrada" });
    }
    
    res.json({ message: "Estado de la mesa actualizado exitosamente" });
  });
};

module.exports = {crearMesa, crearMesas, listarMesas, cambiarEstadoMesa};