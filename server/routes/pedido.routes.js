import express from "express";
const router = express.Router();

import {
    iniciarPedido,
    crearPedido,
    agregarItemsPedido
} from '../controllers/pedidos.controller.js';

import {
    requirePermission,
    auditoriaMiddleware
} from "../middlewares/auth.middleware.js";

router.post('/iniciar', auditoriaMiddleware, requirePermission('crear_pedido'), iniciarPedido);
router.post('/crear', auditoriaMiddleware, requirePermission('crear_pedido'), crearPedido);
router.patch('/:id/items', auditoriaMiddleware, requirePermission('crear_pedido'), agregarItemsPedido);

export default router;
