const express = require("express");
const router = express.Router();
const {
  crearPlatillo,
  obtenerPlatillos,
  obtenerPlatillo,
  editarPlatillo,
  cambiarEstadoPlatillo
  
} = require("../controllers/platillos.controller");
const { requirePermission, auditoriaMiddleware } = require("../middlewares/auth.middleware");


router.post("/", auditoriaMiddleware, requirePermission("gestionar_menu"), crearPlatillo);

router.get("/", auditoriaMiddleware, requirePermission("ver_menu"), obtenerPlatillos);

router.get("/:id", auditoriaMiddleware, requirePermission("ver_menu"), obtenerPlatillo);

router.put("/:id", auditoriaMiddleware, requirePermission("gestionar_menu"), editarPlatillo);

router.patch("/:id/estado", auditoriaMiddleware, requirePermission("gestionar_menu"), cambiarEstadoPlatillo);

module.exports = router;
