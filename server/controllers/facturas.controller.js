import * as facturasService from "../services/facturas.service.js";
import { handleControllerError } from "../utils/errorHandler.js";

export const previsualizarFacturaConsumidorFinal = async (req, res) => {
  try {
    const data = await facturasService.previsualizarFacturaConsumidorFinal(
      req.params.id_pedido
    );

    res.json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al previsualizar la factura");
  }
};

export const generarFacturaConsumidorFinal = async (req, res) => {
  try {
    const idPedido = req.body.id_pedido || req.body.pedido_id;
    const data = await facturasService.generarFacturaConsumidorFinal({
      id_pedido: idPedido,
      nombre_cliente: req.body.nombre_cliente || null,
      nit_cliente: req.body.nit_cliente || req.body.nit || null,
      id_cajero: req.user.id,
    });

    res.status(201).json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al generar la factura");
  }
};

export const obtenerFacturaPorId = async (req, res) => {
  try {
    const data = await facturasService.obtenerFacturaPorId(req.params.id_factura);
    res.json(data);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener la factura");
  }
};
