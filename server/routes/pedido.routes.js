import express from "express";
const router = express.Router();

import {
    iniciarPedido,
    crearPedido,
    agregarPlatilloAPedido,
    eliminarPlatilloPedido
} from '../controllers/pedidos.controller.js';

import {
    requirePermission,
    auditoriaMiddleware
} from "../middlewares/auth.middleware.js";

router.post('/iniciar', auditoriaMiddleware, requirePermission('crear_pedido'), iniciarPedido);

router.post('/crear', auditoriaMiddleware, requirePermission('crear_pedido'), crearPedido);

router.post('/:id_pedido/platillos', auditoriaMiddleware, requirePermission('crear_pedido'), agregarPlatilloAPedido);

router.delete('/platillos/:id_detalle', auditoriaMiddleware, requirePermission('crear_pedido'), eliminarPlatilloPedido);

export default router;