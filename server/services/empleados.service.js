import bcrypt from "bcrypt";
import db from "../config/db.js";

//  CREAR
export const crearEmpleado = async (data) => {
  const { nombre, email, password, telefono, rol } = data;

  if (!nombre || !email || !password || !telefono || !rol) {
    throw new Error("Todos los campos son obligatorios");
  }

  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [resultado] = await db.query(
    `INSERT INTO usuarios 
     (usuario_nombre, usuario_email, usuario_password, usuario_telefono)
     VALUES (?, ?, ?, ?)`,
    [nombre, email, hashedPassword, telefono]
  );

  const idUsuario = resultado.insertId;

  const [resultadoRol] = await db.query(
    "SELECT id_rol FROM roles WHERE rol_nombre = ?",
    [rol]
  );

  if (resultadoRol.length === 0) {
    throw new Error("Rol no encontrado");
  }

  const idRol = resultadoRol[0].id_rol;

  await db.query(
    "INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)",
    [idUsuario, idRol]
  );

  return { mensaje: "Empleado creado correctamente" };
};

//  OBTENER
export const obtenerEmpleados = async () => {
  const [empleados] = await db.query(`
    SELECT 
      u.id_usuario,
      u.usuario_nombre,
      u.usuario_email,
      u.usuario_telefono,
      r.rol_nombre,
      DATE_FORMAT(u.usuario_creado_en, '%Y-%m-%d') AS fecha_creacion
    FROM usuarios u
    JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    JOIN roles r ON ur.id_rol = r.id_rol
    WHERE u.usuario_activo = TRUE
    ORDER BY u.id_usuario DESC
  `);

  return empleados;
};

// ELIMINAR
export const eliminarEmpleado = async (id) => {
  await db.query(
    "UPDATE usuarios SET usuario_activo = FALSE WHERE id_usuario = ?",
    [id]
  );

  return { mensaje: "Empleado eliminado correctamente" };
};

//  EDITAR
export const editarEmpleado = async (id, data) => {
  const { nombre, email, telefono, rol, password } = data;

  let hashedPassword = null;

  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  const sqlUsuario = `
    UPDATE usuarios
    SET usuario_nombre = ?, usuario_email = ?, usuario_telefono = ?${hashedPassword ? ", usuario_password = ?" : ""}
    WHERE id_usuario = ?
  `;

  const params = hashedPassword
    ? [nombre, email, telefono, hashedPassword, id]
    : [nombre, email, telefono, id];

  await db.query(sqlUsuario, params);

  await db.query(
    `UPDATE usuario_rol
     SET id_rol = (SELECT id_rol FROM roles WHERE rol_nombre = ?)
     WHERE id_usuario = ?`,
    [rol, id]
  );

  return { mensaje: "Empleado actualizado correctamente" };
};