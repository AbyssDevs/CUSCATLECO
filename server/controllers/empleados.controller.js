const db = require("../db");

const crearEmpleado = (req, res) => {
  const { nombre, email, password, telefono, rol } = req.body;

  const sqlUsuario = `
    INSERT INTO usuarios 
    (usuario_nombre, usuario_email, usuario_password, usuario_telefono)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sqlUsuario,
    [nombre, email, password, telefono],
    (error, resultado) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al crear usuario" });
      }

      const idUsuario = resultado.insertId;

      // buscar id del rol
      const sqlRol = "SELECT id_rol FROM roles WHERE rol_nombre = ?";

      db.query(sqlRol, [rol], (error2, resultadoRol) => {
        if (error2 || resultadoRol.length === 0) {
          console.error(error2);
          return res.status(500).json({ error: "Rol no encontrado" });
        }

        const idRol = resultadoRol[0].id_rol;

        // insertar relación
        const sqlAsignar = `
          INSERT INTO usuario_rol (id_usuario, id_rol)
          VALUES (?, ?)
        `;

        db.query(sqlAsignar, [idUsuario, idRol], (error3) => {
          if (error3) {
            console.error(error3);
            return res.status(500).json({ error: "Error al asignar rol" });
          }

          res.json({ mensaje: "Empleado creado correctamente" });
        });
      });
    }
  );
};

const obtenerEmpleados = (req, res) => {
  const sql = `
    SELECT 
      u.id_usuario,
      u.usuario_nombre,
      u.usuario_email,
      u.usuario_telefono,
      r.rol_nombre,
      Date_Format(u.usuario_creado_en, '%Y-%m-%d') AS fecha_creacion
    FROM usuarios u
    JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    JOIN roles r ON ur.id_rol = r.id_rol
    WHERE u.usuario_activo = TRUE
    ORDER BY u.id_usuario DESC
  `;

  db.query(sql, (error, empleados) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error del servidor" });
    }

    res.json(empleados);
  });
};

const eliminarEmpleado = (req, res) => {
  const { id } = req.params;

  const sql = `UPDATE usuarios SET usuario_activo = FALSE WHERE id_usuario = ?`;

  db.query(sql, [id], (error, resultado) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error del servidor" });
    }
    res.json({ mensaje: "Empleado eliminado correctamente" });
  });
};

const editarEmpleado = (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono, rol, password } = req.body;

  const sqlUsuario = `
    UPDATE usuarios
    SET usuario_nombre = ?, usuario_email = ?, usuario_telefono = ?${password ? ", usuario_password = ?" : ""}
    WHERE id_usuario = ?
  `;

  const params = password
    ? [nombre, email, telefono, password, id]
    : [nombre, email, telefono, id];

  db.query(sqlUsuario, params, (error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error al actualizar usuario" });
    }

    // actualizar rol
    const sqlRol = `
      UPDATE usuario_rol ur
      JOIN roles r ON ur.id_rol = r.id_rol
      SET ur.id_rol = (
        SELECT id_rol FROM roles WHERE rol_nombre = ?
      )
      WHERE ur.id_usuario = ?
    `;

    db.query(sqlRol, [rol, id], (error2) => {
      if (error2) {
        console.error(error2);
        return res.status(500).json({ error: "Error al actualizar rol" });
      }

      res.json({ mensaje: "Empleado actualizado correctamente" });
    });
  });
};

module.exports = { crearEmpleado, obtenerEmpleados, eliminarEmpleado, editarEmpleado };
