import * as pedidosService from '../services/pedidos.service.js';


export const crearPedido = async (req, res) => {
  try {
    const data = await pedidosService.crearPedido({
      ...req.body,
      userId: req.user.id
    });

    return res.status(201).json(data);

  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || "Error al crear pedido"
    });
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
    return res.status(error.status || 500).json({
      error: error.message
    });
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
    res.status(error.status || 500).json({
      error: error.message
    });
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

    res.status(error.status || 500).json({
      error: error.message
    });
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

    res.status(error.status || 500).json({
      error: error.message
    });
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
    console.error('Error:', error);
    res.status(error.status || 500).json({
      error: error.message
    });
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

    res.status(error.status || 500).json({
      error: error.message
    });
  }
};