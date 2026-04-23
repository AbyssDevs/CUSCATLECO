import * as empleadosService from "../services/empleados.service.js";

// 🔹 CREAR
export const crearEmpleado = async (req, res) => {
  try {
    const resultado = await empleadosService.crearEmpleado(req.body);
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

// 🔹 OBTENER
export const obtenerEmpleados = async (req, res) => {
  try {
    const empleados = await empleadosService.obtenerEmpleados();
    res.json(empleados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener empleados" });
  }
};

// 🔹 ELIMINAR
export const eliminarEmpleado = async (req, res) => {
  try {
    const resultado = await empleadosService.eliminarEmpleado(req.params.id);
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar empleado" });
  }
};

// 🔹 EDITAR
export const editarEmpleado = async (req, res) => {
  try {
    const resultado = await empleadosService.editarEmpleado(
      req.params.id,
      req.body
    );
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar empleado" });
  }
};