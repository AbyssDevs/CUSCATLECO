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