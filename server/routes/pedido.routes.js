import express from "express";
const router = express.Router();

import {
    iniciarPedido,
    crearPedido,
    agregarPlatilloAPedido,
    eliminarPlatilloPedido,
    modificarCantidadPlatillo,
    obtenerPedidosActivosMesero,
    marcarPedidoEntregado,
    obtenerDetallePedido,
    cancelarPedido

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

router.get("/activos",requirePermission("crear_pedido"), obtenerPedidosActivosMesero);

router.patch("/:id/cancelar",requirePermission("crear_pedido"), cancelarPedido);

router.put('/:id_pedido/entregar',auditoriaMiddleware,requirePermission('crear_pedido'),marcarPedidoEntregado);

router.get('/:id_pedido',requirePermission('crear_pedido'),obtenerDetallePedido);


export default router;