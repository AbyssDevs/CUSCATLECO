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