import express from "express";
const router = express.Router();
import {
    marcarNotificacionLeida,
    obtenerNotificacionesNuevas
} from "../controllers/notificaciones.controller.js";

import { requirePermission } from "../middlewares/auth.middleware.js";

router.get('/nuevas', requirePermission('crear_pedido'), obtenerNotificacionesNuevas);
router.patch('/:id/leida', marcarNotificacionLeida);

export default router;