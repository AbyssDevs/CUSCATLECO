import express from "express";
const router = express.Router();
import {
  crearPlatillo,
  obtenerPlatillos,
  obtenerPlatillo,
  editarPlatillo,
  cambiarEstadoPlatillo
  
} from "../controllers/platillos.controller.js";

import {
  requirePermission,
  auditoriaMiddleware 
} from "../middlewares/auth.middleware.js";




router.post("/", auditoriaMiddleware, requirePermission("gestionar_menu"), crearPlatillo);

router.get("/", auditoriaMiddleware, requirePermission("ver_menu"), obtenerPlatillos);

router.get("/:id", auditoriaMiddleware, requirePermission("ver_menu"), obtenerPlatillo);

router.put("/:id", auditoriaMiddleware, requirePermission("gestionar_menu"), editarPlatillo);

router.patch("/:id/estado", auditoriaMiddleware, requirePermission("gestionar_menu"), cambiarEstadoPlatillo);

export default router;
