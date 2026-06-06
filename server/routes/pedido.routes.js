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
    enviarPedidoACocina,
    marcarPedidoEntregado,
    cancelarPedido,
    obtenerPedidosPendientesCocina,
    cambiarEstadoPedidoCocina,
    obtenerDetallePedido,
    marcarPedidoListo
} from '../controllers/pedidos.controller.js';

import {
    requirePermission,
    auditoriaMiddleware
} from "../middlewares/auth.middleware.js";


router.patch('/:id/estado', requirePermission('crear_pedido'), marcarPedidoListo);

router.post('/iniciar', auditoriaMiddleware, requirePermission('crear_pedido'), iniciarPedido);

router.post('/crear', auditoriaMiddleware, requirePermission('crear_pedido'), crearPedido);

router.patch('/:id/items', auditoriaMiddleware, requirePermission('crear_pedido'), agregarItemsPedido);

router.post('/:id_pedido/platillos', auditoriaMiddleware, requirePermission('crear_pedido'), agregarPlatilloAPedido);

router.delete('/platillos/:id_detalle', auditoriaMiddleware, requirePermission('crear_pedido'), eliminarPlatilloPedido);

router.put("/platillos/:id_detalle", requirePermission("crear_pedido"), modificarCantidadPlatillo);

router.post('/:id_pedido/enviar',auditoriaMiddleware,requirePermission('crear_pedido'),enviarPedidoACocina);

router.put('/:id_pedido/entregar',auditoriaMiddleware,requirePermission('crear_pedido'),marcarPedidoEntregado);

router.get("/activos",requirePermission("crear_pedido"), obtenerPedidosActivosMesero);

router.get("/mis-pedidos",requirePermission("crear_pedido"), obtenerPedidosActivosMesero);

router.patch("/:id/cancelar",requirePermission("crear_pedido"), cancelarPedido);

router.get('/:id_pedido',requirePermission('crear_pedido'),obtenerDetallePedido);

router.get("/cocina/pendientes",requirePermission("ver_pedidos"), obtenerPedidosPendientesCocina);

router.patch("/:id/cocina/estado",requirePermission("ver_pedidos"), cambiarEstadoPedidoCocina);

export default router;
