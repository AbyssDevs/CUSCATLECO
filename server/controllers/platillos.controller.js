import * as platillosService from "../services/platillos.service.js";
import { handleControllerError } from "../utils/errorHandler.js";
import upload from "../config/uploadConfig.js";

// CREAR
export const crearPlatillo = async (req, res) => {
  try {
    // construir la URL de la imagen si existe
    const imagenUrl = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    // mezclar body + imagen
    const data = {
      ...req.body,
      platillo_imagen_url: imagenUrl
    };

    const result = await platillosService.crearPlatillo(
      data,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    handleControllerError(res, error, "Error al crear platillo");
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
    handleControllerError(res, error, "Error al obtener platillos");
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
    handleControllerError(res, error, "Error al obtener platillo");
  }
};

// EDITAR
export const editarPlatillo = async (req, res) => {
  try {
    const imagenUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const data ={
      ...req.body,
      platillo_imagen_url: imagenUrl
    }

    const result = await platillosService.editarPlatillo(
      req.params.id,
      data,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    handleControllerError(res, error, "Error al editar platillo");
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
    handleControllerError(res, error, "Error al cambiar estado del platillo");
  }
};