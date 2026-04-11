const express = require("express");
const session = require("express-session");
const path = require("path");
const db = require("./db");
const { requirePermission, requireLogin, requireRole, auditoriaMiddleware } = require("./middlewares/auth.middleware");

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const empleadosRoutes = require("./routes/empleados.routes");
const platillosRoutes = require("./routes/platillos.routes");

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

// Copia el usuario de sesión a req.user para los middlewares de autorización
app.use((req, res, next) => {
  if (req.session && req.session.usuario) {
    req.user = req.session.usuario;
  }
  next();
});

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
app.get("/admin", requireLogin, requireRole("administrador"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/administrador.html"));
});

app.get("/mesero", requireLogin, requireRole("mesero"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/mesero.html"));
});

app.get("/cocina", requireLogin, requireRole("cocina"), (req, res) => {
  res.sendFile(path.join(__dirname, "../public/views/cocina.html"));
});

app.get("/cajero", requireLogin, requireRole("cajero"), (req, res) => {
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


// Iniciar el servidor
app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  console.log(` Abre esa URL en tu navegador para ver el login`);
});