import express from "express";
const router = express.Router();

import {
    iniciarPedido,
    crearPedido,
    agregarPlatilloAPedido,
    eliminarPlatilloPedido,
    modificarCantidadPlatillo,
    obtenerPedidosActivos,
    enviarPedidoACocina,
    marcarPedidoEntregado,
  
} from '../controllers/pedidos.controller.js';

import {
    requirePermission,
    auditoriaMiddleware
} from "../middlewares/auth.middleware.js";

router.post('/iniciar', auditoriaMiddleware, requirePermission('crear_pedido'), iniciarPedido);

router.post('/crear', auditoriaMiddleware, requirePermission('crear_pedido'), crearPedido);

router.post('/:id_pedido/platillos', auditoriaMiddleware, requirePermission('crear_pedido'), agregarPlatilloAPedido);

router.delete('/platillos/:id_detalle', auditoriaMiddleware, requirePermission('crear_pedido'), eliminarPlatilloPedido);

router.put("/platillos/:id_detalle", requirePermission("crear_pedido"), modificarCantidadPlatillo);

router.patch('/:id_pedido/enviar',auditoriaMiddleware,requirePermission('crear_pedido'),enviarPedidoACocina);

router.patch(
  '/:id_pedido/listo',
  auditoriaMiddleware,
  requirePermission('gestionar_cocina'),
  marcarPedidoListo
);

export default router;