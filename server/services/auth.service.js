import db from "../config/db.js";
import bcrypt from "bcryptjs";

export const login = async (usuario_email, usuario_password) => {
  // 1. Buscar usuario
  const sql = `
    SELECT 
      u.id_usuario,
      u.usuario_nombre,
      u.usuario_email,
      u.usuario_password,
      r.rol_nombre
    FROM usuarios u
    JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    JOIN roles r ON ur.id_rol = r.id_rol
    WHERE u.usuario_email = ?
      AND u.usuario_activo = TRUE
    LIMIT 1
  `;

  const [resultados] = await db.query(sql, [usuario_email]);

  if (resultados.length === 0) {
    const error = new Error("Credenciales incorrectas");
    error.status = 401;
    throw error;
  }

  const usuario = resultados[0];

  // 2. Comparar contraseña
  const coincide = await bcrypt.compare(
    usuario_password,
    usuario.usuario_password
  );

  if (!coincide) {
    const error = new Error("Credenciales incorrectas");
    error.status = 401;
    throw error;
  }

  // 3. Obtener permisos
  const sqlPermisos = `
    SELECT p.permiso_nombre
    FROM permisos p
    JOIN rol_permiso rp ON p.id_permiso = rp.id_permiso
    JOIN usuario_rol ur ON rp.id_rol = ur.id_rol
    WHERE ur.id_usuario = ?
  `;

  const [permisos] = await db.query(sqlPermisos, [usuario.id_usuario]);

  return {
    id: usuario.id_usuario,
    nombre: usuario.usuario_nombre,
    rol: usuario.rol_nombre,
    permisos: permisos.map(p => p.permiso_nombre),
  };
};

export const getUsuario = (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: "Sesión no válida" });
  }

  res.json(req.session.usuario);
};