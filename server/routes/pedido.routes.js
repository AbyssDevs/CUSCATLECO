import express from "express";
const router = express.Router();

import {
    iniciarPedido,
    crearPedido,
    agregarItemsPedido,
    agregarPlatilloAPedido,
    eliminarPlatilloPedido,
    modificarCantidadPlatillo,
    obtenerPedidosActivosMesero,
    cancelarPedido,
    obtenerPedidosPendientesCocina,
    cambiarEstadoPedidoCocina


} from '../controllers/pedidos.controller.js';

import {
    requirePermission,
    auditoriaMiddleware
} from "../middlewares/auth.middleware.js";

router.post('/iniciar', auditoriaMiddleware, requirePermission('crear_pedido'), iniciarPedido);
router.post('/', auditoriaMiddleware, requirePermission('crear_pedido'), crearPedido);

router.post('/crear', auditoriaMiddleware, requirePermission('crear_pedido'), crearPedido);
router.patch('/:id/items', auditoriaMiddleware, requirePermission('crear_pedido'), agregarItemsPedido);


export default router;

router.post('/:id_pedido/platillos', auditoriaMiddleware, requirePermission('crear_pedido'), agregarPlatilloAPedido);

router.delete('/platillos/:id_detalle', auditoriaMiddleware, requirePermission('crear_pedido'), eliminarPlatilloPedido);

router.put("/platillos/:id_detalle", requirePermission("crear_pedido"), modificarCantidadPlatillo);

router.get("/activos",requirePermission("crear_pedido"), obtenerPedidosActivosMesero);

router.patch("/:id/cancelar",requirePermission("crear_pedido"), cancelarPedido);

router.get("/cocina/pendientes",requirePermission("ver_pedidos"), obtenerPedidosPendientesCocina);

router.patch("/:id/cocina/estado",requirePermission("ver_pedidos"), cambiarEstadoPedidoCocina);

export default router;

