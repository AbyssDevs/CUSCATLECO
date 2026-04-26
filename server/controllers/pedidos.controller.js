import * as pedidosService from '../services/pedidos.service.js';

export const iniciarPedido = async (req, res) => {
  try {
    const data = await pedidosService.iniciarPedido({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json(data);

  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message
    });
  }
};