import * as notificacionesService from "../services/notificaciones.service.js";
import { handleControllerError } from "../utils/errorHandler.js";

export const marcarNotificacionLeida = async (
  req,
  res
) => {

  try {

    const data =
      await notificacionesService.marcarNotificacionLeida(
        req.params.id
      );

    res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al marcar notificación como leída");
  }

};

export const obtenerNotificacionesNuevas = async (req, res) => {
  try {
    const desde = req.query.desde || '1970-01-01 00:00:00';
    const userId = req.user && req.user.id ? req.user.id : null;

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const data = await notificacionesService.obtenerNotificacionesNuevas(userId, desde);
    res.json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener notificaciones");
  }
};