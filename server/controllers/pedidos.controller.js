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

export const marcarPedidoEntregado = async (req, res) => {
  try {
    const { id_pedido } = req.params;

    const data = await pedidosService.marcarPedidoEntregado(
      id_pedido,
      req.user.id
    );

    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message
    });
  }
};

export const enviarPedidoACocina = async (req, res) => {
  try {
    const { id_pedido } = req.params;

    const data = await pedidosService.enviarPedidoACocina(id_pedido);

    return res.json(data);

  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || "Error al enviar pedido a cocina"
    });
  }
};
