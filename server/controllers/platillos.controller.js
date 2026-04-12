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



module.exports = { crearPlatillo };
