// middlewares/auth.middleware.js

import path from "path";
import { cambiarEstadoMesa } from "../controllers/mesas.controller.js";
import { act } from "react";


// Middleware para recuperar el usuario de la sesión
export const recoverSession = (req, res, next) => {
  if (req.session && req.session.usuario) {
    req.user = req.session.usuario;
  }
  next();
}

export const requirePermission = (permiso) => {
  return (req, res, next) => {
    const isApi = req.originalUrl.startsWith("/api");

    if (!req.user) {
      console.warn(`Intento sin sesión para permiso: ${permiso}`);
      return isApi
      ? res.status(401).json({ error: "No autorizado - Inicia sesión" })
      : res.redirect("/");
}

    if (!req.user.permisos || !req.user.permisos.includes(permiso)) {
      return isApi
        ? res.status(403).json({ error: "Permiso denegado" })
        : res.redirect("/403");
    }

    next();
  };
}

//NO TOCAR ESTE CODIGO POR FAVOR, SIRVE PARA GARANTIZAR QUE HAY USUARIO DISPONIBLE EN LA SESION ANTES DE EJECUTAR CONTROLADORES QUE REQUIEREN USUARIO
export const auditoriaMiddleware = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "No autenticado" });
  }

  next();
};