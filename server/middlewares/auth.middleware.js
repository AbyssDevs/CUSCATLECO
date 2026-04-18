// middlewares/auth.middleware.js

const path = require("path");
const { cambiarEstadoMesa } = require("../controllers/mesas.controller");
const { act } = require("react");

// Middleware para recuperar el usuario de la sesión
function recoverSession(req, res, next) {
  if (req.session && req.session.usuario) {
    req.user = req.session.usuario;
  }
  next();
}

function requirePermission(permiso) {
  return (req, res, next) => {
    const isApi = req.originalUrl.startsWith('/api');

    if (!req.user) {
      return isApi
        ? res.status(401).json({ error: "No autorizado" })
        : res.redirect("/");
    }

    const role = (req.user.role || "").toLowerCase();

    if (permiso === "ver_menu") {
      if (role === "administrador" || role === "mesero" || role === "cajero") {
        return next();
      }
    } else if (permiso === "gestionar_menu") {
      if (role === "administrador") {
        return next();
      }
    } else if (permiso === "gestionar_usuarios") {
      if (role === "administrador") {
        return next();
      }
    } else if (permiso === "ver_mesas") {
      if (role === "administrador" || role === "mesero" || role === "cajero") {
        return next();
      }
    } else if (permiso === "gestionar_mesas") {
      if (role === "administrador") {
        return next();
      }
    } else if (permiso === "actualizar_estado_mesa") {
        if (role === "administrador" || role === "mesero") {
          return next();
        }
    } else {
      if (role === "administrador") {
        return next();
      }
    }

    return isApi
      ? res.status(403).json({ error: "Permiso denegado" })
      : res.redirect("/403");
  };
}

function requireLogin(req, res, next) {
  if (!req.user) {
    return res.redirect("/");
  }
  next();
}

function requireRole(rol) {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect("/403");
    }

    if ((req.user.role || "").toLowerCase() !== rol.toLowerCase()) {
      return res.redirect("/403");
    }

    next();
  };
}

//NO TOCAR ESTE CODIGO POR FAVOR, ES IMPORTANTE Y ME SIRVE PARA HACER PRUEBAS EN THUNDER CLIENT
const auditoriaMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  // Si ya tenemos el usuario por la sesión (recoverSession) lo usamos para evitar el error "❌ Error: Usuario no enviado en headers"
  if (req.user && req.user.id) {
    return next();
  }

  // Si no hay sesión, intentamos con los headers (para Thunder Client, etc.)
  if (userId) {
    req.user = {
        id: parseInt(userId),
        role: userRole
    };
    console.log("HEADERS:", req.headers);
    console.log("USER:", req.user);
    return next();
  }

  return res.status(400).json({ error: "Usuario no enviado en sesión ni en headers" });
};


module.exports = { requirePermission, requireLogin, requireRole, auditoriaMiddleware, recoverSession };
