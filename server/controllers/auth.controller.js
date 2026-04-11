const db = require("../db");

const login = (req, res) => {
  const { usuario_email, usuario_password } = req.body;

  if (!usuario_email || !usuario_password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  const sql = `
    SELECT 
      u.id_usuario,
      u.usuario_nombre,
      u.usuario_email,
      r.rol_nombre
    FROM usuarios u
    JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    JOIN roles r ON ur.id_rol = r.id_rol
    WHERE u.usuario_email = ?
      AND u.usuario_password = ?
      AND u.usuario_activo = TRUE
    LIMIT 1
  `;

  db.query(sql, [usuario_email, usuario_password], (error, resultados) => {
    if (error) {
      console.error("Error en login:", error);
      return res.status(500).json({ error: "Error del servidor" });
    }

    if (resultados.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const usuario = resultados[0];

    //obtener permisos
    const sqlPermisos = `
      SELECT p.permiso_nombre
      FROM permisos p
      JOIN rol_permiso rp ON p.id_permiso = rp.id_permiso
      JOIN usuario_rol ur ON rp.id_rol = ur.id_rol
      WHERE ur.id_usuario = ?
    `;

    db.query(sqlPermisos, [usuario.id_usuario], (err, permisos) => {
      if (err) {
        console.error("Error obteniendo permisos:", err);
        return res.status(500).json({ error: "Error del servidor" });
      }

      //guardar TODO en sesión
      req.session.usuario = {
        id: usuario.id_usuario,
        nombre: usuario.usuario_nombre,
        rol: usuario.rol_nombre,
        permisos: permisos.map(p => p.permiso_nombre)
      };

      console.log(
        `Login exitoso: ${usuario.usuario_nombre} (${usuario.rol_nombre})`
      );

      res.json({
        mensaje: "Login exitoso",
        rol: usuario.rol_nombre,
        usuario: usuario.usuario_nombre,
      });
    });
  });
};


const getUsuario = (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: "Sesión no válida" });
  }

  res.json(req.session.usuario);
};

module.exports = { login, getUsuario };
