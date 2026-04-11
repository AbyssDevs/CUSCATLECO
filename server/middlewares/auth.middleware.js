// middlewares/auth.middleware.js

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
  const isApi = req.originalUrl.startsWith('/api');

  if (!req.user) {
    return isApi
      ? res.status(401).json({ error: "No autorizado" })
      : res.redirect("/");
  }
  next();
}

function requireRole(rol) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if ((req.user.role || "").toLowerCase() !== rol.toLowerCase()) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    next();
  };
}

const auditoriaMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId) {
        return res.status(400).json({ error: "Usuario no enviado en headers" });
    }

    req.user = {
        id: parseInt(userId),
        role: userRole
    };
    
    console.log("HEADERS:", req.headers);
    console.log("USER:", req.user);
    next();

};


module.exports = { requirePermission, requireLogin, requireRole, auditoriaMiddleware };
