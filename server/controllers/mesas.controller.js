import * as mesasService from "../services/mesas.service.js";

// 🔹 CREAR
export const crearMesa = async (req, res) => {
  try {
    const data = await mesasService.crearMesa(req.body, req.user.id);
    res.status(201).json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// 🔹 CREAR MASIVO
export const crearMesas = async (req, res) => {
  try {
    const data = await mesasService.crearMesas(req.body.mesas, req.user.id);
    res.status(201).json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// 🔹 LISTAR
export const listarMesas = async (req, res) => {
  try {
    const data = await mesasService.listarMesas();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al listar mesas" });
  }
};

// 🔹 ELIMINAR
export const eliminarMesa = async (req, res) => {
  try {
    const data = await mesasService.eliminarMesa(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// 🔹 ESTADO
export const cambiarEstadoMesa = async (req, res) => {
  try {
    const data = await mesasService.cambiarEstadoMesa(
      req.params.id,
      req.body.mesa_estado,
      req.user.id
    );
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};