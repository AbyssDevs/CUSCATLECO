import express from "express";
import {
  generarFacturaConsumidorFinal,
  obtenerFacturaPorId,
  previsualizarFacturaConsumidorFinal,
} from "../controllers/facturas.controller.js";
import {
  auditoriaMiddleware,
  requirePermission,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/pedido/:id_pedido/previsualizar",
  auditoriaMiddleware,
  requirePermission("generar_factura"),
  previsualizarFacturaConsumidorFinal
);

router.post(
  "/generar",
  auditoriaMiddleware,
  requirePermission("generar_factura"),
  generarFacturaConsumidorFinal
);

router.get(
  "/:id_factura",
  auditoriaMiddleware,
  requirePermission("generar_factura"),
  obtenerFacturaPorId
);

export default router;
