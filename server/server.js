import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

// recrear __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { requirePermission, auditoriaMiddleware, recoverSession } from "./middlewares/auth.middleware.js";


// Importar rutas
import authRoutes from "./routes/auth.routes.js";
import empleadosRoutes from "./routes/empleados.routes.js";
import platillosRoutes from "./routes/platillos.routes.js";
import mesasRoutes from "./routes/mesas.routes.js";

const app = express();
const PORT = 3000;

// Middlewares globales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// Sesiones
app.use(
  session({
    secret: "clave-secreta-del-sistema",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 1000 * 60 * 30 }, // La sesión dura 30 minutos
  })
);


// Middleware para recuperar usuario de la sesión

app.use(recoverSession);

// Rutas públicas
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/index.html"));
});

app.get("/403", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/403.html"));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Rutas protegidas por rol
app.get("/admin", requirePermission("ver_admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/administrador.html"));
});

app.get("/mesero", requirePermission("ver_mesero"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/mesero.html"));
});

app.get("/cocina", requirePermission("ver_cocina"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/cocina.html"));
});

app.get("/cajero", requirePermission("ver_cajero"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/cajero.html"));
});

// Evitar acceso directo a los archivos .html en /views
app.use("/views", (req, res) => {
  res.redirect("/");
});

// Usar rutas modulares
app.use("/api", authRoutes);
app.use("/api/empleados", requirePermission("gestionar_usuarios"), empleadosRoutes);
app.use("/api/platillos", auditoriaMiddleware, platillosRoutes);
app.use("/api/mesas", auditoriaMiddleware, mesasRoutes);


// Iniciar el servidor
app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  console.log(` Abre esa URL en tu navegador para ver el login`);
});