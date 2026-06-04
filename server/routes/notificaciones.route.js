import express from express;
const router = express.Router();
import {
    marcarNotificacionLeida,
} from "../controllers/notificaciones.controller.js";

router.patch('/:id/leida', marcarNotificacionLeida);

export default router;