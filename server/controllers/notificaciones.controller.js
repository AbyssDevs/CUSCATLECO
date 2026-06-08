import * as notificacionesService from "../services/notificaciones.service.js";

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

    res.status(error.status || 500).json({
      error: error.message
    });

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
    res.status(error.status || 500).json({ error: error.message });
  }
};