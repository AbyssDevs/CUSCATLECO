const express = require("express");
const router = express.Router();
const {
  crearPlatillo,

} = require("../controllers/platillos.controller");
const { requirePermission, auditoriaMiddleware } = require("../middlewares/auth.middleware");

router.post("/", auditoriaMiddleware, requirePermission("gestionar_menu"), crearPlatillo);



module.exports = router;
