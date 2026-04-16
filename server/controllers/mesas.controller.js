const db = require("../db");

const crearMesa = (req, res) => {
  const { mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado  } = req.body;

  if (!mesa_numero || !mesa_capacidad || !mesa_estado) {
    return res.status(400).json({ error: "Todos los datos son requeridos" });
  }

  const existingMesaSql = `SELECT * FROM mesas WHERE mesa_numero = ?`;
  db.query(existingMesaSql, [mesa_numero], (err, existingMesa) => {
    if (err) {
      console.error("Error al verificar la mesa existente:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }

    if (existingMesa.length > 0) {
      return res
        .status(400)
        .json({ error: "La mesa con ese número ya existe" });
    }

    if (mesa_capacidad <= 0) {
      return res.status(400).json({ error: "La capacidad de la mesa debe ser un número positivo" });
    }


    const sql = `
        INSERT INTO mesas (mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado, mesa_actualizada_por)
        VALUES (?, ?, ?, ?, ?)
        `;

     db.query(sql, [mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado, req.user.id], (err, result) => {
      if (err) {
        console.error("Error al crear la mesa:", err);
        return res.status(500).json({ error: "Error al crear la mesa" });
      }
      res
        .status(201)
        .json({ message: "Mesa creada exitosamente", id: result.insertId });
    });
  });
};

const obtenerMesas = (req, res) => {
  const sql = `SELECT mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado FROM mesas ORDER BY mesa_numero ASC`;
  db.query(sql, (err, mesas) => {
    if (err) {
      console.error("Error al obtener las mesas:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }
    res.json(mesas);
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

  if (mesas.some(m => m.mesa_capacidad <= 0)) {
    return res.status(400).json({ error: "La capacidad de la mesa debe ser un número positivo" });
  }

  // Validar cada mesa
  for (let i = 0; i < mesas.length; i++) {
    const { mesa_numero, mesa_capacidad, mesa_estado } = mesas[i];
    if (!mesa_numero || !mesa_capacidad) {
      return res.status(400).json({ error: `Mesa ${i + 1}: mesa_numero y mesa_capacidad son requeridos` });
    }
    if (mesa_estado && !['Disponible', 'Ocupada', 'Reservada'].includes(mesa_estado)) {
      return res.status(400).json({ error: `Mesa ${i + 1}: estado inválido` });
    }
    mesas[i].mesa_estado = mesa_estado || 'Disponible';
  }

  // Verificar duplicados en el array
  const numeros = mesas.map(m => m.mesa_numero);
  if (new Set(numeros).size !== numeros.length) {
    return res.status(400).json({ error: "Hay números de mesa duplicados en la solicitud" });
  }

  // Verificar que no existan en la DB
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

    // Insertar todas las mesas
    const values = mesas.map(m => [m.mesa_numero, m.mesa_capacidad, m.mesa_ubicacion, m.mesa_estado, req.user.id]);
    const insertSql = `INSERT INTO mesas (mesa_numero, mesa_capacidad, mesa_ubicacion, mesa_estado, mesa_actualizada_por) VALUES ?`;

    db.query(insertSql, [values], (err, result) => {
      if (err) {
        console.error("Error al crear las mesas:", err);
        return res.status(500).json({ error: "Error al crear las mesas" });
      }
      res.status(201).json({ message: `${mesas.length} mesas creadas exitosamente`, ids: result.insertId ? Array.from({length: mesas.length}, (_, i) => result.insertId + i) : [] });
    });
  });
};

module.exports = { crearMesa, crearMesas, obtenerMesas };