
import express from "express";
const router = express.Router();
import { 
  crearEmpleado, 
  obtenerEmpleados, 
  eliminarEmpleado, 
  editarEmpleado 
} from "../controllers/empleados.controller.js";

import { 
  requirePermission 
} from "../middlewares/auth.middleware.js";

router.post("/", requirePermission("gestionar_usuarios"), crearEmpleado);

router.get("/", requirePermission("gestionar_usuarios"), obtenerEmpleados);

router.delete("/:id", requirePermission("gestionar_usuarios"), eliminarEmpleado);

router.put("/:id", requirePermission("gestionar_usuarios"), editarEmpleado);


export default router;