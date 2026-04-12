const express = require("express");
const router = express.Router();
const { 
  crearEmpleado, 
  obtenerEmpleados, 
  eliminarEmpleado, 
  editarEmpleado 
} = require("../controllers/empleados.controller");
const { requirePermission } = require("../middlewares/auth.middleware");

router.post("/", crearEmpleado);

router.get("/", obtenerEmpleados);

router.delete("/:id", eliminarEmpleado);

router.put("/:id", editarEmpleado);

module.exports = router;
