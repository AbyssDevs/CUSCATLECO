import express from "express";
const router = express.Router();
import {
    marcarNotificacionLeida,
    obtenerNotificacionesNuevas
} from "../controllers/notificaciones.controller.js";

import { requirePermission } from "../middlewares/auth.middleware.js";

router.get('/nuevas', requirePermission('crear_pedido'), obtenerNotificacionesNuevas);
router.patch('/:id/leida', requirePermission('crear_pedido'), marcarNotificacionLeida);

export default router;