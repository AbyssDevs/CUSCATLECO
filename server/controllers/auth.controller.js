import * as authService from "../services/auth.service.js";

export const login = async (req, res) => {
  const { usuario_email, usuario_password } = req.body;

  if (!usuario_email || !usuario_password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  try {
    const usuario = await authService.login(
      usuario_email,
      usuario_password
    );

    // guardar sesión
    req.session.usuario = usuario;

    console.log(`Login exitoso: ${usuario.nombre} (${usuario.rol})`);

    res.json({
      mensaje: "Login exitoso",
      rol: usuario.rol,
      usuario: usuario.nombre,
    });

  } catch (error) {
    console.error("Error en login:", error.message);

    res.status(401).json({
      error: error.message || "Error del servidor"
    });
  }
};

export const getUsuario = (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: "Sesión no válida" });

  }
    res.json(req.session.usuario);
}