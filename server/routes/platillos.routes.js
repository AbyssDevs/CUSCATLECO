const express = require("express");
const router = express.Router();
const {
  crearPlatillo,
  obtenerPlatillos,
  obtenerPlatillo,
  
} = require("../controllers/platillos.controller");
const { requirePermission, auditoriaMiddleware } = require("../middlewares/auth.middleware");


router.post("/", auditoriaMiddleware, requirePermission("gestionar_menu"), crearPlatillo);

router.get("/", auditoriaMiddleware, requirePermission("ver_menu"), obtenerPlatillos);

router.get("/:id", auditoriaMiddleware, requirePermission("ver_menu"), obtenerPlatillo);

module.exports = router;
