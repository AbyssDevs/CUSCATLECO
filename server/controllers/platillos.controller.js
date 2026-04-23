import * as platillosService from "../services/platillos.service.js";

// CREAR
export const crearPlatillo = async (req, res) => {
  try {
    const result = await platillosService.crearPlatillo(req.body, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// LISTAR
export const obtenerPlatillos = async (req, res) => {
  try {
    const data = await platillosService.obtenerPlatillos(
      req.query,
      req.user.rol
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener platillos" });
  }
};

// UNO
export const obtenerPlatillo = async (req, res) => {
  try {
    const data = await platillosService.obtenerPlatillo(
      req.params.id,
      req.user.rol
    );
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// EDITAR
export const editarPlatillo = async (req, res) => {
  try {
    const result = await platillosService.editarPlatillo(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// ESTADO
export const cambiarEstadoPlatillo = async (req, res) => {
  try {
    const result = await platillosService.cambiarEstadoPlatillo(
      req.params.id,
      req.body.platillo_disponible,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};