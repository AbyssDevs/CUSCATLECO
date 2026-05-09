import express from "express";
const router = express.Router();
import {
    crearMesa,
    crearMesas,
    listarMesas,
    eliminarMesa,
    cambiarEstadoMesa
} from "../controllers/mesas.controller.js";

import {
    requirePermission,
    auditoriaMiddleware
} from "../middlewares/auth.middleware.js";

router.post('/', auditoriaMiddleware, requirePermission('gestionar_mesas'), crearMesa);

router.post('/bulk', auditoriaMiddleware, requirePermission('gestionar_mesas'), crearMesas);

router.get('/', requirePermission('listar_mesas'), listarMesas);

router.delete('/:id', requirePermission('gestionar_mesas'), eliminarMesa);

router.patch('/:id/estado', auditoriaMiddleware, requirePermission('actualizar_estado_mesa'), cambiarEstadoMesa);

export default router;