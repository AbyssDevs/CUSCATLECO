import * as pedidosService from '../services/pedidos.service.js';
import { handleControllerError } from '../utils/errorHandler.js';


export const crearPedido = async (req, res) => {
  try {
    const data = await pedidosService.crearPedido({
      ...req.body,
      userId: req.user.id
    });

    return res.status(201).json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al crear pedido");
  }
};


export const iniciarPedido = async (req, res) => {
  try {
    const data = await pedidosService.iniciarPedido({
      ...req.body,
      userId: req.user.id
    });

    return res.status(201).json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al iniciar pedido");
  }
};


export const agregarItemsPedido = async (req, res) => {
  try {
    const data = await pedidosService.agregarItemsPedido({
      id_pedido: req.params.id,
      items: req.body.items,
      notas: req.body.notas,
      observaciones: req.body.observaciones,
      pedido_observaciones: req.body.pedido_observaciones
    });

    return res.status(200).json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al agregar platillos al pedido");
  }
};


export const agregarPlatilloAPedido = async (req, res) => {
  try {
    const data = await pedidosService.agregarPlatilloAPedido({
      id_pedido: req.params.id_pedido,
      ...req.body
    });

    res.status(201).json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al agregar platillo al pedido");
  }
};



export const eliminarPlatilloPedido = async (req, res) => {
  try {

    const data =
      await pedidosService.eliminarPlatilloPedido(
        req.params.id_detalle
      );

    res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al eliminar platillo");
  }
};

export const cancelarPedido = async (req, res) => {
  try {

    const data =
      await pedidosService.cancelarPedido(
        req.params.id,
        req.body.motivo,
        req.user.id
      );

    res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al cancelar pedido");
  }
};

export const modificarCantidadPlatillo = async (req, res) => {
  try {

    const data = await pedidosService.modificarCantidadPlatillo({
      id_detalle: req.params.id_detalle,
      cantidad: req.body.cantidad
    });

    res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al modificar cantidad");
  }
};


export const marcarPedidoEntregado = async (req, res) => {
  try {
    const { id_pedido } = req.params;

    const data = await pedidosService.marcarPedidoEntregado(
      id_pedido,
      req.user.id
    );

    res.json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al marcar pedido como entregado");
  }
};


export const obtenerPedidosActivosMesero = async (req, res) => {
  try {

    const data =
      await pedidosService.obtenerPedidosActivosMesero(
        req.user.id
      );

    res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al obtener pedidos activos");
  }


};


export const enviarPedidoACocina = async (req, res) => {
  try {
    const { id_pedido } = req.params;

    const data = await pedidosService.enviarPedidoACocina(id_pedido, req.user.id);

    return res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al enviar pedido a cocina");
  }
};


export const obtenerPedidosPendientesCocina = async (req, res) => {

  try {

    const data =
      await pedidosService.obtenerPedidosPendientesCocina();

    res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al obtener pedidos pendientes");
  }
};

export const cambiarEstadoPedidoCocina = async (
  req,
  res
) => {

  try {

    const data =
      await pedidosService.cambiarEstadoPedidoCocina(
        req.params.id,
        req.body.estado
      );

    res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al cambiar estado del pedido");
  }
};


export const obtenerPedidosPendientesCajero = async (req, res) => {
  try {
    const data = await pedidosService.obtenerPedidosPendientesCajero();
    res.json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener pedidos pendientes");
  }
};


export const marcarPedidoListo = async (req, res) => {
  try {
    const data = await pedidosService.marcarPedidoListo(req.params.id, req.user.id);
    res.json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al marcar pedido como listo");
  }
};


export const obtenerDetallePedido = async (req, res) => {
  try {

    const { id_pedido } = req.params;

    const data = await pedidosService.obtenerDetallePedido(id_pedido, req.user.id);

    res.json(data);

  } catch (error) {
    handleControllerError(res, error, "Error al obtener detalle del pedido");
  }
};


