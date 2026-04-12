const express = require("express");
const router = express.Router();
const { 
  crearEmpleado, 
  obtenerEmpleados, 
  eliminarEmpleado, 
  editarEmpleado 
} = require("../controllers/empleados.controller");
const { requirePermission } = require("../middlewares/auth.middleware");

router.post("/", requirePermission("gestionar_usuarios"), crearEmpleado);

router.get("/", requirePermission("gestionar_usuarios"), obtenerEmpleados);

router.delete("/:id", requirePermission("gestionar_usuarios"), eliminarEmpleado);

router.put("/:id", requirePermission("gestionar_usuarios"), editarEmpleado);


module.exports = router;
