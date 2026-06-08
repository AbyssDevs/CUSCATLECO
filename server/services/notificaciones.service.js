import db from "../config/db.js";

export const marcarNotificacionLeida = async (
  id_notificacion
) => {

  const [result] = await db.query(
    `UPDATE notificaciones
     SET
        notificacion_leida = TRUE,
        notificacion_leida_en = NOW()
     WHERE id_notificacion = ?`,
    [id_notificacion]
  );

  if (result.affectedRows === 0) {
    throw Object.assign(
      new Error("Notificación no encontrada"),
      { status: 404 }
    );
  }

  return {
    message: "Notificación marcada como leída"
  };

};


// Función para crear notificación de nuevo pedido para cocineros
export const crearNotificacionNuevoPedido = async (
  id_pedido,
  mesa_numero
) => {

  const [cocineros] = await db.query(`
    SELECT u.id_usuario
    FROM usuarios u
    INNER JOIN usuario_rol ur
      ON u.id_usuario = ur.id_usuario
    INNER JOIN roles r
      ON ur.id_rol = r.id_rol
    WHERE r.rol_nombre = 'Cocina'
  `);

  for (const cocinero of cocineros) {
    await db.query(`
      INSERT INTO notificaciones (
        id_usuario,
        id_pedido,
        notificacion_tipo,
        notificacion_asunto,
        notificacion_mensaje
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      cocinero.id_usuario,
      id_pedido,
      "Pedido",
      "Nuevo pedido",
      `Nuevo pedido #${id_pedido} de Mesa ${mesa_numero}`
    ]);
  }

};
